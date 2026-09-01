"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuthenticatedHeader } from "../../../components/AuthenticatedHeader";
import { accessApi, ApiError, shoppingApi, type CurrentUser, type ShoppingCategory, type ShoppingItem } from "../../../lib/api";

type ShoppingMode = "catalog" | "list";
type CategoryOrder = "house" | "alphabetical";
type ListPhase = "planning" | "shopping";

function CategoryCheckbox({ checked, indeterminate, disabled, label, onChange }: { checked: boolean; indeterminate: boolean; disabled: boolean; label: string; onChange: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);
  return <input aria-label={label} checked={checked} disabled={disabled} onChange={onChange} ref={ref} type="checkbox" />;
}

export default function ShoppingPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [categories, setCategories] = useState<ShoppingCategory[]>([]);
  const [mode, setMode] = useState<ShoppingMode>("catalog");
  const [order, setOrder] = useState<CategoryOrder>("house");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [listPhase, setListPhase] = useState<ListPhase>("planning");
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
    setSelectedIds((current) => new Set([...current].filter((id) => stored.some((category) => category.items.some((item) => item.id === id)))));
    setPurchasedIds((current) => new Set([...current].filter((id) => stored.some((category) => category.items.some((item) => item.id === id)))));
    return stored;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [current] = await Promise.all([accessApi.me(), refreshCatalog()]);
      setUser(current); setError("");
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) window.location.hash = "/login";
      else setError(reason instanceof ApiError ? reason.message : "Não foi possível carregar sua lista de compras.");
    } finally { setLoading(false); }
  }, [refreshCatalog]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const allItems = useMemo(() => categories.flatMap((category) => category.items), [categories]);
  const orderedCategories = useMemo(() => order === "alphabetical" ? [...categories].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")) : categories, [categories, order]);
  const remainingIds = useMemo(() => new Set([...selectedIds].filter((id) => !purchasedIds.has(id))), [purchasedIds, selectedIds]);

  function showCatalogMessage(message: string) { setSuccess(message); setError(""); }
  function clearCategoryDraft() { setEditingCategoryId(null); setCategoryName(""); }
  function clearItemDraft() { setEditingItemId(null); setItemName(""); setItemCategoryId(categories[0]?.id ?? ""); }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setSuccess("");
    try {
      await (editingCategoryId ? shoppingApi.updateCategory(editingCategoryId, categoryName) : shoppingApi.createCategory(categoryName));
      await refreshCatalog(); clearCategoryDraft(); showCatalogMessage(editingCategoryId ? "Categoria atualizada." : "Categoria criada.");
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
    try { await shoppingApi.deleteCategory(category.id); await refreshCatalog(); showCatalogMessage("Categoria excluída."); }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : "Não foi possível excluir a categoria."); }
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setSuccess("");
    try {
      const input = { categoryId: itemCategoryId, name: itemName };
      await (editingItemId ? shoppingApi.updateItem(editingItemId, input) : shoppingApi.createItem(input));
      await refreshCatalog(); clearItemDraft(); showCatalogMessage(editingItemId ? "Item atualizado." : "Item adicionado ao catálogo.");
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : "Não foi possível salvar o item."); }
    finally { setSaving(false); }
  }

  function editItem(item: ShoppingItem) { setEditingItemId(item.id); setItemName(item.name); setItemCategoryId(item.categoryId); setMode("catalog"); setSuccess(""); setError(""); window.scrollTo({ top: 0, behavior: "smooth" }); }

  async function deleteItem(item: ShoppingItem) {
    if (!window.confirm(`Excluir ${item.name} do catálogo?`)) return;
    setError(""); setSuccess("");
    try { await shoppingApi.deleteItem(item.id); await refreshCatalog(); showCatalogMessage("Item excluído."); }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : "Não foi possível excluir o item."); }
  }

  function generateList() { setSelectedIds(new Set(allItems.map((item) => item.id))); setPurchasedIds(new Set()); setListPhase("planning"); setMode("list"); setError(""); setSuccess(""); }
  function toggleItem(id: string) { setSelectedIds((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  function toggleCategory(category: ShoppingCategory) {
    const allSelected = category.items.length > 0 && category.items.every((item) => selectedIds.has(item.id));
    setSelectedIds((current) => { const next = new Set(current); category.items.forEach((item) => allSelected ? next.delete(item.id) : next.add(item.id)); return next; });
  }
  function markPurchased(id: string) { setPurchasedIds((current) => new Set(current).add(id)); }
  function markCategoryPurchased(category: ShoppingCategory) {
    setPurchasedIds((current) => {
      const next = new Set(current);
      category.items.forEach((item) => { if (selectedIds.has(item.id)) next.add(item.id); });
      return next;
    });
  }

  if (loading) return <main className="center-state"><span className="loading-dot" /><p>Preparando as compras da casa...</p></main>;
  if (!user) return <main className="center-state"><p role="alert">{error}</p><button onClick={load}>Tentar novamente</button></main>;

  return <main className="authenticated-page"><AuthenticatedHeader user={user} /><div className="shopping-shell">
    <section className="shopping-hero"><div><p className="eyebrow">COMPRAS DA CASA</p><h1>O que está faltando?</h1><p>Organize o catálogo em categorias e monte uma lista enxuta antes de sair.</p></div><div className="shopping-bag" aria-hidden="true"><span>✓</span><i /><i /><i /></div></section>
    <div className="shopping-mode-tabs" role="tablist" aria-label="Área de compras"><button aria-selected={mode === "catalog"} className={mode === "catalog" ? "active" : ""} onClick={() => setMode("catalog")} role="tab" type="button">Cadastrar itens</button><button aria-selected={mode === "list"} className={mode === "list" ? "active" : ""} disabled={allItems.length === 0} onClick={generateList} role="tab" type="button">Gerar lista <span>{allItems.length}</span></button></div>
    {error && <p className="shopping-alert error" role="alert">{error}</p>}{success && <p className="shopping-alert success" role="status">{success}</p>}
    {mode === "catalog" ? <>
      <section className="shopping-forms">
        <form onSubmit={saveCategory}><span className="step-badge">{editingCategoryId ? "EDITAR CATEGORIA" : "NOVA CATEGORIA"}</span><h2>{editingCategoryId ? "Ajuste o nome" : "Crie uma prateleira"}</h2><label>Nome da categoria<input autoComplete="off" maxLength={60} minLength={2} onChange={(event) => setCategoryName(event.target.value)} placeholder="Ex.: Hortifruti" required value={categoryName} /></label><button className="primary-button" disabled={saving}>{saving ? "Salvando..." : editingCategoryId ? "Salvar categoria" : "Criar categoria"}</button>{editingCategoryId && <button className="secondary-button" onClick={clearCategoryDraft} type="button">Cancelar</button>}</form>
        <form onSubmit={saveItem}><span className="step-badge">{editingItemId ? "EDITAR ITEM" : "NOVO ITEM"}</span><h2>{editingItemId ? "Atualize o item" : "O que costuma faltar?"}</h2>{categories.length === 0 ? <p className="form-alert">Crie uma categoria antes de adicionar itens.</p> : <><label>Categoria<select onChange={(event) => setItemCategoryId(event.target.value)} required value={itemCategoryId}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Nome do item<input autoComplete="off" maxLength={100} minLength={2} onChange={(event) => setItemName(event.target.value)} placeholder="Ex.: Leite" required value={itemName} /></label><button className="primary-button" disabled={saving}>{saving ? "Salvando..." : editingItemId ? "Salvar item" : "Adicionar item"}</button>{editingItemId && <button className="secondary-button" onClick={clearItemDraft} type="button">Cancelar</button>}</>}</form>
      </section>
      <section className="shopping-catalog"><div className="list-header"><div><p className="eyebrow">CATÁLOGO DA CASA</p><h2>{categories.length} {categories.length === 1 ? "categoria" : "categorias"}</h2></div><button className="primary-button" disabled={allItems.length === 0} onClick={generateList} type="button">Gerar lista agora</button></div>
        {categories.length === 0 ? <div className="shopping-empty"><span>▤</span><h3>Seu catálogo está vazio</h3><p>Comece criando uma categoria, como Mercado, Limpeza ou Hortifruti.</p></div> : <div className="shopping-category-grid">{categories.map((category, index) => <article className={`shopping-category-card category-tone-${index % 4}`} key={category.id}><header><div className="category-order"><button aria-label={`Mover ${category.name} para cima`} disabled={index === 0} onClick={() => moveCategory(category, -1)} type="button">↑</button><button aria-label={`Mover ${category.name} para baixo`} disabled={index === categories.length - 1} onClick={() => moveCategory(category, 1)} type="button">↓</button></div><div><small>CATEGORIA {String(index + 1).padStart(2, "0")}</small><h3>{category.name}</h3></div><div className="category-actions"><button onClick={() => { setEditingCategoryId(category.id); setCategoryName(category.name); window.scrollTo({ top: 0, behavior: "smooth" }); }} type="button">Editar</button><button onClick={() => deleteCategory(category)} type="button">Excluir</button></div></header>{category.items.length === 0 ? <p className="category-empty">Nenhum item cadastrado.</p> : <ul>{category.items.map((item) => <li key={item.id}><span>{item.name}</span><div><button onClick={() => editItem(item)} type="button">Editar</button><button onClick={() => deleteItem(item)} type="button">Excluir</button></div></li>)}</ul>}</article>)}</div>}
      </section>
    </> : <section className={`generated-list ${listPhase === "shopping" ? "shopping-in-progress" : ""}`}>
      <div className="generated-list-head"><div><p className="eyebrow">{listPhase === "planning" ? "PREPARE A LISTA" : "LISTA DE HOJE"}</p><h2>{listPhase === "planning" ? `${selectedIds.size} de ${allItems.length} itens selecionados` : `${remainingIds.size} ${remainingIds.size === 1 ? "item falta" : "itens faltam"}`}</h2><p>{listPhase === "planning" ? "Desmarque o que não precisa comprar desta vez." : "Marque o que já colocou no carrinho. O item comprado sai da lista."}</p></div><label>Ordenar categorias<select onChange={(event) => setOrder(event.target.value as CategoryOrder)} value={order}><option value="house">Ordem da casa</option><option value="alphabetical">Ordem alfabética</option></select></label></div>
      {listPhase === "planning" ? <>
        <div className="generated-actions"><button onClick={() => setSelectedIds(new Set(allItems.map((item) => item.id)))} type="button">Selecionar tudo</button><button onClick={() => setSelectedIds(new Set())} type="button">Limpar seleção</button><button className="secondary-button" onClick={() => setMode("catalog")} type="button">Voltar ao catálogo</button><button className="primary-button start-shopping" disabled={selectedIds.size === 0} onClick={() => setListPhase("shopping")} type="button">Começar compras</button></div>
        {orderedCategories.map((category) => { const selectedCount = category.items.filter((item) => selectedIds.has(item.id)).length; const checked = category.items.length > 0 && selectedCount === category.items.length; const partial = selectedCount > 0 && !checked; return <article className={`generated-category ${partial ? "partial" : ""}`} key={category.id}><header><CategoryCheckbox checked={checked} disabled={category.items.length === 0} indeterminate={partial} label={`${checked ? "Desselecionar" : "Selecionar"} categoria ${category.name}`} onChange={() => toggleCategory(category)} /><div><h3>{category.name}</h3><span>{selectedCount}/{category.items.length} selecionados{partial ? " · seleção parcial" : ""}</span></div></header>{category.items.length === 0 ? <p>Sem itens nesta categoria.</p> : <ul>{category.items.map((item) => <li className={selectedIds.has(item.id) ? "selected" : ""} key={item.id}><label><input checked={selectedIds.has(item.id)} onChange={() => toggleItem(item.id)} type="checkbox" /><span>{item.name}</span></label></li>)}</ul>}</article>; })}
        {selectedIds.size === 0 && <div className="shopping-empty compact"><span>○</span><h3>Nada selecionado ainda</h3><p>Escolha uma categoria inteira ou apenas os itens necessários.</p></div>}
      </> : <>
        <div className="generated-actions shopping-progress-actions"><span>{purchasedIds.size} {purchasedIds.size === 1 ? "item comprado" : "itens comprados"}</span><button onClick={() => { setPurchasedIds(new Set()); setListPhase("planning"); }} type="button">Refazer seleção</button><button className="secondary-button" onClick={() => setMode("catalog")} type="button">Voltar ao catálogo</button></div>
        <div aria-live="polite" className="remaining-shopping-list">{orderedCategories.map((category) => { const remainingItems = category.items.filter((item) => remainingIds.has(item.id)); if (remainingItems.length === 0) return null; return <article className="generated-category shopping-category" key={category.id}><header><CategoryCheckbox checked={false} disabled={false} indeterminate={false} label={`Marcar categoria ${category.name} como comprada`} onChange={() => markCategoryPurchased(category)} /><div><h3>{category.name}</h3><span>{remainingItems.length} {remainingItems.length === 1 ? "item pendente" : "itens pendentes"}</span></div></header><ul>{remainingItems.map((item) => <li className="shopping-pending-item" key={item.id}><label><input aria-label={`Marcar ${item.name} como comprado`} checked={false} onChange={() => markPurchased(item.id)} type="checkbox" /><span>{item.name}</span></label><small>Marcar como comprado</small></li>)}</ul></article>; })}</div>
        {remainingIds.size === 0 && <div className="shopping-empty compact shopping-complete" role="status"><span>✓</span><h3>Compras concluídas!</h3><p>Todos os itens desta lista já foram comprados. O catálogo continua pronto para a próxima vez.</p><button className="primary-button" onClick={generateList} type="button">Gerar nova lista</button></div>}
      </>}
    </section>}
  </div></main>;
}
