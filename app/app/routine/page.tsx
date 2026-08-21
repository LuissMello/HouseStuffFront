"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthenticatedHeader } from "../../../components/AuthenticatedHeader";
import { CalendarEventForm } from "../../../components/CalendarEventForm";
import { accessApi, ApiError, residenceApi, routineApi, type CurrentUser, type HouseholdTaskKind, type Residence, type RoutineOverview } from "../../../lib/api";

const kindLabels: Record<HouseholdTaskKind, string> = { oneTime: "Única", reusable: "Reutilizável", recurring: "Recorrente" };

function shortMonth(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(value)).replace(".", "").toUpperCase();
}

function fullDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(value));
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export default function RoutinePage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [overview, setOverview] = useState<RoutineOverview | null>(null);
  const [residence, setResidence] = useState<Residence | null>(null);
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [current, data, currentResidence] = await Promise.all([accessApi.me(), routineApi.overview(), residenceApi.current()]);
      setUser(current); setOverview(data); setResidence(currentResidence);
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) window.location.href = "/login";
      else setError(reason instanceof ApiError ? reason.message : "Não foi possível carregar sua rotina.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (loading) return <main className="center-state"><span className="loading-dot" /><p>Organizando sua rotina...</p></main>;
  if (!user || !overview || !residence) return <main className="center-state"><p role="alert">{error}</p><button onClick={load}>Tentar novamente</button></main>;

  return <main className="authenticated-page">
    <AuthenticatedHeader user={user} />
    <div className="app-shell routine-shell">
      <section className="routine-hero"><div><p className="eyebrow">CALENDÁRIO DA CASA</p><h1>Sua rotina,<br /><span>vista no tempo.</span></h1><p>Veja quando as tarefas recorrentes voltam ao pote e relembre o que você já concluiu.</p></div><div className="routine-summary"><article><strong>{overview.upcoming.length}</strong><span>PRÓXIMAS</span></article><article><strong>{overview.history.length}</strong><span>CONCLUÍDAS</span></article></div></section>
      {success && <p className="calendar-success" role="status">{success}</p>}
      <div className="calendar-registration"><CalendarEventForm editing={null} onCancelEdit={() => undefined} onChanged={setSuccess} residence={residence} /><aside><p className="eyebrow">AGENDA COMPARTILHADA</p><h2>Todo mundo sabe o que vem por aí.</h2><p>Cadastre datas importantes, aniversários anuais ou compromissos com horário. Na próxima etapa, tudo entra na grade diária, semanal e mensal.</p><div><span>□ Datas</span><span>♡ Aniversários</span><span>◷ Compromissos</span></div></aside></div>
      <div className="routine-grid">
        <section className="routine-panel upcoming-panel"><header><div><p className="eyebrow">PRÓXIMAS LIBERAÇÕES</p><h2>Calendário</h2></div><span>{overview.upcoming.length}</span></header>
          {overview.upcoming.length === 0 ? <div className="routine-empty"><span>◷</span><strong>Nada agendado agora</strong><p>As tarefas recorrentes aparecerão aqui depois que forem concluídas.</p></div> : <div className="upcoming-list">{overview.upcoming.map((item) => <article key={item.taskId}><time dateTime={item.nextAvailableAt}><strong>{new Date(item.nextAvailableAt).getDate().toString().padStart(2, "0")}</strong><span>{shortMonth(item.nextAvailableAt)}</span></time><div><span className="pot-name-chip">{item.potName}</span><h3>{item.taskName}</h3><p>{item.description || "Tarefa recorrente da casa."}</p><small>Disponível em {fullDate(item.nextAvailableAt)}</small></div></article>)}</div>}
        </section>
        <section className="routine-panel history-panel"><header><div><p className="eyebrow">SUAS CONCLUSÕES</p><h2>Histórico</h2></div><span>{overview.history.length}</span></header>
          {overview.history.length === 0 ? <div className="routine-empty"><span>✓</span><strong>Seu histórico começa aqui</strong><p>Conclua uma tarefa para registrar sua primeira entrega.</p></div> : <div className="history-list">{overview.history.map((item) => <article key={item.assignmentId}><span className="history-check">✓</span><div><span>{item.potName} · {kindLabels[item.kind]}</span><h3>{item.taskName}</h3><small>Concluída em {dateTime(item.completedAt)}</small></div></article>)}</div>}
        </section>
      </div>
    </div>
  </main>;
}
