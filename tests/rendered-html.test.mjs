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

test("renderiza o estado inicial da lista de compras", async () => {
  const response = await render("/app/shopping");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Preparando as compras da casa/);
});

test("renderiza o estado inicial dos desejos da casa", async () => {
  const response = await render("/app/wishes");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Organizando os desejos da casa/);
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
  assert.match(header, /href="#\/app\/pots">Potes/);
  assert.match(header, /href="#\/app\/tasks">Tarefas/);
  assert.doesNotMatch(pots, /!current\.isAdministrator/);
  assert.doesNotMatch(tasks, /!current\.isAdministrator/);
});

test("mantém seleção individual, total e parcial na lista de compras", async () => {
  const page = await readFile(new URL("../app/app/shopping/page.tsx", import.meta.url), "utf8");
  const header = await readFile(new URL("../components/AuthenticatedHeader.tsx", import.meta.url), "utf8");
  assert.match(page, /indeterminate/);
  assert.match(page, /toggleCategory/);
  assert.match(page, /toggleItem/);
  assert.match(page, /Ordem alfabética/);
  assert.match(page, /Limpar seleção/);
  assert.match(header, /href="#\/app\/shopping">Compras/);
});

test("mantém reordenação acessível e links seguros nos desejos", async () => {
  const page = await readFile(new URL("../app/app/wishes/page.tsx", import.meta.url), "utf8");
  const header = await readFile(new URL("../components/AuthenticatedHeader.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(page, /onPointerDown/);
  assert.match(page, /document\.elementFromPoint/);
  assert.match(page, /ArrowUp/);
  assert.match(page, /ArrowDown/);
  assert.match(page, /rel="noopener noreferrer"/);
  assert.match(page, /purchaseWishApi\.reorder/);
  assert.match(styles, /touch-action:none/);
  assert.match(header, /href="#\/app\/wishes">Desejos/);
});

test("publica todas as telas com hash routing no GitHub Pages", async () => {
  const entry = await readFile(new URL("../github-pages/main.tsx", import.meta.url), "utf8");
  const config = await readFile(new URL("../vite.github-pages.config.ts", import.meta.url), "utf8");
  const workflow = await readFile(new URL("../.github/workflows/deploy-github-pages.yml", import.meta.url), "utf8");
  assert.match(entry, /window\.location\.hash/);
  assert.match(entry, /"\/app\/routine"/);
  assert.match(entry, /"\/app\/shopping"/);
  assert.match(entry, /"\/admin\/users"/);
  assert.match(config, /base: "\/HouseStuffFront\/"/);
  assert.match(config, /https:\/\/housestuffapi\.fly\.dev/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
});

test("mantém cadastro exclusivo por todos ou moradores no calendário", async () => {
  const form = await readFile(new URL("../components/CalendarEventForm.tsx", import.meta.url), "utf8");
  assert.match(form, /Data de nascimento/);
  assert.match(form, /datetime-local/);
  assert.match(form, /Todos da casa/);
  assert.match(form, /Escolher moradores/);
  assert.match(form, /setParticipantIds\(new Set\(\)\)/);
  assert.match(form, /calendarApi\.update/);
});

test("oferece calendário real diário, semanal e mensal", async () => {
  const page = await readFile(new URL("../app/app/routine/page.tsx", import.meta.url), "utf8");
  const board = await readFile(new URL("../components/CalendarBoard.tsx", import.meta.url), "utf8");
  assert.match(board, /\['day', 'Dia'\]/);
  assert.match(board, /\['week', 'Semana'\]/);
  assert.match(board, /\['month', 'Mês'\]/);
  assert.match(board, /Período anterior/);
  assert.match(board, />Hoje</);
  assert.match(board, /calendar-month-grid/);
  assert.match(board, /calendar-week-grid/);
  assert.match(board, /calendar-timeline/);
  assert.match(board, /todayKey/);
  assert.match(page, /calendarApi\.range/);
  assert.match(page, /routineApi\.overview/);
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
