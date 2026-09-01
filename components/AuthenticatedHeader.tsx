"use client";

import { useEffect, useRef, useState } from "react";
import { accessApi, ApiError, type CurrentUser } from "../lib/api";
import { PersonAvatar, profileColors, safeProfileColor } from "./PersonColor";

export function AuthenticatedHeader({ user }: { user: CurrentUser }) {
  const [color, setColor] = useState(safeProfileColor(user.profileColor));
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(event: PointerEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  async function chooseColor(nextColor: string) {
    if (nextColor === color) { setOpen(false); return; }
    setSaving(nextColor); setError("");
    try {
      const updated = await accessApi.updateProfileColor(nextColor);
      setColor(updated.profileColor);
      setOpen(false);
      window.location.reload();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Não foi possível trocar sua cor.");
    } finally { setSaving(""); }
  }

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
    <div className="user-menu"><div className="profile-color-control" ref={pickerRef}><button aria-expanded={open} aria-haspopup="dialog" className="profile-color-trigger" onClick={() => { setOpen((current) => !current); setError(""); }} title="Escolher minha cor" type="button"><PersonAvatar name={user.name} profileColor={color} /><span><small>Minha cor</small></span></button>{open && <div aria-label="Escolha sua cor" className="profile-color-picker" role="dialog"><strong>Sua cor na casa</strong><small>Ela identifica você nas tarefas e no calendário.</small><div>{profileColors.map((option) => <button aria-label={option.label} aria-pressed={option.value === color} className={option.value === color ? "selected" : ""} disabled={Boolean(saving)} key={option.value} onClick={() => chooseColor(option.value)} style={{ backgroundColor: option.value }} title={option.label} type="button">{option.value === color && <span aria-hidden="true">✓</span>}</button>)}</div>{saving && <small role="status">Salvando sua cor...</small>}{error && <small className="profile-color-error" role="alert">{error}</small>}</div>}</div><span className="user-residence"><strong>{user.name}</strong><small>{user.residenceName ?? (user.isAdministrator ? "Administrador" : "Morador")}</small></span><button className="logout-button" onClick={signOut}>Sair</button></div>
  </header><nav className="mobile-app-nav" aria-label="Navegação móvel"><a href="#/app"><span aria-hidden="true">⌂</span>Casa</a><a href="#/app/routine"><span aria-hidden="true">◷</span>Calendário</a><a href="#/app/pots"><span aria-hidden="true">◉</span>Potes</a><a href="#/app/tasks"><span aria-hidden="true">▣</span>Tarefas</a><a href="#/app/shopping"><span aria-hidden="true">▤</span>Compras</a><a href="#/app/wishes"><span aria-hidden="true">♡</span>Desejos</a></nav></>;
}
