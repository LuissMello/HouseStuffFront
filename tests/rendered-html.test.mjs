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

test("converte o hash routing em rotas reais no ambiente local", async () => {
  const bridge = await readFile(new URL("../components/LocalHashNavigation.tsx", import.meta.url), "utf8");
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /<LocalHashNavigation \/>/);
  assert.match(bridge, /window\.addEventListener\("hashchange", navigate\)/);
  assert.match(bridge, /window\.location\.assign\(target\)/);
  assert.match(bridge, /route\.startsWith\("\/\/"\)/);
  assert.match(bridge, /searchParams\.get\("section"\)/);
});

test("permite mostrar e ocultar senhas sem alterar os formulários", async () => {
  const component = await readFile(new URL("../components/PasswordInput.tsx", import.meta.url), "utf8");
  const login = await readFile(new URL("../app/login/page.tsx", import.meta.url), "utf8");
  const users = await readFile(new URL("../app/admin/users/page.tsx", import.meta.url), "utf8");
  assert.match(component, /visible \? "text" : "password"/);
  assert.match(component, /aria-pressed=\{visible\}/);
  assert.match(component, /type="button"/);
  assert.match(component, /Ocultar/);
  assert.match(component, /Mostrar/);
  assert.match(login, /autoComplete="current-password"/);
  assert.match(users, /name="password"/);
});

test("renderiza o estado inicial protegido da área administrativa", async () => {
  const response = await render("/admin/users");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Carregando usuários/);
});

test("mantém alteração administrativa de perfil com confirmação", async () => {
  const page = await readFile(new URL("../app/admin/users/page.tsx", import.meta.url), "utf8");
  const api = await readFile(new URL("../lib/api.ts", import.meta.url), "utf8");
  assert.match(page, /Tornar admin/);
  assert.match(page, /Tornar morador/);
  assert.match(page, /role-confirm/);
  assert.match(page, /accessApi\.changeUserRole/);
  assert.match(api, /\/api\/v1\/admin\/users\/\$\{userId\}\/role/);
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
  const source = await readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Preparando sua casa/);
  assert.doesNotMatch(source, /admin-callout-grid/);
  assert.doesNotMatch(source, /Cadastre as tarefas da casa/);
  assert.doesNotMatch(source, /Cadastre e ordene os potes/);
  assert.doesNotMatch(source, /Gerencie as pessoas da casa/);
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
  assert.match(source, /Qual é a dificuldade/);
  assert.match(source, /Quem pode pegar/);
  assert.match(source, /eligibleUserIds/);
  assert.match(source, /postit-drop-scene/);
});

