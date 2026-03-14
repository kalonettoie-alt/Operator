"use client";

// Calendrier admin — vue de toutes les interventions avec filtres.
// Utilise FullCalendar v6 (daygrid + timegrid + interaction).
// Vues : mois, semaine, jour. Filtres : logement, client, prestataire, statut.
// Clic sur un événement → navigation vers /admin/interventions/[id].

import { useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import frLocale from "@fullcalendar/core/locales/fr";
import type { DatesSetArg, EventClickArg, EventContentArg } from "@fullcalendar/core";

import { useInterventions } from "@/lib/hooks/useInterventions";
import { useLogements } from "@/lib/hooks/useLogements";
import { useClients, usePrestataires } from "@/lib/hooks/useProfiles";
import { INTERVENTION_STATUSES } from "@/types/enums";
import type { InterventionStatus } from "@/types/enums";
import type { InterventionWithRelations } from "@/lib/hooks/useInterventions";

// ─── Couleurs par statut ───────────────────────────────────────────────────────

const STATUS_COLOR: Record<InterventionStatus, string> = {
  [INTERVENTION_STATUSES.A_ATTRIBUER]: "#94a3b8", // slate-400
  [INTERVENTION_STATUSES.ASSIGNEE]:    "#3b82f6", // blue-500
  [INTERVENTION_STATUSES.ACCEPTEE]:    "#6366f1", // indigo-500
  [INTERVENTION_STATUSES.REFUSEE]:     "#f87171", // red-400
  [INTERVENTION_STATUSES.EN_COURS]:    "#f59e0b", // amber-500
  [INTERVENTION_STATUSES.TERMINEE]:    "#22c55e", // green-500
  [INTERVENTION_STATUSES.ANNULEE]:     "#cbd5e1", // slate-300
};

const STATUS_LABEL: Record<InterventionStatus, string> = {
  [INTERVENTION_STATUSES.A_ATTRIBUER]: "À attribuer",
  [INTERVENTION_STATUSES.ASSIGNEE]:    "Assignée",
  [INTERVENTION_STATUSES.ACCEPTEE]:    "Acceptée",
  [INTERVENTION_STATUSES.REFUSEE]:     "Refusée",
  [INTERVENTION_STATUSES.EN_COURS]:    "En cours",
  [INTERVENTION_STATUSES.TERMINEE]:    "Terminée",
  [INTERVENTION_STATUSES.ANNULEE]:     "Annulée",
};

const ALL_STATUSES = Object.entries(STATUS_LABEL) as [InterventionStatus, string][];

const TYPE_LABELS: Record<string, string> = {
  menage: "Ménage",
  etat_lieux: "État des lieux",
  maintenance: "Maintenance",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Contenu personnalisé d'un événement FullCalendar */
function EventContent({ eventInfo }: { eventInfo: EventContentArg }) {
  const { title, extendedProps } = eventInfo.event;
  const type = extendedProps.type as string;
  return (
    <div className="overflow-hidden px-1 py-0.5 leading-tight w-full">
      <div className="font-medium text-[11px] truncate">{title}</div>
      {eventInfo.view.type !== "dayGridMonth" && (
        <div className="text-[10px] opacity-80 truncate">
          {TYPE_LABELS[type] ?? type}
        </div>
      )}
    </div>
  );
}

// ─── Composant filtre select ──────────────────────────────────────────────────

function FilterSelect({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <label htmlFor={id} className="text-xs text-muted-foreground font-medium">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-input bg-white px-2.5 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring truncate"
      >
        {children}
      </select>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminCalendrierPage() {
  const router = useRouter();

  // ── Plage de dates visible (mise à jour par FullCalendar) ─────────────────
  const initFrom = toDateStr(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const initTo   = toDateStr(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));

  const [dateFrom, setDateFrom] = useState(initFrom);
  const [dateTo,   setDateTo]   = useState(initTo);

  // ── Filtres ───────────────────────────────────────────────────────────────
  const [filtreLogement,    setFiltreLogement]    = useState("all");
  const [filtreClient,      setFiltreClient]      = useState("all");
  const [filtrePrestataire, setFiltrePrestataire] = useState("all");
  const [filtreStatut,      setFiltreStatut]      = useState("all");

  // ── Données ───────────────────────────────────────────────────────────────
  const { data: allInterventions, isLoading } = useInterventions({ dateFrom, dateTo });
  const { data: logements }    = useLogements();
  const { data: clients }      = useClients();
  const { data: prestataires } = usePrestataires();

  // ── Filtrage côté client ──────────────────────────────────────────────────
  const filtered = useMemo<InterventionWithRelations[]>(() => {
    return (allInterventions ?? []).filter((i) => {
      if (filtreLogement    !== "all" && i.logement_id !== filtreLogement)       return false;
      if (filtreClient      !== "all" && i.client_id !== filtreClient)           return false;
      if (filtrePrestataire !== "all" && i.prestataire_id !== filtrePrestataire) return false;
      if (filtreStatut      !== "all" && i.status !== filtreStatut)              return false;
      return true;
    });
  }, [allInterventions, filtreLogement, filtreClient, filtrePrestataire, filtreStatut]);

  // ── Conversion en événements FullCalendar ─────────────────────────────────
  const events = useMemo(() =>
    filtered.map((i) => ({
      id:              i.id,
      title:           i.logement?.name ?? "Logement inconnu",
      date:            i.date,
      backgroundColor: STATUS_COLOR[i.status as InterventionStatus] ?? "#94a3b8",
      borderColor:     "transparent",
      textColor:       "#ffffff",
      extendedProps:   {
        interventionId: i.id,
        type:           i.type,
        client:         i.client?.full_name,
        prestataire:    i.prestataire?.full_name,
        status:         i.status,
      },
    }))
  , [filtered]);

  // ── Handlers FullCalendar ─────────────────────────────────────────────────
  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    // arg.start / arg.end donnent la plage exacte de la vue courante
    setDateFrom(toDateStr(arg.start));
    // arg.end est exclusif (lendemain du dernier jour visible)
    const endInclusive = new Date(arg.end);
    endInclusive.setDate(endInclusive.getDate() - 1);
    setDateTo(toDateStr(endInclusive));
  }, []);

  const handleEventClick = useCallback((info: EventClickArg) => {
    const id = info.event.extendedProps.interventionId as string;
    router.push(`/admin/interventions/${id}`);
  }, [router]);

  // ── Réinitialiser les filtres ──────────────────────────────────────────────
  function resetFiltres() {
    setFiltreLogement("all");
    setFiltreClient("all");
    setFiltrePrestataire("all");
    setFiltreStatut("all");
  }

  const hasFiltres =
    filtreLogement !== "all" ||
    filtreClient !== "all" ||
    filtrePrestataire !== "all" ||
    filtreStatut !== "all";

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-full">

      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendrier</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading
              ? "Chargement…"
              : `${filtered.length} intervention${filtered.length > 1 ? "s" : ""} affichée${filtered.length > 1 ? "s" : ""}`}
          </p>
        </div>
        {hasFiltres && (
          <button
            onClick={resetFiltres}
            className="text-xs text-blue-600 hover:underline shrink-0"
          >
            Réinitialiser les filtres
          </button>
        )}
      </div>

      {/* ── Filtres ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white rounded-xl border p-3 shadow-sm">
        <FilterSelect
          id="filtre-logement"
          label="Logement"
          value={filtreLogement}
          onChange={setFiltreLogement}
        >
          <option value="all">Tous les logements</option>
          {(logements ?? []).map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </FilterSelect>

        <FilterSelect
          id="filtre-client"
          label="Client"
          value={filtreClient}
          onChange={setFiltreClient}
        >
          <option value="all">Tous les clients</option>
          {(clients ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.full_name}</option>
          ))}
        </FilterSelect>

        <FilterSelect
          id="filtre-prestataire"
          label="Prestataire"
          value={filtrePrestataire}
          onChange={setFiltrePrestataire}
        >
          <option value="all">Tous les prestataires</option>
          {(prestataires ?? []).map((p) => (
            <option key={p.id} value={p.id}>{p.full_name}</option>
          ))}
        </FilterSelect>

        <FilterSelect
          id="filtre-statut"
          label="Statut"
          value={filtreStatut}
          onChange={setFiltreStatut}
        >
          <option value="all">Tous les statuts</option>
          {ALL_STATUSES.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </FilterSelect>
      </div>

      {/* ── Calendrier ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden fc-admin">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          locale={frLocale}
          initialView="dayGridMonth"
          headerToolbar={{
            left:   "prev,next today",
            center: "title",
            right:  "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          buttonText={{
            today:        "Aujourd'hui",
            month:        "Mois",
            week:         "Semaine",
            day:          "Jour",
          }}
          events={events}
          datesSet={handleDatesSet}
          eventClick={handleEventClick}
          eventContent={(info) => <EventContent eventInfo={info} />}
          eventDisplay="block"
          dayMaxEvents={4}
          moreLinkText={(n) => `+${n} autre${n > 1 ? "s" : ""}`}
          nowIndicator
          height="auto"
          aspectRatio={1.8}
          stickyHeaderDates
          // Vue semaine/jour : heures de travail en surbrillance
          businessHours={{ daysOfWeek: [1, 2, 3, 4, 5, 6], startTime: "07:00", endTime: "21:00" }}
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          allDayText="Toute la journée"
          eventTimeFormat={{ hour: "2-digit", minute: "2-digit", meridiem: false }}
        />
      </div>

      {/* ── Légende statuts ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {ALL_STATUSES.map(([status, label]) => (
          <button
            key={status}
            onClick={() => setFiltreStatut(filtreStatut === status ? "all" : status)}
            className={[
              "flex items-center gap-1.5 text-xs transition-opacity",
              filtreStatut !== "all" && filtreStatut !== status ? "opacity-30" : "opacity-100",
            ].join(" ")}
            title={`Filtrer : ${label}`}
          >
            <span
              className="size-2.5 rounded-full shrink-0"
              style={{ backgroundColor: STATUS_COLOR[status] }}
            />
            {label}
          </button>
        ))}
      </div>

      {/* ── Styles FullCalendar overrides ──────────────────────────────── */}
      <style>{`
        .fc-admin .fc-toolbar-title { font-size: 1.1rem; font-weight: 700; }
        .fc-admin .fc-button {
          background: white !important;
          border: 1px solid #e2e8f0 !important;
          color: #374151 !important;
          font-size: 0.8125rem !important;
          padding: 0.3rem 0.75rem !important;
          border-radius: 0.5rem !important;
          box-shadow: 0 1px 2px rgba(0,0,0,.05) !important;
          text-transform: none !important;
          font-weight: 500 !important;
        }
        .fc-admin .fc-button:hover { background: #f9fafb !important; }
        .fc-admin .fc-button-active,
        .fc-admin .fc-button-primary:not(:disabled):active {
          background: #eff6ff !important;
          border-color: #bfdbfe !important;
          color: #1d4ed8 !important;
        }
        .fc-admin .fc-toolbar { padding: 0.75rem 1rem; border-bottom: 1px solid #f1f5f9; }
        .fc-admin .fc-col-header-cell { background: #f8fafc; font-size: 0.8125rem; font-weight: 600; color: #64748b; }
        .fc-admin .fc-daygrid-day-number { font-size: 0.8125rem; color: #374151; padding: 4px 6px; }
        .fc-admin .fc-day-today { background: #eff6ff !important; }
        .fc-admin .fc-day-today .fc-daygrid-day-number {
          background: #2563eb; color: white; border-radius: 9999px;
          width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
        }
        .fc-admin .fc-event { border-radius: 4px !important; cursor: pointer; }
        .fc-admin .fc-event:hover { filter: brightness(0.93); }
        .fc-admin .fc-more-link { font-size: 0.75rem; color: #6366f1; font-weight: 600; }
        .fc-admin .fc-timegrid-slot { height: 2.5rem; }
        .fc-admin .fc-timegrid-axis { font-size: 0.75rem; color: #94a3b8; }
        .fc-admin .fc-now-indicator-line { border-color: #ef4444; }
        .fc-admin table { border-collapse: collapse; }
        .fc-admin .fc-scrollgrid { border-radius: 0; border: none; }
      `}</style>
    </div>
  );
}
