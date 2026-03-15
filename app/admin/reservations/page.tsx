"use client";

// Sources iCal — admin.
// L'admin ajoute / supprime / active des URLs iCal par logement.
// Bouton "Tester" appelle /api/ical-test pour vérifier l'URL côté serveur.

import { useState } from "react";
import { toast } from "sonner";
import { Rss, Trash2, CheckCircle2, XCircle, Loader2, ToggleLeft, ToggleRight, ExternalLink, RefreshCw } from "lucide-react";
import * as Sentry from "@sentry/nextjs";

import {
  useReservationSources,
  useCreateReservationSource,
  useDeleteReservationSource,
  useToggleReservationSource,
} from "@/lib/hooks/useReservationSources";
import { useLogements } from "@/lib/hooks/useLogements";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Constantes ───────────────────────────────────────────────────────────────

const PLATFORMS = [
  { value: "airbnb",      label: "Airbnb",       color: "bg-rose-100 text-rose-700"   },
  { value: "booking",     label: "Booking.com",  color: "bg-blue-100 text-blue-700"   },
  { value: "vrbo",        label: "Vrbo",         color: "bg-green-100 text-green-700" },
  { value: "abritel",     label: "Abritel",      color: "bg-orange-100 text-orange-700"},
  { value: "autre",       label: "Autre",        color: "bg-slate-100 text-slate-700" },
] as const;

type Platform = typeof PLATFORMS[number]["value"];

function platformStyle(value: string) {
  return PLATFORMS.find((p) => p.value === value)?.color ?? "bg-slate-100 text-slate-700";
}

function platformLabel(value: string) {
  return PLATFORMS.find((p) => p.value === value)?.label ?? value;
}

