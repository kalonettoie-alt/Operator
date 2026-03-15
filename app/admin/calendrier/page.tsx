"use client";

// Calendrier admin — vue de toutes les interventions avec filtres.
// Utilise FullCalendar v6 (daygrid + timegrid + interaction).
// Vues : mois, semaine, jour. Filtres : logement, client, prestataire, statut.
// Clic sur un jour → panneau latéral avec la liste des interventions du jour.
// Clic sur une intervention → navigation vers /admin/interventions/[id].

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import frLocale from "@fullcalendar/core/locales/fr";
import type {
  DatesSetArg,
  EventClickArg,
  EventContentArg,
} from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";

import { useInterventions } from "@/lib/hooks/useInterventions";
import { useLogements } from "@/lib/hooks/useLogements";
import { useClients, usePrestataires } from "@/lib/hooks/useProfiles";
import { INTERVENTION_STATUSES, INTERVENTION_PRIORITIES } from "@/types/enums";
import type { InterventionStatus } from "@/types/enums";
import type { InterventionWithRelations } from "@/lib/hooks/useInterventions";

// ─── Couleurs par statut ───────────────────────────────────────────────────────

const STATUS_COLOR: Record<InterventionStatus, string> = {
  [INTERVENTION_STATUSES.A_ATTRIBUER]: "#94a3b8",
  [INTERVENTION_STATUSES.ASSIGNEE]:    "#3b82f6",
  [INTERVENTION_STATUSES.ACCEPTEE]:    "#6366f1",
  [INTERVENTION_STATUSES.REFUSEE]:     "#f87171",
  [INTERVENTION_STATUSES.EN_COURS]:    "#f59e0b",
  [INTERVENTION_STATUSES.TERMINEE]:    "#22c55e",
  [INTERVENTION_STATUSES.ANNULEE]:     "#cbd5e1",
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
  menage:      "Ménage",
  etat_lieux:  "État des lieux",
  maintenance: "Maintenance",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Formate "2026-03-08" → "Dimanche 8 mars" */
function formatDayTitle(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00"); // évite le décalage UTC
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
  }).format(d);
}

// ─── Contenu personnalisé d'un événement FullCalendar ─────────────────────────

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

// ─── Carte d'une intervention dans le panneau jour ────────────────────────────

function InterventionCard({
  intervention,
  onClick,
}: {
  intervention: InterventionWithRelations;
  onClick: () => void;
}) {
  const status    = intervention.status as InterventionStatus;
  const color     = STATUS_COLOR[status] ?? "#94a3b8";
  const label     = STATUS_LABEL[status] ?? status;
  const type      = TYPE_LABELS[intervention.type] ?? intervention.type;
  const city      = intervention.logement?.city;
  const presta    = intervention.prestataire?.full_name;
  const isUrgent  = intervention.priority === INTERVENTION_PRIORITIES.HAUTE;

  return (
    <button
      onClick={onClick}
      className={[
        "w-full text-left border rounded-xl p-3.5 transition-colors shadow-sm group",
        isUrgent
          ? "bg-red-50 border-red-200 hover:border-red-300 hover:bg-red-100/60"
          : "bg-white hover:border-blue-200 hover:bg-blue-50/40",
      ].join(" ")}
    >
      {/* Nom du logement + badge Urgente */}
      <div className="flex items-start justify-between gap-2">
        <p className={[
          "font-semibold text-sm truncate",
          isUrgent ? "text-red-900 group-hover:text-red-700" : "text-gray-900 group-hover:text-blue-700",
        ].join(" ")}>
          {intervention.logement?.name ?? "Logement inconnu"}
        </p>
        {isUrgent && (
          <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-red-100 border border-red-200 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
            ⚡ Urgente
          </span>
        )}
      </div>

      {/* Bandeau check-in même jour */}
      {intervention.checkin_meme_jour && (
        <p className="text-[10px] font-medium text-orange-600 mt-1.5 bg-orange-50 border border-orange-100 rounded px-1.5 py-0.5">
          🏃 Check-in le même jour
        </p>
      )}

      {/* Badge statut */}
      <div className="flex items-center gap-1.5 mt-1.5">
        <span
          className="size-2 rounded-full shrink-0"
          style={{ backgroundColor: isUrgent ? "#ef4444" : color }}
        />
        <span className="text-xs font-medium" style={{ color: isUrgent ? "#dc2626" : color }}>
          {label}
        </span>
      </div>

      {/* Type d'intervention */}
      <p className="text-xs text-amber-600 font-medium mt-1.5 flex items-center gap-1">
        <span>⚡</span>
        {type}
      </p>

      {/* Ville */}
      {city && (
        <p className="text-xs text-gray-500 mt-1">{city}</p>
      )}

      {/* Prestataire assigné */}
      {presta ? (
        <p className="text-xs text-gray-600 mt-1 font-medium">{presta}</p>
      ) : (
        <p className="text-xs text-gray-400 mt-1 italic">Aucun prestataire assigné</p>
      )}
    </button>
  );
}

