# Revisão de RLS — Supabase (2026-09-26)

Âmbito: `supabase/migrations/*.sql` (5 ficheiros, 8 tabelas). Revisão estática; nada foi alterado na base de dados.

## O que está bem

- RLS ativo nas 8 tabelas (`profiles`, `user_roles`, `vehicles`, `delivery_routes`, `stops`, `time_entries`, `expenses`, `maintenance_requests`). O gate `G_SEGURANCA_ROTAPRIME` (R4) passa a bloquear tabela nova sem RLS.
- Nenhuma política para `anon`; tudo exige `authenticated`.
- `user_roles` só tem `SELECT` para `authenticated`: não há autoatribuição de papel (R6 impede regressão).
- `has_role` / `is_gestor` são `SECURITY DEFINER` com `search_path = public` e `EXECUTE` revogado a `anon`/`PUBLIC`.
- `SUPABASE_SERVICE_ROLE_KEY` só em `src/integrations/supabase/client.server.ts` (R3).

## Achados (por gravidade)

| # | Gravidade | Onde | Problema | Correção proposta |
| --- | --- | --- | --- | --- |
| A1 | **Crítica** | `20260925174826_…sql` | Senhas em texto puro de 4 contas (incluindo a conta `god`) no histórico git já publicado. | **Trocar as 4 senhas já** no Lovable Cloud. Não dá para reescrever o histórico (o Lovable sincroniza a `main`). R5 impede novas migrations com senha. |
| A2 | Alta | `routes_update_own` | O estafeta pode fazer `UPDATE` em qualquer coluna da própria rota, incluindo `valor_por_parada` (o que recebe) e `vehicle_id`. A UI do estafeta não atualiza `delivery_routes`; só `rotas.$id.tsx` (gestor) o faz. | Restringir o `UPDATE` a gestores (SQL abaixo). |
| A3 | Média | `profiles_update_self_or_gestor` | O próprio utilizador pode repor `ativo = true` depois de ser desativado por um gestor. | Trigger que só deixa gestor mudar `ativo`. |
| A4 | Média | `stops_update` | O estafeta pode mudar `route_id`, `objetos`, `morada` das próprias paradas (não só estado/prova de entrega). | Trigger que limita as colunas editáveis pelo estafeta. |
| A5 | Média | `expenses_update` / `expenses_delete` | O estafeta pode alterar ou apagar despesas já lançadas, sem rasto. | Decidir regra de negócio (ex.: bloquear depois de N horas ou de aprovação). |
| A6 | A confirmar | `handle_new_user` | O primeiro utilizador vira `admin`; os seguintes viram `estafeta`. Se o registo público estiver ativo no Auth, qualquer pessoa com a chave publicável cria conta `estafeta`. O requisito diz “sem registo público”, mas `supabase/config.toml` não fixa `enable_signup = false`. | Confirmar no painel Auth do Lovable Cloud que *signups* estão desligados. |

## SQL proposto (não aplicado)

Não foi criada migration: aplicar RLS nova mexe na base de produção do Lovable Cloud e precisa de aprovação e de teste manual com as contas de demonstração.

```sql
-- A2: só gestor atualiza rotas
DROP POLICY "routes_update_own" ON public.delivery_routes;
CREATE POLICY "routes_update_gestor" ON public.delivery_routes FOR UPDATE TO authenticated
  USING (public.is_gestor(auth.uid())) WITH CHECK (public.is_gestor(auth.uid()));

-- A3: só gestor muda o campo ativo
CREATE OR REPLACE FUNCTION public.profiles_protege_ativo()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.ativo IS DISTINCT FROM OLD.ativo AND NOT public.is_gestor(auth.uid()) THEN
    RAISE EXCEPTION 'apenas gestores alteram o estado ativo';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER profiles_protege_ativo BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_protege_ativo();
```
