"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AuthenticatedHeader } from "../../../components/AuthenticatedHeader";
import {
  accessApi,
  ApiError,
  householdTaskApi,
  potApi,
  residenceApi,
  type CurrentUser,
  type HouseholdTask,
  type HouseholdTaskKind,
  type Pot,
  type Residence,
  type TaskDifficulty,
} from "../../../lib/api";

const kindLabels: Record<HouseholdTaskKind, string> = {
  oneTime: "Única",
  reusable: "Reutilizável",
  recurring: "Recorrente",
};

const difficultyLabels: Record<TaskDifficulty, string> = {
  easy: "Fácil",
  medium: "Médio",
  hard: "Difícil",
};

type Draft = {
  potId: string;
  name: string;
  description: string;
  kind: HouseholdTaskKind;
  recurrenceDays: string;
  difficulty: TaskDifficulty;
  eligibility: "all" | "specific";
  eligibleUserIds: string[];
};

type PotFilter = Pick<Pot, "id" | "name" | "isActive">;

const emptyDraft: Draft = {
  potId: "",
  name: "",
  description: "",
  kind: "reusable",
  recurrenceDays: "",
  difficulty: "medium",
  eligibility: "all",
  eligibleUserIds: [],
};

export default function TasksAdminPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [residence, setResidence] = useState<Residence | null>(null);
  const [pots, setPots] = useState<Pot[]>([]);
  const [tasks, setTasks] = useState<HouseholdTask[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [filterPotId, setFilterPotId] = useState("all");
  const [createdAnimation, setCreatedAnimation] = useState<{ name: string; potName: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const activePots = useMemo(() => pots.filter((pot) => pot.isActive), [pots]);
  const potFilters = useMemo<PotFilter[]>(
    () => [{ id: "all", name: "Todos os potes", isActive: true }, ...pots],
    [pots],
  );
  const selectedFilterIndex = Math.max(0, potFilters.findIndex((pot) => pot.id === filterPotId));
  const selectedFilter = potFilters[selectedFilterIndex];
  const previousFilter = potFilters[(selectedFilterIndex - 1 + potFilters.length) % potFilters.length];
  const nextFilter = potFilters[(selectedFilterIndex + 1) % potFilters.length];
  const visibleTasks = useMemo(
    () => filterPotId === "all" ? tasks : tasks.filter((task) => task.potId === filterPotId),
    [tasks, filterPotId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [current, home, availablePots, storedTasks] = await Promise.all([
        accessApi.me(),
        residenceApi.current(),
        potApi.listForManagement(),
        householdTaskApi.listForManagement(),
      ]);
      setUser(current);
      setResidence(home);
      setPots(availablePots);
      setTasks(storedTasks);
      setFilterPotId((currentFilter) => currentFilter === "all" || availablePots.some((pot) => pot.id === currentFilter) ? currentFilter : "all");
      setDraft((currentDraft) => ({
        ...currentDraft,
        potId: currentDraft.potId || availablePots.find((pot) => pot.isActive)?.id || "",
      }));
      setError("");
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) window.location.hash = "/login";
      else setError("Não foi possível carregar as tarefas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function resetDraft() {
    setEditingId(null);
    setDraft({ ...emptyDraft, potId: activePots[0]?.id || "" });
  }

  function navigateFilter(offset: -1 | 1) {
    if (potFilters.length === 0) return;
    const nextIndex = (selectedFilterIndex + offset + potFilters.length) % potFilters.length;
    setFilterPotId(potFilters[nextIndex].id);
  }

  function toggleEligibleUser(userId: string) {
    setDraft((current) => ({
      ...current,
      eligibleUserIds: current.eligibleUserIds.includes(userId)
        ? current.eligibleUserIds.filter((id) => id !== userId)
        : [...current.eligibleUserIds, userId],
    }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.eligibility === "specific" && draft.eligibleUserIds.length === 0) {
      setError("Selecione pelo menos uma pessoa que pode pegar a tarefa.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const input = {
        potId: draft.potId,
        name: draft.name,
        description: draft.description,
        kind: draft.kind,
        recurrenceDays: draft.kind === "recurring" ? Number(draft.recurrenceDays) : null,
        difficulty: draft.difficulty,
        isAvailableToAllResidents: draft.eligibility === "all",
        eligibleUserIds: draft.eligibility === "specific" ? draft.eligibleUserIds : [],
      };
      const saved = editingId
        ? await householdTaskApi.update(editingId, input)
        : await householdTaskApi.create(input);
      setTasks((current) => editingId
        ? current.map((task) => task.id === saved.id ? saved : task)
        : [...current, saved].sort((a, b) => a.potName.localeCompare(b.potName) || a.name.localeCompare(b.name)));

      if (!editingId) {
        setCreatedAnimation({ name: saved.name, potName: saved.potName });
        window.setTimeout(() => setCreatedAnimation(null), 1400);
      }
      setSuccess(editingId ? "Post-it atualizado." : "Post-it dobrado e guardado no pote!");
      resetDraft();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Não foi possível salvar a tarefa.");
    } finally {
      setSaving(false);
    }
  }

  function edit(task: HouseholdTask) {
    setEditingId(task.id);
    setDraft({
      potId: task.potId,
      name: task.name,
      description: task.description ?? "",
      kind: task.kind,
      recurrenceDays: task.recurrenceDays?.toString() ?? "",
      difficulty: task.difficulty,
      eligibility: task.isAvailableToAllResidents ? "all" : "specific",
      eligibleUserIds: task.eligibleUserIds ?? [],
    });
    setSuccess("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggle(task: HouseholdTask) {
    setError("");
    setSuccess("");
    try {
      const changed = await householdTaskApi.setActive(task.id, !task.isActive);
      setTasks((current) => current.map((item) => item.id === changed.id ? changed : item));
      setSuccess(changed.isActive ? "Tarefa reativada." : "Tarefa arquivada.");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Não foi possível alterar a tarefa.");
    }
  }

  function eligibilityLabel(task: HouseholdTask) {
    if (task.isAvailableToAllResidents) return "Todos da casa";
    const names = residence?.members
      .filter((member) => task.eligibleUserIds?.includes(member.id))
      .map((member) => member.name) ?? [];
    return names.join(", ") || "Moradores selecionados";
  }

  if (loading) return <main className="center-state"><span className="loading-dot" /><p>Preparando as tarefas...</p></main>;
  if (!user) return <main className="center-state"><p role="alert">{error}</p><button onClick={load}>Tentar novamente</button></main>;

  return <main className="authenticated-page">
    <AuthenticatedHeader user={user} />
    <div className="admin-shell">
      <div className="admin-title playful-admin-title">
        <div><p className="eyebrow">MURAL DA CASA</p><h1>Post-its para sortear</h1><p>Anote a tarefa, o esforço e quem pode tirá-la do pote.</p></div>
        <span>{tasks.filter((task) => task.isActive).length} NO MURAL</span>
      </div>

      <div className="task-admin-grid">
        <form className="pot-form task-form task-postit-form" onSubmit={save}>
          <span aria-hidden="true" className="postit-tape" />
          <span className="step-badge">{editingId ? "EDITANDO O POST-IT" : "NOVO POST-IT"}</span>
          <h2>{editingId ? draft.name : "O que precisa ser feito?"}</h2>
          {activePots.length === 0 ? <div className="form-alert">Crie ou reative um pote antes de cadastrar tarefas. <a href="#/app/pots">Gerenciar potes</a></div> : <>
            <label className="note-field note-pot">Guardar no pote
              <select name="potId" onChange={(event) => setDraft({ ...draft, potId: event.target.value })} required value={draft.potId}>
                {activePots.map((pot) => <option key={pot.id} value={pot.id}>{pot.name}</option>)}
              </select>
            </label>
            <label className="note-field note-title">Minha anotação
              <input autoComplete="off" maxLength={100} minLength={2} name="name" onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Ex.: Limpar a geladeira" required value={draft.name} />
            </label>
            <label className="note-field note-description">Um lembrete <small>Opcional, até 300 caracteres</small>
              <textarea maxLength={300} name="description" onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Alguma dica para quem tirar este post-it?" value={draft.description} />
            </label>

            <fieldset className="task-kind"><legend>Qual é a dificuldade?</legend>
              {(Object.keys(difficultyLabels) as TaskDifficulty[]).map((difficulty) => <label className={draft.difficulty === difficulty ? "selected" : ""} htmlFor={`difficulty-${difficulty}`} key={difficulty}>
                <span className="sr-only">Selecionar dificuldade</span>
                <input checked={draft.difficulty === difficulty} id={`difficulty-${difficulty}`} name="difficulty" onChange={() => setDraft({ ...draft, difficulty })} type="radio" value={difficulty} />
                <span><strong>{difficultyLabels[difficulty]}</strong><small>{difficulty === "easy" ? "Rapidinha e leve" : difficulty === "medium" ? "Pede um pouco de dedicação" : "Mais esforço ou tempo"}</small></span>
              </label>)}
            </fieldset>

            <fieldset className="task-eligibility"><legend>Quem pode pegar?</legend>
              <label className={draft.eligibility === "all" ? "selected" : ""}>
                <span className="sr-only">Disponível para todos da casa</span>
                <input checked={draft.eligibility === "all"} name="eligibility" onChange={() => setDraft({ ...draft, eligibility: "all", eligibleUserIds: [] })} type="radio" />
                <span><strong>Todos da casa</strong><small>Inclui moradores adicionados depois</small></span>
              </label>
              <label className={draft.eligibility === "specific" ? "selected" : ""}>
                <span className="sr-only">Disponível para pessoas escolhidas</span>
                <input checked={draft.eligibility === "specific"} name="eligibility" onChange={() => setDraft({ ...draft, eligibility: "specific" })} type="radio" />
                <span><strong>Escolher pessoas</strong><small>Somente os moradores marcados</small></span>
              </label>
              {draft.eligibility === "specific" && <div className="eligible-member-list">
                {residence?.members.map((member) => <label key={member.id}>
                  <span className="sr-only">Selecionar morador</span>
                  <input checked={draft.eligibleUserIds.includes(member.id)} onChange={() => toggleEligibleUser(member.id)} type="checkbox" />
                  <span className="avatar">{member.name.charAt(0).toUpperCase()}</span>
                  <span><strong>{member.name}</strong><small>{member.email}</small></span>
                </label>)}
              </div>}
            </fieldset>
            {error && <p className="form-alert" role="alert">{error}</p>}
            {success && <p className="form-success" role="status">{success}</p>}
            <button className="primary-button" disabled={saving}>{saving ? "Guardando..." : editingId ? "Atualizar post-it" : "Dobrar e guardar"}<span aria-hidden="true">↘</span></button>
            {editingId && <button className="secondary-button" onClick={resetDraft} type="button">Cancelar edição</button>}
          </>}
        </form>

        <section className="house-task-list">
          <div className="list-header task-list-header"><div><h2>Tarefas da casa</h2><span>{visibleTasks.length} NO FILTRO</span></div><small>NAVEGUE PELA PRATELEIRA</small></div>
          <div className="task-pot-shelf" aria-label="Filtro das tarefas por pote">
            <div aria-hidden="true" className="shelf-jars">
              {[previousFilter, selectedFilter, nextFilter].map((pot, index) => <span className={`shelf-jar ${index === 1 ? "selected" : "neighbor"} ${!pot.isActive ? "archived" : ""}`} key={`${pot.id}-${index}`}>
                <i className="shelf-jar-lid" /><i className="shelf-paper one" /><i className="shelf-paper two" /><strong>{pot.id === "all" ? "TODOS" : pot.name}</strong>
              </span>)}
            </div>
            <div className="shelf-plank" aria-hidden="true" />
            <div className="shelf-navigation">
              <button aria-label={`Ir para o pote anterior: ${previousFilter.name}`} onClick={() => navigateFilter(-1)} type="button">‹‹</button>
              <strong aria-live="polite">{selectedFilter.name}</strong>
              <button aria-label={`Ir para o próximo pote: ${nextFilter.name}`} onClick={() => navigateFilter(1)} type="button">››</button>
            </div>
            {!selectedFilter.isActive && <small className="archived-filter-note">Pote arquivado · tarefas preservadas</small>}
          </div>
          {visibleTasks.length === 0 ? <div className="empty-state">Nenhum post-it neste pote ainda.</div> : <div className="house-task-cards postit-board">
            {visibleTasks.map((task, index) => <article className={`task-postit postit-tone-${index % 4} ${!task.isActive ? "is-archived" : ""}`} key={task.id}>
              <span aria-hidden="true" className="postit-pin" />
              <div className="task-card-top"><span className="pot-name-chip">{task.potName}</span><span className={`state-chip ${task.isActive ? "completed" : "pending"}`}>{task.isActive ? "No pote" : "Arquivada"}</span></div>
              <h3>{task.name}</h3><p>{task.description || "Sem lembrete adicional."}</p>
              <div className="task-card-badges"><span className={`difficulty-chip ${task.difficulty}`}>{difficultyLabels[task.difficulty]}</span><span>👥 {eligibilityLabel(task)}</span></div>
              <div className="task-card-meta"><strong>{kindLabels[task.kind]}</strong>{task.kind === "recurring" && <span>A cada {task.recurrenceDays} dias</span>}</div>
              <div className="pot-actions"><button onClick={() => edit(task)} type="button">Editar</button><button className="danger-action" onClick={() => toggle(task)} type="button">{task.isActive ? "Arquivar" : "Reativar"}</button></div>
            </article>)}
          </div>}
        </section>
      </div>
    </div>

    {createdAnimation && <div aria-live="polite" className="postit-drop-scene" role="status">
      <div className="postit-folding"><span>{createdAnimation.name}</span></div>
      <div className="postit-drop-box"><span className="box-lid" /><strong>{createdAnimation.potName}</strong></div>
      <span className="sr-only">Post-it dobrado e colocado no pote {createdAnimation.potName}.</span>
    </div>}
  </main>;
}