// ─── Panneau jour ─────────────────────────────────────────────────────────────

function DayPanel({
  dateStr,
  interventions,
  onClose,
  onAdd,
  onSelectIntervention,
}: {
  dateStr: string;
  interventions: InterventionWithRelations[];
  onClose: () => void;
  onAdd: () => void;
  onSelectIntervention: (id: string) => void;
}) {
  const title = formatDayTitle(dateStr);
  // Capitalise la première lettre
  const titleCapitalized = title.charAt(0).toUpperCase() + title.slice(1);

  return (
    <div className="flex flex-col h-full">
      {/* ── En-tête ────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2 p-4 border-b">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">📅</span>
          <h2 className="font-bold text-gray-900 text-sm leading-tight">
            {titleCapitalized}
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onAdd}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-lg px-2.5 py-1.5 transition-colors"
          >
            <span className="text-sm leading-none">+</span>
            Ajouter
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            title="Fermer"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Liste des interventions ────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {interventions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm text-gray-500">Aucune intervention ce jour</p>
            <button
              onClick={onAdd}
              className="mt-3 text-xs text-blue-600 hover:underline"
            >
              + Créer une intervention
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 font-medium px-1">
              {interventions.length} intervention{interventions.length > 1 ? "s" : ""}
            </p>
            {interventions.map((i) => (
              <InterventionCard
                key={i.id}
                intervention={i}
                onClick={() => onSelectIntervention(i.id)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Filtre select ────────────────────────────────────────────────────────────

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

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AdminCalendrierPage() {
  const router = useRouter();

  // ── Plage de dates visible (mise à jour par FullCalendar) ─────────────────
  const today = new Date();
  const initFrom = toDateStr(new Date(today.getFullYear(), today.getMonth(), 1));
  const initTo   = toDateStr(new Date(today.getFullYear(), today.getMonth() + 1, 0));

  const [dateFrom, setDateFrom] = useState(initFrom);
  const [dateTo,   setDateTo]   = useState(initTo);

  // ── Jour sélectionné (panneau latéral) ───────────────────────────────────
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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

  // ── Interventions du jour sélectionné ────────────────────────────────────
  const dayInterventions = useMemo<InterventionWithRelations[]>(() => {
    if (!selectedDate) return [];
    return filtered.filter((i) => i.date === selectedDate);
  }, [filtered, selectedDate]);

  // ── Événements FullCalendar ───────────────────────────────────────────────
  const events = useMemo(() =>
    filtered.map((i) => {
      const isUrgent = i.priority === INTERVENTION_PRIORITIES.HAUTE;
      return {
        id:              i.id,
        title:           i.logement?.name ?? "Logement inconnu",
        date:            i.date,
        // Priorité haute → rouge vif, sinon couleur du statut
        backgroundColor: isUrgent ? "#ef4444" : (STATUS_COLOR[i.status as InterventionStatus] ?? "#94a3b8"),
        borderColor:     "transparent",
        textColor:       "#ffffff",
        extendedProps:   {
          interventionId:   i.id,
          type:             i.type,
          status:           i.status,
          priority:         i.priority,
          checkinMemeJour:  i.checkin_meme_jour,
        },
      };
    })
  , [filtered]);

  // ── Handlers FullCalendar ─────────────────────────────────────────────────
  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    setDateFrom(toDateStr(arg.start));
    const endInclusive = new Date(arg.end);
    endInclusive.setDate(endInclusive.getDate() - 1);
    setDateTo(toDateStr(endInclusive));
  }, []);

  // Clic sur un événement → ouvre le panneau du jour correspondant
  const handleEventClick = useCallback((info: EventClickArg) => {
    const dateStr = info.event.startStr.slice(0, 10);
    setSelectedDate(dateStr);
  }, []);

  // Clic sur une cellule jour vide → ouvre aussi le panneau
  const handleDateClick = useCallback((info: DateClickArg) => {
    setSelectedDate(info.dateStr);
  }, []);

  // ── Réinitialiser les filtres ─────────────────────────────────────────────
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
        <FilterSelect id="filtre-logement" label="Logement" value={filtreLogement} onChange={setFiltreLogement}>
          <option value="all">Tous les logements</option>
          {(logements ?? []).map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </FilterSelect>

        <FilterSelect id="filtre-client" label="Client" value={filtreClient} onChange={setFiltreClient}>
          <option value="all">Tous les clients</option>
          {(clients ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.full_name}</option>
          ))}
        </FilterSelect>

        <FilterSelect id="filtre-prestataire" label="Prestataire" value={filtrePrestataire} onChange={setFiltrePrestataire}>
          <option value="all">Tous les prestataires</option>
          {(prestataires ?? []).map((p) => (
            <option key={p.id} value={p.id}>{p.full_name}</option>
          ))}
        </FilterSelect>

        <FilterSelect id="filtre-statut" label="Statut" value={filtreStatut} onChange={setFiltreStatut}>
          <option value="all">Tous les statuts</option>
          {ALL_STATUSES.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </FilterSelect>
      </div>

      {/* ── Calendrier + panneau latéral ────────────────────────────────── */}
      <div className={[
        "flex gap-4 items-start",
        selectedDate ? "flex-col md:flex-row" : "",
      ].join(" ")}>

        {/* Calendrier */}
        <div className={[
          "bg-white rounded-xl border shadow-sm overflow-hidden fc-admin min-w-0",
          selectedDate ? "w-full md:flex-1" : "w-full",
        ].join(" ")}>
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
              today:   "Aujourd'hui",
              month:   "Mois",
              week:    "Semaine",
              day:     "Jour",
            }}
            events={events}
            datesSet={handleDatesSet}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            eventContent={(info) => <EventContent eventInfo={info} />}
            eventDisplay="block"
            dayMaxEvents={3}
            moreLinkText={(n) => `+${n} autre${n > 1 ? "s" : ""}`}
            nowIndicator
            height="auto"
            stickyHeaderDates
            businessHours={{ daysOfWeek: [1, 2, 3, 4, 5, 6], startTime: "07:00", endTime: "21:00" }}
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            allDayText="Toute la journée"
            eventTimeFormat={{ hour: "2-digit", minute: "2-digit", meridiem: false }}
            // Highlight le jour sélectionné
            dayCellClassNames={(arg) =>
              arg.date.toISOString().slice(0, 10) === selectedDate
                ? ["fc-day-selected"]
                : []
            }
          />
        </div>

        {/* Panneau latéral — visible uniquement si un jour est sélectionné */}
        {selectedDate && (
          <div className="w-full md:w-80 lg:w-96 shrink-0 bg-white rounded-xl border shadow-sm overflow-hidden md:sticky md:top-20 md:h-[calc(100vh-6rem)] flex flex-col">
            <DayPanel
              dateStr={selectedDate}
              interventions={dayInterventions}
              onClose={() => setSelectedDate(null)}
              onAdd={() =>
                router.push(`/admin/interventions/nouvelle?date=${selectedDate}`)
              }
              onSelectIntervention={(id) =>
                router.push(`/admin/interventions/${id}`)
              }
            />
          </div>
        )}
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
            <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLOR[status] }} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Styles FullCalendar ──────────────────────────────────────────── */}
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
        .fc-admin .fc-day-selected { background: #f0fdf4 !important; outline: 2px solid #22c55e; outline-offset: -2px; }
        .fc-admin .fc-event { border-radius: 4px !important; cursor: pointer; }
        .fc-admin .fc-event:hover { filter: brightness(0.93); }
        .fc-admin .fc-more-link { font-size: 0.75rem; color: #6366f1; font-weight: 600; }
        .fc-admin .fc-timegrid-slot { height: 2.5rem; }
        .fc-admin .fc-timegrid-axis { font-size: 0.75rem; color: #94a3b8; }
        .fc-admin .fc-now-indicator-line { border-color: #ef4444; }
        .fc-admin table { border-collapse: collapse; }
        .fc-admin .fc-scrollgrid { border-radius: 0; border: none; }
        .fc-admin .fc-daygrid-day { cursor: pointer; transition: background 0.1s; }
        .fc-admin .fc-daygrid-day:hover { background: #f8fafc !important; }
      `}</style>
    </div>
  );
}
