"use client";

// Estimations admin — simulateur de coût d'une intervention en temps réel.
// Sélectionner un logement pré-remplit les prix depuis la DB.
// Tous les champs sont modifiables pour ajuster la simulation.
// Les calculs utilisent calculateInterventionGain() depuis finance.ts.

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calculator, TrendingUp, ArrowRight } from "lucide-react";

import { useLogements } from "@/lib/hooks/useLogements";
import { calculateInterventionGain } from "@/lib/utils/finance";
import { Button } from "@/components/ui/button";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrix(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style:                 "currency",
    currency:              "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

const TYPE_OPTIONS = [
  { value: "menage",      label: "Ménage" },
  { value: "etat_lieux",  label: "État des lieux" },
  { value: "maintenance", label: "Maintenance" },
] as const;

// ─── Champ de saisie numérique ────────────────────────────────────────────────

function PriceInput({
  id,
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      {hint && <p className="text-xs text-muted-foreground -mt-1">{hint}</p>}
      <div className="relative">
        <input
          id={id}
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={[
            "w-full rounded-lg border px-3 py-2 text-sm shadow-sm",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors",
            disabled
              ? "bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200"
              : "bg-white border-input",
            "pr-10",
          ].join(" ")}
          placeholder="0.00"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
          €
        </span>
      </div>
    </div>
  );
}

// ─── Ligne de résultat ───────────────────────────────────────────────────────

function ResultLine({
  label,
  value,
  valueClass,
  sub,
}: {
  label: string;
  value: string;
  valueClass?: string;
  sub?: boolean;
}) {
  return (
    <div className={[
      "flex items-center justify-between py-1.5",
      sub ? "text-sm text-muted-foreground" : "text-sm font-medium text-gray-800",
    ].join(" ")}>
      <span>{label}</span>
      <span className={valueClass ?? ""}>{value}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminEstimationsPage() {
  const router = useRouter();
  const { data: logements, isLoading: logLoading } = useLogements();

  // ── État du formulaire ────────────────────────────────────────────────────
  const [logementId,         setLogementId]         = useState("");
  const [type,               setType]               = useState<string>("menage");
  const [blanchisserie,      setBlanchisserie]      = useState(false);
  const [prixClientStr,      setPrixClientStr]      = useState("");
  const [prixPrestaStr,      setPrixPrestaStr]      = useState("");
  const [prixBlanStr,        setPrixBlanStr]        = useState("");

  // ── Pré-remplissage quand un logement est sélectionné ────────────────────
  useEffect(() => {
    if (!logementId) {
      setPrixClientStr("");
      setPrixPrestaStr("");
      setPrixBlanStr("");
      setBlanchisserie(false);
      return;
    }
    const l = logements?.find((lo) => lo.id === logementId);
    if (!l) return;
    setPrixClientStr(l.prix_client_ttc  != null ? String(l.prix_client_ttc)  : "");
    setPrixPrestaStr(l.prix_prestataire_ht != null ? String(l.prix_prestataire_ht) : "");
    setPrixBlanStr(l.prix_blanchisserie  != null ? String(l.prix_blanchisserie)  : "");
    // Active auto la blanchisserie si le logement a un prix configuré
    setBlanchisserie(l.prix_blanchisserie != null && l.prix_blanchisserie > 0);
  }, [logementId, logements]);

  // ── Valeurs numériques parsées ────────────────────────────────────────────
  const prixClient = parseFloat(prixClientStr) || 0;
  const prixPresta = parseFloat(prixPrestaStr) || 0;
  const prixBlan   = parseFloat(prixBlanStr)   || 0;

  // ── Calcul du gain via finance.ts ─────────────────────────────────────────
  const simulation = useMemo(() => {
    const gain = calculateInterventionGain({
      prix_client_ttc:     prixClient,
      prix_prestataire_ht: prixPresta,
      blanchisserie_incluse: blanchisserie,
      prix_blanchisserie:  blanchisserie ? prixBlan : 0,
    });

    const totalClient = prixClient + (blanchisserie ? prixBlan : 0);
    const marge = totalClient > 0 ? (gain / totalClient) * 100 : 0;

    return { gain, totalClient, marge };
  }, [prixClient, prixPresta, blanchisserie, prixBlan]);

  const margeOk  = simulation.marge >= 20;
  const margeWarn = simulation.marge > 0 && simulation.marge < 20;
  const margeBad  = simulation.gain < 0;

  const logementActuel = logements?.find((l) => l.id === logementId);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">

      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-50 rounded-lg">
          <Calculator className="size-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estimations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Simulez le coût et la marge d&apos;une intervention
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_320px] gap-6 items-start">

        {/* ── Formulaire ────────────────────────────────────────────────── */}
        <div className="space-y-5 bg-white rounded-xl border shadow-sm p-5">

          {/* Logement */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="logement" className="text-sm font-medium text-gray-700">
              Logement
            </label>
            <select
              id="logement"
              value={logementId}
              onChange={(e) => setLogementId(e.target.value)}
              className="rounded-lg border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Choisir un logement —</option>
              {logLoading && <option disabled>Chargement…</option>}
              {(logements ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                  {l.city ? ` — ${l.city}` : ""}
                </option>
              ))}
            </select>
            {logementActuel?.client && (
              <p className="text-xs text-muted-foreground">
                Client : {logementActuel.client.full_name}
              </p>
            )}
          </div>

          {/* Type d'intervention */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Type d&apos;intervention
            </label>
            <div className="flex gap-2 flex-wrap">
              {TYPE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setType(o.value)}
                  className={[
                    "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                    type === o.value
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-blue-300",
                  ].join(" ")}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Prix client TTC */}
          <PriceInput
            id="prix-client"
            label="Prix client TTC"
            hint="Ce que le client paie pour le ménage"
            value={prixClientStr}
            onChange={setPrixClientStr}
          />

          {/* Prix prestataire HT */}
          <PriceInput
            id="prix-presta"
            label="Prix prestataire HT"
            hint="Ce que vous versez au prestataire"
            value={prixPrestaStr}
            onChange={setPrixPrestaStr}
          />

          <hr className="border-gray-100" />

          {/* Blanchisserie */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={blanchisserie}
                  onChange={(e) => setBlanchisserie(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-checked:bg-blue-600 rounded-full transition-colors peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-1" />
                <div className="absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-5 shadow-sm" />
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Blanchisserie incluse</span>
                {logementActuel?.type_blanchisserie && (
                  <p className="text-xs text-muted-foreground">
                    Type : {logementActuel.type_blanchisserie}
                  </p>
                )}
              </div>
            </label>

            {blanchisserie && (
              <PriceInput
                id="prix-blan"
                label="Prix blanchisserie"
                hint="Ajouté à la facture client"
                value={prixBlanStr}
                onChange={setPrixBlanStr}
              />
            )}
          </div>
        </div>

        {/* ── Résultat ──────────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Carte résultat principal */}
          <div className={[
            "rounded-xl border shadow-sm p-5 space-y-3 transition-colors",
            margeBad  ? "bg-red-50 border-red-200"
            : margeWarn ? "bg-amber-50 border-amber-200"
            : margeOk   ? "bg-green-50 border-green-200"
            : "bg-white border-gray-200",
          ].join(" ")}>

            {/* Gain / marge */}
            <div className="text-center py-2">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <TrendingUp className={[
                  "size-4",
                  margeBad ? "text-red-500" : margeWarn ? "text-amber-500" : "text-green-600",
                ].join(" ")} />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Marge nette
                </span>
              </div>
              <p className={[
                "text-4xl font-bold",
                margeBad  ? "text-red-600"
                : margeWarn ? "text-amber-600"
                : "text-green-700",
              ].join(" ")}>
                {formatPrix(simulation.gain)}
              </p>
              <p className={[
                "text-sm mt-1 font-medium",
                margeBad  ? "text-red-500"
                : margeWarn ? "text-amber-500"
                : "text-green-600",
              ].join(" ")}>
                {simulation.marge > 0 || simulation.gain !== 0
                  ? `${simulation.marge.toFixed(1)} % de marge`
                  : "Renseignez les prix pour simuler"}
              </p>
            </div>

            <hr className={margeBad ? "border-red-200" : margeWarn ? "border-amber-200" : "border-green-200"} />

            {/* Détail */}
            <div className="space-y-0.5">
              <ResultLine
                label="Prix client TTC"
                value={formatPrix(prixClient)}
                sub
              />
              {blanchisserie && (
                <ResultLine
                  label="+ Blanchisserie"
                  value={formatPrix(prixBlan)}
                  sub
                />
              )}
              <ResultLine
                label="Total encaissé"
                value={formatPrix(simulation.totalClient)}
                valueClass="font-semibold"
              />

              <div className="my-1.5" />

              <ResultLine
                label="− Prestataire HT"
                value={formatPrix(prixPresta)}
                sub
                valueClass="text-red-500"
              />

              <div className="h-px bg-gray-200 my-1.5" />

              <ResultLine
                label="= Gain net Deltom"
                value={formatPrix(simulation.gain)}
                valueClass={[
                  "font-bold",
                  margeBad ? "text-red-600" : margeWarn ? "text-amber-600" : "text-green-700",
                ].join(" ")}
              />
            </div>
          </div>

          {/* Alerte marge faible */}
          {margeBad && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600">
              ⚠️ <strong>Marge négative</strong> — le prestataire coûte plus cher que ce que le client paie.
            </div>
          )}
          {margeWarn && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-600">
              ⚠️ <strong>Marge faible</strong> — en dessous de 20 %. Pensez à revoir les prix.
            </div>
          )}

          {/* Bouton créer l'intervention */}
          {logementId && prixClient > 0 && (
            <Button
              className="w-full"
              onClick={() => {
                const params = new URLSearchParams({
                  logement_id:         logementId,
                  type,
                  prix_client_ttc:     String(prixClient),
                  prix_prestataire_ht: String(prixPresta),
                  ...(blanchisserie && { prix_blanchisserie: String(prixBlan) }),
                });
                router.push(`/admin/interventions/nouvelle?${params.toString()}`);
              }}
            >
              Créer l&apos;intervention
              <ArrowRight className="size-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
