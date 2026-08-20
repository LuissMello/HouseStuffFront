"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AuthenticatedHeader } from "../../components/AuthenticatedHeader";
import { accessApi, ApiError, potApi, residenceApi, type CurrentUser, type Pot, type Residence } from "../../lib/api";

export default function MyHomePage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [residence, setResidence] = useState<Residence | null>(null);
  const [pots, setPots] = useState<Pot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const current = await accessApi.me();
      setUser(current);
      try {
        const [home, availablePots] = await Promise.all([residenceApi.current(), potApi.list()]);
        setResidence(home);
        setPots(availablePots);
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

  if (loading) return <main className="center-state"><span className="loading-dot" /><p>Preparando sua casa...</p></main>;
  if (!user) return <main className="center-state"><p role="alert">{error}</p><button onClick={load}>Tentar novamente</button></main>;

  return <main className="authenticated-page">
    <AuthenticatedHeader user={user} />
    <div className="app-shell">
      {residence ? <>
        <section className="welcome-panel residence-welcome"><div><p className="eyebrow">MINHA CASA</p><h1>{residence.name}</h1><p>Olá, {user.name.split(" ")[0]}. Você está vendo somente as informações vinculadas a esta residência.</p></div><span className="access-ok">CASA CONECTADA</span></section>
        <section className="pots-section">
          <div className="members-title"><div><p className="eyebrow">ORGANIZAÇÃO DA CASA</p><h2>Seus potes</h2></div><span>{pots.length} {pots.length === 1 ? "POTE ATIVO" : "POTES ATIVOS"}</span></div>
          {pots.length > 0 ? <div className="pot-grid">{pots.map((pot, index) => <article className="pot-card" key={pot.id}><span className="pot-index">{String(index + 1).padStart(2, "0")}</span><div><h3>{pot.name}</h3><p>{pot.description || "Um espaço para organizar as tarefas desta categoria."}</p></div><small>DISPONÍVEL</small></article>)}</div> : <div className="pot-empty"><span>◌</span><div><strong>Nenhum pote disponível</strong><p>{user.isAdministrator ? "Crie o primeiro pote para começar a organizar as tarefas da casa." : "O administrador da casa ainda não cadastrou potes."}</p></div>{user.isAdministrator && <a href="/admin/pots">Criar pote</a>}</div>}
        </section>
        <section className="residence-members">
          <div className="members-title"><div><p className="eyebrow">QUEM MORA AQUI</p><h2>{residence.members.length} {residence.members.length === 1 ? "pessoa" : "pessoas"}</h2></div><span>VÍNCULO PROTEGIDO</span></div>
          <div className="member-grid">{residence.members.map((member) => <article key={member.id}><span className="avatar large-avatar">{member.name.charAt(0).toUpperCase()}</span><div><strong>{member.name}</strong><small>{member.email}</small></div><span className={`role-chip ${member.isAdministrator ? "admin" : ""}`}>{member.isAdministrator ? "Administrador" : "Morador"}</span></article>)}</div>
        </section>
        {user.isAdministrator && <div className="admin-callout-grid"><a className="admin-callout" href="/admin/pots"><div><small>ORGANIZAÇÃO</small><strong>Cadastre e ordene os potes</strong><p>Defina as categorias que os moradores verão.</p></div><span aria-hidden="true">→</span></a><a className="admin-callout" href="/admin/users"><div><small>ACESSOS</small><strong>Gerencie as pessoas da casa</strong><p>Crie usuários e associe acessos pendentes.</p></div><span aria-hidden="true">→</span></a></div>}
      </> : user.isAdministrator ? <section className="create-home-panel">
        <div className="create-home-copy"><p className="eyebrow">PRIMEIRO PASSO</p><h1>Dê um nome à sua casa.</h1><p>Você será associado automaticamente como administrador. Depois poderá trazer os acessos pendentes para cá.</p><div className="privacy-note"><span>✓</span><p><strong>Separação desde o início</strong>Outras casas não conseguem visualizar seus moradores.</p></div></div>
        <form onSubmit={createResidence}><span className="step-badge">CRIAR RESIDÊNCIA</span><label>Nome da casa<input autoComplete="off" maxLength={80} minLength={2} name="name" placeholder="Ex.: Casa da Família Silva" required /></label>{error && <p className="form-alert" role="alert">{error}</p>}<button className="primary-button" disabled={saving}>{saving ? "Criando..." : "Criar minha casa"}<span aria-hidden="true">→</span></button></form>
      </section> : <section className="waiting-home"><span className="waiting-icon">H</span><p className="eyebrow">VÍNCULO PENDENTE</p><h1>Sua casa está quase pronta.</h1><p>Seu acesso funciona, mas um administrador ainda precisa associar você a uma residência.</p><button onClick={load}>Verificar novamente</button></section>}
    </div>
  </main>;
}