test("simplifica o cadastro e encaixa o mês na largura do celular", async () => {
  const page = await readFile(new URL("../app/admin/tasks/page.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.doesNotMatch(page, /Como ela funciona/);
  assert.doesNotMatch(page, /name="kind"/);
  assert.match(page, /kind: "reusable"/);
  assert.match(page, /Dobrar e guardar/);
  assert.match(page, /Atualizar post-it/);
  assert.match(styles, /\.calendar-month-grid\{min-width:0;width:100%\}/);
  assert.match(styles, /\.calendar-month-grid>section\{min-height:68px;padding:3px\}/);
  assert.doesNotMatch(styles, /calendar-month-grid\{min-width:(720|850)px/);
});

test("navega circularmente pela prateleira de potes do mural", async () => {
  const source = await readFile(new URL("../app/admin/tasks/page.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(source, /task-pot-shelf/);
  assert.match(source, /previousFilter/);
  assert.match(source, /nextFilter/);
  assert.match(source, /navigateFilter\(-1\)/);
  assert.match(source, /navigateFilter\(1\)/);
  assert.match(source, /aria-live="polite"/);
  assert.doesNotMatch(source, /<label>Filtrar por pote/);
  assert.match(styles, /\.task-pot-shelf/);
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
  assert.match(page, /Começar compras/);
  assert.match(page, /markPurchased/);
  assert.match(page, /markCategoryPurchased/);
  assert.match(page, /Marcar .* como comprado/);
  assert.match(page, /remainingIds/);
  assert.match(page, /Compras concluídas/);
  assert.match(page, /setPurchasedIds\(new Set\(\)\)/);
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

test("protege o layout do Safari no viewport do iPhone 12", async () => {
  const html = await readFile(new URL("../github-pages/index.html", import.meta.url), "utf8");
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(html, /viewport-fit=cover/);
  assert.match(layout, /viewportFit: "cover"/);
  assert.match(styles, /@media\(max-width:430px\)/);
  assert.match(styles, /env\(safe-area-inset-bottom,0px\)/);
  assert.match(styles, /font-size:16px!important/);
  assert.match(styles, /min-height:100dvh/);
  assert.match(styles, /\.mobile-app-nav a \{ flex:1 1 0/);
  assert.match(styles, /overflow-x:hidden/);
});

test("encaminha a API para o Fly por padrão e para a API local no Visual Studio", async () => {
  const config = await readFile(new URL("../vite.config.ts", import.meta.url), "utf8");
  const visualStudioEnvironment = await readFile(new URL("../.env.visual-studio", import.meta.url), "utf8");
  const visualStudioProject = await readFile(new URL("../HouseStuffFront.esproj", import.meta.url), "utf8");
  const visualStudioStarter = await readFile(new URL("../scripts/start-visual-studio.mjs", import.meta.url), "utf8");
  assert.match(config, /"\/api"/);
  assert.match(config, /HOUSESTUFF_API_PROXY_TARGET/);
  assert.match(config, /"https:\/\/housestuffapi\.fly\.dev"/);
  assert.match(config, /changeOrigin: true/);
  assert.match(visualStudioEnvironment, /NEXT_PUBLIC_API_URL=http:\/\/localhost:3000/);
  assert.match(visualStudioEnvironment, /HOUSESTUFF_API_PROXY_TARGET=http:\/\/localhost:5049/);
  assert.match(visualStudioProject, /npm run dev:visual-studio/);
  assert.match(visualStudioStarter, /NEXT_PUBLIC_API_URL = "http:\/\/localhost:3000"/);
  assert.match(visualStudioStarter, /HOUSESTUFF_API_PROXY_TARGET = "http:\/\/localhost:5049"/);
});

test("mantém sessão móvel sem depender de cookie entre sites", async () => {
  const api = await readFile(new URL("../lib/api.ts", import.meta.url), "utf8");
  assert.match(api, /Authorization: `\$\{session\.tokenType\} \$\{session\.accessToken\}`/);
  assert.match(api, /\/api\/v1\/auth\/refresh/);
  assert.match(api, /window\.sessionStorage/);
  assert.match(api, /window\.localStorage/);
  assert.match(api, /clearSession\(\)/);
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

test("permite escolher uma cor pessoal e a reutiliza nas referências da casa", async () => {
  const header = await readFile(new URL("../components/AuthenticatedHeader.tsx", import.meta.url), "utf8");
  const colors = await readFile(new URL("../components/PersonColor.tsx", import.meta.url), "utf8");
  const tasks = await readFile(new URL("../app/admin/tasks/page.tsx", import.meta.url), "utf8");
  const calendar = await readFile(new URL("../components/CalendarBoard.tsx", import.meta.url), "utf8");
  const api = await readFile(new URL("../lib/api.ts", import.meta.url), "utf8");
  assert.match(header, /Sua cor na casa/);
  assert.match(header, /accessApi\.updateProfileColor/);
  assert.match(colors, /#2F6B50/);
  assert.match(colors, /#9B356A/);
  assert.match(tasks, /member\.profileColor/);
  assert.match(calendar, /participant\.profileColor/);
  assert.match(api, /\/api\/v1\/auth\/me\/color/);
});

test("oferece calendário real diário, semanal e mensal", async () => {
  const page = await readFile(new URL("../app/app/routine/page.tsx", import.meta.url), "utf8");
  const board = await readFile(new URL("../components/CalendarBoard.tsx", import.meta.url), "utf8");
  const header = await readFile(new URL("../components/AuthenticatedHeader.tsx", import.meta.url), "utf8");
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
  assert.match(header, /href="#\/app\/routine"><span aria-hidden="true">◷<\/span>Calendário<\/a>/);
  assert.doesNotMatch(header, />Rotina<\/a>/);
});

test("consulta um evento antes de permitir sua alteração", async () => {
  const page = await readFile(new URL("../app/app/routine/page.tsx", import.meta.url), "utf8");
  const board = await readFile(new URL("../components/CalendarBoard.tsx", import.meta.url), "utf8");
  const details = await readFile(new URL("../components/CalendarEventDetails.tsx", import.meta.url), "utf8");
  assert.match(page, /selected && <CalendarEventDetails/);
  assert.match(page, /setSelected\(entry\)/);
  assert.match(board, /Ver detalhes de/);
  assert.doesNotMatch(board, /calendar-chip-delete/);
  assert.match(details, /role="dialog"/);
  assert.match(details, /Alterar evento/);
  assert.match(details, /Detalhes/);
  assert.match(details, /Para quem/);
  assert.match(details, /onEdit\(entry\)/);
});

test("mantém a sequência acessível do sorteio animado", async () => {
  const page = await readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(page, /Sortear uma tarefa/);
  assert.match(page, /Qual pote você quer abrir/);
  assert.match(page, /Qual dificuldade você quer/);
  assert.match(page, /selectedDifficulty/);
  assert.match(page, /assignmentApi\.draw\(selectedPotId, \[\], selectedDifficulty \|\| null\)/);
  assert.match(page, /aria-pressed=\{selected\}/);
  assert.match(page, /aria-modal="true"/);
  assert.match(page, /Seus post-its em andamento/);
  assert.match(page, /assignments\.map/);
  assert.match(page, /assignmentApi\.complete\(assignmentId\)/);
  assert.doesNotMatch(page, /Tirar outro post-it/);
  assert.doesNotMatch(page, /close-proposal/);
  assert.match(styles, /@keyframes jar-shake/);
  assert.match(styles, /@keyframes postit-from-jar/);
  assert.match(styles, /prefers-reduced-motion:reduce/);
});
