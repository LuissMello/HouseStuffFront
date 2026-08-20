import assert from "node:assert/strict";
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

test("renderiza o estado inicial da residência autenticada", async () => {
  const response = await render("/app");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Preparando sua casa/);
});
