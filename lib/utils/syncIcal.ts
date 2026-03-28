// lib/utils/syncIcal.ts
// Logique de synchronisation iCal partagée entre le cron et le bouton admin.
// Lit les sources iCal actives, parse les événements, upserte les réservations
// et crée automatiquement une intervention de ménage pour chaque nouvelle réservation.

import ical from "node-ical";
import type { VEvent } from "node-ical";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { INTERVENTION_STATUSES, INTERVENTION_TYPES, INTERVENTION_PRIORITIES } from "@/types/enums";

type ReservationSourceRow = Database["public"]["Tables"]["reservation_sources"]["Row"];
type LogementRow = Database["public"]["Tables"]["logements"]["Row"];

// ─── Types ─────────────────────────────────────────────────────────────────

export interface SyncStats {
  sourceId: string;
  logementId: string;
  platform: string;
  created: number;
  updated: number;
  cancelled: number;
  interventionsCreated: number;
  interventionsCancelled: number;
  errors: string[];
}

export interface SyncResult {
  sources: SyncStats[];
  totalCreated: number;
  totalUpdated: number;
  totalCancelled: number;
  totalInterventionsCreated: number;
  totalInterventionsCancelled: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Convertit un ParameterValue (string ou objet avec .val) en string propre */
function paramToString(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null && "val" in val) {
    return String((val as { val: unknown }).val);
  }
  return "";
}

/** Formate une date (Date ou DateWithTimeZone) en "YYYY-MM-DD".
 *  Utilise l'heure LOCALE (getDate/getMonth/getFullYear) et non UTC
 *  pour éviter le décalage d'un jour sur les événements journée entière :
 *  node-ical crée les dates à minuit heure locale, donc UTC+1 donne
 *  2026-03-21T23:00:00Z → .toISOString().slice(0,10) retournerait "2026-03-21". */
