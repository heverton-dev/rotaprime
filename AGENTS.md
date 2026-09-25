<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# AGENTS.md — RotaPrime

Leia `SPEC.md` primeiro (fonte funcional). UI e textos em português de Portugal.

## Regras técnicas
- Stack TanStack Start + Lovable Cloud; lógica interna via `createServerFn`, endpoints externos só em `src/routes/api/public/*` — padrão do template.
- `src/lib/studio.ts` é a fonte única de rotas, tabelas, eventos e tokens do Studio — evita divergência entre OpenAPI, MCP e docs; atualize-o ao mudar páginas, tabelas ou eventos.
- Papéis só em `user_roles` com `has_role`/`is_gestor` — evita escalada de privilégios.
- Sem registo público nem login social; acessos criados pela administração — requisito do cliente.
- Mapas Leaflet/OSM carregados só no cliente — Leaflet quebra no SSR.
- Escritas do estafeta passam por `src/lib/offline.ts` — garante offline-first.
- Endpoint MCP é só leitura e sem dados pessoais — é público.
- Cores só por tokens semânticos em `src/styles.css` — mantém tema e modo escuro.
