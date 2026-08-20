"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AuthenticatedHeader } from "../../../components/AuthenticatedHeader";
import { accessApi, ApiError, potApi, type CurrentUser, type Pot } from "../../../lib/api";

export default function PotsAdminPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [pots, setPots] = useState<Pot[]>([]);
  const [editing, setEditing] = useState<Pot | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const current = await accessApi.me();
      if (!current.isAdministrator) { window.location.href = "/app"; return; }
      const items = await potApi.listAdmin();
      setUser(current); setPots(items); setError("");
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) window.location.href = "/login";
      else setError("Não foi possível carregar os potes.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSaving(true); setError(""); setSuccess("");
    try {
      const input = { name: String(data.get("name")), description: String(data.get("description")) };
      const saved = editing ? await potApi.update(editing.id, input) : await potApi.create(input);
      setPots((current) => editing ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]);
      setEditing(null); form.reset(); setSuccess(editing ? "Pote atualizado." : "Pote criado.");
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : "Não foi possível salvar o pote."); }
    finally { setSaving(false); }
  }

  async function toggle(pot: Pot) {
    setError(""); setSuccess("");
    try {
      const changed = await potApi.setActive(pot.id, !pot.isActive);
      setPots((current) => current.map((item) => item.id === changed.id ? changed : item));
      setSuccess(changed.isActive ? "Pote reativado." : "Pote arquivado.");
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : "Não foi possível alterar o pote."); }
  }

  async function move(pot: Pot, offset: number) {
    setError("");
    try { setPots(await potApi.move(pot.id, offset)); }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : "Não foi possível reordenar os potes."); }
  }

  if (loading) return <main className="center-state"><span className="loading-dot" /><p>Organizando os potes...</p></main>;
  if (!user) return <main className="center-state"><p role="alert">{error}</p><button onClick={load}>Tentar novamente</button></main>;

  return <main className="authenticated-page"><AuthenticatedHeader user={user} /><div className="admin-shell">
    <div className="admin-title"><div><p className="eyebrow">ADMINISTRAÇÃO DA CASA</p><h1>Potes</h1><p>Crie as categorias que organizam as tarefas de {user.residenceName}.</p></div><span>{pots.filter((pot) => pot.isActive).length} ATIVOS</span></div>
    <div className="pot-admin-grid">
      <form className="pot-form" onSubmit={save}><span className="step-badge">{editing ? "EDITAR POTE" : "NOVO POTE"}</span><h2>{editing ? editing.name : "Adicione uma categoria"}</h2><label>Nome<input autoComplete="off" defaultValue={editing?.name ?? ""} key={`name-${editing?.id ?? "new"}`} maxLength={60} minLength={2} name="name" placeholder="Ex.: Mensal" required /></label><label>Descrição <small>Opcional, até 200 caracteres</small><textarea defaultValue={editing?.description ?? ""} key={`description-${editing?.id ?? "new"}`} maxLength={200} name="description" placeholder="Ex.: Tarefas que aparecem uma vez por mês" /></label>{error && <p className="form-alert" role="alert">{error}</p>}{success && <p className="form-success" role="status">{success}</p>}<button className="primary-button" disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar pote"}<span aria-hidden="true">→</span></button>{editing && <button className="secondary-button" onClick={() => setEditing(null)} type="button">Cancelar edição</button>}</form>
      <section className="pot-list"><div className="list-header"><h2>Potes da casa</h2><span>ORDEM DE EXIBIÇÃO</span></div>{pots.length === 0 ? <div className="empty-state">Nenhum pote cadastrado.</div> : pots.map((pot, index) => <article className={!pot.isActive ? "is-archived" : ""} key={pot.id}><div className="pot-order"><button aria-label={`Mover ${pot.name} para cima`} disabled={index === 0} onClick={() => move(pot, -1)} type="button">↑</button><span>{String(index + 1).padStart(2, "0")}</span><button aria-label={`Mover ${pot.name} para baixo`} disabled={index === pots.length - 1} onClick={() => move(pot, 1)} type="button">↓</button></div><div className="pot-admin-copy"><div><strong>{pot.name}</strong><span className={`state-chip ${pot.isActive ? "completed" : "pending"}`}>{pot.isActive ? "Ativo" : "Arquivado"}</span></div><p>{pot.description || "Sem descrição."}</p></div><div className="pot-actions"><button onClick={() => { setEditing(pot); setSuccess(""); window.scrollTo({ top: 0, behavior: "smooth" }); }} type="button">Editar</button><button className="danger-action" onClick={() => toggle(pot)} type="button">{pot.isActive ? "Arquivar" : "Reativar"}</button></div></article>)}</section>
    </div>
  </div></main>;
}
