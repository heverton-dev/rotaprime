# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Qualidade e blindagem AIDD

O projeto continua a ser editado no Lovable; esta secção descreve o que corre fora dele.

| Comando | O que faz |
| --- | --- |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint + Prettier |
| `npm test` | Vitest (`src/**/*.test.ts`, `tests/**/*.test.ts`) |
| `npm run verificar` | typecheck + lint + testes + build |

- **Variáveis de ambiente:** copie `.env.example` para `.env` e preencha. `.env` nunca vai para o git. `SUPABASE_SERVICE_ROLE_KEY` é só de servidor (ficheiros `*.server.ts`), nunca `VITE_*`.
- **Pre-commit:** `python <ecossistema-aidd>/ecossistema.py forge init .` instala `.git/hooks/pre-commit`, que corre todos os `gates/G_*.py` (incluindo `G_SUITE_NPM`, que chama `npm run verificar`). Commit vermelho é bloqueado; não usar `--no-verify`.
- **CI:** `.github/workflows/ci.yml` corre os mesmos gates em push/PR.
- **Segurança:** `gates/G_SEGURANCA_ROTAPRIME.py` (regras R1–R6) e revisão de RLS em `docs/seguranca/RLS-REVISAO.md`. Problemas corrigidos e respetivos testes em `POSTMORTEM.md`.
- **Stack:** TanStack Start (não Next.js) por decisão registada em `.stack_override.json` — é o template do Lovable.
