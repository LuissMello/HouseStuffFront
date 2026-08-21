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

Em `/app/routine`, o calendário mostra as próximas recorrências da casa e o histórico apresenta as conclusões do usuário autenticado. No celular, a navegação inferior conecta Casa e Rotina.

O comando sincroniza automaticamente `app/data/project.generated.json` a partir de `../HouseStuffAPi/docs/tracking/project.json` antes de iniciar.

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