function formatDate(iso: string | null) {
  if (!iso) return "Jamais";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

// ─── Types d'état ─────────────────────────────────────────────────────────────

type TestState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok";  message: string }
  | { status: "err"; message: string };

type SyncState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok";  message: string }
  | { status: "err"; message: string };

// ─── Composant : ligne source ─────────────────────────────────────────────────

function SourceRow({
  source,
  onDelete,
  onToggle,
  onTest,
  onSync,
}: {
  source: ReturnType<typeof useReservationSources>["data"] extends (infer T)[] | undefined ? T : never;
  onDelete: () => void;
  onToggle: (active: boolean) => void;
  onTest: () => void;
  onSync: () => void;
}) {
  return (
    <div className="flex items-start gap-3 p-4 hover:bg-slate-50 transition-colors">
      {/* Plateforme */}
      <span className={`text-xs px-2 py-1 rounded-full font-semibold shrink-0 ${platformStyle(source.platform)}`}>
        {platformLabel(source.platform)}
      </span>

      {/* Infos */}
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm font-semibold text-gray-900 truncate">
          {source.logement?.name ?? "Logement inconnu"}
          {source.logement?.city && (
            <span className="text-muted-foreground font-normal"> — {source.logement.city}</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground truncate font-mono">{source.ical_url}</p>
        <p className="text-xs text-muted-foreground">
          Sync toutes les {source.sync_interval_minutes ?? 60} min
          &nbsp;·&nbsp;
          Dernier sync : {formatDate(source.last_synced_at)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Tester */}
        <button
          onClick={onTest}
          className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-2.5 py-1.5 hover:bg-blue-50 transition-colors font-medium"
        >
          Tester
        </button>

        {/* Synchroniser cette source */}
        <button
          onClick={onSync}
          title="Synchroniser maintenant"
          className="text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-lg px-2.5 py-1.5 hover:bg-indigo-50 transition-colors font-medium flex items-center gap-1"
        >
          <RefreshCw className="size-3.5" />
          Sync
        </button>

        {/* Lien externe */}
        {source.ical_url && (
          <a
            href={source.ical_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Ouvrir l'URL"
          >
            <ExternalLink className="size-4" />
          </a>
        )}

        {/* Toggle actif */}
        <button
          onClick={() => onToggle(!(source.is_active ?? true))}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          title={source.is_active ? "Désactiver" : "Activer"}
        >
          {source.is_active
            ? <ToggleRight className="size-5 text-green-600" />
            : <ToggleLeft  className="size-5 text-slate-400" />}
        </button>

        {/* Supprimer */}
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          title="Supprimer"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminReservationsPage() {

  // ── Données ───────────────────────────────────────────────────────────────
  const { data: sources = [], isLoading }      = useReservationSources();
  const { data: logements = [], isLoading: logLoading } = useLogements();
  const createSource = useCreateReservationSource();
  const deleteSource = useDeleteReservationSource();
  const toggleSource = useToggleReservationSource();

  // ── Formulaire d'ajout ────────────────────────────────────────────────────
  const [logementId, setLogementId] = useState("");
  const [platform,   setPlatform]   = useState<Platform>("airbnb");
  const [icalUrl,    setIcalUrl]    = useState("");
  const [syncMin,    setSyncMin]    = useState("60");
  const [showForm,   setShowForm]   = useState(false);

  // ── État test URL ─────────────────────────────────────────────────────────
  // Map sourceId → TestState (pour les tests sur sources existantes)
  const [testStates, setTestStates] = useState<Record<string, TestState>>({});
  // Test sur l'URL du formulaire (avant création)
  const [formTestState, setFormTestState] = useState<TestState>({ status: "idle" });

  // ── État sync ─────────────────────────────────────────────────────────────
  const [globalSyncState, setGlobalSyncState] = useState<SyncState>({ status: "idle" });
  const [syncStates, setSyncStates] = useState<Record<string, SyncState>>({});

  // ── Appel API test ────────────────────────────────────────────────────────
  async function testUrl(url: string, key: string, setFn: (s: TestState) => void) {
    if (!url.trim()) { toast.error("URL vide"); return; }
    setFn({ status: "loading" });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch("/api/ical-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ url }),
      });
      const json = await res.json() as { valid?: boolean; message?: string; error?: string };
      if (json.valid) {
        setFn({ status: "ok",  message: json.message ?? "URL valide" });
      } else {
        setFn({ status: "err", message: json.error  ?? "URL invalide" });
      }
    } catch (err) {
      Sentry.captureException(err);
      setFn({ status: "err", message: "Erreur réseau" });
    }
  }

  function setSourceTestState(id: string, state: TestState) {
    setTestStates((prev) => ({ ...prev, [id]: state }));
  }

  // ── Appel API sync ────────────────────────────────────────────────────────
  async function syncSource(sourceId?: string) {
    const setFn = sourceId
      ? (s: SyncState) => setSyncStates((prev) => ({ ...prev, [sourceId]: s }))
      : setGlobalSyncState;

    setFn({ status: "loading" });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch("/api/admin/sync-ical", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(sourceId ? { source_id: sourceId } : {}),
      });
      const json = await res.json() as {
        success?: boolean;
        totalCreated?: number;
        totalUpdated?: number;
        totalCancelled?: number;
        error?: string;
      };
      if (json.success) {
        const msg = `${json.totalCreated ?? 0} créée(s), ${json.totalUpdated ?? 0} mise(s) à jour, ${json.totalCancelled ?? 0} annulée(s)`;
        setFn({ status: "ok", message: msg });
        toast.success(`Synchronisation terminée — ${msg}`);
      } else {
        setFn({ status: "err", message: json.error ?? "Erreur inconnue" });
        toast.error(json.error ?? "Erreur lors de la synchronisation");
      }
    } catch (err) {
      Sentry.captureException(err);
      setFn({ status: "err", message: "Erreur réseau" });
      toast.error("Erreur réseau lors de la synchronisation");
    }
  }

  // ── Soumettre le formulaire ───────────────────────────────────────────────
  async function handleAdd() {
    if (!logementId) { toast.error("Choisissez un logement"); return; }
    if (!icalUrl.trim()) { toast.error("L'URL iCal est requise"); return; }
    if (!icalUrl.startsWith("http://") && !icalUrl.startsWith("https://")) {
      toast.error("L'URL doit commencer par http:// ou https://");
      return;
    }
    try {
      await createSource.mutateAsync({
        logement_id: logementId,
        platform,
        ical_url: icalUrl.trim(),
        type: "ical",
        is_active: true,
        sync_interval_minutes: parseInt(syncMin) || 60,
      });
      toast.success("Source iCal ajoutée avec succès");
      setLogementId(""); setIcalUrl(""); setPlatform("airbnb"); setSyncMin("60");
      setFormTestState({ status: "idle" });
      setShowForm(false);
    } catch (err) {
      toast.error("Erreur lors de l'ajout de la source");
      Sentry.captureException(err);
    }
  }

  async function handleDelete(id: string, name: string) {
    try {
      await deleteSource.mutateAsync(id);
      toast.success(`Source "${name}" supprimée`);
    } catch (err) {
      toast.error("Erreur lors de la suppression");
      Sentry.captureException(err);
    }
  }

  async function handleToggle(id: string, active: boolean) {
    try {
      await toggleSource.mutateAsync({ id, is_active: active });
      toast.success(active ? "Source activée" : "Source désactivée");
    } catch (err) {
      toast.error("Erreur lors de la mise à jour");
      Sentry.captureException(err);
    }
  }

  // ── Groupement par logement ───────────────────────────────────────────────
  const grouped = sources.reduce<Record<string, typeof sources>>((acc, s) => {
    const key = s.logement_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const activeCount   = sources.filter((s) => s.is_active).length;
  const inactiveCount = sources.length - activeCount;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl">

      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Rss className="size-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sources iCal</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isLoading ? "Chargement…" : (
                `${sources.length} source${sources.length > 1 ? "s" : ""} — ${activeCount} active${activeCount > 1 ? "s" : ""}${inactiveCount > 0 ? `, ${inactiveCount} inactive${inactiveCount > 1 ? "s" : ""}` : ""}`
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Synchroniser toutes les sources */}
          {sources.length > 0 && (
            <Button
              variant="outline"
              onClick={() => syncSource()}
              disabled={globalSyncState.status === "loading"}
              className="flex items-center gap-2"
            >
              {globalSyncState.status === "loading"
                ? <Loader2 className="size-4 animate-spin" />
                : <RefreshCw className="size-4" />}
              Synchroniser tout
            </Button>
          )}
          <Button onClick={() => setShowForm((v) => !v)} variant={showForm ? "outline" : "default"}>
            {showForm ? "Annuler" : "+ Ajouter une source"}
          </Button>
        </div>
      </div>

      {/* ── Résultat sync globale ───────────────────────────────────────── */}
      {globalSyncState.status !== "idle" && (
        <div className={`flex items-center gap-2 text-sm font-medium rounded-lg px-4 py-2.5 ${
          globalSyncState.status === "loading" ? "bg-indigo-50 text-indigo-600" :
          globalSyncState.status === "ok"      ? "bg-green-50 text-green-700" :
          "bg-red-50 text-red-600"
        }`}>
          {globalSyncState.status === "loading" && <Loader2 className="size-4 animate-spin" />}
          {globalSyncState.status === "ok"      && <CheckCircle2 className="size-4" />}
          {globalSyncState.status === "err"     && <XCircle className="size-4" />}
          {globalSyncState.status === "loading"
            ? "Synchronisation en cours…"
            : globalSyncState.message}
        </div>
      )}

      {/* ── Formulaire d'ajout ──────────────────────────────────────────── */}
      {showForm && (
        <div className="bg-white border rounded-xl shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Nouvelle source iCal</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Logement */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Logement *</label>
              <select
                value={logementId}
                onChange={(e) => setLogementId(e.target.value)}
                className="rounded-lg border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Choisir un logement —</option>
                {logLoading && <option disabled>Chargement…</option>}
                {logements.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}{l.city ? ` — ${l.city}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Plateforme */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Plateforme *</label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPlatform(p.value)}
                    className={[
                      "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                      platform === p.value
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-blue-300",
                    ].join(" ")}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* URL iCal */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">URL iCal *</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={icalUrl}
                onChange={(e) => { setIcalUrl(e.target.value); setFormTestState({ status: "idle" }); }}
                placeholder="https://www.airbnb.com/calendar/ical/..."
                className="flex-1 rounded-lg border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
              />
              <button
                onClick={() => testUrl(icalUrl, "form", setFormTestState)}
                disabled={!icalUrl || formTestState.status === "loading"}
                className="flex items-center gap-1.5 text-sm font-medium border rounded-lg px-3 py-2 transition-colors disabled:opacity-40 bg-white border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                {formTestState.status === "loading"
                  ? <Loader2 className="size-4 animate-spin" />
                  : "Tester"}
              </button>
            </div>

            {/* Résultat test URL formulaire */}
            {formTestState.status === "ok" && (
              <p className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                <CheckCircle2 className="size-3.5" /> {formTestState.message}
              </p>
            )}
            {formTestState.status === "err" && (
              <p className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
                <XCircle className="size-3.5" /> {formTestState.message}
              </p>
            )}
          </div>

          {/* Intervalle de sync */}
          <div className="flex flex-col gap-1.5 max-w-xs">
            <label className="text-sm font-medium text-gray-700">
              Intervalle de synchronisation (minutes)
            </label>
            <select
              value={syncMin}
              onChange={(e) => setSyncMin(e.target.value)}
              className="rounded-lg border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="15">Toutes les 15 min</option>
              <option value="30">Toutes les 30 min</option>
              <option value="60">Toutes les heures</option>
              <option value="360">Toutes les 6 heures</option>
              <option value="1440">Une fois par jour</option>
            </select>
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              onClick={handleAdd}
              disabled={createSource.isPending || !logementId || !icalUrl}
            >
              {createSource.isPending ? (
                <><Loader2 className="size-4 mr-2 animate-spin" />Ajout en cours…</>
              ) : "Ajouter la source"}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      {/* ── Liste des sources ────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : sources.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <p className="text-4xl mb-3">📡</p>
          <p className="font-medium text-gray-700">Aucune source iCal configurée</p>
          <p className="text-sm text-muted-foreground mt-1">
            Ajoutez une source pour synchroniser les réservations Airbnb, Booking…
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 text-sm text-blue-600 hover:underline"
          >
            + Ajouter la première source
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([logementId, groupSources]) => {
            const logName = groupSources[0]?.logement?.name ?? "Logement inconnu";
            const logCity = groupSources[0]?.logement?.city;
            return (
              <div key={logementId} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                {/* En-tête du groupe logement */}
                <div className="bg-slate-50 border-b px-4 py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-sm text-gray-900">{logName}</span>
                    {logCity && <span className="text-xs text-muted-foreground ml-2">{logCity}</span>}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {groupSources.length} source{groupSources.length > 1 ? "s" : ""}
                  </span>
                </div>

                {/* Sources du logement */}
                <div className="divide-y">
                  {groupSources.map((source) => {
                    const ts = testStates[source.id] ?? { status: "idle" };
                    const ss = syncStates[source.id] ?? { status: "idle" };
                    return (
                      <div key={source.id}>
                        <SourceRow
                          source={source}
                          onDelete={() => handleDelete(source.id, logName)}
                          onToggle={(active) => handleToggle(source.id, active)}
                          onTest={() =>
                            testUrl(
                              source.ical_url ?? "",
                              source.id,
                              (s) => setSourceTestState(source.id, s)
                            )
                          }
                          onSync={() => syncSource(source.id)}
                        />
                        {/* Résultat du test pour cette source */}
                        {ts.status !== "idle" && (
                          <div className={`px-4 pb-2 flex items-center gap-2 text-xs font-medium ${ts.status === "loading" ? "text-slate-500" : ts.status === "ok" ? "text-green-600" : "text-red-500"}`}>
                            {ts.status === "loading" && <Loader2 className="size-3.5 animate-spin" />}
                            {ts.status === "ok"      && <CheckCircle2 className="size-3.5" />}
                            {ts.status === "err"     && <XCircle className="size-3.5" />}
                            {ts.status === "loading" ? "Test en cours…" : ts.message}
                          </div>
                        )}
                        {/* Résultat de la sync pour cette source */}
                        {ss.status !== "idle" && (
                          <div className={`px-4 pb-3 flex items-center gap-2 text-xs font-medium ${ss.status === "loading" ? "text-indigo-500" : ss.status === "ok" ? "text-green-600" : "text-red-500"}`}>
                            {ss.status === "loading" && <Loader2 className="size-3.5 animate-spin" />}
                            {ss.status === "ok"      && <RefreshCw className="size-3.5" />}
                            {ss.status === "err"     && <XCircle className="size-3.5" />}
                            {ss.status === "loading" ? "Synchronisation en cours…" : ss.message}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
