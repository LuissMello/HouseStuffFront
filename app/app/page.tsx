"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AuthenticatedHeader } from "../../components/AuthenticatedHeader";
import { accessApi, ApiError, assignmentApi, potApi, residenceApi, type ActiveAssignment, type CompletedAssignment, type CurrentUser, type DrawProposal, type HouseholdTaskKind, type Pot, type Residence } from "../../lib/api";

const taskKindLabels: Record<HouseholdTaskKind, string> = { oneTime: "Única", reusable: "Reutilizável", recurring: "Recorrente" };

export default function MyHomePage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [residence, setResidence] = useState<Residence | null>(null);
  const [pots, setPots] = useState<Pot[]>([]);
  const [assignment, setAssignment] = useState<ActiveAssignment | null>(null);
  const [proposal, setProposal] = useState<DrawProposal | null>(null);
  const [selectedPotId, setSelectedPotId] = useState("");
  const [excludedTaskIds, setExcludedTaskIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [confirmingCompletion, setConfirmingCompletion] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completion, setCompletion] = useState<CompletedAssignment | null>(null);
  const [error, setError] = useState("");
  const [drawError, setDrawError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const current = await accessApi.me();
      setUser(current);
      try {
        const [home, availablePots, currentAssignment] = await Promise.all([residenceApi.current(), potApi.list(), assignmentApi.current()]);
        setResidence(home);
        setPots(availablePots);
        setAssignment(currentAssignment);
        setSelectedPotId((current) => current || availablePots[0]?.id || "");
      }
      catch (reason) {
        if (reason instanceof ApiError && reason.code === "residence_not_found") { setResidence(null); setPots([]); }
        else throw reason;
      }
      setError("");
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) window.location.href = "/login";
      else setError("Não foi possível carregar sua casa.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

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
    setSelectedPotId(potId); setProposal(null); setExcludedTaskIds([]); setDrawError("");
  }

  async function drawAnother(isAnother = false) {
    if (!selectedPotId) return;
    const excluded = isAnother && proposal ? [...excludedTaskIds, proposal.taskId] : excludedTaskIds;
    setDrawing(true); setDrawError("");
    if (isAnother) { setExcludedTaskIds(excluded); setProposal(null); }
    try { setProposal(await assignmentApi.draw(selectedPotId, excluded)); }
    catch (reason) { setDrawError(reason instanceof ApiError ? reason.message : "Não foi possível sortear uma tarefa."); }
    finally { setDrawing(false); }
  }

  async function acceptProposal() {
    if (!proposal) return;
    setAccepting(true); setDrawError("");
    try { setAssignment(await assignmentApi.accept(proposal.taskId)); setProposal(null); setExcludedTaskIds([]); }
    catch (reason) { setDrawError(reason instanceof ApiError ? reason.message : "Não foi possível aceitar a tarefa."); }
    finally { setAccepting(false); }
  }

  async function completeAssignment() {
    setCompleting(true); setError("");
    try {
      const completed = await assignmentApi.completeCurrent();
      setCompletion(completed); setAssignment(null); setConfirmingCompletion(false);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Não foi possível concluir a tarefa.");
    } finally { setCompleting(false); }
  }

  if (loading) return <main className="center-state"><span className="loading-dot" /><p>Preparando sua casa...</p></main>;
  if (!user) return <main className="center-state"><p role="alert">{error}</p><button onClick={load}>Tentar novamente</button></main>;

  return <main className="authenticated-page">
    <AuthenticatedHeader user={user} />
    <div className="app-shell">
      {residence ? <>
        <section className="welcome-panel residence-welcome"><div><p className="eyebrow">MINHA CASA</p><h1>{residence.name}</h1><p>Olá, {user.name.split(" ")[0]}. Você está vendo somente as informações vinculadas a esta residência.</p></div><span className="access-ok">CASA CONECTADA</span></section>
        {completion && <section className="completion-success" aria-live="polite"><span>✓</span><div><p className="eyebrow">TAREFA CONCLUÍDA</p><h2>{completion.taskName}</h2><p>{completion.kind === "oneTime" ? "Essa tarefa única foi encerrada e não voltará ao pote." : completion.kind === "reusable" ? "Ela já está disponível novamente para os próximos sorteios." : `Ela voltará ao pote em ${new Date(completion.nextAvailableAt!).toLocaleDateString("pt-BR")}.`}</p></div><button onClick={() => setCompletion(null)} type="button">Entendi</button></section>}
        {assignment ? <section className="active-assignment"><div className="assignment-kicker"><span>TAREFA EM ANDAMENTO</span><strong>{assignment.potName}</strong></div><div><p className="eyebrow">VOCÊ ACEITOU</p><h2>{assignment.taskName}</h2><p>{assignment.description || "Faça a tarefa e marque como concluída quando terminar."}</p><div className="assignment-meta"><span>{taskKindLabels[assignment.kind]}</span>{assignment.kind === "recurring" && <span>A cada {assignment.recurrenceDays} dias</span>}<span>Aceita em {new Date(assignment.acceptedAt).toLocaleDateString("pt-BR")}</span></div>{confirmingCompletion ? <div className="completion-confirm" role="group" aria-label="Confirmar conclusão"><p>Confirmar que você terminou esta tarefa?</p><div><button className="complete-button" disabled={completing} onClick={completeAssignment} type="button">{completing ? "Concluindo..." : "Sim, concluí"}<span aria-hidden="true">✓</span></button><button className="cancel-completion" disabled={completing} onClick={() => setConfirmingCompletion(false)} type="button">Ainda não</button></div></div> : <button className="complete-button" onClick={() => setConfirmingCompletion(true)} type="button">Concluir tarefa<span aria-hidden="true">✓</span></button>}{error && <p className="assignment-error" role="alert">{error}</p>}</div></section> : <section className="draw-section">
          <div className="members-title"><div><p className="eyebrow">QUAL É A PRÓXIMA?</p><h2>Escolha um pote</h2></div><span>{pots.length} {pots.length === 1 ? "POTE ATIVO" : "POTES ATIVOS"}</span></div>
          {pots.length > 0 ? <><div className="pot-grid draw-pot-grid">{pots.map((pot, index) => <button aria-pressed={selectedPotId === pot.id} className={`pot-card pot-choice ${selectedPotId === pot.id ? "selected" : ""}`} key={pot.id} onClick={() => choosePot(pot.id)} type="button"><span className="pot-index">{String(index + 1).padStart(2, "0")}</span><span><strong>{pot.name}</strong><small>{pot.description || "Um espaço para as tarefas desta categoria."}</small></span><i>{selectedPotId === pot.id ? "ESCOLHIDO" : "ESCOLHER"}</i></button>)}</div>{!proposal && <div className="draw-controls"><p>O sorteio mostra uma proposta. A tarefa só fica com você depois do aceite.</p><button className="primary-button" disabled={drawing} onClick={() => drawAnother(false)} type="button">{drawing ? "Sorteando..." : "Sortear uma tarefa"}<span aria-hidden="true">✦</span></button></div>}</> : <div className="pot-empty"><span>◌</span><div><strong>Nenhum pote disponível</strong><p>{user.isAdministrator ? "Crie o primeiro pote para começar a organizar as tarefas da casa." : "O administrador da casa ainda não cadastrou potes."}</p></div>{user.isAdministrator && <a href="/admin/pots">Criar pote</a>}</div>}
          {proposal && <article className="proposal-card"><div className="proposal-mark">✦</div><div className="proposal-copy"><p className="eyebrow">SUA PROPOSTA</p><span>{proposal.potName} · {taskKindLabels[proposal.kind]}</span><h3>{proposal.taskName}</h3><p>{proposal.description || "Esta tarefa está pronta para ser feita."}</p>{proposal.kind === "recurring" && <small>Volta ao pote {proposal.recurrenceDays} dias após a conclusão.</small>}</div><div className="proposal-actions"><button className="primary-button" disabled={accepting} onClick={acceptProposal} type="button">{accepting ? "Aceitando..." : "Aceitar tarefa"}<span aria-hidden="true">✓</span></button><button className="secondary-button" disabled={drawing} onClick={() => drawAnother(true)} type="button">Quero outra</button></div></article>}
          {drawError && <div className="draw-error" role="alert"><p>{drawError}</p>{excludedTaskIds.length > 0 && <button onClick={() => { setExcludedTaskIds([]); setProposal(null); setDrawError(""); }} type="button">Recomeçar rodada</button>}</div>}
        </section>}
        <section className="residence-members">
          <div className="members-title"><div><p className="eyebrow">QUEM MORA AQUI</p><h2>{residence.members.length} {residence.members.length === 1 ? "pessoa" : "pessoas"}</h2></div><span>VÍNCULO PROTEGIDO</span></div>
          <div className="member-grid">{residence.members.map((member) => <article key={member.id}><span className="avatar large-avatar">{member.name.charAt(0).toUpperCase()}</span><div><strong>{member.name}</strong><small>{member.email}</small></div><span className={`role-chip ${member.isAdministrator ? "admin" : ""}`}>{member.isAdministrator ? "Administrador" : "Morador"}</span></article>)}</div>
        </section>
        {user.isAdministrator && <div className="admin-callout-grid"><a className="admin-callout" href="/admin/tasks"><div><small>ROTINA</small><strong>Cadastre as tarefas da casa</strong><p>Escolha o pote, o tipo e o intervalo de recorrência.</p></div><span aria-hidden="true">→</span></a><a className="admin-callout" href="/admin/pots"><div><small>ORGANIZAÇÃO</small><strong>Cadastre e ordene os potes</strong><p>Defina as categorias que os moradores verão.</p></div><span aria-hidden="true">→</span></a><a className="admin-callout" href="/admin/users"><div><small>ACESSOS</small><strong>Gerencie as pessoas da casa</strong><p>Crie usuários e associe acessos pendentes.</p></div><span aria-hidden="true">→</span></a></div>}
      </> : user.isAdministrator ? <section className="create-home-panel">
        <div className="create-home-copy"><p className="eyebrow">PRIMEIRO PASSO</p><h1>Dê um nome à sua casa.</h1><p>Você será associado automaticamente como administrador. Depois poderá trazer os acessos pendentes para cá.</p><div className="privacy-note"><span>✓</span><p><strong>Separação desde o início</strong>Outras casas não conseguem visualizar seus moradores.</p></div></div>
        <form onSubmit={createResidence}><span className="step-badge">CRIAR RESIDÊNCIA</span><label>Nome da casa<input autoComplete="off" maxLength={80} minLength={2} name="name" placeholder="Ex.: Casa da Família Silva" required /></label>{error && <p className="form-alert" role="alert">{error}</p>}<button className="primary-button" disabled={saving}>{saving ? "Criando..." : "Criar minha casa"}<span aria-hidden="true">→</span></button></form>
      </section> : <section className="waiting-home"><span className="waiting-icon">H</span><p className="eyebrow">VÍNCULO PENDENTE</p><h1>Sua casa está quase pronta.</h1><p>Seu acesso funciona, mas um administrador ainda precisa associar você a uma residência.</p><button onClick={load}>Verificar novamente</button></section>}
    </div>
  </main>;
}
