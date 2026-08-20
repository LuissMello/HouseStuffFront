"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AuthenticatedHeader } from "../../../components/AuthenticatedHeader";
import { accessApi, ApiError, residenceApi, type CurrentUser, type UserSummary } from "../../../lib/api";

export default function UsersPage() {
  const [current, setCurrent] = useState<CurrentUser | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState("");

  const load = useCallback(async () => {
    try {
      const me = await accessApi.me();
      if (!me.isAdministrator) { window.location.href = "/app"; return; }
      setCurrent(me);
      setUsers(await accessApi.listUsers());
      setError("");
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) window.location.href = "/login";
      else setError("Não foi possível carregar os usuários.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // A carga começa após a montagem; as atualizações de estado ocorrem após I/O assíncrono.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSaving(true); setError(""); setSuccess("");
    try {
      const created = await accessApi.createUser({
        name: String(form.get("name")), email: String(form.get("email")),
        temporaryPassword: String(form.get("password")), isAdministrator: form.get("administrator") === "on",
      });
      setUsers((items) => [...items, created].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      setSuccess(`Acesso de ${created.name} criado. A pessoa já pode entrar.`);
      formElement.reset();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Não foi possível criar o usuário.");
    } finally { setSaving(false); }
  }

  async function assign(user: UserSummary) {
    setAssigning(user.id); setError(""); setSuccess("");
    try {
      const residence = await residenceApi.addMember(user.id);
      setUsers((items) => items.map((item) => item.id === user.id ? { ...item, residenceId: residence.id, residenceName: residence.name } : item));
      setSuccess(`${user.name} agora faz parte da ${residence.name}.`);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Não foi possível associar o usuário.");
    } finally { setAssigning(""); }
  }

  if (loading) return <main className="center-state"><span className="loading-dot" /><p>Carregando usuários...</p></main>;
  if (!current) return <main className="center-state"><p role="alert">{error}</p><button onClick={load}>Tentar novamente</button></main>;

  return <main className="authenticated-page">
    <AuthenticatedHeader user={current} />
    <div className="admin-shell">
      <div className="admin-title"><div><p className="eyebrow">ADMINISTRAÇÃO</p><h1>Pessoas da casa</h1><p>{current.residenceName ? `Gerencie os moradores da ${current.residenceName} e os acessos ainda pendentes.` : "Crie sua residência antes de associar moradores."}</p></div><span>{users.length} {users.length === 1 ? "acesso" : "acessos"}</span></div>
      <div className="admin-grid">
        <form className="user-form" onSubmit={submit}>
          <div><span className="step-badge">NOVO ACESSO</span><h2>Criar usuário</h2></div>
          <label>Nome completo<input name="name" required placeholder="Ex.: Luis Henrique" /></label>
          <label>E-mail<input name="email" required type="email" placeholder="luis@exemplo.com" /></label>
          <label>Senha temporária<input minLength={10} name="password" required type="password" placeholder="Mínimo de 10 caracteres" /><small>Use maiúscula, minúscula, número e símbolo.</small></label>
          <label className="check-field"><input name="administrator" type="checkbox" /><span>Este usuário também administra a casa</span></label>
          {error && <p className="form-alert" role="alert">{error}</p>}
          {success && <p className="form-success" role="status">{success}</p>}
          <button className="primary-button" disabled={saving}>{saving ? "Criando..." : "Criar acesso"}<span aria-hidden="true">→</span></button>
        </form>
        <section className="user-list" aria-label="Usuários cadastrados">
          <div className="list-header"><h2>Acessos ativos</h2><span>PERFIL</span></div>
          {users.length === 0 ? <p className="empty-state">Nenhum usuário cadastrado.</p> : users.map((user) => <article key={user.id}><span className="avatar">{user.name.charAt(0).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.residenceName ?? "Sem casa · vínculo pendente"}</small></div><div className="user-actions"><span className={`role-chip ${user.isAdministrator ? "admin" : ""}`}>{user.isAdministrator ? "Administrador" : "Morador"}</span>{!user.residenceId && current.residenceId && user.id !== current.id && <button className="assign-button" disabled={assigning === user.id} onClick={() => assign(user)}>{assigning === user.id ? "Associando..." : "Trazer para casa"}</button>}</div></article>)}
        </section>
      </div>
    </div>
  </main>;
}
