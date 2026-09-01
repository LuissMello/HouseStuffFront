"use client";

import { type CalendarEntry } from "../lib/api";
import { safeProfileColor } from "./PersonColor";

export type CalendarMode = "day" | "week" | "month";
export type CalendarPeriod = { start: Date; end: Date; days: Date[] };

export function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfDay(value: Date) { return new Date(value.getFullYear(), value.getMonth(), value.getDate()); }
function addDays(value: Date, amount: number) { const next = new Date(value); next.setDate(next.getDate() + amount); return next; }

export function buildCalendarPeriod(cursor: Date, mode: CalendarMode): CalendarPeriod {
  const selected = startOfDay(cursor);
  let start = selected;
  let end = addDays(selected, 1);
  if (mode === "week") {
    start = addDays(selected, -((selected.getDay() + 6) % 7));
    end = addDays(start, 7);
  }
  if (mode === "month") {
    const first = new Date(selected.getFullYear(), selected.getMonth(), 1);
    const last = new Date(selected.getFullYear(), selected.getMonth() + 1, 0);
    start = addDays(first, -((first.getDay() + 6) % 7));
    end = addDays(last, 7 - ((last.getDay() + 6) % 7));
  }
  const days: Date[] = [];
  for (let day = start; day < end; day = addDays(day, 1)) days.push(day);
  return { start, end, days };
}

function entriesForDay(entries: CalendarEntry[], day: Date) {
  const key = localDateKey(day);
  const nextDay = addDays(day, 1);
  return entries.filter((entry) => {
    if (entry.date) return entry.date === key;
    if (!entry.startsAt) return false;
    const start = new Date(entry.startsAt);
    if (entry.endsAt) return start < nextDay && new Date(entry.endsAt) > day;
    return start >= day && start < nextDay;
  });
}

function audience(entry: CalendarEntry) { return entry.appliesToAll ? "Todos" : entry.participants.map((participant) => participant.name).join(", "); }
function timeLabel(entry: CalendarEntry) {
  if (entry.date) return entry.kind === "birthday" ? "Dia inteiro · anual" : "Dia inteiro";
  if (!entry.startsAt) return "";
  const formatter = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return entry.endsAt ? `${formatter.format(new Date(entry.startsAt))}–${formatter.format(new Date(entry.endsAt))}` : formatter.format(new Date(entry.startsAt));
}

function CalendarChip({ entry, onEdit, onDelete }: { entry: CalendarEntry; onEdit: (entry: CalendarEntry) => void; onDelete: (entry: CalendarEntry) => void }) {
  const className = `calendar-chip ${entry.source === "task" ? "task-entry" : `event-${entry.kind}`}`;
  if (entry.source === "task") return <div className={className}><span aria-hidden="true">↻</span><strong>{entry.title}</strong><small>Tarefa recorrente · {timeLabel(entry)}</small></div>;
  return <article className={className}><button className="calendar-chip-main" onClick={() => onEdit(entry)} type="button"><span aria-hidden="true">{entry.kind === "birthday" ? "♡" : entry.kind === "appointment" ? "◷" : "□"}</span><strong>{entry.title}</strong><small>{timeLabel(entry)} · {audience(entry)}</small></button>{!entry.appliesToAll && entry.participants.length > 0 && <span aria-label={`Participantes: ${audience(entry)}`} className="calendar-participant-colors">{entry.participants.map((participant) => <i key={participant.userId} style={{ backgroundColor: safeProfileColor(participant.profileColor) }} title={participant.name} />)}</span>}<button aria-label={`Excluir ${entry.title}`} className="calendar-chip-delete" onClick={() => onDelete(entry)} type="button">×</button></article>;
}

function periodLabel(period: CalendarPeriod, cursor: Date, mode: CalendarMode) {
  if (mode === "day") return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(cursor);
  if (mode === "month") return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(cursor);
  const end = addDays(period.end, -1);
  return `${new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" }).format(period.start)} – ${new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric" }).format(end)}`;
}

