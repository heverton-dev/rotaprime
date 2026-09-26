# POSTMORTEM — RotaPrime

Cada problema corrigido tem uma prevenção verificável e um teste de regressão
(`tests/seguranca.regressao.test.ts`, que corre `gates/G_SEGURANCA_ROTAPRIME.py`).

## PM-01 — `.env` versionado no git

- **Causa:** export do Lovable commitou `.env` com as chaves do Supabase.
- **Fix:** `164f74d` — `git rm --cached .env`, `.gitignore` com `.env`/`.env.*`, `.env.example` criado.
- **Prevenção:** gate R1 (nenhum `.env*` versionado exceto `.env.example`) e R2 (`.env.example` existe).
- **Teste:** `PM-01: bloqueia .env versionado`, `PM-01: bloqueia ausencia de .env.example`.
- **Arquivos:** `.gitignore`, `.env.example`.

## PM-02 — Senhas em texto puro numa migration

- **Causa:** `supabase/migrations/20260925174826_…sql` cria 4 contas com as senhas literais no SQL.
- **Fix:** não é possível reescrever o histórico publicado (o Lovable sincroniza a `main`). **Pendente: trocar as 4 senhas.** A migration fica numa lista explícita de exceções históricas do gate.
- **Prevenção:** gate R5 — migrations novas não podem usar `crypt(` nem `encrypted_password`; contas criam-se pela administração (server function com service role).
- **Teste:** `PM-02: bloqueia senha de utilizador numa migration nova`.
- **Arquivos:** `gates/G_SEGURANCA_ROTAPRIME.py`.

## PM-03 — Service role ao alcance do browser (risco preventivo)

- **Causa:** padrão comum em apps Lovable/Bolt; aqui está correto (`client.server.ts`), mas nada impedia regressão.
- **Fix:** nenhum código mudou.
- **Prevenção:** gate R3 — `SUPABASE_SERVICE_ROLE_KEY` só em `src/**/*.server.ts` e nunca como `VITE_*`.
- **Teste:** `PM-03: bloqueia service role fora de *.server.ts e como VITE_`, `PM-03: aceita service role em *.server.ts`.

## PM-04 — Tabela nova sem RLS (risco preventivo)

- **Causa:** as 8 tabelas atuais têm RLS, mas uma migration nova gerada por IA pode esquecer.
- **Prevenção:** gate R4 — toda tabela `CREATE TABLE public.*` tem `ENABLE ROW LEVEL SECURITY`.
- **Teste:** `PM-04: bloqueia tabela sem RLS`.

## PM-05 — Escalada de privilégio via `user_roles` (risco preventivo)

- **Causa:** regra do `AGENTS.md` (“papéis só em `user_roles`”) não tinha mecanismo.
- **Prevenção:** gate R6 — nenhum `GRANT INSERT/UPDATE/DELETE/ALL` em `public.user_roles` para `anon`/`authenticated`/`public`.
- **Teste:** `PM-05: bloqueia escrita em user_roles para authenticated`.

## PM-06 — Lint vermelho (570 erros de formatação)

- **Causa:** código gerado sem passar pelo Prettier configurado no próprio template.
- **Fix:** `eslint --fix` (só formatação) e `prefer-const` com `ignoreReadBeforeAssign` (evita reescrever `previewAuthStorage.ts`, gerido pelo Lovable).
- **Prevenção:** `G_SUITE_NPM` corre `npm run verificar` (inclui lint) no pre-commit e no CI.

## PM-07 — Falso positivo do `G_CONTRACTS` (forge)

- **Causa:** o gate tratava qualquer JSON com `$schema` como JSON Schema; `components.json` do shadcn aponta para `ui.shadcn.com/schema.json` e bloqueava o commit.
- **Fix:** cópia local em `gates/G_CONTRACTS.py` só valida ficheiros cujo `$schema` é do `json-schema.org`. **Pendente: aplicar a mesma correção no template do ecossistema-aidd**, senão `forge init --force` reintroduz o falso positivo.
- **Prevenção:** verificado à mão que um schema `draft-07` continua a falhar (exit 1).

## PM-08 — Falso positivo do `G_BLOQUEAR_SEGREDOS` (forge) depois do build

- **Causa:** sem ficheiros *staged* (CI ou execução manual), o gate varre a árvore inteira, incluindo `.output/` (build do nitro, no `.gitignore`), e acusa código das libs do Supabase.
- **Fix:** cópia local exclui `.output`, `.nitro`, `.tanstack`, `.vinxi`, `.wrangler`. **Pendente: levar para o template do ecossistema-aidd** (idealmente respeitar o `.gitignore`).
- **Prevenção:** verificado num clone limpo com `.output/` presente: exit 0; com `password = "…"` em `src/`: exit 1.
