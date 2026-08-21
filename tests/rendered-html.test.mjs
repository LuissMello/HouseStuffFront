import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renderiza o acompanhamento do HouseStuff", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /HouseStuff — Sua casa, uma tarefa por vez/);
  assert.match(html, /Uma casa organizada/);
  assert.match(html, /HOUSE-001/);
  assert.match(html, /HOUSE-010/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|Your site is taking shape/);
});

test("renderiza a tela real de login", async () => {
  const response = await render("/login");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Que bom ter você de volta/);
  assert.match(html, /Entrar na minha casa/);
});

test("renderiza o estado inicial protegido da área administrativa", async () => {
  const response = await render("/admin/users");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Carregando usuários/);
});

test("renderiza o estado inicial da administração de potes", async () => {
  const response = await render("/admin/pots");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Organizando os potes/);
});

test("renderiza o estado inicial da administração de tarefas", async () => {
  const response = await render("/admin/tasks");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Preparando as tarefas/);
});

test("renderiza os potes na rota compartilhada pelos moradores", async () => {
  const response = await render("/app/pots");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Organizando os potes/);
});

test("renderiza as tarefas na rota compartilhada pelos moradores", async () => {
  const response = await render("/app/tasks");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Preparando as tarefas/);
});

test("renderiza o estado inicial da residência autenticada", async () => {
  const response = await render("/app");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Preparando sua casa/);
});

test("renderiza o estado inicial do calendário e histórico", async () => {
  const response = await render("/app/routine");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Organizando sua rotina/);
});

test("mantém o cadastro de tarefas com linguagem de post-it", async () => {
  const source = await readFile(new URL("../app/admin/tasks/page.tsx", import.meta.url), "utf8");
  assert.match(source, /task-postit-form/);
  assert.match(source, /O que precisa ser feito/);
  assert.match(source, /Guardar no pote/);
  assert.match(source, /postit-board/);
});

test("expõe a organização da casa a qualquer morador autenticado", async () => {
  const header = await readFile(new URL("../components/AuthenticatedHeader.tsx", import.meta.url), "utf8");
  const pots = await readFile(new URL("../app/admin/pots/page.tsx", import.meta.url), "utf8");
  const tasks = await readFile(new URL("../app/admin/tasks/page.tsx", import.meta.url), "utf8");
  assert.match(header, /href="\/app\/pots">Potes/);
  assert.match(header, /href="\/app\/tasks">Tarefas/);
  assert.doesNotMatch(pots, /!current\.isAdministrator/);
  assert.doesNotMatch(tasks, /!current\.isAdministrator/);
});

test("mantém a sequência acessível do sorteio animado", async () => {
  const page = await readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(page, /Sortear uma tarefa/);
  assert.match(page, /Qual pote você quer abrir/);
  assert.match(page, /aria-pressed=\{selected\}/);
  assert.match(page, /aria-modal="true"/);
  assert.match(styles, /@keyframes jar-shake/);
  assert.match(styles, /@keyframes postit-from-jar/);
  assert.match(styles, /prefers-reduced-motion:reduce/);
});