function toIsoDate(d: unknown): string {
  if (!d) return "";
  if (d instanceof Date) {
    const y   = d.getFullYear();
    const m   = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return "";
}

// ─── Création d'une intervention depuis une réservation ───────────────────

/**
 * Crée une intervention de ménage liée à une réservation.
 *
 * RÈGLE MÉTIER : on n'intervient QUE sur les check-out.
 * - Un check-in ne génère JAMAIS d'intervention (le logement est déjà propre).
 * - Si check-out et check-in sont le même jour, l'intervention est créée grâce
 *   au check-out, pas au check-in (checkin_meme_jour = true → priorité haute).
 * - Les événements iCal "0-jour" (checkIn === checkOut) sont des marqueurs
 *   de blocage, pas des séjours réels → aucune intervention.
 *
 * - date = check_out (le ménage se fait au départ du voyageur)
 * - checkin_meme_jour = true s'il y a une autre réservation qui arrive ce même jour
 * - priority = 'haute' si checkin_meme_jour
 * - Met à jour les interventions existantes du logement si une arrivée tombe le même jour
 */
async function createInterventionForReservation(
  supabase: SupabaseClient<Database>,
  params: {
    reservationId: string;
    logementId: string;
    checkIn: string;
    checkOut: string;
    logement: LogementRow;
    nbVoyageurs?: number | null;
    hasBaby?: boolean | null;
  }
): Promise<{ created: boolean; error?: string }> {
  const { reservationId, logementId, checkIn, checkOut, logement, nbVoyageurs, hasBaby } = params;

  // RÈGLE : pas d'intervention pour les événements sans séjour réel
  // (checkIn >= checkOut = événement 0-jour ou marqueur d'arrivée iCal)
  if (checkIn >= checkOut) {
    return { created: false };
  }

  // 1. Vérifier si une intervention existe déjà pour cette réservation
  const { data: existing } = await supabase
    .from("interventions")
    .select("id")
    .eq("reservation_id", reservationId)
    .maybeSingle();

  if (existing) {
    return { created: false };
  }

  // Garde supplémentaire : éviter deux interventions le même jour pour le même logement
  // (cas où deux events iCal auraient accidentellement le même checkout)
  const { data: existingSameDay } = await supabase
    .from("interventions")
    .select("id")
    .eq("logement_id", logementId)
    .eq("date", checkOut)
    .maybeSingle();

  if (existingSameDay) {
    return { created: false };
  }

  // 2. Créer l'intervention (checkin_meme_jour sera vérifié en post-création)
  const { data, error: insertErr } = await supabase
    .from("interventions")
    .insert({
      reservation_id:      reservationId,
      logement_id:         logementId,
      client_id:           logement.client_id,
      date:                checkOut,
      type:                INTERVENTION_TYPES.MENAGE,
      status:              INTERVENTION_STATUSES.A_ATTRIBUER,
      priority:            INTERVENTION_PRIORITIES.NORMALE,
      checkin_meme_jour:   false,
      prix_client_ttc:     logement.prix_client_ttc ?? null,
      prix_prestataire_ht: logement.prix_prestataire_ht ?? null,
      prix_blanchisserie:  logement.prix_blanchisserie ?? null,
      nb_voyageurs:        nbVoyageurs ?? null,
      has_baby:            hasBaby ?? null,
    })
    .select("id")
    .single();
  if (insertErr || !data) {
    return { created: false, error: insertErr?.message ?? "pas de données retournées" };
  }

  // 3. Lier l'intervention à la réservation
  await supabase
    .from("reservations")
    .update({ intervention_id: data.id })
    .eq("id", reservationId);

  // 4. Vérifier checkin_meme_jour en post-création.
  //    On cherche si une autre réservation active sur ce logement a un check_in
  //    égal au check_out de CETTE réservation (= un voyageur arrive le même jour
  //    qu'un autre part). Si oui, mettre à jour l'intervention qu'on vient de créer.
  //    Cette approche est robuste quel que soit l'ordre de traitement des événements.
  const { data: nextCheckin } = await supabase
    .from("reservations")
    .select("id")
    .eq("logement_id", logementId)
    .eq("check_in", checkOut)
    .neq("id", reservationId)
    .neq("status", "cancelled")
    .limit(1);

  if ((nextCheckin?.length ?? 0) > 0) {
    await supabase
      .from("interventions")
      .update({ checkin_meme_jour: true, priority: INTERVENTION_PRIORITIES.HAUTE })
      .eq("id", data.id);
  }

  // 5. Cas inverse : si CETTE réservation arrive sur un logement où quelqu'un
  //    part le même jour, l'intervention de ce départ doit aussi être marquée.
  //    (couvre le cas où l'intervention du départ a été créée avant celle-ci)
  const { data: departingToday } = await supabase
    .from("interventions")
    .select("id")
    .eq("logement_id", logementId)
    .eq("date", checkIn)
    .neq("reservation_id", reservationId);

  if (departingToday && departingToday.length > 0) {
    await supabase
      .from("interventions")
      .update({ checkin_meme_jour: true, priority: INTERVENTION_PRIORITIES.HAUTE })
      .in("id", departingToday.map((r) => r.id));
  }

  return { created: true };
}

// ─── Annulation d'une intervention liée à une réservation ────────────────

async function cancelInterventionForReservation(
  supabase: SupabaseClient<Database>,
  reservationId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("interventions")
    .update({
      status: INTERVENTION_STATUSES.ANNULEE,
      cancellation_reason: "Réservation annulée (sync iCal)",
      updated_at: new Date().toISOString(),
    })
    .eq("reservation_id", reservationId)
    .in("status", [
      INTERVENTION_STATUSES.A_ATTRIBUER,
      INTERVENTION_STATUSES.ASSIGNEE,
      INTERVENTION_STATUSES.ACCEPTEE,
    ])
    .select("id");

  if (error) return false;
  return (data?.length ?? 0) > 0;
}

// ─── Sync d'une source ─────────────────────────────────────────────────────

async function syncOneSource(
  supabase: SupabaseClient<Database>,
  source: ReservationSourceRow
): Promise<SyncStats> {
  const stats: SyncStats = {
    sourceId: source.id,
    logementId: source.logement_id,
    platform: source.platform,
    created: 0,
    updated: 0,
    cancelled: 0,
    interventionsCreated: 0,
    interventionsCancelled: 0,
    errors: [],
  };

  const url = source.ical_url;
  if (!url) {
    stats.errors.push("URL iCal manquante");
    return stats;
  }

  // 1. Fetch le fichier iCal
  let icsText: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Deltom-Operator/3.0 iCal-Sync",
        Accept: "text/calendar, */*",
      },
    });
    clearTimeout(timeout);

    console.log('[ICAL] fetch response status:', resp.status);
    if (!resp.ok) {
      stats.errors.push(`HTTP ${resp.status} sur ${url}`);
      return stats;
    }
    icsText = await resp.text();
    console.log('[ICAL] raw text length:', icsText.length);
    console.log('[ICAL] first 500 chars:', icsText.substring(0, 500));
  } catch (err) {
    const msg = err instanceof Error && err.name === "AbortError"
      ? "Timeout — l'URL n'a pas répondu en 15s"
      : `Erreur fetch : ${String(err)}`;
    stats.errors.push(msg);
    return stats;
  }

  // 2. Parse iCal
  let components: ReturnType<typeof ical.parseICS>;
  try {
    components = ical.parseICS(icsText);
  } catch (err) {
    stats.errors.push(`Erreur de parsing iCal : ${String(err)}`);
    return stats;
  }

  // 3. Filtrer les VEVENT
  const events = Object.values(components).filter(
    (c): c is VEvent => !!c && c.type === "VEVENT"
  );

  console.log('[ICAL] total events parsed:', events.length);
  events.forEach(e => console.log('[ICAL] event:', JSON.stringify(e).substring(0, 200)));

  // Map uid → event (les CANCELLED seront traités comme absents du flux actif)
  const activeUids = new Set<string>();
  for (const ev of events) {
    if (ev.status !== "CANCELLED") {
      activeUids.add(ev.uid);
    }
  }

  // 4. Charger les réservations existantes pour cette source
  const { data: existingRows, error: fetchErr } = await supabase
    .from("reservations")
    .select("id, external_id, status")
    .eq("source_id", source.id);

  if (fetchErr) {
    stats.errors.push(`Erreur DB fetch réservations : ${fetchErr.message}`);
    return stats;
  }

  const existingMap = new Map<string, { id: string; status: string }>();
  for (const row of existingRows ?? []) {
    if (row.external_id) {
      existingMap.set(row.external_id, { id: row.id, status: row.status });
    }
  }

  // 5. Charger le logement une seule fois (client_id + prix)
  const { data: logement, error: logErr } = await supabase
    .from("logements")
    .select("*")
    .eq("id", source.logement_id)
    .single();

  if (logErr || !logement) {
    stats.errors.push(`Logement introuvable : ${source.logement_id}`);
    return stats;
  }

  // 6. Upsert chaque événement actif
  for (const ev of events) {
    if (ev.status === "CANCELLED") {
      console.log('[ICAL] SKIPPED:', ev.uid, 'reason: status=CANCELLED');
      continue;
    }

    const uid = ev.uid;
    const checkIn  = toIsoDate(ev.start);
    const checkOut = toIsoDate(ev.end ?? ev.start);

    console.log('[ICAL] processing event:', {
      uid: ev.uid,
      summary: ev.summary,
      dtstart: ev.start,
      dtend: ev.end,
      status: ev.status,
      checkIn,
      checkOut,
    });

    if (!checkIn || !checkOut) {
      console.log('[ICAL] SKIPPED:', uid, 'reason: checkIn ou checkOut vide', { checkIn, checkOut, rawStart: ev.start, rawEnd: ev.end });
      continue;
    }

    const guestName = paramToString(ev.summary) || null;
    const rawData = {
      uid,
      summary: guestName,
      status: ev.status ?? null,
      description: paramToString(ev.description) || null,
    };

    const existing = existingMap.get(uid);
    console.log('[ICAL]', uid, existing ? 'UPDATE (déjà en DB)' : 'INSERT (nouveau)');

    if (existing) {
      // ── Mise à jour ───────────────────────────────────────────────────────
      const { error: updateErr } = await supabase
        .from("reservations")
        .update({
          check_in:   checkIn,
          check_out:  checkOut,
          guest_name: guestName,
          raw_data:   rawData,
          // Si elle était annulée dans notre DB mais réapparaît dans le flux → la réactiver
          status:     existing.status === "cancelled" ? "active" : existing.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      console.log('[ICAL] update result:', uid, updateErr ? 'NULL' : 'OK', 'error:', JSON.stringify(updateErr));
      if (updateErr) {
        stats.errors.push(`Update ${uid} : ${updateErr.message}`);
      } else {
        stats.updated++;

        // Créer l'intervention si elle n'existe pas encore pour cette réservation
        // (cas des réservations créées avant l'implémentation de la 10.3)
        const result = await createInterventionForReservation(supabase, {
          reservationId: existing.id,
          logementId:    source.logement_id,
          checkIn,
          checkOut,
          logement,
        });
        if (result.error) {
          stats.errors.push(`Intervention (update) pour ${uid} : ${result.error}`);
        } else if (result.created) {
          stats.interventionsCreated++;
        }
      }
    } else {
      // ── Création ──────────────────────────────────────────────────────────
      const { data: inserted, error: insertErr } = await supabase
        .from("reservations")
        .insert({
          external_id: uid,
          source_id:   source.id,
          logement_id: source.logement_id,
          platform:    source.platform,
          check_in:    checkIn,
          check_out:   checkOut,
          guest_name:  guestName,
          raw_data:    rawData,
          status:      "active",
        })
        .select("id")
        .single();

      console.log('[ICAL] insert result:', uid, inserted ? 'OK' : 'NULL', 'error:', JSON.stringify(insertErr));
      if (insertErr || !inserted) {
        stats.errors.push(`Insert ${uid} : ${insertErr?.message ?? "pas de données retournées"}`);
        continue;
      }
      stats.created++;

      // ── Créer l'intervention de ménage associée ───────────────────────────
      const result = await createInterventionForReservation(supabase, {
        reservationId: inserted.id,
        logementId:    source.logement_id,
        checkIn,
        checkOut,
        logement,
      });

      if (result.error) {
        stats.errors.push(`Intervention pour ${uid} : ${result.error}`);
      } else if (result.created) {
        stats.interventionsCreated++;
      }
    }
  }

  // 7. Annuler les réservations absentes du flux + leurs interventions
  for (const [uid, row] of existingMap.entries()) {
    if (!activeUids.has(uid) && row.status !== "cancelled") {
      const { error: cancelErr } = await supabase
        .from("reservations")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", row.id);

      if (cancelErr) {
        stats.errors.push(`Cancel ${uid} : ${cancelErr.message}`);
        continue;
      }
      stats.cancelled++;

      // Annuler l'intervention liée si elle n'est pas encore commencée
      const cancelled = await cancelInterventionForReservation(supabase, row.id);
      if (cancelled) stats.interventionsCancelled++;
    }
  }

  // 8. Mettre à jour last_synced_at
  await supabase
    .from("reservation_sources")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", source.id);

  return stats;
}

// ─── Export principal ──────────────────────────────────────────────────────

/**
 * Synchronise toutes les sources iCal actives (ou une seule si sourceId fourni).
 * @param supabase  Client Supabase avec service_role (bypass RLS)
 * @param sourceId  Optionnel — ID d'une source spécifique
 */
export async function syncIcalSources(
  supabase: SupabaseClient<Database>,
  sourceId?: string
): Promise<SyncResult> {
  let query = supabase
    .from("reservation_sources")
    .select("*")
    .eq("is_active", true);

  if (sourceId) {
    query = query.eq("id", sourceId);
  }

  const { data: sources, error } = await query;

  if (error || !sources?.length) {
    return {
      sources: [],
      totalCreated: 0, totalUpdated: 0, totalCancelled: 0,
      totalInterventionsCreated: 0, totalInterventionsCancelled: 0,
    };
  }

  const results: SyncStats[] = [];
  for (const source of sources) {
    const stats = await syncOneSource(supabase, source);
    results.push(stats);
  }

  return {
    sources:                    results,
    totalCreated:               results.reduce((s, r) => s + r.created,                0),
    totalUpdated:               results.reduce((s, r) => s + r.updated,                0),
    totalCancelled:             results.reduce((s, r) => s + r.cancelled,              0),
    totalInterventionsCreated:  results.reduce((s, r) => s + r.interventionsCreated,   0),
    totalInterventionsCancelled:results.reduce((s, r) => s + r.interventionsCancelled, 0),
  };
}
