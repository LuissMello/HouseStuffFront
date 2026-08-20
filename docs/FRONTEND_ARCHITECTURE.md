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
- `/admin/users`: criação direta de usuários, visível apenas para administrador;
- a API mantém a sessão em cookie HTTP-only e o frontend sempre envia credenciais nas chamadas.

## Residência

- `/app` possui três estados reais: administrador sem casa, morador aguardando vínculo e residência conectada;
- a tela nunca seleciona uma residência por ID: consome somente `/residences/current`;
- `/admin/users` mostra membros da casa atual e acessos pendentes permitidos pela API;
- novos usuários herdam a residência do administrador no backend.

## Qualidade

Lint, TypeScript e build são gates permanentes. Comportamentos de componentes recebem testes; os fluxos críticos recebem validação ponta a ponta quando forem implementados. Toda mudança visual exige revisão responsiva e evidência.
