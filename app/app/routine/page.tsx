"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthenticatedHeader } from "../../../components/AuthenticatedHeader";
import { buildCalendarPeriod, CalendarBoard, localDateKey, type CalendarMode } from "../../../components/CalendarBoard";
import { CalendarEventForm } from "../../../components/CalendarEventForm";
import { accessApi, ApiError, calendarApi, residenceApi, routineApi, type CalendarEntry, type CurrentUser, type HouseholdTaskKind, type Residence, type RoutineOverview } from "../../../lib/api";

const kindLabels: Record<HouseholdTaskKind, string> = { oneTime: "Única", reusable: "Reutilizável", recurring: "Recorrente" };
function dateTime(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }

export default function RoutinePage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [overview, setOverview] = useState<RoutineOverview | null>(null);
  const [residence, setResidence] = useState<Residence | null>(null);
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [mode, setMode] = useState<CalendarMode>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [editing, setEditing] = useState<CalendarEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const period = useMemo(() => buildCalendarPeriod(cursor, mode), [cursor, mode]);
  const fromDate = localDateKey(period.start);
  const toDate = localDateKey(period.end);
  const fromUtc = period.start.toISOString();
  const toUtc = period.end.toISOString();

  const refreshCalendar = useCallback(async () => {
    setCalendarLoading(true);
    try {
      const range = await calendarApi.range({ fromDate, toDate, fromUtc, toUtc });
      setEntries(range.entries); setError("");
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) window.location.hash = "/login";
      else setError(reason instanceof ApiError ? reason.message : "Não foi possível carregar este período.");
    } finally { setCalendarLoading(false); }
  }, [fromDate, toDate, fromUtc, toUtc]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [current, data, currentResidence] = await Promise.all([accessApi.me(), routineApi.overview(), residenceApi.current()]);
      setUser(current); setOverview(data); setResidence(currentResidence);
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) window.location.hash = "/login";
      else setError(reason instanceof ApiError ? reason.message : "Não foi possível carregar sua rotina.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshCalendar();
  }, [refreshCalendar]);

  async function deleteEvent(entry: CalendarEntry) {
    if (!entry.eventId || !window.confirm(`Excluir ${entry.title} do calendário?`)) return;
    setError(""); setSuccess("");
    try {
      await calendarApi.delete(entry.eventId);
      if (editing?.eventId === entry.eventId) setEditing(null);
      await refreshCalendar(); setSuccess("Evento excluído do calendário.");
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : "Não foi possível excluir o evento."); }
  }

  function changed(message: string) { setSuccess(message); setError(""); void refreshCalendar(); }
  function editEvent(entry: CalendarEntry) { setEditing(entry); setSuccess(""); setError(""); window.scrollTo({ top: 245, behavior: "smooth" }); }

  if (loading) return <main className="center-state"><span className="loading-dot" /><p>Organizando sua rotina...</p></main>;
  if (!user || !overview || !residence) return <main className="center-state"><p role="alert">{error}</p><button onClick={load}>Tentar novamente</button></main>;

  return <main className="authenticated-page"><AuthenticatedHeader user={user} /><div className="app-shell routine-shell">
    <section className="routine-hero"><div><p className="eyebrow">CALENDÁRIO DA CASA</p><h1>A casa toda,<br /><span>no mesmo ritmo.</span></h1><p>Datas, aniversários, compromissos e tarefas recorrentes juntos — com clareza sobre quem participa.</p></div><div className="routine-summary"><article><strong>{entries.length}</strong><span>NO PERÍODO</span></article><article><strong>{overview.history.length}</strong><span>CONCLUÍDAS</span></article></div></section>
    {error && <p className="calendar-message error" role="alert">{error}</p>}{success && <p className="calendar-message success" role="status">{success}</p>}
    <div className="calendar-registration"><CalendarEventForm editing={editing} onCancelEdit={() => setEditing(null)} onChanged={changed} residence={residence} /><aside><p className="eyebrow">AGENDA COMPARTILHADA</p><h2>Todo mundo sabe o que vem por aí.</h2><p>Os eventos são vistos pela casa toda. Cada cartão mostra se é para todos ou quais moradores estão envolvidos.</p><div><span>□ Datas</span><span>♡ Aniversários anuais</span><span>◷ Compromissos no seu fuso</span></div></aside></div>
    <CalendarBoard cursor={cursor} entries={entries} loading={calendarLoading} mode={mode} onCursorChange={setCursor} onDelete={deleteEvent} onEdit={editEvent} onModeChange={setMode} />
    <section className="routine-panel history-panel calendar-history"><header><div><p className="eyebrow">SUAS CONCLUSÕES</p><h2>Histórico pessoal</h2></div><span>{overview.history.length}</span></header>{overview.history.length === 0 ? <div className="routine-empty"><span>✓</span><strong>Seu histórico começa aqui</strong><p>Conclua uma tarefa para registrar sua primeira entrega.</p></div> : <div className="history-list">{overview.history.map((item) => <article key={item.assignmentId}><span className="history-check">✓</span><div><span>{item.potName} · {kindLabels[item.kind]}</span><h3>{item.taskName}</h3><small>Concluída em {dateTime(item.completedAt)}</small></div></article>)}</div>}</section>
  </div></main>;
}
