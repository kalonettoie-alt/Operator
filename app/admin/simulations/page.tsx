"use client";

// Simulations admin — 3 onglets :
//   1. Par intervention : calcul marge en temps réel (logement → prix → blanchisserie)
//   2. Par logement : rentabilité mensuelle/annuelle selon nb interventions
//   3. Croissance : projections CA/gain/prestataires selon taille du parc (slider)
// Toutes les fonctions de calcul viennent de lib/utils/finance.ts.

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calculator, TrendingUp, BarChart2, ArrowRight } from "lucide-react";

import { useLogements } from "@/lib/hooks/useLogements";
import {
  calculateInterventionGain,
  simulateLogementRevenue,
  simulateCroissance,
} from "@/lib/utils/finance";
import { Button } from "@/components/ui/button";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtEur(v: number, decimals = 0) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: "EUR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(v);
}

const TYPE_OPTIONS = [
  { value: "menage",      label: "Ménage" },
  { value: "etat_lieux",  label: "État des lieux" },
  { value: "maintenance", label: "Maintenance" },
] as const;

// ─── Composants partagés ──────────────────────────────────────────────────────

function PriceInput({
  id, label, hint, value, onChange, disabled,
}: {
  id: string; label: string; hint?: string;
  value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</label>
      {hint && <p className="text-xs text-muted-foreground -mt-1">{hint}</p>}
      <div className="relative">
        <input
          id={id} type="number" min="0" step="0.01" value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="0.00"
          className={[
            "w-full rounded-lg border px-3 py-2 text-sm shadow-sm pr-8",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors",
            disabled ? "bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200" : "bg-white border-input",
          ].join(" ")}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">€</span>
      </div>
    </div>
  );
}

