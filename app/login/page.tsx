"use client";

import { FormEvent, useEffect, useState } from "react";
import { PasswordInput } from "../../components/PasswordInput";
import { accessApi, ApiError } from "../../lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    accessApi.me().then(() => { window.location.hash = "/app"; }).catch(() => undefined);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await accessApi.login(email, password, rememberMe);
      window.location.hash = "/app";
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "A API não está disponível. Confira se o backend está rodando.");
      setLoading(false);
    }
  }

  return <main className="access-page">
    <section className="access-story">
      <a className="brand light-brand" href="#/"><span className="brand-mark light-mark">H</span><span>HOUSESTUFF</span></a>
      <div><p className="eyebrow">SUA ROTINA, SEM ATRITO</p><h1>A casa funciona melhor quando todo mundo sabe o próximo passo.</h1><p>Entre para acessar somente as tarefas e informações ligadas a você.</p></div>
      <small>Uma casa. Várias pessoas. Tudo no lugar.</small>
    </section>
    <section className="access-form-wrap">
      <form className="access-form" onSubmit={submit}>
        <div className="form-heading"><span className="step-badge">ACESSO</span><h2>Que bom ter você de volta.</h2><p>Use o acesso criado pelo administrador da sua casa.</p></div>
        <label>E-mail<input autoComplete="email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com" /></label>
        <PasswordInput autoComplete="current-password" id="login-password" label="Senha" onChange={(event) => setPassword(event.target.value)} placeholder="Sua senha" required value={password} />
        <label className="check-field"><input checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} type="checkbox" /><span>Continuar conectado neste dispositivo</span></label>
        {error && <p className="form-alert" role="alert">{error}</p>}
        <button className="primary-button" disabled={loading} type="submit">{loading ? "Entrando..." : "Entrar na minha casa"}<span aria-hidden="true">→</span></button>
        <p className="form-note">Ainda não tem acesso? Peça ao administrador para criar seu usuário.</p>
      </form>
    </section>
  </main>;
}
