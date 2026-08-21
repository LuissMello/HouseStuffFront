"use client";

import { accessApi, type CurrentUser } from "../lib/api";

export function AuthenticatedHeader({ user }: { user: CurrentUser }) {
  async function signOut() {
    await accessApi.logout();
    window.location.hash = "/login";
  }

  return <><header className="app-header">
    <a className="brand" href="#/app" aria-label="HouseStuff — minha casa"><span className="brand-mark">H</span><span>HOUSESTUFF</span></a>
    <nav aria-label="Área autenticada">
      <a href="#/app">Minha casa</a>
      <a href="#/app/routine">Calendário</a>
      <a href="#/app/pots">Potes</a>
      <a href="#/app/tasks">Tarefas</a>
      <a href="#/app/shopping">Compras</a>
      <a href="#/app/wishes">Desejos</a>
      {user.isAdministrator && <a href="#/admin/users">Usuários</a>}
    </nav>
    <div className="user-menu"><span><strong>{user.name}</strong><small>{user.residenceName ?? (user.isAdministrator ? "Administrador" : "Morador")}</small></span><button onClick={signOut}>Sair</button></div>
  </header><nav className="mobile-app-nav" aria-label="Navegação móvel"><a href="#/app"><span aria-hidden="true">⌂</span>Casa</a><a href="#/app/routine"><span aria-hidden="true">◷</span>Rotina</a><a href="#/app/pots"><span aria-hidden="true">◉</span>Potes</a><a href="#/app/tasks"><span aria-hidden="true">▣</span>Tarefas</a><a href="#/app/shopping"><span aria-hidden="true">▤</span>Compras</a><a href="#/app/wishes"><span aria-hidden="true">♡</span>Desejos</a></nav></>;
}
