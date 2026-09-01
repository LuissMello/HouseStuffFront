"use client";

import { FormEvent, useEffect, useState } from "react";
import { ApiError, calendarApi, type CalendarEntry, type CalendarEventKind, type Residence } from "../lib/api";
import { PersonAvatar } from "./PersonColor";

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toLocalDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return `${localDateKey(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function CalendarEventForm({ residence, editing, onChanged, onCancelEdit }: {
  residence: Residence;
  editing: CalendarEntry | null;
  onChanged: (message: string) => void;
  onCancelEdit: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<CalendarEventKind>("date");
  const [allDayDate, setAllDayDate] = useState(localDateKey(new Date()));
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [appliesToAll, setAppliesToAll] = useState(true);
  const [participantIds, setParticipantIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editing) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitle(editing.title); setDescription(editing.description ?? "");
    setKind(editing.kind as CalendarEventKind);
    setAllDayDate(editing.definitionDate ?? editing.date ?? localDateKey(new Date()));
    setStartsAt(toLocalDateTime(editing.startsAt)); setEndsAt(toLocalDateTime(editing.endsAt));
    setAppliesToAll(editing.appliesToAll);
    setParticipantIds(new Set(editing.participants.map((participant) => participant.userId)));
    setError("");
  }, [editing]);

  function reset() {
    setTitle(""); setDescription(""); setKind("date"); setAllDayDate(localDateKey(new Date()));
    setStartsAt(""); setEndsAt(""); setAppliesToAll(true); setParticipantIds(new Set()); setError("");
  }

  function toggleParticipant(id: string) {
    setParticipantIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const input = {
        title,
        description: description.trim() || null,
        kind,
        appliesToAll,
        allDayDate: kind === "appointment" ? null : allDayDate,
        startsAt: kind === "appointment" && startsAt ? new Date(startsAt).toISOString() : null,
        endsAt: kind === "appointment" && endsAt ? new Date(endsAt).toISOString() : null,
        participantUserIds: appliesToAll ? [] : [...participantIds],
      };
      if (editing?.eventId) await calendarApi.update(editing.eventId, input); else await calendarApi.create(input);
      const message = editing ? "Evento atualizado no calendário." : "Evento adicionado ao calendário.";
      reset(); onCancelEdit(); onChanged(message);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Não foi possível salvar o evento.");
    } finally { setSaving(false); }
  }

  return <form className="calendar-event-form" onSubmit={save}>
    <div className="calendar-form-heading"><span aria-hidden="true">＋</span><div><p className="eyebrow">{editing ? "EDITAR EVENTO" : "NOVA DATA"}</p><h2>{editing ? "Ajuste o combinado" : "Marque na agenda"}</h2></div></div>
    {error && <p className="form-alert" role="alert">{error}</p>}
    <label>Título<input autoComplete="off" maxLength={120} minLength={2} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Aniversário da Alice" required value={title} /></label>
    <fieldset className="calendar-kind"><legend>Tipo</legend>{([['date', 'Data', '□'], ['birthday', 'Aniversário', '♡'], ['appointment', 'Compromisso', '◷']] as const).map(([value, label, icon]) => <button aria-pressed={kind === value} className={kind === value ? "selected" : ""} key={value} onClick={() => setKind(value)} type="button"><span aria-hidden="true">{icon}</span>{label}</button>)}</fieldset>
    {kind === "appointment" ? <div className="calendar-time-fields"><label>Início<input onChange={(event) => setStartsAt(event.target.value)} required type="datetime-local" value={startsAt} /></label><label>Fim <small>opcional</small><input min={startsAt} onChange={(event) => setEndsAt(event.target.value)} type="datetime-local" value={endsAt} /></label></div> : <label>{kind === "birthday" ? "Data de nascimento" : "Data"}<input onChange={(event) => setAllDayDate(event.target.value)} required type="date" value={allDayDate} /></label>}
    <label>Descrição <small>opcional</small><textarea maxLength={500} onChange={(event) => setDescription(event.target.value)} placeholder="Algum detalhe para a casa lembrar..." value={description} /></label>
    <fieldset className="calendar-audience"><legend>Para quem é?</legend><label className={appliesToAll ? "selected" : ""}><input checked={appliesToAll} name="audience" onChange={() => { setAppliesToAll(true); setParticipantIds(new Set()); }} type="radio" />Todos da casa</label><label className={!appliesToAll ? "selected" : ""}><input checked={!appliesToAll} name="audience" onChange={() => setAppliesToAll(false)} type="radio" />Escolher moradores</label></fieldset>
    {!appliesToAll && <div className="calendar-members" aria-label="Moradores envolvidos">{residence.members.map((member) => <label key={member.id}><input checked={participantIds.has(member.id)} onChange={() => toggleParticipant(member.id)} type="checkbox" /><PersonAvatar name={member.name} profileColor={member.profileColor} />{member.name}</label>)}</div>}
    <button className="primary-button" disabled={saving || (!appliesToAll && participantIds.size === 0)}>{saving ? "Salvando..." : editing ? "Salvar evento" : "Adicionar à agenda"}</button>
    {editing && <button className="secondary-button" onClick={() => { reset(); onCancelEdit(); }} type="button">Cancelar edição</button>}
  </form>;
}
