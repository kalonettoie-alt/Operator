// lib/utils/syncIcal.ts
// Logique de synchronisation iCal partagée entre le cron et le bouton admin.
// Lit les sources iCal actives, parse les événements et upserte les réservations.

import ical from "node-ical";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type ReservationSourceRow = Database["public"]["Tables"]["reservation_sources"]["Row"];

// ─── Types ─────────────────────────────────────────────────────────────────

export interface SyncStats {
  sourceId: string;
  logementId: string;
  platform: string;
  created: number;
  updated: number;
  cancelled: number;
  errors: string[];
}

export interface SyncResult {
  sources: SyncStats[];
  totalCreated: number;
  totalUpdated: number;
  totalCancelled: number;
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

/** Formate une date (Date ou DateWithTimeZone) en "YYYY-MM-DD" */
function toIsoDate(d: unknown): string {
  if (!d) return "";
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return "";
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

    if (!resp.ok) {
      stats.errors.push(`HTTP ${resp.status} sur ${url}`);
      return stats;
    }
    icsText = await resp.text();
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

  // 3. Récupérer les VEVENT actifs (non CANCELLED selon le flux iCal)
  const events = Object.values(components).filter(
    (c): c is NonNullable<typeof c> => !!c && c.type === "VEVENT" && !!c.uid && !!c.start
  );

  // Map uid → event (les événements CANCELLED dans le flux seront traités comme absents)
  const activeUids = new Set<string>();
  for (const ev of events) {
    // On ignore les événements explicitement CANCELLED dans le flux
    if (ev.type === "VEVENT" && ev.status !== "CANCELLED") {
      activeUids.add(String(ev.uid));
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

  // 5. Upsert chaque événement actif
  for (const ev of events) {
    if (ev.type !== "VEVENT" || !ev.uid || !ev.start) continue;
    if (ev.status === "CANCELLED") continue;

    const uid = String(ev.uid);
    const checkIn  = toIsoDate(ev.start);
    const checkOut = toIsoDate(ev.end ?? ev.start);

    if (!checkIn || !checkOut) continue;

    const guestName = paramToString(ev.summary) || null;
    const rawData = {
      uid,
      summary: guestName,
      status: ev.status ?? null,
      description: paramToString(ev.description) || null,
    };

    const existing = existingMap.get(uid);

    if (existing) {
      // Mise à jour si les dates ou le nom ont changé
      const { error: updateErr } = await supabase
        .from("reservations")
        .update({
          check_in: checkIn,
          check_out: checkOut,
          guest_name: guestName,
          raw_data: rawData,
          status: existing.status === "cancelled" ? "confirmed" : existing.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateErr) {
        stats.errors.push(`Update ${uid} : ${updateErr.message}`);
      } else {
        stats.updated++;
      }
    } else {
      // Création
      const { error: insertErr } = await supabase
        .from("reservations")
        .insert({
          external_id: uid,
          source_id: source.id,
          logement_id: source.logement_id,
          platform: source.platform,
          check_in: checkIn,
          check_out: checkOut,
          guest_name: guestName,
          raw_data: rawData,
          status: "confirmed",
        });

      if (insertErr) {
        stats.errors.push(`Insert ${uid} : ${insertErr.message}`);
      } else {
        stats.created++;
      }
    }
  }

  // 6. Annuler les réservations qui ne sont plus dans le flux
  for (const [uid, row] of existingMap.entries()) {
    if (!activeUids.has(uid) && row.status !== "cancelled") {
      const { error: cancelErr } = await supabase
        .from("reservations")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", row.id);

      if (cancelErr) {
        stats.errors.push(`Cancel ${uid} : ${cancelErr.message}`);
      } else {
        stats.cancelled++;
      }
    }
  }

  // 7. Mettre à jour last_synced_at
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
  // Charger les sources actives
  let query = supabase
    .from("reservation_sources")
    .select("*")
    .eq("is_active", true);

  if (sourceId) {
    query = query.eq("id", sourceId);
  }

  const { data: sources, error } = await query;

  if (error || !sources?.length) {
    return { sources: [], totalCreated: 0, totalUpdated: 0, totalCancelled: 0 };
  }

  // Synchroniser chaque source (séquentiel pour éviter de surcharger les APIs externes)
  const results: SyncStats[] = [];
  for (const source of sources) {
    const stats = await syncOneSource(supabase, source);
    results.push(stats);
  }

  return {
    sources: results,
    totalCreated:   results.reduce((s, r) => s + r.created,   0),
    totalUpdated:   results.reduce((s, r) => s + r.updated,   0),
    totalCancelled: results.reduce((s, r) => s + r.cancelled, 0),
  };
}
