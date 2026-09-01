"use client";

import { useEffect, useRef } from "react";
import type { CalendarEntry } from "../lib/api";
import { PersonAvatar } from "./PersonColor";

const kindLabels = { date: "Data", birthday: "Aniversário", appointment: "Compromisso" } as const;
const kindIcons = { date: "□", birthday: "♡", appointment: "◷" } as const;

function civilDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(new Date(`${value}T12:00:00`));
}

function schedule(entry: CalendarEntry) {
  if (entry.date) return `${civilDate(entry.date)}${entry.kind === "birthday" ? " · repete todo ano" : " · dia inteiro"}`;
  if (!entry.startsAt) return "Horário não informado";
  const start = new Date(entry.startsAt);
  const startText = new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short" }).format(start);
  if (!entry.endsAt) return startText;
  const end = new Date(entry.endsAt);
  const sameDay = start.toDateString() === end.toDateString();
  const endText = new Intl.DateTimeFormat("pt-BR", sameDay ? { timeStyle: "short" } : { dateStyle: "short", timeStyle: "short" }).format(end);
  return `${startText} até ${endText}`;
}

export function CalendarEventDetails({ entry, onClose, onEdit, onDelete }: {
  entry: CalendarEntry;
  onClose: () => void;
  onEdit: (entry: CalendarEntry) => void;
  onDelete: (entry: CalendarEntry) => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeOnEscape); };
  }, [onClose]);

  const kind = entry.kind as keyof typeof kindLabels;
  return <div className="calendar-details-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} role="presentation"><article aria-labelledby="calendar-details-title" aria-modal="true" className={`calendar-event-details details-${kind}`} ref={dialogRef} role="dialog" tabIndex={-1}>
    <button aria-label="Fechar detalhes" className="calendar-details-close" onClick={onClose} type="button">×</button>
    <header><span aria-hidden="true">{kindIcons[kind]}</span><div><p className="eyebrow">{kindLabels[kind]}</p><h2 id="calendar-details-title">{entry.title}</h2></div></header>
    <dl><div><dt>Quando</dt><dd>{schedule(entry)}</dd></div><div><dt>Detalhes</dt><dd>{entry.description || "Nenhuma observação adicionada."}</dd></div><div><dt>Para quem</dt><dd>{entry.appliesToAll ? <span className="calendar-everyone">Todos da casa</span> : <span className="calendar-detail-people">{entry.participants.map((participant) => <span key={participant.userId}><PersonAvatar name={participant.name} profileColor={participant.profileColor} />{participant.name}</span>)}</span>}</dd></div></dl>
    <footer><button className="primary-button" onClick={() => onEdit(entry)} type="button">Alterar evento<span aria-hidden="true">✎</span></button><button className="calendar-detail-delete" onClick={() => onDelete(entry)} type="button">Excluir</button><button className="secondary-button" onClick={onClose} type="button">Fechar</button></footer>
  </article></div>;
}
