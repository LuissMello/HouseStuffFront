# HouseStuff Frontend

Aplicação web responsiva e mobile-first do HouseStuff, com autenticação, administração de usuários, potes e tarefas, sorteio com aceite ou troca, área da residência e acompanhamento dos dois repositórios.

## Pré-requisitos

- Node.js `>=22.13.0`;
- `HouseStuffAPi` e `HouseStuffFront` lado a lado no mesmo diretório.
- API e PostgreSQL iniciados conforme o README do backend.

## Executar o projeto completo

No repositório `HouseStuffAPi`, execute:

```powershell
.\scripts\start-local.ps1
```

Esse é o roteiro canônico: prepara PostgreSQL, API e este frontend, cria os dados locais demonstráveis e aguarda a prontidão. Acesse `http://localhost:3000`. Para parar os processos registrados, use `.\scripts\stop-local.ps1` no backend.

## Executar somente o frontend

```powershell
npm ci
npm run dev
```

Acesse `http://localhost:3000/login`.

No ambiente local, use `admin@housestuff.local` e `HouseStuff#2026` para administrar pessoas e potes. Para validar a experiência de morador da Casa do Luis, use `luis@housestuff.local` e `LuisHouse#2026`.

Na área do morador, escolha um pote, sorteie uma proposta, aceite ou peça outra. Após o aceite, a atribuição ativa permanece na tela mesmo depois de recarregar a aplicação e pode ser concluída com confirmação. Tarefas únicas encerram, reutilizáveis voltam imediatamente e recorrentes mostram quando estarão disponíveis outra vez.

As tarefas são anotadas como post-its. No sorteio, o usuário inicia a brincadeira, escolhe um pote animado, vê o pote avançar e recebe a proposta em um post-it no centro da tela.

Em `/app/routine`, datas, aniversários, compromissos e próximas recorrências aparecem em calendário diário, semanal ou mensal; o histórico continua mostrando somente as conclusões do usuário autenticado.

Em `/app/wishes`, os moradores cadastram coisas para comprar para a casa, guardam um link opcional e reorganizam a prioridade por toque, mouse, teclado ou botões.

O comando sincroniza automaticamente `app/data/project.generated.json` a partir de `../HouseStuffAPi/docs/tracking/project.json` antes de iniciar.

## Visual Studio

O arquivo `HouseStuffFront.esproj` permite carregar este frontend na solução conjunta do backend. Nesse perfil, `npm run dev:visual-studio` injeta explicitamente as URLs locais, mantém as chamadas do navegador na origem `http://localhost:3000` e encaminha `/api` para a API real em `http://localhost:5049`. A API decide qual PostgreSQL usar pela configuração .NET; nenhum mock é usado.

Os links compartilhados continuam usando hash routing para funcionar no GitHub Pages. No servidor local, `LocalHashNavigation` converte hashes como `#/login` na rota real `/login`, permitindo que os mesmos componentes naveguem corretamente nos dois ambientes.

Abra `HouseStuffAPi/HouseStuff.VisualStudio.sln` para iniciar os dois projetos juntos. O roteiro completo, inclusive a configuração segura da conexão PostgreSQL, está no README do backend.

## Validar

```powershell
npm run lint
npm test
```

## Estrutura inicial

- `app/`: rotas e composição visual;
- `lib/api.ts`: cliente centralizado da API;
- `components/`: componentes compartilhados da área autenticada;
- `app/data/`: snapshot gerado do acompanhamento;
- `scripts/`: sincronização da fonte canônica;
- `docs/`: arquitetura e decisões exclusivas do frontend.
