"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AuthenticatedHeader } from "../../../components/AuthenticatedHeader";
import { accessApi, ApiError, householdTaskApi, potApi, type CurrentUser, type HouseholdTask, type HouseholdTaskKind, type Pot } from "../../../lib/api";

const kindLabels: Record<HouseholdTaskKind, string> = {
  oneTime: "Única",
  reusable: "Reutilizável",
  recurring: "Recorrente",
};

type Draft = { potId: string; name: string; description: string; kind: HouseholdTaskKind; recurrenceDays: string };
const emptyDraft: Draft = { potId: "", name: "", description: "", kind: "reusable", recurrenceDays: "" };

export default function TasksAdminPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [pots, setPots] = useState<Pot[]>([]);
  const [tasks, setTasks] = useState<HouseholdTask[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [filterPotId, setFilterPotId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const activePots = useMemo(() => pots.filter((pot) => pot.isActive), [pots]);
  const visibleTasks = useMemo(() => filterPotId === "all" ? tasks : tasks.filter((task) => task.potId === filterPotId), [tasks, filterPotId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const current = await accessApi.me();
      if (!current.isAdministrator) { window.location.href = "/app"; return; }
      const [availablePots, storedTasks] = await Promise.all([potApi.listAdmin(), householdTaskApi.listAdmin()]);
      setUser(current); setPots(availablePots); setTasks(storedTasks);
      setDraft((currentDraft) => ({ ...currentDraft, potId: currentDraft.potId || availablePots.find((pot) => pot.isActive)?.id || "" }));
      setError("");
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) window.location.href = "/login";
      else setError("Não foi possível carregar as tarefas.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function resetDraft() {
    setEditingId(null);
    setDraft({ ...emptyDraft, potId: activePots[0]?.id || "" });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(""); setSuccess("");
    try {
      const input = { potId: draft.potId, name: draft.name, description: draft.description, kind: draft.kind, recurrenceDays: draft.kind === "recurring" ? Number(draft.recurrenceDays) : null };
      const saved = editingId ? await householdTaskApi.update(editingId, input) : await householdTaskApi.create(input);
      setTasks((current) => editingId ? current.map((task) => task.id === saved.id ? saved : task) : [...current, saved].sort((a, b) => a.potName.localeCompare(b.potName) || a.name.localeCompare(b.name)));
      setSuccess(editingId ? "Tarefa atualizada." : "Tarefa criada.");
      resetDraft();
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : "Não foi possível salvar a tarefa."); }
    finally { setSaving(false); }
  }

  function edit(task: HouseholdTask) {
    setEditingId(task.id);
    setDraft({ potId: task.potId, name: task.name, description: task.description ?? "", kind: task.kind, recurrenceDays: task.recurrenceDays?.toString() ?? "" });
    setSuccess(""); setError(""); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggle(task: HouseholdTask) {
    setError(""); setSuccess("");
    try {
      const changed = await householdTaskApi.setActive(task.id, !task.isActive);
      setTasks((current) => current.map((item) => item.id === changed.id ? changed : item));
      setSuccess(changed.isActive ? "Tarefa reativada." : "Tarefa arquivada.");
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : "Não foi possível alterar a tarefa."); }
  }

  if (loading) return <main className="center-state"><span className="loading-dot" /><p>Preparando as tarefas...</p></main>;
  if (!user) return <main className="center-state"><p role="alert">{error}</p><button onClick={load}>Tentar novamente</button></main>;

  return <main className="authenticated-page"><AuthenticatedHeader user={user} /><div className="admin-shell">
    <div className="admin-title playful-admin-title"><div><p className="eyebrow">MURAL DA CASA</p><h1>Post-its para sortear</h1><p>Anote uma tarefa do jeito que você lembraria dela na geladeira e guarde no pote certo.</p></div><span>{tasks.filter((task) => task.isActive).length} NO MURAL</span></div>
    <div className="task-admin-grid">
      <form className="pot-form task-form task-postit-form" onSubmit={save}><span aria-hidden="true" className="postit-tape" /><span className="step-badge">{editingId ? "EDITANDO O POST-IT" : "NOVO POST-IT"}</span><h2>{editingId ? draft.name : "O que precisa ser feito?"}</h2>
        {activePots.length === 0 ? <div className="form-alert">Crie ou reative um pote antes de cadastrar tarefas. <a href="/admin/pots">Gerenciar potes</a></div> : <>
          <label className="note-field note-pot">Guardar no pote<select name="potId" onChange={(event) => setDraft({ ...draft, potId: event.target.value })} required value={draft.potId}>{activePots.map((pot) => <option key={pot.id} value={pot.id}>{pot.name}</option>)}</select></label>
          <label className="note-field note-title">Minha anotação<input autoComplete="off" maxLength={100} minLength={2} name="name" onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Ex.: Limpar a geladeira" required value={draft.name} /></label>
          <label className="note-field note-description">Um lembrete <small>Opcional, até 300 caracteres</small><textarea maxLength={300} name="description" onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Alguma dica para quem tirar este post-it?" value={draft.description} /></label>
          <fieldset className="task-kind"><legend>Como ela funciona?</legend>{(Object.keys(kindLabels) as HouseholdTaskKind[]).map((kind) => <label className={draft.kind === kind ? "selected" : ""} htmlFor={`kind-${kind}`} key={kind}><span className="sr-only">Tipo de tarefa</span><input checked={draft.kind === kind} id={`kind-${kind}`} name="kind" onChange={() => setDraft({ ...draft, kind, recurrenceDays: kind === "recurring" ? draft.recurrenceDays : "" })} type="radio" value={kind} /><span><strong>{kindLabels[kind]}</strong><small>{kind === "oneTime" ? "Concluiu, não volta" : kind === "reusable" ? "Pode voltar ao pote" : "Volta após um intervalo"}</small></span></label>)}</fieldset>
          {draft.kind === "recurring" && <label>Intervalo em dias<input inputMode="numeric" max={3650} min={1} name="recurrenceDays" onChange={(event) => setDraft({ ...draft, recurrenceDays: event.target.value })} placeholder="Ex.: 30" required type="number" value={draft.recurrenceDays} /></label>}
          {error && <p className="form-alert" role="alert">{error}</p>}{success && <p className="form-success" role="status">{success}</p>}<button className="primary-button" disabled={saving}>{saving ? "Guardando..." : editingId ? "Atualizar post-it" : "Guardar no pote"}<span aria-hidden="true">↘</span></button>{editingId && <button className="secondary-button" onClick={resetDraft} type="button">Cancelar edição</button>}
        </>}
      </form>
      <section className="house-task-list"><div className="list-header task-list-header"><div><h2>Tarefas da casa</h2><span>{visibleTasks.length} NO FILTRO</span></div><label>Filtrar por pote<select onChange={(event) => setFilterPotId(event.target.value)} value={filterPotId}><option value="all">Todos os potes</option>{pots.map((pot) => <option key={pot.id} value={pot.id}>{pot.name}</option>)}</select></label></div>
        {visibleTasks.length === 0 ? <div className="empty-state">Nenhum post-it neste pote ainda.</div> : <div className="house-task-cards postit-board">{visibleTasks.map((task, index) => <article className={`task-postit postit-tone-${index % 4} ${!task.isActive ? "is-archived" : ""}`} key={task.id}><span aria-hidden="true" className="postit-pin" /><div className="task-card-top"><span className="pot-name-chip">{task.potName}</span><span className={`state-chip ${task.isActive ? "completed" : "pending"}`}>{task.isActive ? "No pote" : "Arquivada"}</span></div><h3>{task.name}</h3><p>{task.description || "Sem lembrete adicional."}</p><div className="task-card-meta"><strong>{kindLabels[task.kind]}</strong>{task.kind === "recurring" && <span>A cada {task.recurrenceDays} dias</span>}</div><div className="pot-actions"><button onClick={() => edit(task)} type="button">Editar</button><button className="danger-action" onClick={() => toggle(task)} type="button">{task.isActive ? "Arquivar" : "Reativar"}</button></div></article>)}</div>}
      </section>
    </div>
  </div></main>;
}
