# Arquitetura frontend

## Direção

O HouseStuff é uma aplicação web responsiva única. Não há intenção de publicar Android/iOS em lojas e não existe uma aplicação administrativa separada. Áreas administrativas serão rotas protegidas da mesma aplicação.

## Stack inicial

- React 19;
- TypeScript strict;
- Vite/Vinext;
- CSS responsivo com tokens semânticos;
- Sites/Vite para uma saída web compatível com hospedagem futura.

O primeiro cliente remoto entrou em `HOUSE-010` como um módulo TypeScript centralizado e enxuto. Bibliotecas de formulário e cache remoto ficam adiadas até a complexidade justificar a dependência.

## Estrutura futura

```text
app/
features/
  auth/
  residence/
  pots/
  tasks/
  draws/
  completions/
  calendar/
components/
lib/
```

Rotas apenas compõem telas. Acesso à API, schemas e comportamento ficam na feature proprietária. Dados remotos não serão copiados para uma store global sem necessidade.

## Acesso

- `/login`: entrada pública;
- `/app`: área de qualquer usuário autenticado;
- `/app/routine`: calendário da casa e histórico pessoal;
- `/admin/users`: criação direta de usuários, visível apenas para administrador;
- `/app/pots`: manutenção e ordenação colaborativa dos potes por qualquer morador vinculado;
- `/app/tasks`: manutenção colaborativa das tarefas únicas, reutilizáveis e recorrentes;
- `/admin/pots` e `/admin/tasks`: aliases mantidos temporariamente por compatibilidade;
- a API mantém a sessão em cookie HTTP-only e o frontend sempre envia credenciais nas chamadas.

## Residência

- `/app` possui três estados reais: administrador sem casa, morador aguardando vínculo e residência conectada;
- a tela nunca seleciona uma residência por ID: consome somente `/residences/current`;
- `/admin/users` mostra membros da casa atual e acessos pendentes permitidos pela API;
- novos usuários herdam a residência do administrador no backend.

## Qualidade

Lint, TypeScript e build são gates permanentes. Comportamentos de componentes recebem testes; os fluxos críticos recebem validação ponta a ponta quando forem implementados. Toda mudança visual exige revisão responsiva e evidência.

## Tarefas

- o formulário administrativo seleciona apenas potes ativos da casa;
- o intervalo em dias aparece somente quando o tipo recorrente é escolhido;
- listagem e filtro usam os dados persistidos da API, sem mocks;
- em telas pequenas, formulário, filtros e cartões ficam em uma coluna com ações touch.

## Conclusão

- `/app` confirma a ação antes de concluir a atribuição ativa;
- o feedback de sucesso explica o efeito do tipo da tarefa;
- após concluir, o usuário volta ao sorteio sem depender de recarregar;
- disponibilidade e isolamento são sempre decididos pela API.

## Calendário e histórico

- calendário e histórico consomem uma projeção única de `/api/v1/routine`;
- datas são apresentadas no fuso do navegador;
- estados sem recorrências ou sem conclusões possuem orientação própria;
- telas menores recebem navegação inferior para Casa, Rotina, Potes e Tarefas.

## Experiência lúdica

- o cadastro administrativo trata cada tarefa como uma anotação em post-it;
- o catálogo varia cores e pequenas inclinações sem prejudicar a leitura;
- o sorteio começa por uma chamada clara, depois pede a escolha de um pote;
- potes são elementos HTML/CSS acessíveis, e o escolhido avança antes de chacoalhar;
- a proposta continua vindo da API e entra no centro como post-it em um diálogo;
- `prefers-reduced-motion` remove animações sem remover nenhuma ação ou informação.
