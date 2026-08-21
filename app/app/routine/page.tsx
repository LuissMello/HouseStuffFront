"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthenticatedHeader } from "../../../components/AuthenticatedHeader";
import { accessApi, ApiError, routineApi, type CurrentUser, type HouseholdTaskKind, type RoutineOverview } from "../../../lib/api";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [current, data] = await Promise.all([accessApi.me(), routineApi.overview()]);
      setUser(current); setOverview(data);
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
  if (!user || !overview) return <main className="center-state"><p role="alert">{error}</p><button onClick={load}>Tentar novamente</button></main>;

  return <main className="authenticated-page">
    <AuthenticatedHeader user={user} />
    <div className="app-shell routine-shell">
      <section className="routine-hero"><div><p className="eyebrow">CALENDÁRIO DA CASA</p><h1>Sua rotina,<br /><span>vista no tempo.</span></h1><p>Veja quando as tarefas recorrentes voltam ao pote e relembre o que você já concluiu.</p></div><div className="routine-summary"><article><strong>{overview.upcoming.length}</strong><span>PRÓXIMAS</span></article><article><strong>{overview.history.length}</strong><span>CONCLUÍDAS</span></article></div></section>
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
