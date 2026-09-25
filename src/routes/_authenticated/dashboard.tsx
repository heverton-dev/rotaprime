import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, MapPin, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AdminShell } from "@/components/AdminShell";
import { FleetMap, type MapPonto } from "@/components/FleetMap";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  euro,
  minutosEntre,
  ROUTE_ESTADOS,
  SLA_PARADA_MIN,
  STOP_ESTADOS,
} from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel de controlo — RotaPrime" },
      {
        name: "description",
        content: "Indicadores operacionais, frota no mapa e alertas de SLA do dia.",
      },
      { property: "og:title", content: "Painel de controlo — RotaPrime" },
      { property: "og:description", content: "Indicadores operacionais e alertas de SLA do dia." },
    ],
  }),
  component: Dashboard,
});

const CORES: Record<string, string> = {
  pendente: "#94a3b8",
  em_curso: "#1f6feb",
  concluida: "#15803d",
  insucesso: "#e30613",
  reversa: "#ea8c0c",
};

function Dashboard() {
  const { isGestor, roles } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (roles.length > 0 && !isGestor) void navigate({ to: "/app", replace: true });
  }, [roles, isGestor, navigate]);

  const hoje = new Date().toISOString().slice(0, 10);

  const rotas = useQuery({
    queryKey: ["rotas", hoje],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_routes")
        .select("id, nome, data, estado, valor_por_parada, estafeta_id, vehicle_id")
        .eq("data", hoje)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const paradas = useQuery({
    queryKey: ["paradas-hoje", rotas.data?.map((r) => r.id).join(",")],
    enabled: !!rotas.data,
    queryFn: async () => {
      const ids = (rotas.data ?? []).map((r) => r.id);
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("stops")
        .select(
          "id, route_id, ordem, cliente, morada, estado, lat, lng, iniciada_em, concluida_em, tipo",
        )
        .in("route_id", ids)
        .order("ordem");
      if (error) throw error;
      return data;
    },
  });

  const veiculos = useQuery({
    queryKey: ["veiculos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("id, matricula, estado");
      if (error) throw error;
      return data;
    },
  });

  const custos = useQuery({
    queryKey: ["custos-mes"],
    queryFn: async () => {
      const inicio = new Date();
      inicio.setDate(1);
      const { data, error } = await supabase
        .from("expenses")
        .select("valor")
        .gte("data", inicio.toISOString().slice(0, 10));
      if (error) throw error;
      return data;
    },
  });

  const lista = paradas.data ?? [];
  const concluidas = lista.filter((s) => s.estado === "concluida").length;
  const insucessos = lista.filter((s) => s.estado === "insucesso" || s.estado === "reversa").length;
  const emAtraso = lista.filter(
    (s) =>
      s.estado === "em_curso" && (minutosEntre(s.iniciada_em, s.concluida_em) ?? 0) > SLA_PARADA_MIN,
  );
  const totalCustos = (custos.data ?? []).reduce((t, c) => t + Number(c.valor), 0);
  const proventos = (rotas.data ?? []).reduce((t, r) => {
    const n = lista.filter((s) => s.route_id === r.id && s.estado === "concluida").length;
    return t + n * Number(r.valor_por_parada);
  }, 0);

  const pontos: MapPonto[] = lista
    .filter((s) => s.lat != null && s.lng != null)
    .map((s) => ({
      id: s.id,
      lat: s.lat as number,
      lng: s.lng as number,
      titulo: `#${s.ordem} ${s.cliente}`,
      subtitulo: s.morada,
      cor: CORES[s.estado] ?? "#94a3b8",
    }));

  return (
    <AdminShell
      titulo="Painel de controlo"
      descricao="Indicadores do dia, frota no mapa e alertas de permanência."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={MapPin} label="Paradas do dia" valor={String(lista.length)} />
        <Kpi icon={CheckCircle2} label="Concluídas" valor={String(concluidas)} tone="success" />
        <Kpi
          icon={AlertTriangle}
          label="Insucessos / reversa"
          valor={String(insucessos)}
          tone="destructive"
        />
        <Kpi
          icon={Truck}
          label="Carrinhas ativas"
          valor={String((veiculos.data ?? []).filter((v) => v.estado === "ativa").length)}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Monitorização em tempo real</CardTitle>
          </CardHeader>
          <CardContent>
            {pontos.length ? (
              <FleetMap pontos={pontos} altura={380} />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Sem paradas com coordenadas para hoje.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Financeiro do período</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Linha label="Proventos por parada atendida" valor={euro(proventos)} />
              <Linha label="Custos operacionais do mês" valor={euro(totalCustos)} />
              <Linha
                label="Resultado"
                valor={euro(proventos - totalCustos)}
                destaque={proventos - totalCustos >= 0 ? "success" : "destructive"}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Alertas de SLA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {emAtraso.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma parada acima de {SLA_PARADA_MIN} minutos de permanência.
                </p>
              ) : (
                emAtraso.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">
                      #{s.ordem} {s.cliente}
                    </span>
                    <StatusBadge
                      tone="warning"
                      label={`${minutosEntre(s.iniciada_em, s.concluida_em)} min`}
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Rotas de hoje</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(rotas.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ainda não há rotas para hoje.{" "}
              <Link to="/rotas" className="font-semibold text-primary">
                Criar rota
              </Link>
            </p>
          ) : (
            (rotas.data ?? []).map((r) => {
              const total = lista.filter((s) => s.route_id === r.id).length;
              const feitas = lista.filter(
                (s) => s.route_id === r.id && s.estado === "concluida",
              ).length;
              const e = ROUTE_ESTADOS[r.estado as keyof typeof ROUTE_ESTADOS];
              return (
                <Link
                  key={r.id}
                  to="/rotas/$id"
                  params={{ id: r.id }}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-3 transition-colors hover:bg-accent"
                >
                  <span className="min-w-0 truncate text-sm font-semibold">{r.nome}</span>
                  <span className="flex shrink-0 items-center gap-3 text-sm">
                    <span className="numeric-data">
                      {feitas}/{total}
                    </span>
                    <StatusBadge label={e?.label ?? r.estado} tone={e?.tone ?? "muted"} />
                  </span>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        Estados das paradas: {Object.values(STOP_ESTADOS).map((s) => s.label).join(" · ")}
      </p>
    </AdminShell>
  );
}

function Kpi({
  icon: Icon,
  label,
  valor,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  valor: string;
  tone?: "success" | "destructive";
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-5">
        <span
          className={
            tone === "success"
              ? "flex size-10 items-center justify-center rounded-md bg-success/12 text-success"
              : tone === "destructive"
                ? "flex size-10 items-center justify-center rounded-md bg-destructive/12 text-destructive"
                : "flex size-10 items-center justify-center rounded-md bg-accent text-accent-foreground"
          }
        >
          <Icon className="size-5" />
        </span>
        <span>
          <span className="block text-2xl numeric-data">{valor}</span>
          <span className="block text-xs text-muted-foreground">{label}</span>
        </span>
      </CardContent>
    </Card>
  );
}

function Linha({
  label,
  valor,
  destaque,
}: {
  label: string;
  valor: string;
  destaque?: "success" | "destructive";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          destaque === "success"
            ? "numeric-data text-success"
            : destaque === "destructive"
              ? "numeric-data text-destructive"
              : "numeric-data"
        }
      >
        {valor}
      </span>
    </div>
  );
}