export function CalendarBoard({ entries, mode, cursor, loading, onModeChange, onCursorChange, onEdit, onDelete }: {
  entries: CalendarEntry[]; mode: CalendarMode; cursor: Date; loading: boolean;
  onModeChange: (mode: CalendarMode) => void; onCursorChange: (cursor: Date) => void;
  onEdit: (entry: CalendarEntry) => void; onDelete: (entry: CalendarEntry) => void;
}) {
  const period = buildCalendarPeriod(cursor, mode);
  const todayKey = localDateKey(new Date());
  const move = (offset: number) => {
    const next = new Date(cursor);
    if (mode === "month") next.setMonth(next.getMonth() + offset);
    else next.setDate(next.getDate() + offset * (mode === "week" ? 7 : 1));
    onCursorChange(next);
  };

  return <section className={`calendar-board mode-${mode}${loading ? " is-loading" : ""}`}>
    <header className="calendar-toolbar"><div><p className="eyebrow">AGENDA DA CASA</p><h2>{periodLabel(period, cursor, mode)}</h2></div><div className="calendar-navigation"><button aria-label="Período anterior" onClick={() => move(-1)} type="button">←</button><button onClick={() => onCursorChange(new Date())} type="button">Hoje</button><button aria-label="Próximo período" onClick={() => move(1)} type="button">→</button></div><div className="calendar-modes" role="group" aria-label="Modo do calendário">{([['day', 'Dia'], ['week', 'Semana'], ['month', 'Mês']] as const).map(([value, label]) => <button aria-pressed={mode === value} className={mode === value ? "active" : ""} key={value} onClick={() => onModeChange(value)} type="button">{label}</button>)}</div></header>
    <div className="calendar-legend"><span><i className="legend-date" />Data</span><span><i className="legend-birthday" />Aniversário</span><span><i className="legend-appointment" />Compromisso</span><span><i className="legend-task" />Tarefa recorrente</span></div>
    {!loading && entries.length === 0 && <div className="calendar-empty-banner"><span aria-hidden="true">□</span><div><strong>Período livre por aqui</strong><small>Use o formulário acima para marcar a primeira data da casa.</small></div></div>}
    {mode === "month" && <div className="calendar-month"><div className="calendar-weekdays">{["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-month-grid">{period.days.map((day) => { const dayEntries = entriesForDay(entries, day); const key = localDateKey(day); return <section className={`${day.getMonth() !== cursor.getMonth() ? "outside" : ""}${key === todayKey ? " today" : ""}`} key={key}><header><time dateTime={key}>{day.getDate()}</time>{key === todayKey && <small>HOJE</small>}</header><div>{dayEntries.map((entry) => <CalendarChip entry={entry} key={entry.entryId} onDelete={onDelete} onEdit={onEdit} />)}</div></section>; })}</div></div>}
    {mode === "week" && <div className="calendar-week-grid">{period.days.map((day) => { const key = localDateKey(day); const dayEntries = entriesForDay(entries, day); return <section className={key === todayKey ? "today" : ""} key={key}><header><span>{new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(day).replace(".", "")}</span><strong>{day.getDate()}</strong></header><div>{dayEntries.length === 0 ? <small className="calendar-no-entry">Livre</small> : dayEntries.map((entry) => <CalendarChip entry={entry} key={entry.entryId} onDelete={onDelete} onEdit={onEdit} />)}</div></section>; })}</div>}
    {mode === "day" && <div className="calendar-day"><div className="calendar-all-day"><strong>DIA INTEIRO</strong><div>{entriesForDay(entries, period.start).filter((entry) => entry.date).map((entry) => <CalendarChip entry={entry} key={entry.entryId} onDelete={onDelete} onEdit={onEdit} />)}{entriesForDay(entries, period.start).filter((entry) => entry.date).length === 0 && <small>Nenhum evento de dia inteiro.</small>}</div></div><div className="calendar-timeline">{Array.from({ length: 24 }, (_, hour) => { const timed = entriesForDay(entries, period.start).filter((entry) => !entry.date && entry.startsAt && (new Date(entry.startsAt) < period.start ? 0 : new Date(entry.startsAt).getHours()) === hour); return <div className="calendar-hour" key={hour}><time>{String(hour).padStart(2, "0")}:00</time><div>{timed.map((entry) => <CalendarChip entry={entry} key={entry.entryId} onDelete={onDelete} onEdit={onEdit} />)}</div></div>; })}</div></div>}
  </section>;
}
