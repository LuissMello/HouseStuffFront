"use client";

import { type CSSProperties, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { AuthenticatedHeader } from "../../components/AuthenticatedHeader";
import { PersonAvatar, personColorStyle } from "../../components/PersonColor";
import { accessApi, ApiError, assignmentApi, potApi, residenceApi, type ActiveAssignment, type CompletedAssignment, type CurrentUser, type DrawProposal, type HouseholdTaskKind, type Pot, type Residence, type TaskDifficulty } from "../../lib/api";

const taskKindLabels: Record<HouseholdTaskKind, string> = { oneTime: "Única", reusable: "Reutilizável", recurring: "Recorrente" };
const difficultyLabels: Record<TaskDifficulty, string> = { easy: "Fácil", medium: "Médio", hard: "Difícil" };

type DrawStyle = CSSProperties & { "--draw-from-x": string; "--draw-from-y": string };

function waitForDrawAnimation(milliseconds: number) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return Promise.resolve();
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export default function MyHomePage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [residence, setResidence] = useState<Residence | null>(null);
  const [pots, setPots] = useState<Pot[]>([]);
  const [assignments, setAssignments] = useState<ActiveAssignment[]>([]);
  const [proposal, setProposal] = useState<DrawProposal | null>(null);
  const [choosingPot, setChoosingPot] = useState(false);
  const [selectedPotId, setSelectedPotId] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<TaskDifficulty | "">("");
  const [drawOrigin, setDrawOrigin] = useState({ x: "0px", y: "180px" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [confirmingCompletionId, setConfirmingCompletionId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completion, setCompletion] = useState<CompletedAssignment | null>(null);
  const [error, setError] = useState("");
  const [drawError, setDrawError] = useState("");
  const selectedPotRef = useRef<HTMLButtonElement | null>(null);
  const proposalRef = useRef<HTMLElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const current = await accessApi.me();
      setUser(current);
      try {
        const [home, availablePots, activeAssignments] = await Promise.all([residenceApi.current(), potApi.list(), assignmentApi.active()]);
        setResidence(home);
        setPots(availablePots);
        setAssignments(activeAssignments);
        setSelectedPotId((current) => availablePots.some((pot) => pot.id === current) ? current : "");
      }
      catch (reason) {
        if (reason instanceof ApiError && reason.code === "residence_not_found") { setResidence(null); setPots([]); }
        else throw reason;
      }
      setError("");
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) window.location.hash = "/login";
      else setError("Não foi possível carregar sua casa.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    if (!proposal) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    proposalRef.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; };
  }, [proposal]);

  async function createResidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true); setError("");
    try {
      const created = await residenceApi.create(String(form.get("name")));
      setResidence(created);
      setUser((current) => current ? { ...current, residenceId: created.id, residenceName: created.name } : current);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Não foi possível criar a casa.");
    } finally { setSaving(false); }
  }

  function choosePot(potId: string) {
    setSelectedPotId(potId); setProposal(null); setDrawError("");
  }

  async function drawTask() {
    if (!selectedPotId) return;
    setDrawing(true); setDrawError("");
    const bounds = selectedPotRef.current?.getBoundingClientRect();
    if (bounds) setDrawOrigin({ x: `${bounds.left + bounds.width / 2 - window.innerWidth / 2}px`, y: `${bounds.top + bounds.height * .38 - window.innerHeight / 2}px` });
    try {
      await waitForDrawAnimation(650);
      setProposal(await assignmentApi.draw(selectedPotId, [], selectedDifficulty || null));
    }
    catch (reason) { setDrawError(reason instanceof ApiError ? reason.message : "Não foi possível sortear uma tarefa."); }
    finally { setDrawing(false); }
  }

  async function acceptProposal() {
    if (!proposal) return;
    setAccepting(true); setDrawError("");
    try {
      const accepted = await assignmentApi.accept(proposal.taskId);
      setAssignments((current) => [accepted, ...current]);
      setProposal(null); setChoosingPot(false); setSelectedPotId(""); setSelectedDifficulty("");
    }
    catch (reason) {
      setDrawError(reason instanceof ApiError ? reason.message : "Não foi possível aceitar a tarefa.");
      if (reason instanceof ApiError && ["task_unavailable", "assignment_conflict"].includes(reason.code ?? "")) setProposal(null);
    }
    finally { setAccepting(false); }
  }

  async function completeAssignment(assignmentId: string) {
    setCompletingId(assignmentId); setError("");
    try {
      const completed = await assignmentApi.complete(assignmentId);
      setCompletion(completed);
      setAssignments((current) => current.filter((assignment) => assignment.assignmentId !== assignmentId));
      setConfirmingCompletionId(null);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Não foi possível concluir a tarefa.");
    } finally { setCompletingId(null); }
  }

  if (loading) return <main className="center-state"><span className="loading-dot" /><p>Preparando sua casa...</p></main>;
  if (!user) return <main className="center-state"><p role="alert">{error}</p><button onClick={load}>Tentar novamente</button></main>;

  return <main className="authenticated-page">
    <AuthenticatedHeader user={user} />
    <div className="app-shell">
      {residence ? <>
        <section className="welcome-panel residence-welcome"><div><p className="eyebrow">MINHA CASA</p><h1>{residence.name}</h1><p>Olá, {user.name.split(" ")[0]}. Você está vendo somente as informações vinculadas a esta residência.</p></div><span className="access-ok">CASA CONECTADA</span></section>
        {completion && <section className="completion-success" aria-live="polite" style={personColorStyle(user.profileColor)}><span>✓</span><div><p className="eyebrow">TAREFA CONCLUÍDA</p><h2>{completion.taskName}</h2><p>{completion.kind === "oneTime" ? "Essa tarefa única foi encerrada e não voltará ao pote." : completion.kind === "reusable" ? "Ela já está disponível novamente para os próximos sorteios." : `Ela voltará ao pote em ${new Date(completion.nextAvailableAt!).toLocaleDateString("pt-BR")}.`}</p></div><button onClick={() => setCompletion(null)} type="button">Entendi</button></section>}
        {assignments.length > 0 && <section className="active-assignments" style={personColorStyle(user.profileColor)}>
          <div className="active-assignments-heading"><div><p className="eyebrow">COM VOCÊ AGORA</p><h2>Seus post-its em andamento</h2></div><span>{assignments.length} {assignments.length === 1 ? "post-it" : "post-its"}</span></div>
          <div className="active-postit-grid">{assignments.map((assignment) => <article className="active-postit" key={assignment.assignmentId}>
            <span aria-hidden="true" className="active-postit-pin" />
            <div className="active-postit-top"><span>{assignment.potName}</span><strong>Com você</strong></div>
            <h3>{assignment.taskName}</h3>
            <p>{assignment.description || "Faça a tarefa e marque como concluída quando terminar."}</p>
            <div className="assignment-meta"><span>{taskKindLabels[assignment.kind]}</span><span className={`difficulty-chip ${assignment.difficulty}`}>{difficultyLabels[assignment.difficulty]}</span>{assignment.kind === "recurring" && <span>A cada {assignment.recurrenceDays} dias</span>}<span>Desde {new Date(assignment.acceptedAt).toLocaleDateString("pt-BR")}</span></div>
            {confirmingCompletionId === assignment.assignmentId ? <div className="completion-confirm" role="group" aria-label={`Confirmar conclusão de ${assignment.taskName}`}><p>Confirmar que você terminou este post-it?</p><div><button className="complete-button" disabled={completingId === assignment.assignmentId} onClick={() => completeAssignment(assignment.assignmentId)} type="button">{completingId === assignment.assignmentId ? "Concluindo..." : "Sim, concluí"}<span aria-hidden="true">✓</span></button><button className="cancel-completion" disabled={completingId === assignment.assignmentId} onClick={() => setConfirmingCompletionId(null)} type="button">Ainda não</button></div></div> : <button className="complete-button" onClick={() => setConfirmingCompletionId(assignment.assignmentId)} type="button">Concluir post-it<span aria-hidden="true">✓</span></button>}
          </article>)}</div>
          {error && <p className="assignment-error" role="alert">{error}</p>}
        </section>}
        <section className={`draw-section playful-draw ${choosingPot ? "is-choosing" : ""}`}>
          {!choosingPot ? <div className="draw-invitation">
            <div className="floating-notes" aria-hidden="true"><i /><i /><i /></div>
            <div><p className="eyebrow">QUAL É A PRÓXIMA?</p><h2>Vamos tirar um post-it?</h2><p>Escolha um dos potes da casa e deixe a sorte decidir qual tarefa vem agora.</p></div>
            <button className="primary-button playful-start" disabled={pots.length === 0} onClick={() => setChoosingPot(true)} type="button">Sortear uma tarefa<span aria-hidden="true">✦</span></button>
          </div> : <>
            <div className="members-title draw-title"><div><p className="eyebrow">PASSO 1 DE 2</p><h2>Qual pote você quer abrir?</h2></div><button className="text-button" onClick={() => { setChoosingPot(false); setSelectedPotId(""); setSelectedDifficulty(""); setDrawError(""); }} type="button">Agora não</button></div>
            {pots.length > 0 ? <>
              <div className={`jar-shelf ${selectedPotId ? "has-selection" : ""}`}>{pots.map((pot, index) => {
                const selected = selectedPotId === pot.id;
                return <button aria-label={`${pot.name}. ${pot.description || "Pote de tarefas"}${selected ? ". Selecionado" : ""}`} aria-pressed={selected} className={`task-jar jar-tone-${index % 4} ${selected ? "selected" : ""} ${selected && drawing ? "is-drawing" : ""}`} key={pot.id} onClick={() => choosePot(pot.id)} ref={selected ? selectedPotRef : null} type="button">
                  <span className="jar-lid" aria-hidden="true" />
                  <span className="jar-glass"><span className="paper-slips" aria-hidden="true"><i /><i /><i /><i /></span><span className="jar-label"><strong>{pot.name}</strong><small>{pot.description || "Tarefas para um próximo momento."}</small></span></span>
                  <span className="jar-choice">{selected ? "É esse!" : "Escolher"}</span>
                </button>;
              })}</div>
              <fieldset className={`draw-difficulty-picker ${selectedPotId ? "ready" : ""}`} disabled={!selectedPotId || drawing}><legend><span>PASSO 2 DE 2</span>Qual dificuldade você quer?</legend><div>
                <label className={selectedDifficulty === "" ? "selected" : ""}><input checked={selectedDifficulty === ""} name="draw-difficulty" onChange={() => { setSelectedDifficulty(""); setProposal(null); setDrawError(""); }} type="radio" />Surpresa</label>
                {(Object.keys(difficultyLabels) as TaskDifficulty[]).map((difficulty) => <label className={selectedDifficulty === difficulty ? `selected ${difficulty}` : difficulty} key={difficulty}><input checked={selectedDifficulty === difficulty} name="draw-difficulty" onChange={() => { setSelectedDifficulty(difficulty); setProposal(null); setDrawError(""); }} type="radio" />{difficultyLabels[difficulty]}</label>)}
              </div></fieldset>
              <div className={`draw-controls playful-controls ${selectedPotId ? "ready" : ""}`} aria-live="polite"><p>{selectedPotId ? `${selectedDifficulty ? `Dificuldade ${difficultyLabels[selectedDifficulty].toLowerCase()}` : "Qualquer dificuldade"}. O post-it sorteado será o resultado desta rodada.` : "Toque em um pote para trazer ele para perto."}</p><button className="primary-button" disabled={!selectedPotId || drawing} onClick={drawTask} type="button">{drawing ? "Misturando os post-its..." : "Tirar um post-it"}<span aria-hidden="true">↥</span></button></div>
            </> : <div className="pot-empty"><span>◌</span><div><strong>Nenhum pote disponível</strong><p>Crie o primeiro pote para começar a organizar as tarefas da casa.</p></div><a href="#/app/pots">Criar pote</a></div>}
          </>}
          {drawError && <div className="draw-error" role="alert"><p>{drawError}</p></div>}
          {proposal && <div className="proposal-backdrop" role="presentation"><article aria-labelledby="drawn-task-title" aria-modal="true" className="drawn-postit" ref={proposalRef} role="dialog" style={{ "--draw-from-x": drawOrigin.x, "--draw-from-y": drawOrigin.y } as DrawStyle} tabIndex={-1}><span aria-hidden="true" className="postit-tape" /><div className="proposal-copy"><p className="eyebrow">VOCÊ TIROU</p><span>{proposal.potName} · {taskKindLabels[proposal.kind]}</span><span className={`difficulty-chip ${proposal.difficulty}`}>{difficultyLabels[proposal.difficulty]}</span><h3 id="drawn-task-title">{proposal.taskName}</h3><p>{proposal.description || "Esta tarefa está pronta para ser feita."}</p>{proposal.kind === "recurring" && <small>Volta ao pote {proposal.recurrenceDays} dias após a conclusão.</small>}</div><div className="proposal-actions">{drawError && <p className="proposal-accept-error" role="alert">{drawError}</p>}<button className="primary-button" disabled={accepting} onClick={acceptProposal} type="button">{accepting ? "Guardando com você..." : "Fico com este post-it"}<span aria-hidden="true">✓</span></button></div></article></div>}
        </section>
        <section className="residence-members">
          <div className="members-title"><div><p className="eyebrow">QUEM MORA AQUI</p><h2>{residence.members.length} {residence.members.length === 1 ? "pessoa" : "pessoas"}</h2></div><span>VÍNCULO PROTEGIDO</span></div>
          <div className="member-grid">{residence.members.map((member) => <article key={member.id}><PersonAvatar className="large-avatar" name={member.name} profileColor={member.profileColor} /><div><strong>{member.name}</strong><small>{member.email}</small></div><span className={`role-chip ${member.isAdministrator ? "admin" : ""}`}>{member.isAdministrator ? "Administrador" : "Morador"}</span></article>)}</div>
        </section>
      </> : user.isAdministrator ? <section className="create-home-panel">
        <div className="create-home-copy"><p className="eyebrow">PRIMEIRO PASSO</p><h1>Dê um nome à sua casa.</h1><p>Você será associado automaticamente como administrador. Depois poderá trazer os acessos pendentes para cá.</p><div className="privacy-note"><span>✓</span><p><strong>Separação desde o início</strong>Outras casas não conseguem visualizar seus moradores.</p></div></div>
        <form onSubmit={createResidence}><span className="step-badge">CRIAR RESIDÊNCIA</span><label>Nome da casa<input autoComplete="off" maxLength={80} minLength={2} name="name" placeholder="Ex.: Casa da Família Silva" required /></label>{error && <p className="form-alert" role="alert">{error}</p>}<button className="primary-button" disabled={saving}>{saving ? "Criando..." : "Criar minha casa"}<span aria-hidden="true">→</span></button></form>
      </section> : <section className="waiting-home"><span className="waiting-icon">H</span><p className="eyebrow">VÍNCULO PENDENTE</p><h1>Sua casa está quase pronta.</h1><p>Seu acesso funciona, mas um administrador ainda precisa associar você a uma residência.</p><button onClick={load}>Verificar novamente</button></section>}
    </div>
  </main>;
}
