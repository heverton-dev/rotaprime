import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MobileShell } from "@/components/MobileShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dataCurta, euro } from "@/lib/domain";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/app/resumo")({
  head: () => ({
    meta: [
      { title: "Resumo e proventos — Estafeta CTT" },
      {
        name: "description",
        content: "Paradas atendidas, insucessos e proventos acumulados por rota.",
      },
      { property: "og:title", content: "Resumo e proventos — Estafeta CTT" },
      {
        property: "og:description",
        content: "Paradas atendidas, insucessos e proventos acumulados.",
      },
    ],
  }),
  component: Resumo,
});

function Resumo() {
  const { user } = useAuth();

  const rotas = useQuery({
    queryKey: ["minhas-rotas", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_routes")
        .select("id, nome, data, valor_por_parada")
        .eq("estafeta_id", user!.id)
        .order("data", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const paradas = useQuery({
    queryKey: ["paradas-resumo", rotas.data?.map((r) => r.id).join(",")],
    enabled: !!rotas.data?.length,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stops")
        .select("id, route_id, estado")
        .in(
          "route_id",
          (rotas.data ?? []).map((r) => r.id),
        );
      if (error) throw error;
      return data;
    },
  });

  const lista = paradas.data ?? [];
  const porRota = (rotas.data ?? []).map((r) => {
    const dela = lista.filter((s) => s.route_id === r.id);
    const concluidas = dela.filter((s) => s.estado === "concluida").length;
    const insucessos = dela.filter(
      (s) => s.estado === "insucesso" || s.estado === "reversa",
    ).length;
    return {
      ...r,
      concluidas,
      insucessos,
      total: dela.length,
      valor: concluidas * Number(r.valor_por_parada),
    };
  });

  const totalGanho = porRota.reduce((t, r) => t + r.valor, 0);
  const totalConcluidas = porRota.reduce((t, r) => t + r.concluidas, 0);
  const totalInsucessos = porRota.reduce((t, r) => t + r.insucessos, 0);

  return (
    <MobileShell titulo="Resumo">
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Atendidas</p>
            <p className="text-xl numeric-data">{totalConcluidas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Insucessos</p>
            <p className="text-xl numeric-data">{totalInsucessos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Proventos</p>
            <p className="text-xl numeric-data">{euro(totalGanho)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Por rota</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border p-0">
          {porRota.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">Ainda sem rotas atribuídas.</p>
          ) : (
            porRota.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{r.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {dataCurta(r.data)} · {r.concluidas}/{r.total} atendidas
                    {r.insucessos ? ` · ${r.insucessos} insucesso(s)` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-sm numeric-data">{euro(r.valor)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </MobileShell>
  );
}
