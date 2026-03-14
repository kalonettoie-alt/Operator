"use client";

// Estimations admin — prévisions mensuelles.
// 4 sections : KPIs, charge prestataires, revenus par client, trésorerie.
// Sélecteur de mois avec comparaison mois précédent.

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";

import { useInterventions, type InterventionWithRelations } from "@/lib/hooks/useInterventions";
import { usePrestataires } from "@/lib/hooks/useProfiles";
import { useLogements } from "@/lib/hooks/useLogements";
import { countWorkingDaysInMonth } from "@/lib/utils/finance";
import { INTERVENTION_STATUSES, type InterventionStatus } from "@/types/enums";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MOIS_FR = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];

function fmtEur(v: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: "EUR", maximumFractionDigits: 0,
  }).format(v);
}

function fmtPct(v: number) {
  return `${v.toFixed(1)} %`;
}

/** Calcule le delta relatif entre current et prev en pourcent */
function delta(current: number, prev: number): { pct: number; up: boolean; neutral: boolean } {
  if (prev === 0) return { pct: 0, up: true, neutral: true };
  const pct = ((current - prev) / Math.abs(prev)) * 100;
  return { pct: Math.abs(pct), up: pct >= 0, neutral: Math.abs(pct) < 0.5 };
}

/** Computes dateFrom/dateTo for a given year/month (1-12) */
function monthBounds(year: number, month: number) {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

/** Calcule les statuts "actifs" (hors annulée) */
const STATUTS_ACTIFS: string[] = [
  INTERVENTION_STATUSES.A_ATTRIBUER,
  INTERVENTION_STATUSES.ASSIGNEE,
  INTERVENTION_STATUSES.ACCEPTEE,
  INTERVENTION_STATUSES.EN_COURS,
  INTERVENTION_STATUSES.TERMINEE,
];

const STATUTS_ASSIGNES: string[] = [
  INTERVENTION_STATUSES.ASSIGNEE,
  INTERVENTION_STATUSES.ACCEPTEE,
  INTERVENTION_STATUSES.EN_COURS,
  INTERVENTION_STATUSES.TERMINEE,
];

// ─── Calculs KPI ──────────────────────────────────────────────────────────────

function computeKPIs(interventions: InterventionWithRelations[]) {
  const actives = interventions.filter((i) => STATUTS_ACTIFS.includes(i.status));
  const total = actives.length;
  const assignes = actives.filter((i) => STATUTS_ASSIGNES.includes(i.status)).length;
  const tauxAssignation = total > 0 ? (assignes / total) * 100 : 0;

  const revenu = interventions.reduce((s, i) => {
    if (!STATUTS_ACTIFS.includes(i.status)) return s;
    return s + (i.prix_client_ttc ?? 0) + (i.blanchisserie_incluse ? (i.prix_blanchisserie ?? 0) : 0);
  }, 0);

  const cout = interventions.reduce((s, i) => {
    if (!STATUTS_ACTIFS.includes(i.status)) return s;
    return s + (i.prix_prestataire_ht ?? 0);
  }, 0);

  return { total, tauxAssignation, revenu, cout, gain: revenu - cout };
}

// ─── Composants UI ────────────────────────────────────────────────────────────

function KPICard({
  label, value, sub, delta: d, colored,
}: {
  label: string; value: string; sub?: string;
  delta?: ReturnType<typeof delta> & { text: string }; colored?: "green" | "red" | "blue";
}) {
  const bg = colored === "green" ? "bg-green-50 border-green-200"
    : colored === "red" ? "bg-red-50 border-red-200"
    : "bg-white";

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${bg}`}>
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colored === "green" ? "text-green-700" : colored === "red" ? "text-red-600" : "text-gray-900"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      {d && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${d.neutral ? "text-gray-400" : d.up ? "text-green-600" : "text-red-500"}`}>
          {d.neutral ? <Minus className="size-3" /> : d.up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
          {d.neutral ? "stable" : `${d.up ? "+" : "−"}${d.pct.toFixed(1)} % vs mois préc.`}
        </div>
      )}
    </div>
  );
}

