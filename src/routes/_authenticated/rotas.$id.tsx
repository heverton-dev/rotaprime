import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { FleetMap, type MapPonto } from "@/components/FleetMap";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ROUTE_ESTADOS,
  SLA_PARADA_MIN,
  STOP_ESTADOS,
  dataCurta,
  distanciaM,
  euro,
  hora,
  minutosEntre,
} from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/rotas/$id")({
  head: () => ({
    meta: [
      { title: "Auditoria de rota — RotaPrime" },
      {
        name: "description",
        content: "Detalhe da rota: paradas, tempos de permanência, insucessos e comprovativos.",
      },
      { property: "og:title", content: "Auditoria de rota — RotaPrime" },
      {
        property: "og:description",
        content: "Paradas, tempos de permanência, insucessos e comprovativos.",
      },
    ],
  }),
  component: DetalheRota,
});

const CORES: Record<string, string> = {
  pendente: "#94a3b8",
  em_curso: "#1f6feb",
  concluida: "#15803d",
  insucesso: "#e30613",
  reversa: "#ea8c0c",
};

function DetalheRota() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const rota = useQuery({
    queryKey: ["rota", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_routes")
        .select("id, nome, data, estado, valor_por_parada, estafeta_id, vehicle_id")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const paradas = useQuery({
    queryKey: ["paradas", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stops")
        .select("*")
        .eq("route_id", id)
        .order("ordem");
      if (error) throw error;
      return data;
    },
  });

  const perfis = useQuery({
    queryKey: ["perfis"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, nome").order("nome");
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

  const atualizarRota = useMutation({
    mutationFn: async (campos: Record<string, unknown>) => {
      const { error } = await supabase.from("delivery_routes").update(campos as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["rota", id] });
      void qc.invalidateQueries({ queryKey: ["rotas-todas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const otimizar = useMutation({
    mutationFn: async () => {
      const lista = (paradas.data ?? []).filter((s) => s.lat != null && s.lng != null);
      if (lista.length < 3) throw new Error("A rota precisa de pelo menos três paradas localizadas.");
      const restantes = [...lista];
      const ordenadas = [restantes.shift()!];
      while (restantes.length) {
        const atual = ordenadas[ordenadas.length - 1]!;
        let melhor = 0;
        let melhorDist = Infinity;
        restantes.forEach((cand, i) => {
          const d = distanciaM(
            { lat: atual.lat as number, lng: atual.lng as number },
            { lat: cand.lat as number, lng: cand.lng as number },
          );
          if (d < melhorDist) {
            melhorDist = d;
            melhor = i;
          }
        });
        ordenadas.push(restantes.splice(melhor, 1)[0]!);
      }
      const semCoords = (paradas.data ?? []).filter((s) => s.lat == null || s.lng == null);
      const finais = [...ordenadas, ...semCoords];
      for (let i = 0; i < finais.length; i++) {
        const { error } = await supabase
          .from("stops")
          .update({ ordem: i + 1 })
          .eq("id", finais[i]!.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Ordem otimizada por proximidade.");
      void qc.invalidateQueries({ queryKey: ["paradas", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const lista = paradas.data ?? [];
  const concluidas = lista.filter((s) => s.estado === "concluida").length;
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

  const estadoRota = rota.data
    ? ROUTE_ESTADOS[rota.data.estado as keyof typeof ROUTE_ESTADOS]
    : undefined;

  return (
    <AdminShell
      titulo={rota.data?.nome ?? "Rota"}
      descricao={
        rota.data
          ? `${dataCurta(rota.data.data)} · ${euro(Number(rota.data.valor_por_parada))} por parada · ${concluidas}/${lista.length} concluídas`
          : "A carregar…"
      }
      acoes={
        <>
          <Button variant="outline" asChild>
            <Link to="/rotas">
              <ArrowLeft className="size-4" /> Rotas
            </Link>
          </Button>
          <Button onClick={() => otimizar.mutate()} disabled={otimizar.isPending}>
            Otimizar ordem
          </Button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Percurso</CardTitle>
            {estadoRota ? (
              <StatusBadge label={estadoRota.label} tone={estadoRota.tone} />
            ) : null}
          </CardHeader>
          <CardContent>
            {pontos.length ? (
              <FleetMap pontos={pontos} ligar altura={360} />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nenhuma parada localizada no mapa.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Definições da rota</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Estafeta</Label>
              <Select
                value={rota.data?.estafeta_id ?? "nenhum"}
                onValueChange={(v) =>
                  atualizarRota.mutate({ estafeta_id: v === "nenhum" ? null : v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Sem atribuição</SelectItem>
                  {(perfis.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome || "Sem nome"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Carrinha</Label>
              <Select
                value={rota.data?.vehicle_id ?? "nenhum"}
                onValueChange={(v) =>
                  atualizarRota.mutate({ vehicle_id: v === "nenhum" ? null : v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Sem atribuição</SelectItem>
                  {(veiculos.data ?? []).map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.matricula}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select
                value={rota.data?.estado ?? "planeada"}
                onValueChange={(v) => atualizarRota.mutate({ estado: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROUTE_ESTADOS).map(([k, val]) => (
                    <SelectItem key={k} value={k}>
                      {val.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Auditoria das paradas</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border p-0">
          {lista.map((s) => {
            const e = STOP_ESTADOS[s.estado as keyof typeof STOP_ESTADOS];
            const permanencia = minutosEntre(s.iniciada_em, s.concluida_em);
            const excedeu = permanencia != null && permanencia > SLA_PARADA_MIN;
            return (
              <div key={s.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    #{s.ordem} {s.cliente}{" "}
                    <span className="font-normal text-muted-foreground">
                      · {s.tipo === "recolha" ? "Recolha" : "Entrega"} · {s.objetos} objeto(s)
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.morada} {s.codigo_postal ? `· ${s.codigo_postal}` : ""}
                  </p>
                  {s.motivo_insucesso ? (
                    <p className="mt-1 text-xs text-destructive">
                      Insucesso: {s.motivo_insucesso}
                    </p>
                  ) : null}
                  {s.assinatura_nome ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Comprovativo assinado por {s.assinatura_nome}
                      {s.foto_url ? " · com registo fotográfico" : ""}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs">
                  <span className="text-muted-foreground">
                    {hora(s.iniciada_em)} → {hora(s.concluida_em)}
                  </span>
                  {permanencia != null ? (
                    <StatusBadge
                      label={`${permanencia} min`}
                      tone={excedeu ? "warning" : "muted"}
                    />
                  ) : null}
                  <StatusBadge label={e?.label ?? s.estado} tone={e?.tone ?? "muted"} />
                </div>
              </div>
            );
          })}
          {lista.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Esta rota não tem paradas.</p>
          ) : null}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
