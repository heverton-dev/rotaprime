import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABELS, TIME_TIPOS, hora } from "@/lib/domain";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/estafetas")({
  head: () => ({
    meta: [
      { title: "Estafetas — RotaPrime" },
      {
        name: "description",
        content: "Cadastro de estafetas, carta de condução, base operacional e níveis de acesso.",
      },
      { property: "og:title", content: "Estafetas — RotaPrime" },
      {
        property: "og:description",
        content: "Cadastro de estafetas, carta de condução e níveis de acesso.",
      },
    ],
  }),
  component: Estafetas,
});

function Estafetas() {
  const qc = useQueryClient();
  const { isGod } = useAuth();

  const perfis = useQuery({
    queryKey: ["perfis-detalhe"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, telefone, carta_conducao, base, ativo")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const papeis = useQuery({
    queryKey: ["papeis"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      return data;
    },
  });

  const pontos = useQuery({
    queryKey: ["ponto-hoje"],
    queryFn: async () => {
      const inicio = new Date();
      inicio.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("time_entries")
        .select("user_id, tipo, created_at")
        .gte("created_at", inicio.toISOString())
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const guardar = useMutation({
    mutationFn: async (v: { id: string; campos: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("profiles")
        .update(v.campos as never)
        .eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cadastro atualizado.");
      void qc.invalidateQueries({ queryKey: ["perfis-detalhe"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminShell
      titulo="Estafetas"
      descricao="Cadastro, base operacional, níveis de acesso e ponto do dia."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {(perfis.data ?? []).map((p) => {
          const roles = (papeis.data ?? []).filter((r) => r.user_id === p.id);
          const registos = (pontos.data ?? []).filter((t) => t.user_id === p.id);
          const ultimo = registos[registos.length - 1];
          return (
            <Card key={p.id}>
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">{p.nome || "Sem nome"}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {roles.map((r) => ROLE_LABELS[r.role as keyof typeof ROLE_LABELS]).join(", ") ||
                      "Sem nível atribuído"}
                  </p>
                </div>
                <StatusBadge
                  label={p.ativo ? "Ativo" : "Inativo"}
                  tone={p.ativo ? "success" : "muted"}
                />
              </CardHeader>
              <CardContent className="space-y-3">
                <Campo
                  label="Telefone"
                  valor={p.telefone ?? ""}
                  onGuardar={(v) => guardar.mutate({ id: p.id, campos: { telefone: v } })}
                />
                <Campo
                  label="Carta de condução"
                  valor={p.carta_conducao ?? ""}
                  onGuardar={(v) => guardar.mutate({ id: p.id, campos: { carta_conducao: v } })}
                />
                <Campo
                  label="Base operacional"
                  valor={p.base ?? ""}
                  onGuardar={(v) => guardar.mutate({ id: p.id, campos: { base: v } })}
                />
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor={`ativo-${p.id}`}>Cadastro ativo</Label>
                  <Switch
                    id={`ativo-${p.id}`}
                    checked={p.ativo}
                    onCheckedChange={(v) => guardar.mutate({ id: p.id, campos: { ativo: v } })}
                  />
                </div>
                <div className="border-t border-border pt-3 text-xs text-muted-foreground">
                  Ponto de hoje:{" "}
                  {ultimo
                    ? `${TIME_TIPOS[ultimo.tipo as keyof typeof TIME_TIPOS] ?? ultimo.tipo} às ${hora(ultimo.created_at)}`
                    : "sem registos"}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isGod ? (
        <p className="mt-4 text-xs text-muted-foreground">
          Sessão com nível GOD: restrições de geofencing e rastreamento podem ser inativadas no
          ambiente do estafeta para testes e auditorias técnicas.
        </p>
      ) : null}
    </AdminShell>
  );
}

function Campo({
  label,
  valor,
  onGuardar,
}: {
  label: string;
  valor: string;
  onGuardar: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        defaultValue={valor}
        onBlur={(e) => {
          if (e.target.value !== valor) onGuardar(e.target.value);
        }}
      />
    </div>
  );
}