function SectionTitle({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h2 className="text-base font-bold text-gray-900">{title}</h2>
      {count !== undefined && (
        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
          {count}
        </span>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminEstimationsPage() {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12

  // ── Mois précédent ────────────────────────────────────────────────────────
  const prevYear  = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;

  const { from: dateFrom, to: dateTo }         = monthBounds(year, month);
  const { from: prevFrom, to: prevTo }         = monthBounds(prevYear, prevMonth);

  // ── Données ───────────────────────────────────────────────────────────────
  const { data: current = [], isLoading: loadCur } = useInterventions({ dateFrom, dateTo });
  const { data: prev    = []                       } = useInterventions({ dateFrom: prevFrom, dateTo: prevTo });
  const { data: prestataires = []                  } = usePrestataires();
  const { data: logements    = []                  } = useLogements();

  // ── Navigation mois ───────────────────────────────────────────────────────
  function prevM() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextM() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpi     = useMemo(() => computeKPIs(current), [current]);
  const kpiPrev = useMemo(() => computeKPIs(prev),    [prev]);

  // ── Charge par prestataire ────────────────────────────────────────────────
  const workDays = useMemo(() => countWorkingDaysInMonth(year, month), [year, month]);

  const chargePrestataires = useMemo(() => {
    // Grouper les interventions du mois par prestataire_id
    const byPresta = new Map<string, { count: number; ca: number }>();
    current.forEach((i) => {
      if (!i.prestataire_id || i.status === INTERVENTION_STATUSES.ANNULEE) return;
      const prev = byPresta.get(i.prestataire_id) ?? { count: 0, ca: 0 };
      byPresta.set(i.prestataire_id, {
        count: prev.count + 1,
        ca:    prev.ca + (i.prix_prestataire_ht ?? 0),
      });
    });

    return prestataires.map((p) => {
      const stats    = byPresta.get(p.id) ?? { count: 0, ca: 0 };
      const capacity = (p.max_daily_interventions ?? 2) * workDays;
      const chargePct = capacity > 0 ? (stats.count / capacity) * 100 : 0;
      const badge =
        chargePct > 100 ? "surchargé"    :
        chargePct >= 60 ? "optimal"       :
        "sous-utilisé";

      return { ...p, ...stats, capacity, chargePct, badge };
    }).sort((a, b) => b.count - a.count);
  }, [current, prestataires, workDays]);

  // ── Revenus par client ────────────────────────────────────────────────────
  const revenusClients = useMemo(() => {
    const map = new Map<string, {
      nom: string; count: number; montant: number; logements: Set<string>;
    }>();

    current.forEach((i) => {
      if (!i.client_id || !STATUTS_ACTIFS.includes(i.status)) return;
      const prev = map.get(i.client_id) ?? { nom: i.client?.full_name ?? "—", count: 0, montant: 0, logements: new Set() };
      map.set(i.client_id, {
        nom:      prev.nom,
        count:    prev.count + 1,
        montant:  prev.montant + (i.prix_client_ttc ?? 0) + (i.blanchisserie_incluse ? (i.prix_blanchisserie ?? 0) : 0),
        logements: prev.logements.add(i.logement_id ?? ""),
      });
    });

    return [...map.entries()]
      .map(([id, v]) => ({ id, ...v, nbLogements: v.logements.size }))
      .sort((a, b) => b.montant - a.montant);
  }, [current]);

  // ── Trésorerie (interventions terminées) ──────────────────────────────────
  const tresorerie = useMemo(() => {
    const terminees = current.filter((i) => i.status === INTERVENTION_STATUSES.TERMINEE);
    const aEncaisser = terminees.reduce((s, i) =>
      s + (i.prix_client_ttc ?? 0) + (i.blanchisserie_incluse ? (i.prix_blanchisserie ?? 0) : 0), 0);
    const aPayer = terminees.reduce((s, i) => s + (i.prix_prestataire_ht ?? 0), 0);
    return { aEncaisser, aPayer, solde: aEncaisser - aPayer, nbTerminees: terminees.length };
  }, [current]);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* ── En-tête + sélecteur mois ────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estimations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Prévisions mensuelles</p>
        </div>
        <div className="flex items-center gap-2 bg-white border rounded-xl px-3 py-2 shadow-sm">
          <button onClick={prevM} className="p-1 rounded hover:bg-slate-100 transition-colors">
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-sm font-semibold min-w-[130px] text-center">
            {MOIS_FR[month - 1]} {year}
          </span>
          <button
            onClick={nextM}
            disabled={isCurrentMonth}
            className="p-1 rounded hover:bg-slate-100 transition-colors disabled:opacity-30"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* ── Section 1 : KPIs ────────────────────────────────────────────── */}
      <section>
        <SectionTitle title="Indicateurs du mois" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <KPICard
            label="Interventions"
            value={loadCur ? "…" : String(kpi.total)}
            sub="hors annulées"
            delta={{ ...delta(kpi.total, kpiPrev.total), text: "" }}
          />
          <KPICard
            label="Taux d'assignation"
            value={loadCur ? "…" : fmtPct(kpi.tauxAssignation)}
            sub="assignées + acceptées + en cours + terminées"
            delta={{ ...delta(kpi.tauxAssignation, kpiPrev.tauxAssignation), text: "" }}
          />
          <KPICard
            label="Revenu estimé clients"
            value={loadCur ? "…" : fmtEur(kpi.revenu)}
            sub="TTC + blanchisserie"
            delta={{ ...delta(kpi.revenu, kpiPrev.revenu), text: "" }}
            colored="blue"
          />
          <KPICard
            label="Coût prestataires"
            value={loadCur ? "…" : fmtEur(kpi.cout)}
            sub="HT"
            delta={{ ...delta(kpi.cout, kpiPrev.cout), text: "" }}
          />
          <KPICard
            label="Gain net estimé"
            value={loadCur ? "…" : fmtEur(kpi.gain)}
            sub="revenu − coût"
            delta={{ ...delta(kpi.gain, kpiPrev.gain), text: "" }}
            colored={kpi.gain >= 0 ? "green" : "red"}
          />
        </div>
      </section>

      {/* ── Section 2 : Charge prestataires ─────────────────────────────── */}
      <section>
        <SectionTitle title="Charge par prestataire" count={chargePrestataires.length} />
        {chargePrestataires.length === 0 ? (
          <p className="text-sm text-muted-foreground bg-white border rounded-xl p-4">Aucun prestataire.</p>
        ) : (
          <div className="bg-white border rounded-xl shadow-sm overflow-hidden divide-y">
            {chargePrestataires.map((p) => (
              <div key={p.id} className="p-4 flex items-center gap-4">
                {/* Nom + badge */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{p.full_name}</span>
                    <span className={[
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      p.badge === "surchargé"   ? "bg-red-100 text-red-700"    :
                      p.badge === "optimal"      ? "bg-green-100 text-green-700" :
                      "bg-amber-100 text-amber-700",
                    ].join(" ")}>
                      {p.badge}
                    </span>
                  </div>
                  {/* Barre de charge */}
                  <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={[
                        "h-full rounded-full transition-all",
                        p.badge === "surchargé"  ? "bg-red-500"    :
                        p.badge === "optimal"     ? "bg-green-500"  :
                        "bg-amber-400",
                      ].join(" ")}
                      style={{ width: `${Math.min(p.chargePct, 100).toFixed(1)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {p.count} mission{p.count > 1 ? "s" : ""} / capacité {p.capacity} ({p.chargePct.toFixed(0)} %)
                    &nbsp;·&nbsp;{workDays} jours ouvrés
                  </p>
                </div>
                {/* CA */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-700">{fmtEur(p.ca)}</p>
                  <p className="text-xs text-muted-foreground">coût HT</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Section 3 : Revenus par client ──────────────────────────────── */}
      <section>
        <SectionTitle title="Revenus par client" count={revenusClients.length} />
        {revenusClients.length === 0 ? (
          <p className="text-sm text-muted-foreground bg-white border rounded-xl p-4">Aucun client actif ce mois.</p>
        ) : (
          <div className="bg-white border rounded-xl shadow-sm overflow-hidden divide-y">
            {revenusClients.map((c, idx) => (
              <div key={c.id} className="p-4 flex items-center gap-4">
                <span className="text-sm font-bold text-slate-400 w-6 text-right shrink-0">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">{c.nom}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {c.count} intervention{c.count > 1 ? "s" : ""}
                    {" "}·{" "}
                    {c.nbLogements} logement{c.nbLogements > 1 ? "s" : ""} actif{c.nbLogements > 1 ? "s" : ""}
                  </p>
                </div>
                <p className="text-sm font-bold text-blue-700 shrink-0">{fmtEur(c.montant)}</p>
              </div>
            ))}
            {/* Total */}
            <div className="p-4 bg-slate-50 flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-600">Total clients</span>
              <span className="text-sm font-bold">{fmtEur(revenusClients.reduce((s, c) => s + c.montant, 0))}</span>
            </div>
          </div>
        )}
      </section>

      {/* ── Section 4 : Prévision de trésorerie ─────────────────────────── */}
      <section>
        <SectionTitle title="Prévision de trésorerie" />
        <p className="text-xs text-muted-foreground mb-3">
          Basée sur les {tresorerie.nbTerminees} intervention{tresorerie.nbTerminees > 1 ? "s" : ""} terminée{tresorerie.nbTerminees > 1 ? "s" : ""} du mois
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs text-green-600 font-medium">Total à encaisser (clients)</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{fmtEur(tresorerie.aEncaisser)}</p>
            <p className="text-xs text-green-600 mt-1">TTC + blanchisserie</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-xs text-red-500 font-medium">Total à payer (prestataires)</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{fmtEur(tresorerie.aPayer)}</p>
            <p className="text-xs text-red-400 mt-1">HT</p>
          </div>
          <div className={[
            "rounded-xl p-4 border",
            tresorerie.solde >= 0 ? "bg-blue-50 border-blue-200" : "bg-amber-50 border-amber-200",
          ].join(" ")}>
            <p className={`text-xs font-medium ${tresorerie.solde >= 0 ? "text-blue-600" : "text-amber-600"}`}>
              Solde prévisionnel
            </p>
            <p className={`text-2xl font-bold mt-1 ${tresorerie.solde >= 0 ? "text-blue-700" : "text-amber-700"}`}>
              {fmtEur(tresorerie.solde)}
            </p>
            <p className={`text-xs mt-1 ${tresorerie.solde >= 0 ? "text-blue-500" : "text-amber-500"}`}>
              encaissements − paiements
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
