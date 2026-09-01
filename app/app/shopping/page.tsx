"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AuthenticatedHeader } from "../../../components/AuthenticatedHeader";
import { accessApi, ApiError, shoppingApi, type CurrentUser, type ShoppingCategory, type ShoppingItem, type ShoppingPurchase } from "../../../lib/api";

type ShoppingMode = "notebook" | "manage" | "history";
type CategoryOrder = "house" | "alphabetical";

function groupPurchaseItems(purchase: ShoppingPurchase) {
  return purchase.items.reduce<Record<string, string[]>>((grouped, item) => {
    (grouped[item.categoryName] ??= []).push(item.itemName);
    return grouped;
  }, {});
}

function formatPurchaseDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short" }).format(new Date(value));
}

export default function ShoppingPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [categories, setCategories] = useState<ShoppingCategory[]>([]);
  const [history, setHistory] = useState<ShoppingPurchase[]>([]);
  const [mode, setMode] = useState<ShoppingMode>("notebook");
  const [order, setOrder] = useState<CategoryOrder>("house");
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [categoryName, setCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemCategoryId, setItemCategoryId] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const refreshCatalog = useCallback(async () => {
    const stored = await shoppingApi.catalog();
    setCategories(stored);
    setItemCategoryId((current) => stored.some((category) => category.id === current) ? current : stored[0]?.id ?? "");
    setCheckedIds((current) => new Set([...current].filter((id) => stored.some((category) => category.items.some((item) => item.id === id)))));
    return stored;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [current, , storedHistory] = await Promise.all([accessApi.me(), refreshCatalog(), shoppingApi.purchaseHistory()]);
      setUser(current);
      setHistory(storedHistory);
      setError("");
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) window.location.hash = "/login";
      else setError(reason instanceof ApiError ? reason.message : "Não foi possível carregar seu caderno de compras.");
    } finally { setLoading(false); }
  }, [refreshCatalog]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const allItems = useMemo(() => categories.flatMap((category) => category.items), [categories]);
  const orderedCategories = useMemo(() => order === "alphabetical" ? [...categories].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")) : categories, [categories, order]);
  const pendingCategories = useMemo(() => orderedCategories.filter((category) => category.items.length > 0), [orderedCategories]);

  function showMessage(message: string) { setSuccess(message); setError(""); }
  function clearCategoryDraft() { setEditingCategoryId(null); setCategoryName(""); }
  function clearItemDraft() { setEditingItemId(null); setItemName(""); setItemCategoryId(categories[0]?.id ?? ""); }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setSuccess("");
    try {
      const wasEditing = editingCategoryId !== null;
      await (editingCategoryId ? shoppingApi.updateCategory(editingCategoryId, categoryName) : shoppingApi.createCategory(categoryName));
      await refreshCatalog(); clearCategoryDraft(); showMessage(wasEditing ? "Categoria atualizada." : "Categoria criada.");
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : "Não foi possível salvar a categoria."); }
    finally { setSaving(false); }
  }

  async function moveCategory(category: ShoppingCategory, offset: number) {
    setError(""); setSuccess("");
    try { setCategories(await shoppingApi.moveCategory(category.id, offset)); }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : "Não foi possível ordenar as categorias."); }
  }

  async function deleteCategory(category: ShoppingCategory) {
    if (!window.confirm(`Excluir a categoria ${category.name}?`)) return;
    setError(""); setSuccess("");
    try { await shoppingApi.deleteCategory(category.id); await refreshCatalog(); showMessage("Categoria excluída."); }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : "Não foi possível excluir a categoria."); }
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setSuccess("");
    try {
      const wasEditing = editingItemId !== null;
      const input = { categoryId: itemCategoryId, name: itemName };
      await (editingItemId ? shoppingApi.updateItem(editingItemId, input) : shoppingApi.createItem(input));
      await refreshCatalog(); clearItemDraft(); showMessage(wasEditing ? "Item atualizado." : "Item adicionado às pendências.");
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : "Não foi possível salvar o item."); }
    finally { setSaving(false); }
  }

  function editItem(item: ShoppingItem) {
    setEditingItemId(item.id); setItemName(item.name); setItemCategoryId(item.categoryId); setMode("manage"); setSuccess(""); setError(""); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteItem(item: ShoppingItem) {
    if (!window.confirm(`Excluir ${item.name} das pendências?`)) return;
    setError(""); setSuccess("");
    try { await shoppingApi.deleteItem(item.id); await refreshCatalog(); showMessage("Item excluído."); }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : "Não foi possível excluir o item."); }
  }

  function toggleChecked(id: string) {
    setCheckedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function finishPurchase() {
    if (checkedIds.size === 0) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      await shoppingApi.completePurchase([...checkedIds]);
      const [, storedHistory] = await Promise.all([refreshCatalog(), shoppingApi.purchaseHistory()]);
      setHistory(storedHistory);
      setCheckedIds(new Set());
      showMessage("Compra finalizada e adicionada ao histórico.");
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : "Não foi possível finalizar a compra."); }
    finally { setSaving(false); }
  }

  if (loading) return <main className="center-state"><span className="loading-dot" /><p>Preparando o caderno de compras...</p></main>;
  if (!user) return <main className="center-state"><p role="alert">{error}</p><button onClick={load}>Tentar novamente</button></main>;

  return <main className="authenticated-page"><AuthenticatedHeader user={user} /><div className="shopping-shell">
    <header className="shopping-page-title"><p className="eyebrow">CADERNO DA CASA</p><h1>Compras</h1><p>Anote o que está faltando e risque o que já colocou no carrinho.</p></header>
    <div className="shopping-mode-tabs" role="tablist" aria-label="Área de compras">
      <button aria-selected={mode === "notebook"} className={mode === "notebook" ? "active" : ""} onClick={() => setMode("notebook")} role="tab" type="button">Compras <span>{allItems.length}</span></button>
      <button aria-selected={mode === "manage"} className={mode === "manage" ? "active" : ""} onClick={() => setMode("manage")} role="tab" type="button">Adicionar</button>
      <button aria-selected={mode === "history"} className={mode === "history" ? "active" : ""} onClick={() => setMode("history")} role="tab" type="button">Histórico <span>{history.length}</span></button>
    </div>
    {error && <p className="shopping-alert error" role="alert">{error}</p>}{success && <p className="shopping-alert success" role="status">{success}</p>}

    {mode === "notebook" && <section className="shopping-notebook" aria-labelledby="notebook-title">
      <div className="notebook-binding" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <i key={index} />)}</div>
      <div className="notebook-heading"><div><p>LISTA ATUAL</p><h2 id="notebook-title">Compras</h2></div><label>Ordenar<select onChange={(event) => setOrder(event.target.value as CategoryOrder)} value={order}><option value="house">Ordem da casa</option><option value="alphabetical">A–Z</option></select></label></div>
      {pendingCategories.length === 0 ? <div className="notebook-empty"><span>✓</span><h3>Nada pendente</h3><p>Use “Adicionar” para anotar o que está faltando.</p></div> : <div className="notebook-pages">{pendingCategories.map((category) => <section className="notebook-category" key={category.id}><h3>{category.name}</h3><ul>{category.items.map((item) => { const checked = checkedIds.has(item.id); return <li className={checked ? "checked" : ""} key={item.id}><label><input aria-label={`Marcar ${item.name} como comprado`} checked={checked} onChange={() => toggleChecked(item.id)} type="checkbox" /><span>{item.name}</span></label></li>; })}</ul></section>)}</div>}
      <footer className="notebook-footer"><p>{checkedIds.size === 0 ? "Marque o que já comprou" : `${checkedIds.size} ${checkedIds.size === 1 ? "item marcado" : "itens marcados"}`}</p><button className="primary-button" disabled={checkedIds.size === 0 || saving} onClick={finishPurchase} type="button">{saving ? "Finalizando..." : "Finalizar compra"}</button></footer>
    </section>}

    {mode === "manage" && <>
      <section className="shopping-forms">
        <form onSubmit={saveCategory}><span className="step-badge">{editingCategoryId ? "EDITAR CATEGORIA" : "NOVA CATEGORIA"}</span><h2>{editingCategoryId ? "Ajuste o nome" : "Crie uma categoria"}</h2><label>Nome da categoria<input autoComplete="off" maxLength={60} minLength={2} onChange={(event) => setCategoryName(event.target.value)} placeholder="Ex.: Higiene" required value={categoryName} /></label><button className="primary-button" disabled={saving}>{saving ? "Salvando..." : editingCategoryId ? "Salvar categoria" : "Criar categoria"}</button>{editingCategoryId && <button className="secondary-button" onClick={clearCategoryDraft} type="button">Cancelar</button>}</form>
        <form onSubmit={saveItem}><span className="step-badge">{editingItemId ? "EDITAR ITEM" : "NOVO ITEM"}</span><h2>{editingItemId ? "Atualize o item" : "Anote uma pendência"}</h2>{categories.length === 0 ? <p className="form-alert">Crie uma categoria antes de adicionar itens.</p> : <><label>Categoria<select onChange={(event) => setItemCategoryId(event.target.value)} required value={itemCategoryId}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Nome do item<input autoComplete="off" maxLength={100} minLength={2} onChange={(event) => setItemName(event.target.value)} placeholder="Ex.: Pasta de dente" required value={itemName} /></label><button className="primary-button" disabled={saving}>{saving ? "Salvando..." : editingItemId ? "Salvar item" : "Adicionar à lista"}</button>{editingItemId && <button className="secondary-button" onClick={clearItemDraft} type="button">Cancelar</button>}</>}</form>
      </section>
      <section className="shopping-catalog"><div className="list-header"><div><p className="eyebrow">ORGANIZAR CADERNO</p><h2>{categories.length} {categories.length === 1 ? "categoria" : "categorias"}</h2></div><button className="secondary-button" onClick={() => setMode("notebook")} type="button">Voltar às compras</button></div>
        {categories.length === 0 ? <div className="shopping-empty"><span>▤</span><h3>Seu caderno está vazio</h3><p>Comece criando uma categoria, como Higiene, Frutas ou Limpeza.</p></div> : <div className="shopping-category-grid">{categories.map((category, index) => <article className={`shopping-category-card category-tone-${index % 4}`} key={category.id}><header><div className="category-order"><button aria-label={`Mover ${category.name} para cima`} disabled={index === 0} onClick={() => moveCategory(category, -1)} type="button">↑</button><button aria-label={`Mover ${category.name} para baixo`} disabled={index === categories.length - 1} onClick={() => moveCategory(category, 1)} type="button">↓</button></div><div><small>CATEGORIA {String(index + 1).padStart(2, "0")}</small><h3>{category.name}</h3></div><div className="category-actions"><button onClick={() => { setEditingCategoryId(category.id); setCategoryName(category.name); window.scrollTo({ top: 0, behavior: "smooth" }); }} type="button">Editar</button><button onClick={() => deleteCategory(category)} type="button">Excluir</button></div></header>{category.items.length === 0 ? <p className="category-empty">Nenhum item pendente.</p> : <ul>{category.items.map((item) => <li key={item.id}><span>{item.name}</span><div><button onClick={() => editItem(item)} type="button">Editar</button><button onClick={() => deleteItem(item)} type="button">Excluir</button></div></li>)}</ul>}</article>)}</div>}
      </section>
    </>}

    {mode === "history" && <section className="purchase-history"><header><p className="eyebrow">COMPRAS FINALIZADAS</p><h2>Histórico de compras</h2><p>O que já foi comprado pela casa fica guardado aqui.</p></header>{history.length === 0 ? <div className="shopping-empty compact"><span>○</span><h3>Nenhuma compra finalizada</h3><p>Os itens aparecerão aqui depois de usar “Finalizar compra”.</p></div> : <div className="purchase-history-list">{history.map((purchase) => <article key={purchase.id}><header><strong>{formatPurchaseDate(purchase.completedAt)}</strong><span>por {purchase.completedByName}</span></header>{Object.entries(groupPurchaseItems(purchase)).map(([category, items]) => <section key={category}><h3>{category}</h3><ul>{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></section>)}</article>)}</div>}</section>}
  </div></main>;
}