function ResultBox({
  label, value, sub, accent,
}: {
  label: string; value: string; sub?: string; accent?: "green" | "blue" | "red" | "amber";
}) {
  const colors = {
    green: "bg-green-50 border-green-200 text-green-700",
    blue:  "bg-blue-50 border-blue-200 text-blue-700",
    red:   "bg-red-50 border-red-200 text-red-600",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
  };
  const cls = accent ? colors[accent] : "bg-slate-50 border-slate-200 text-slate-700";
  return (
    <div className={`rounded-xl border p-3 ${cls}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-xl font-bold mt-0.5">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

function ResultLine({ label, value, valueClass, dimmed }: {
  label: string; value: string; valueClass?: string; dimmed?: boolean;
}) {
  return (
    <div className={`flex justify-between py-1.5 text-sm ${dimmed ? "text-muted-foreground" : "font-medium text-gray-800"}`}>
      <span>{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

// ─── Onglet 1 : Simulateur par intervention ───────────────────────────────────

function SimulateurIntervention() {
  const router = useRouter();
  const { data: logements, isLoading: logLoading } = useLogements();

  const [logementId,    setLogementId]    = useState("");
  const [type,          setType]          = useState("menage");
  const [blanchisserie, setBlanchisserie] = useState(false);
  const [prixClientStr, setPrixClientStr] = useState("");
  const [prixPrestaStr, setPrixPrestaStr] = useState("");
  const [prixBlanStr,   setPrixBlanStr]   = useState("");

  useEffect(() => {
    if (!logementId) {
      setPrixClientStr(""); setPrixPrestaStr(""); setPrixBlanStr(""); setBlanchisserie(false);
      return;
    }
    const l = logements?.find((lo) => lo.id === logementId);
    if (!l) return;
    setPrixClientStr(l.prix_client_ttc      != null ? String(l.prix_client_ttc)      : "");
    setPrixPrestaStr(l.prix_prestataire_ht  != null ? String(l.prix_prestataire_ht)  : "");
    setPrixBlanStr(l.prix_blanchisserie     != null ? String(l.prix_blanchisserie)   : "");
    setBlanchisserie((l.prix_blanchisserie ?? 0) > 0);
  }, [logementId, logements]);

  const prixClient = parseFloat(prixClientStr) || 0;
  const prixPresta = parseFloat(prixPrestaStr) || 0;
  const prixBlan   = parseFloat(prixBlanStr)   || 0;

  const sim = useMemo(() => {
    const gain = calculateInterventionGain({
      prix_client_ttc: prixClient, prix_prestataire_ht: prixPresta,
      blanchisserie_incluse: blanchisserie, prix_blanchisserie: blanchisserie ? prixBlan : 0,
    });
    const totalClient = prixClient + (blanchisserie ? prixBlan : 0);
    const marge = totalClient > 0 ? (gain / totalClient) * 100 : 0;
    return { gain, totalClient, marge };
  }, [prixClient, prixPresta, blanchisserie, prixBlan]);

  const margeBad  = sim.gain < 0;
  const margeWarn = sim.marge > 0 && sim.marge < 20;
  const margeOk   = sim.marge >= 20;
  const logActuel = logements?.find((l) => l.id === logementId);

  return (
    <div className="grid md:grid-cols-[1fr_300px] gap-6 items-start">
      {/* Formulaire */}
      <div className="bg-white rounded-xl border shadow-sm p-5 space-y-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Logement</label>
          <select
            value={logementId} onChange={(e) => setLogementId(e.target.value)}
            className="rounded-lg border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Choisir —</option>
            {logLoading && <option disabled>Chargement…</option>}
            {(logements ?? []).map((l) => (
              <option key={l.id} value={l.id}>{l.name}{l.city ? ` — ${l.city}` : ""}</option>
            ))}
          </select>
          {logActuel?.client && (
            <p className="text-xs text-muted-foreground">Client : {logActuel.client.full_name}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Type</label>
          <div className="flex gap-2 flex-wrap">
            {TYPE_OPTIONS.map((o) => (
              <button key={o.value} onClick={() => setType(o.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${type === o.value ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <hr className="border-gray-100" />
        <PriceInput id="i-client" label="Prix client TTC" value={prixClientStr} onChange={setPrixClientStr} />
        <PriceInput id="i-presta" label="Prix prestataire HT" value={prixPrestaStr} onChange={setPrixPrestaStr} />
        <hr className="border-gray-100" />

        {/* Toggle blanchisserie */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input type="checkbox" checked={blanchisserie} onChange={(e) => setBlanchisserie(e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-checked:bg-blue-600 rounded-full transition-colors peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-1" />
            <div className="absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-5 shadow-sm" />
          </div>
          <span className="text-sm font-medium text-gray-700">Blanchisserie incluse</span>
        </label>
        {blanchisserie && (
          <PriceInput id="i-blan" label="Prix blanchisserie" value={prixBlanStr} onChange={setPrixBlanStr} />
        )}
      </div>

      {/* Résultat */}
      <div className="space-y-3">
        <div className={`rounded-xl border shadow-sm p-5 space-y-3 transition-colors ${margeBad ? "bg-red-50 border-red-200" : margeWarn ? "bg-amber-50 border-amber-200" : margeOk ? "bg-green-50 border-green-200" : "bg-white"}`}>
          <div className="text-center py-2">
            <p className="text-4xl font-bold" style={{ color: margeBad ? "#dc2626" : margeWarn ? "#d97706" : sim.gain !== 0 ? "#15803d" : "#374151" }}>
              {fmtEur(sim.gain, 2)}
            </p>
            <p className="text-sm mt-1 font-medium text-muted-foreground">
              {sim.marge !== 0 ? `${sim.marge.toFixed(1)} % de marge` : "Renseignez les prix"}
            </p>
          </div>
          <hr />
          <div className="space-y-0.5">
            <ResultLine label="Prix client TTC" value={fmtEur(prixClient, 2)} dimmed />
            {blanchisserie && <ResultLine label="+ Blanchisserie" value={fmtEur(prixBlan, 2)} dimmed />}
            <ResultLine label="Total encaissé" value={fmtEur(sim.totalClient, 2)} />
            <div className="my-1" />
            <ResultLine label="− Prestataire HT" value={fmtEur(prixPresta, 2)} dimmed valueClass="text-red-500" />
            <hr className="border-gray-200" />
            <ResultLine
              label="= Gain net"
              value={fmtEur(sim.gain, 2)}
              valueClass={`font-bold ${margeBad ? "text-red-600" : margeWarn ? "text-amber-600" : "text-green-700"}`}
            />
          </div>
        </div>

        {margeBad  && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600">⚠️ <strong>Marge négative</strong></div>}
        {margeWarn && <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-600">⚠️ <strong>Marge faible</strong> — en dessous de 20 %</div>}

        {logementId && prixClient > 0 && (
          <Button className="w-full" onClick={() => {
            const p = new URLSearchParams({
              logement_id: logementId, type,
              prix_client_ttc: String(prixClient),
              prix_prestataire_ht: String(prixPresta),
              ...(blanchisserie && { prix_blanchisserie: String(prixBlan) }),
            });
            router.push(`/admin/interventions/nouvelle?${p}`);
          }}>
            Créer l&apos;intervention <ArrowRight className="size-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Onglet 2 : Simulateur par logement ──────────────────────────────────────

function SimulateurLogement() {
  const { data: logements, isLoading } = useLogements();

  const [logementId,     setLogementId]     = useState("");
  const [nbIntStr,       setNbIntStr]       = useState("4");
  const [prixClientStr,  setPrixClientStr]  = useState("");
  const [prixPrestaStr,  setPrixPrestaStr]  = useState("");
  const [blanchisserie,  setBlanchisserie]  = useState(false);
  const [prixBlanStr,    setPrixBlanStr]    = useState("");

  useEffect(() => {
    if (!logementId) return;
    const l = logements?.find((lo) => lo.id === logementId);
    if (!l) return;
    setPrixClientStr(l.prix_client_ttc     != null ? String(l.prix_client_ttc)     : "");
    setPrixPrestaStr(l.prix_prestataire_ht != null ? String(l.prix_prestataire_ht) : "");
    setPrixBlanStr(l.prix_blanchisserie    != null ? String(l.prix_blanchisserie)  : "");
    setBlanchisserie((l.prix_blanchisserie ?? 0) > 0);
  }, [logementId, logements]);

  const result = useMemo(() => simulateLogementRevenue({
    prix_client_ttc:       parseFloat(prixClientStr) || 0,
    prix_prestataire_ht:   parseFloat(prixPrestaStr) || 0,
    nb_interventions_mois: parseInt(nbIntStr)         || 0,
    blanchisserie_incluse: blanchisserie,
    prix_blanchisserie:    parseFloat(prixBlanStr)   || 0,
  }), [prixClientStr, prixPrestaStr, nbIntStr, blanchisserie, prixBlanStr]);

  const margeColor: "green" | "amber" | "red" =
    result.gainMensuel < 0 ? "red" : result.margePercent < 20 ? "amber" : "green";

  return (
    <div className="grid md:grid-cols-[1fr_300px] gap-6 items-start">
      {/* Formulaire */}
      <div className="bg-white rounded-xl border shadow-sm p-5 space-y-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Logement</label>
          <select
            value={logementId} onChange={(e) => setLogementId(e.target.value)}
            className="rounded-lg border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Choisir (optionnel) —</option>
            {isLoading && <option disabled>Chargement…</option>}
            {(logements ?? []).map((l) => (
              <option key={l.id} value={l.id}>{l.name}{l.city ? ` — ${l.city}` : ""}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">
            Interventions par mois
            <span className="ml-2 text-blue-600 font-bold">{nbIntStr}</span>
          </label>
          <input
            type="range" min="1" max="20" value={nbIntStr}
            onChange={(e) => setNbIntStr(e.target.value)}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1</span><span>5</span><span>10</span><span>15</span><span>20</span>
          </div>
        </div>

        <hr className="border-gray-100" />
        <PriceInput id="l-client" label="Prix client TTC" value={prixClientStr} onChange={setPrixClientStr} />
        <PriceInput id="l-presta" label="Prix prestataire HT" value={prixPrestaStr} onChange={setPrixPrestaStr} />
        <hr className="border-gray-100" />

        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input type="checkbox" checked={blanchisserie} onChange={(e) => setBlanchisserie(e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-checked:bg-blue-600 rounded-full transition-colors peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-1" />
            <div className="absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-5 shadow-sm" />
          </div>
          <span className="text-sm font-medium text-gray-700">Blanchisserie incluse</span>
        </label>
        {blanchisserie && (
          <PriceInput id="l-blan" label="Prix blanchisserie" value={prixBlanStr} onChange={setPrixBlanStr} />
        )}
      </div>

      {/* Résultats */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <ResultBox label="Revenu mensuel" value={fmtEur(result.revenuMensuel)} accent="blue" />
          <ResultBox label="Coût mensuel" value={fmtEur(result.coutMensuel)} />
        </div>
        <ResultBox
          label="Gain mensuel"
          value={fmtEur(result.gainMensuel)}
          sub={`${result.margePercent.toFixed(1)} % de marge`}
          accent={margeColor}
        />
        <ResultBox
          label="Gain annuel projeté"
          value={fmtEur(result.gainAnnuel)}
          sub="× 12 mois"
          accent={margeColor}
        />
        {result.gainMensuel < 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600">
            ⚠️ <strong>Marge négative</strong> — ajustez les prix
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Onglet 3 : Simulateur de croissance ─────────────────────────────────────

function SimulateurCroissance() {
  const [nbLogements,   setNbLogements]   = useState(10);
  const [nbIntStr,      setNbIntStr]      = useState("4");
  const [prixClientStr, setPrixClientStr] = useState("80");
  const [prixPrestaStr, setPrixPrestaStr] = useState("50");
  const [maxDailyStr,   setMaxDailyStr]   = useState("3");

  const result = useMemo(() => simulateCroissance({
    nbLogements,
    interventionsMoyennesParLogementMois: parseInt(nbIntStr)       || 0,
    prixMoyenClient:                      parseFloat(prixClientStr) || 0,
    prixMoyenPrestataire:                 parseFloat(prixPrestaStr) || 0,
    maxDailyInterventionsParPresta:       parseInt(maxDailyStr)     || 0,
  }), [nbLogements, nbIntStr, prixClientStr, prixPrestaStr, maxDailyStr]);

  const margeColor: "green" | "amber" | "red" =
    result.gainMensuel < 0 ? "red" : result.margePercent < 20 ? "amber" : "green";

  return (
    <div className="grid md:grid-cols-[1fr_320px] gap-6 items-start">
      {/* Paramètres */}
      <div className="bg-white rounded-xl border shadow-sm p-5 space-y-6">

        {/* Slider nombre de logements */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">
            Nombre de logements
            <span className="ml-2 text-2xl font-bold text-blue-600">{nbLogements}</span>
          </label>
          <input
            type="range" min="1" max="200" step="1" value={nbLogements}
            onChange={(e) => setNbLogements(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1</span><span>50</span><span>100</span><span>150</span><span>200</span>
          </div>
        </div>

        <hr className="border-gray-100" />

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Interventions moy./logement/mois
            </label>
            <input
              type="number" min="0" step="1" value={nbIntStr}
              onChange={(e) => setNbIntStr(e.target.value)}
              className="rounded-lg border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Max missions/jour/prestataire
            </label>
            <input
              type="number" min="1" step="1" value={maxDailyStr}
              onChange={(e) => setMaxDailyStr(e.target.value)}
              className="rounded-lg border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <hr className="border-gray-100" />

        <div className="grid grid-cols-2 gap-4">
          <PriceInput id="g-client" label="Prix moyen client (TTC)" value={prixClientStr} onChange={setPrixClientStr} />
          <PriceInput id="g-presta" label="Prix moyen prestataire (HT)" value={prixPrestaStr} onChange={setPrixPrestaStr} />
        </div>
      </div>

      {/* Projections */}
      <div className="space-y-3">
        <div className="bg-slate-50 border rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Interventions / mois</p>
          <p className="text-3xl font-bold text-slate-700">{result.totalInterventionsMois.toLocaleString("fr-FR")}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <ResultBox label="CA mensuel" value={fmtEur(result.caMensuel)} accent="blue" />
          <ResultBox label="Coût mensuel" value={fmtEur(result.coutMensuel)} />
        </div>

        <ResultBox
          label="Gain mensuel"
          value={fmtEur(result.gainMensuel)}
          sub={`${result.margePercent.toFixed(1)} % de marge`}
          accent={margeColor}
        />

        <div className="grid grid-cols-2 gap-2">
          <ResultBox label="CA annuel" value={fmtEur(result.caAnnuel)} accent="blue" />
          <ResultBox label="Gain annuel" value={fmtEur(result.gainAnnuel)} accent={margeColor} />
        </div>

        <div className={`rounded-xl border p-4 ${result.nbPrestatairesNecessaires > 5 ? "bg-amber-50 border-amber-200" : "bg-white"}`}>
          <p className="text-xs font-medium text-muted-foreground">Prestataires nécessaires</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{result.nbPrestatairesNecessaires}</p>
          <p className="text-xs text-muted-foreground mt-1">
            basé sur {maxDailyStr} missions/jour × 26 jours ouvrés
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "intervention", label: "Par intervention", icon: Calculator },
  { id: "logement",     label: "Par logement",     icon: TrendingUp },
  { id: "croissance",   label: "Croissance",        icon: BarChart2  },
] as const;

type TabId = typeof TABS[number]["id"];

export default function AdminSimulationsPage() {
  const [tab, setTab] = useState<TabId>("intervention");

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-50 rounded-lg">
          <Calculator className="size-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Simulations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Calculateurs de rentabilité</p>
        </div>
      </div>

      {/* ── Onglets ─────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={[
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-slate-500 hover:text-gray-700",
            ].join(" ")}
          >
            <Icon className="size-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Contenu ─────────────────────────────────────────────────────── */}
      {tab === "intervention" && <SimulateurIntervention />}
      {tab === "logement"     && <SimulateurLogement />}
      {tab === "croissance"   && <SimulateurCroissance />}
    </div>
  );
}
