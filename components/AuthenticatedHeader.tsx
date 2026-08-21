"use client";

import { accessApi, type CurrentUser } from "../lib/api";

export function AuthenticatedHeader({ user }: { user: CurrentUser }) {
  async function signOut() {
    await accessApi.logout();
    window.location.href = "/login";
  }

  return <><header className="app-header">
    <a className="brand" href="/app" aria-label="HouseStuff — minha casa"><span className="brand-mark">H</span><span>HOUSESTUFF</span></a>
    <nav aria-label="Área autenticada">
      <a href="/app">Minha casa</a>
      <a href="/app/routine">Calendário</a>
      {user.isAdministrator && <a href="/admin/users">Usuários</a>}
      {user.isAdministrator && <a href="/admin/pots">Potes</a>}
      {user.isAdministrator && <a href="/admin/tasks">Tarefas</a>}
    </nav>
    <div className="user-menu"><span><strong>{user.name}</strong><small>{user.residenceName ?? (user.isAdministrator ? "Administrador" : "Morador")}</small></span><button onClick={signOut}>Sair</button></div>
  </header><nav className="mobile-app-nav" aria-label="Navegação móvel"><a href="/app"><span aria-hidden="true">⌂</span>Casa</a><a href="/app/routine"><span aria-hidden="true">◷</span>Rotina</a></nav></>;
}
