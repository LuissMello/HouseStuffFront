"use client";

import { useMemo, useState } from "react";
import project from "./data/project.generated.json";

type TaskArea = (typeof project.tasks)[number]["area"];
type FilterArea = "Todas" | TaskArea;

const labels = {
  completed: "Concluída",
  inProgress: "Em andamento",
  pending: "Pendente",
  blocked: "Bloqueada",
} as const;

export default function Home() {
  const [area, setArea] = useState<FilterArea>("Todas");
  const [query, setQuery] = useState("");
  const completed = project.tasks.filter((task) => task.status === "completed").length;
  const blocked = project.tasks.filter((task) => task.status === "blocked").length;
  const progress = Math.round((completed / project.tasks.length) * 100);
  const nextTask = project.tasks.find((task) => task.status === "pending");
  const currentStageIndex = project.stages.findIndex((stage) => stage.id === project.currentStageId);
  const areas = ["Todas", ...new Set(project.tasks.map((task) => task.area))] as FilterArea[];

  const visibleTasks = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return project.tasks.filter((task) =>
      (area === "Todas" || task.area === area) &&
      (!normalized || `${task.id} ${task.title} ${task.result}`.toLocaleLowerCase("pt-BR").includes(normalized)),
    );
  }, [area, query]);

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="HouseStuff — início"><span className="brand-mark">H</span><span>HOUSESTUFF</span></a>
        <nav aria-label="Navegação principal"><a className="nav-link is-active" href="#overview">Visão geral</a><a className="nav-link" href="#roadmap">Etapas</a><a className="nav-link" href="#tasks">Tarefas</a></nav>
        <a className="login-link" href="/login">Entrar <span aria-hidden="true">→</span></a>
      </header>

      <div className="shell" id="top">
        <section className="hero" id="overview">
          <div className="hero-copy">
            <p className="eyebrow">ACOMPANHAMENTO DO PROJETO</p>
            <h1>Uma casa organizada,<span>uma tarefa por vez.</span></h1>
            <p className="hero-description">Acompanhe a evolução completa do HouseStuff — da fundação técnica à rotina funcionando de ponta a ponta.</p>
          </div>
          <div className="hero-status" aria-label={`${progress}% do projeto concluído`}>
            <div className="hero-status-head"><span>ETAPA ATUAL</span><strong>{String(currentStageIndex + 1).padStart(2, "0")} / {String(project.stages.length).padStart(2, "0")}</strong></div>
            <div className="status-orbit" style={{ "--progress": `${progress * 3.6}deg` } as React.CSSProperties}><div><strong>{progress}%</strong><span>concluído</span></div></div>
            <p>{project.stages[currentStageIndex]?.name}</p>
          </div>
        </section>

        <section className="metrics" aria-label="Resumo do andamento">
          <article className="metric-card accent-card"><span className="metric-kicker">SITUAÇÃO GERAL</span><strong>Em dia</strong><p>Fundação concluída, sem bloqueios.</p></article>
          <article className="metric-card"><span className="metric-kicker">PRÓXIMA ENTREGA</span><strong className="mono">{nextTask?.id ?? "—"}</strong><p>{nextTask?.title ?? "Backlog concluído."}</p></article>
          <article className="metric-card"><span className="metric-kicker">ENTREGAS</span><strong>{completed} <small>de {project.tasks.length}</small></strong><p>Funcionalidades completas e testáveis.</p></article>
          <article className="metric-card"><span className="metric-kicker">BLOQUEIOS</span><strong>{blocked}</strong><p>{blocked ? "Existem impedimentos registrados." : "Nenhum impedimento registrado."}</p></article>
        </section>

        <section className="section" id="roadmap">
          <div className="section-heading"><div><p className="eyebrow">CAMINHO DO PRODUTO</p><h2>Etapas de evolução</h2></div><p>Sem datas artificiais. Cada etapa avança quando o resultado pode ser executado e testado.</p></div>
          <div className="stage-track">
            {project.stages.map((stage, index) => {
              const state = index < currentStageIndex ? "complete" : index === currentStageIndex ? "active" : "next";
              return <article className={`stage-card ${state}`} key={stage.id} title={stage.outcome}><span>{String(index + 1).padStart(2, "0")}</span><strong>{stage.name}</strong><i /></article>;
            })}
          </div>
        </section>

        <section className="section" id="tasks">
          <div className="section-heading task-heading">
            <div><p className="eyebrow">BACKLOG INTEGRADO</p><h2>Entregas do HouseStuff</h2></div>
            <div className="filters">
              <label><span className="sr-only">Buscar tarefas</span><input onChange={(event) => setQuery(event.target.value)} placeholder="Buscar tarefa..." type="search" value={query} /></label>
              <label><span className="sr-only">Filtrar por área</span><select value={area} onChange={(event) => setArea(event.target.value as FilterArea)}>{areas.map((item) => <option key={item}>{item}</option>)}</select></label>
            </div>
          </div>
          <div className="task-list">
            {visibleTasks.map((task) => <article className="task-row" key={task.id}>
              <span className={`task-state ${task.status}`} aria-hidden="true" />
              <strong className="task-id">{task.id}</strong>
              <div className="task-name"><strong>{task.title}</strong><span>{task.result}</span></div>
              <span className="area-chip">{task.area}</span>
              <span className={`state-chip ${task.status}`}>{labels[task.status]}</span>
            </article>)}
            {visibleTasks.length === 0 && <p className="empty-state">Nenhuma tarefa corresponde aos filtros.</p>}
          </div>
        </section>

        <footer><span>HOUSESTUFF · FONTE ÚNICA DE ACOMPANHAMENTO</span><span>Atualizado em {new Intl.DateTimeFormat("pt-BR").format(new Date(`${project.updatedAt}T12:00:00`))}</span></footer>
      </div>
    </main>
  );
}
