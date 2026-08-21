"use client";

import { FormEvent, PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { AuthenticatedHeader } from "../../../components/AuthenticatedHeader";
import { accessApi, ApiError, purchaseWishApi, type CurrentUser, type PurchaseWish } from "../../../lib/api";

type DragState = { id: string; pointerId: number; original: PurchaseWish[] };

function withPriorities(wishes: PurchaseWish[]) {
  return wishes.map((wish, priority) => ({ ...wish, priority }));
}

function moveInList(wishes: PurchaseWish[], id: string, targetIndex: number) {
  const currentIndex = wishes.findIndex((wish) => wish.id === id);
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= wishes.length || currentIndex === targetIndex) return wishes;
  const next = [...wishes];
  const [moved] = next.splice(currentIndex, 1);
  next.splice(targetIndex, 0, moved);
  return withPriorities(next);
}

export default function PurchaseWishesPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [wishes, setWishes] = useState<PurchaseWish[]>([]);
  const wishesRef = useRef<PurchaseWish[]>([]);
  const dragRef = useRef<DragState | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function replaceWishes(next: PurchaseWish[]) {
    wishesRef.current = next;
    setWishes(next);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [current, stored] = await Promise.all([accessApi.me(), purchaseWishApi.list()]);
      setUser(current);
      wishesRef.current = stored;
      setWishes(stored);
      setError("");
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) window.location.hash = "/login";
      else setError(reason instanceof ApiError ? reason.message : "Não foi possível carregar os desejos da casa.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function clearDraft() {
    setEditingId(null);
    setName("");
    setStoreUrl("");
  }

  async function saveWish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setSuccess("");
    try {
      const input = { name, storeUrl: storeUrl.trim() || null };
      await (editingId ? purchaseWishApi.update(editingId, input) : purchaseWishApi.create(input));
      const stored = await purchaseWishApi.list();
      replaceWishes(stored); clearDraft();
      setSuccess(editingId ? "Desejo atualizado." : "Desejo guardado na lista da casa.");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Não foi possível salvar o desejo.");
    } finally { setSaving(false); }
  }

  function editWish(wish: PurchaseWish) {
    setEditingId(wish.id); setName(wish.name); setStoreUrl(wish.storeUrl ?? ""); setError(""); setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteWish(wish: PurchaseWish) {
    if (!window.confirm(`Remover ${wish.name} da lista de desejos?`)) return;
    setError(""); setSuccess("");
    try {
      await purchaseWishApi.delete(wish.id);
      replaceWishes(await purchaseWishApi.list());
      if (editingId === wish.id) clearDraft();
      setSuccess("Desejo removido da lista.");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Não foi possível remover o desejo.");
    }
  }

  async function persistOrder(next: PurchaseWish[], fallback: PurchaseWish[]) {
    setReordering(true); setError(""); setSuccess("");
    try {
      replaceWishes(await purchaseWishApi.reorder(next.map((wish) => wish.id)));
      setSuccess("Prioridades atualizadas.");
    } catch (reason) {
      replaceWishes(fallback);
      setError(reason instanceof ApiError ? reason.message : "Não foi possível salvar a nova prioridade.");
    } finally { setReordering(false); }
  }

  function moveWish(id: string, offset: number) {
    if (reordering || draggedId) return;
    const original = wishesRef.current;
    const currentIndex = original.findIndex((wish) => wish.id === id);
    const next = moveInList(original, id, currentIndex + offset);
    if (next === original) return;
    replaceWishes(next);
    void persistOrder(next, original);
  }

  function startDragging(event: ReactPointerEvent<HTMLButtonElement>, id: string) {
    if (reordering) return;
    dragRef.current = { id, pointerId: event.pointerId, original: wishesRef.current };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggedId(id); setError(""); setSuccess("");
  }

  function dragOver(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-wish-id]");
    const targetId = target?.dataset.wishId;
    if (!targetId || targetId === drag.id) return;
    const targetIndex = wishesRef.current.findIndex((wish) => wish.id === targetId);
    const next = moveInList(wishesRef.current, drag.id, targetIndex);
    if (next !== wishesRef.current) replaceWishes(next);
  }

  function finishDragging(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null; setDraggedId(null);
    const next = wishesRef.current;
    if (next.map((wish) => wish.id).join() !== drag.original.map((wish) => wish.id).join()) void persistOrder(next, drag.original);
  }

  function cancelDragging(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    replaceWishes(drag.original); dragRef.current = null; setDraggedId(null);
  }

  if (loading) return <main className="center-state"><span className="loading-dot" /><p>Organizando os desejos da casa...</p></main>;
  if (!user) return <main className="center-state"><p role="alert">{error}</p><button onClick={load}>Tentar novamente</button></main>;

  return <main className="authenticated-page"><AuthenticatedHeader user={user} /><div className="wishes-shell">
    <section className="wishes-hero"><div><p className="eyebrow">PLANOS PARA A CASA</p><h1>O que seria legal ter por aqui?</h1><p>Anote agora, guarde o link e deixe as prioridades na ordem que faz sentido para todo mundo.</p></div><div className="wish-spark" aria-hidden="true"><span>♡</span><i /><i /><i /></div></section>
    {error && <p className="wishes-alert error" role="alert">{error}</p>}{success && <p className="wishes-alert success" role="status">{success}</p>}
    <div className="wishes-layout">
      <form className="wish-form" onSubmit={saveWish}><span className="postit-tape" aria-hidden="true" /><p className="eyebrow">{editingId ? "EDITANDO O DESEJO" : "NOVO DESEJO"}</p><h2>{editingId ? "Mude essa ideia" : "Anota aí!"}</h2><label>O que queremos comprar?<input autoComplete="off" maxLength={120} minLength={2} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Uma mesa para a varanda" required value={name} /></label><label>Link da loja <small>opcional</small><input inputMode="url" maxLength={500} onChange={(event) => setStoreUrl(event.target.value)} placeholder="https://..." type="url" value={storeUrl} /></label><button className="primary-button" disabled={saving} type="submit">{saving ? "Guardando..." : editingId ? "Salvar mudanças" : "Guardar desejo"}</button>{editingId && <button className="secondary-button" onClick={clearDraft} type="button">Cancelar edição</button>}</form>
      <section className="wish-list-panel"><header><div><p className="eyebrow">ORDEM DE PRIORIDADE</p><h2>{wishes.length} {wishes.length === 1 ? "ideia na lista" : "ideias na lista"}</h2></div><p>Segure o puxador e arraste. Também funciona com as setas do teclado ou os botões.</p></header>
        {wishes.length === 0 ? <div className="wishes-empty"><span>♡</span><h3>Nenhum plano anotado ainda</h3><p>Cadastre a primeira coisa que vocês gostariam de comprar para a casa.</p></div> : <div className={`wish-priority-list${draggedId ? " is-dragging" : ""}`}>{wishes.map((wish, index) => <article className={`wish-card wish-tone-${index % 4}${draggedId === wish.id ? " dragged" : ""}`} data-wish-id={wish.id} key={wish.id}>
          <button aria-label={`Arrastar ${wish.name}. Use seta para cima ou para baixo para mudar a prioridade.`} className="wish-drag-handle" disabled={reordering} onKeyDown={(event) => { if (event.key === "ArrowUp") { event.preventDefault(); moveWish(wish.id, -1); } if (event.key === "ArrowDown") { event.preventDefault(); moveWish(wish.id, 1); } }} onPointerCancel={cancelDragging} onPointerDown={(event) => startDragging(event, wish.id)} onPointerMove={dragOver} onPointerUp={finishDragging} type="button"><span aria-hidden="true">⠿</span><small>ARRASTE</small></button>
          <span className="wish-priority" aria-label={`Prioridade ${index + 1}`}>{String(index + 1).padStart(2, "0")}</span>
          <div className="wish-copy"><h3>{wish.name}</h3>{wish.storeUrl ? <a href={wish.storeUrl} rel="noopener noreferrer" target="_blank">Abrir link da loja <span aria-hidden="true">↗</span></a> : <small>Sem link de loja</small>}</div>
          <div className="wish-order-buttons"><button aria-label={`Subir ${wish.name}`} disabled={reordering || index === 0} onClick={() => moveWish(wish.id, -1)} type="button">↑</button><button aria-label={`Descer ${wish.name}`} disabled={reordering || index === wishes.length - 1} onClick={() => moveWish(wish.id, 1)} type="button">↓</button></div>
          <div className="wish-actions"><button onClick={() => editWish(wish)} type="button">Editar</button><button onClick={() => deleteWish(wish)} type="button">Excluir</button></div>
        </article>)}</div>}
      </section>
    </div>
  </div></main>;
}
