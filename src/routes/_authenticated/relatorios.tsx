import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SLA_PARADA_MIN, dataCurta, euro, minutosEntre } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios e SLA — RotaPrime" },
      {
        name: "description",
        content: "Produtividade por rota, taxa de insucesso, tempos de permanência e proventos.",
      },
      { property: "og:title", content: "Relatórios e SLA — RotaPrime" },
      {
        property: "og:description",
        content: "Produtividade, taxa de insucesso, tempos de permanência e proventos.",
      },
    ],
  }),
  component: Relatorios,
});

function Relatorios() {
  const rotas = useQuery({
    queryKey: ["rotas-todas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_routes")
        .select("id, nome, data, valor_por_parada")
        .order("data", { ascending: false })
        .limit(14);
      if (error) throw error;
      return data;
    },
  });

  const paradas = useQuery({
    queryKey: ["paradas-relatorio", rotas.data?.map((r) => r.id).join(",")],
    enabled: !!rotas.data,
    queryFn: async () => {
      const ids = (rotas.data ?? []).map((r) => r.id);
      if (!ids.length) return [];
      const { data, error } = await supabase
        .from("stops")
        .select("id, route_id, estado, iniciada_em, concluida_em")
        .in("route_id", ids);
      if (error) throw error;
      return data;
    },
  });

  const lista = paradas.data ?? [];
  const totalParadas = lista.length;
  const concluidas = lista.filter((s) => s.estado === "concluida").length;
  const insucessos = lista.filter((s) => s.estado === "insucesso" || s.estado === "reversa").length;
  const taxaInsucesso = totalParadas ? Math.round((insucessos / totalParadas) * 100) : 0;
  const permanencias = lista
    .map((s) => minutosEntre(s.iniciada_em, s.concluida_em))
    .filter((m): m is number => m != null && m > 0);
  const media = permanencias.length
    ? Math.round(permanencias.reduce((a, b) => a + b, 0) / permanencias.length)
    : 0;
  const foraSla = permanencias.filter((m) => m > SLA_PARADA_MIN).length;

  const grafico = (rotas.data ?? [])
    .slice()
    .reverse()
    .map((r) => {
      const dela = lista.filter((s) => s.route_id === r.id);
      return {
        nome: dataCurta(r.data),
        Concluídas: dela.filter((s) => s.estado === "concluida").length,
        Insucessos: dela.filter((s) => s.estado === "insucesso" || s.estado === "reversa").length,
      };
    });

  const proventos = (rotas.data ?? []).reduce((t, r) => {
    const n = lista.filter((s) => s.route_id === r.id && s.estado === "concluida").length;
    return t + n * Number(r.valor_por_parada);
  }, 0);

  return (
    <AdminShell
      titulo="Relatórios e SLA"
      descricao="Consolidação das últimas rotas, tempos de permanência e proventos por parada."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Paradas no período" valor={String(totalParadas)} />
        <Kpi label="Concluídas" valor={String(concluidas)} />
        <Kpi label="Taxa de insucesso" valor={`${taxaInsucesso}%`} />
        <Kpi label="Proventos por parada" valor={euro(proventos)} />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Produtividade por dia de rota</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={grafico}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="nome" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    color: "var(--color-card-foreground)",
                  }}
                />
                <Bar dataKey="Concluídas" fill="var(--color-chart-3)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Insucessos" fill="var(--color-chart-1)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Permanência nas paradas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Média de permanência</span>
            <span className="numeric-data">{media} min</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              Paradas acima do SLA ({SLA_PARADA_MIN} min)
            </span>
            <StatusBadge label={String(foraSla)} tone={foraSla > 0 ? "warning" : "success"} />
          </div>
        </CardContent>
      </Card>
    </AdminShell>
  );
}

function Kpi({ label, valor }: { label: string; valor: string }) {
  return (
    <Card>
      <CardContent className="py-5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl numeric-data">{valor}</p>
      </CardContent>
    </Card>
  );
}
