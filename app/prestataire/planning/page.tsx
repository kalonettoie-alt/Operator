"use client";

// Planning prestataire — calendrier FullCalendar des missions à venir et en cours.
// Filtré automatiquement sur l'utilisateur connecté (RLS + prestataireId).
// Vues : mois, semaine, jour. Clic sur un événement → détail de la mission.
// Clic sur un jour → panneau latéral avec la liste des missions du jour.

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import frLocale from "@fullcalendar/core/locales/fr";
import type { DatesSetArg, EventClickArg, EventContentArg } from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import { CalendarDays } from "lucide-react";

import { useAuth } from "@/lib/hooks/useAuth";
import { useMissionsPrestataire, type MissionWithLogement } from "@/lib/hooks/useMissionsPrestataire";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { INTERVENTION_STATUSES } from "@/types/enums";
import type { InterventionStatus } from "@/types/enums";

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

const TYPE_LABELS: Record<string, string> = {
  menage:      "Ménage",
  etat_lieux:  "État des lieux",
  maintenance: "Maintenance",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDayTitle(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const s = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
  }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Contenu d'un événement FullCalendar ──────────────────────────────────────

function EventContent({ info }: { info: EventContentArg }) {
  const type = info.event.extendedProps.type as string;
  return (
    <div className="overflow-hidden px-1 py-0.5 leading-tight w-full">
      <div className="font-medium text-[11px] truncate">{info.event.title}</div>
      {info.view.type !== "dayGridMonth" && (
        <div className="text-[10px] opacity-80 truncate">{TYPE_LABELS[type] ?? type}</div>
      )}
    </div>
  );
}

// ─── Carte mission dans le panneau jour ──────────────────────────────────────

function MissionCard({
  mission,
  onClick,
}: {
  mission: MissionWithLogement;
  onClick: () => void;
}) {
  const status = mission.status as InterventionStatus;
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border rounded-xl p-3.5 hover:border-blue-200 hover:bg-blue-50/40 transition-colors shadow-sm group"
    >
      <p className="font-semibold text-sm text-gray-900 group-hover:text-blue-700 truncate">
        {mission.logement?.name ?? "Logement inconnu"}
      </p>
      <div className="mt-1.5">
        <StatusBadge status={status} />
      </div>
      <p className="text-xs text-amber-600 font-medium mt-1.5 flex items-center gap-1">
        <span>⚡</span>
        {TYPE_LABELS[mission.type] ?? mission.type}
      </p>
      {mission.logement?.city && (
        <p className="text-xs text-gray-500 mt-1">{mission.logement.city}</p>
      )}
    </button>
  );
}

// ─── Panneau jour ─────────────────────────────────────────────────────────────

