# HouseStuff Frontend — instruções permanentes

Este é o frontend oficial do HouseStuff. A documentação global e as tarefas ficam em `../HouseStuffAPi/docs`. Os projetos Bolão Chappo são somente referência e nunca devem ser alterados.

## Contexto obrigatório

Antes de modificar o frontend, ler `../HouseStuffAPi/AGENTS.md`, os documentos canônicos, a tarefa `HOUSE-XXX` autorizada, `docs/FRONTEND_ARCHITECTURE.md` e o código relacionado.

## Regras

- aplicação web única, responsiva e em TypeScript strict;
- código organizado por feature; componentes não chamam API de forma dispersa;
- regra crítica sempre confirmada pelo backend;
- telas cobrem loading, vazio, erro e sucesso;
- acessibilidade para teclado, foco, contraste e leitores de tela;
- tarefa funcional só termina com integração real e roteiro de teste;
- não iniciar tarefa seguinte automaticamente.

## Tracking

`app/data/project.generated.json` é gerado por `npm run sync:tracking`. Nunca editá-lo. A fonte canônica é `../HouseStuffAPi/docs/tracking/project.json`.

## Gates

```powershell
npm ci
npm run lint
npm test
```
