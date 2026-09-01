"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { accessApi, ApiError, type CurrentUser } from "../lib/api";
import { normalizeProfileColor, PersonAvatar, profileColors, safeProfileColor } from "./PersonColor";

export function AuthenticatedHeader({ user }: { user: CurrentUser }) {
  const [color, setColor] = useState(safeProfileColor(user.profileColor));
  const [draftColor, setDraftColor] = useState(safeProfileColor(user.profileColor));
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
    const normalized = normalizeProfileColor(nextColor);
    if (!normalized) { setError("Use uma cor no formato #RRGGBB."); return; }
    if (normalized === color) { setOpen(false); return; }
    setSaving(normalized); setError("");
    try {
      const updated = await accessApi.updateProfileColor(normalized);
      setColor(updated.profileColor);
      setOpen(false);
      window.location.reload();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Não foi possível trocar sua cor.");
    } finally { setSaving(""); }
  }

  function saveCustomColor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void chooseColor(draftColor);
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
    <div className="user-menu"><div className="profile-color-control" ref={pickerRef}><button aria-expanded={open} aria-haspopup="dialog" className="profile-color-trigger" onClick={() => { setOpen((current) => !current); setDraftColor(color); setError(""); }} title="Escolher minha cor" type="button"><PersonAvatar name={user.name} profileColor={color} /><span><small>Minha cor</small></span></button>{open && <div aria-label="Escolha sua cor" className="profile-color-picker" role="dialog"><strong>Sua cor na casa</strong><small>Escolha qualquer cor ou use uma das sugestões.</small><div className="profile-color-options">{profileColors.map((option) => <button aria-label={option.label} aria-pressed={option.value === color} className={option.value === color ? "selected" : ""} disabled={Boolean(saving)} key={option.value} onClick={() => chooseColor(option.value)} style={{ backgroundColor: option.value }} title={option.label} type="button">{option.value === color && <span aria-hidden="true">✓</span>}</button>)}</div><form className="custom-profile-color" onSubmit={saveCustomColor}><label><span>Escolher visualmente</span><input aria-label="Escolher qualquer cor" disabled={Boolean(saving)} onChange={(event) => setDraftColor(event.target.value.toUpperCase())} type="color" value={normalizeProfileColor(draftColor) ?? color} /></label><label><span>Código hexadecimal</span><input aria-label="Código hexadecimal da cor" autoCapitalize="characters" disabled={Boolean(saving)} maxLength={7} onChange={(event) => setDraftColor(event.target.value.toUpperCase())} pattern="#[0-9A-Fa-f]{6}" placeholder="#2F6B50" spellCheck={false} type="text" value={draftColor} /></label><button className="save-custom-color" disabled={Boolean(saving) || !normalizeProfileColor(draftColor)} type="submit">{saving ? "Salvando..." : "Usar esta cor"}</button></form>{error && <small className="profile-color-error" role="alert">{error}</small>}</div>}</div><span className="user-residence"><strong>{user.name}</strong><small>{user.residenceName ?? (user.isAdministrator ? "Administrador" : "Morador")}</small></span><button className="logout-button" onClick={signOut}>Sair</button></div>
  </header><nav className="mobile-app-nav" aria-label="Navegação móvel"><a href="#/app"><span aria-hidden="true">⌂</span>Casa</a><a href="#/app/routine"><span aria-hidden="true">◷</span>Calendário</a><a href="#/app/pots"><span aria-hidden="true">◉</span>Potes</a><a href="#/app/tasks"><span aria-hidden="true">▣</span>Tarefas</a><a href="#/app/shopping"><span aria-hidden="true">▤</span>Compras</a><a href="#/app/wishes"><span aria-hidden="true">♡</span>Desejos</a></nav></>;
}