function DayPanel({
  dateStr,
  missions,
  onClose,
  onSelect,
}: {
  dateStr: string;
  missions: MissionWithLogement[];
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 p-4 border-b">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">📅</span>
          <h2 className="font-bold text-gray-900 text-sm leading-tight">
            {formatDayTitle(dateStr)}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1 shrink-0"
          title="Fermer"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {missions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm text-gray-500">Aucune mission ce jour</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 font-medium px-1">
              {missions.length} mission{missions.length > 1 ? "s" : ""}
            </p>
            {missions.map((m) => (
              <MissionCard key={m.id} mission={m} onClick={() => onSelect(m.id)} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PrestatairePlanningPage() {
  const router = useRouter();
  const { user } = useAuth();

  // ── Plage visible ─────────────────────────────────────────────────────────
  const today = new Date();
  const [dateFrom, setDateFrom] = useState(
    toDateStr(new Date(today.getFullYear(), today.getMonth(), 1))
  );
  const [dateTo, setDateTo] = useState(
    toDateStr(new Date(today.getFullYear(), today.getMonth() + 1, 0))
  );

  // ── Jour sélectionné ──────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // ── Données : toutes les missions du prestataire sur la plage visible ─────
  const { data: missions, isLoading } = useMissionsPrestataire(
    user?.id ?? null,
    { dateFrom, dateTo }
  );

  // ── Événements FullCalendar ───────────────────────────────────────────────
  const events = useMemo(() =>
    (missions ?? []).map((m) => ({
      id:              m.id,
      title:           m.logement?.name ?? "Logement inconnu",
      date:            m.date,
      backgroundColor: STATUS_COLOR[m.status as InterventionStatus] ?? "#94a3b8",
      borderColor:     "transparent",
      textColor:       "#ffffff",
      extendedProps:   { missionId: m.id, type: m.type, status: m.status },
    }))
  , [missions]);

  // ── Missions du jour sélectionné ──────────────────────────────────────────
  const dayMissions = useMemo(() =>
    (missions ?? []).filter((m) => m.date === selectedDate)
  , [missions, selectedDate]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    setDateFrom(toDateStr(arg.start));
    const end = new Date(arg.end);
    end.setDate(end.getDate() - 1);
    setDateTo(toDateStr(end));
  }, []);

  const handleEventClick = useCallback((info: EventClickArg) => {
    setSelectedDate(info.event.startStr.slice(0, 10));
  }, []);

  const handleDateClick = useCallback((info: DateClickArg) => {
    setSelectedDate(info.dateStr);
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-full">

      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-50 rounded-lg">
          <CalendarDays className="size-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mon planning</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading
              ? "Chargement…"
              : `${(missions ?? []).length} mission${(missions ?? []).length > 1 ? "s" : ""} sur la période`}
          </p>
        </div>
      </div>

      {/* ── Calendrier + panneau ────────────────────────────────────────── */}
      <div className={[
        "flex gap-4 items-start",
        selectedDate ? "flex-col md:flex-row" : "",
      ].join(" ")}>

        {/* Calendrier */}
        <div className={[
          "bg-white rounded-xl border shadow-sm overflow-hidden fc-planning min-w-0",
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
            buttonText={{ today: "Aujourd'hui", month: "Mois", week: "Semaine", day: "Jour" }}
            events={events}
            datesSet={handleDatesSet}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            eventContent={(info) => <EventContent info={info} />}
            eventDisplay="block"
            dayMaxEvents={3}
            moreLinkText={(n) => `+${n} autre${n > 1 ? "s" : ""}`}
            nowIndicator
            height="auto"
            stickyHeaderDates
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            allDayText="Toute la journée"
            eventTimeFormat={{ hour: "2-digit", minute: "2-digit", meridiem: false }}
            dayCellClassNames={(arg) =>
              arg.date.toISOString().slice(0, 10) === selectedDate
                ? ["fc-day-selected"]
                : []
            }
          />
        </div>

        {/* Panneau jour */}
        {selectedDate && (
          <div className="w-full md:w-80 lg:w-96 shrink-0 bg-white rounded-xl border shadow-sm overflow-hidden md:sticky md:top-20 md:h-[calc(100vh-6rem)] flex flex-col">
            <DayPanel
              dateStr={selectedDate}
              missions={dayMissions}
              onClose={() => setSelectedDate(null)}
              onSelect={(id) => router.push(`/prestataire/missions/${id}`)}
            />
          </div>
        )}
      </div>

      {/* ── Légende ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {([
          [INTERVENTION_STATUSES.ASSIGNEE,  "Assignée"],
          [INTERVENTION_STATUSES.ACCEPTEE,  "Acceptée"],
          [INTERVENTION_STATUSES.EN_COURS,  "En cours"],
          [INTERVENTION_STATUSES.TERMINEE,  "Terminée"],
          [INTERVENTION_STATUSES.ANNULEE,   "Annulée"],
        ] as [InterventionStatus, string][]).map(([status, label]) => (
          <div key={status} className="flex items-center gap-1.5 text-xs">
            <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLOR[status] }} />
            {label}
          </div>
        ))}
      </div>

      {/* ── Styles FullCalendar ──────────────────────────────────────────── */}
      <style>{`
        .fc-planning .fc-toolbar-title { font-size: 1.1rem; font-weight: 700; }
        .fc-planning .fc-button {
          background: white !important; border: 1px solid #e2e8f0 !important;
          color: #374151 !important; font-size: 0.8125rem !important;
          padding: 0.3rem 0.75rem !important; border-radius: 0.5rem !important;
          box-shadow: 0 1px 2px rgba(0,0,0,.05) !important;
          text-transform: none !important; font-weight: 500 !important;
        }
        .fc-planning .fc-button:hover { background: #f9fafb !important; }
        .fc-planning .fc-button-active,
        .fc-planning .fc-button-primary:not(:disabled):active {
          background: #eff6ff !important; border-color: #bfdbfe !important; color: #1d4ed8 !important;
        }
        .fc-planning .fc-toolbar { padding: 0.75rem 1rem; border-bottom: 1px solid #f1f5f9; }
        .fc-planning .fc-col-header-cell { background: #f8fafc; font-size: 0.8125rem; font-weight: 600; color: #64748b; }
        .fc-planning .fc-daygrid-day-number { font-size: 0.8125rem; color: #374151; padding: 4px 6px; }
        .fc-planning .fc-day-today { background: #eff6ff !important; }
        .fc-planning .fc-day-today .fc-daygrid-day-number {
          background: #2563eb; color: white; border-radius: 9999px;
          width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
        }
        .fc-planning .fc-day-selected { background: #f0fdf4 !important; outline: 2px solid #22c55e; outline-offset: -2px; }
        .fc-planning .fc-event { border-radius: 4px !important; cursor: pointer; }
        .fc-planning .fc-event:hover { filter: brightness(0.93); }
        .fc-planning .fc-more-link { font-size: 0.75rem; color: #6366f1; font-weight: 600; }
        .fc-planning .fc-daygrid-day { cursor: pointer; transition: background 0.1s; }
        .fc-planning .fc-daygrid-day:hover { background: #f8fafc !important; }
        .fc-planning .fc-now-indicator-line { border-color: #ef4444; }
        .fc-planning table { border-collapse: collapse; }
        .fc-planning .fc-scrollgrid { border-radius: 0; border: none; }
      `}</style>
    </div>
  );
}
