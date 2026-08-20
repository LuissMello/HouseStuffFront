# HouseStuff Frontend

Aplicação web responsiva e mobile-first do HouseStuff, com autenticação, administração de usuários, potes e tarefas, área da residência e acompanhamento dos dois repositórios.

## Pré-requisitos

- Node.js `>=22.13.0`;
- `HouseStuffAPi` e `HouseStuffFront` lado a lado no mesmo diretório.
- API e PostgreSQL iniciados conforme o README do backend.

## Executar

```powershell
npm ci
npm run dev
```

Acesse `http://localhost:3000/login`.

No ambiente local, use `admin@housestuff.local` e `HouseStuff#2026` para administrar pessoas e potes. Para validar a experiência de morador da Casa do Luis, use `luis@housestuff.local` e `LuisHouse#2026`.

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
