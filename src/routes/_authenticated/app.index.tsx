import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MobileShell } from "@/components/MobileShell";
import { FleetMap, type MapPonto } from "@/components/FleetMap";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { STOP_ESTADOS, euro } from "@/lib/domain";
import { useAuth } from "@/lib/auth";
import { sincronizarFila, tamanhoFila } from "@/lib/offline";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Rota do dia — Estafeta CTT" },
      {
        name: "description",
        content: "Sequência de paradas do dia, com estado, objetos e navegação assistida.",
      },
      { property: "og:title", content: "Rota do dia — Estafeta CTT" },
      {
        property: "og:description",
        content: "Sequência de paradas do dia, com estado e navegação assistida.",
      },
    ],
  }),
  component: RotaDoDia,
});

const CORES: Record<string, string> = {
  pendente: "#94a3b8",
  em_curso: "#1f6feb",
  concluida: "#15803d",
  insucesso: "#e30613",
  reversa: "#ea8c0c",
};

function RotaDoDia() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [pendentes, setPendentes] = useState(0);

  useEffect(() => {
    const ler = () => setPendentes(tamanhoFila());
    ler();
    window.addEventListener("ctt-fila", ler);
    window.addEventListener("online", ler);
    return () => {
      window.removeEventListener("ctt-fila", ler);
      window.removeEventListener("online", ler);
    };
  }, []);

  const rota = useQuery({
    queryKey: ["minha-rota", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const hoje = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("delivery_routes")
        .select("id, nome, data, estado, valor_por_parada")
        .eq("estafeta_id", user!.id)
        .eq("data", hoje)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const paradas = useQuery({
    queryKey: ["minhas-paradas", rota.data?.id],
    enabled: !!rota.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stops")
        .select("id, ordem, cliente, morada, codigo_postal, estado, tipo, objetos, lat, lng")
        .eq("route_id", rota.data!.id)
        .order("ordem");
      if (error) throw error;
      return data;
    },
  });

  const lista = paradas.data ?? [];
  const concluidas = lista.filter((s) => s.estado === "concluida").length;
  const ganho = concluidas * Number(rota.data?.valor_por_parada ?? 0);
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

  async function sincronizar() {
    const n = await sincronizarFila();
    setPendentes(tamanhoFila());
    if (n) {
      toast.success(`${n} registo(s) sincronizado(s).`);
      void qc.invalidateQueries();
    } else {
      toast.info("Nada para sincronizar ou ainda sem rede.");
    }
  }

  return (
    <MobileShell titulo={rota.data?.nome ?? "Sem rota atribuída"}>
      {pendentes > 0 ? (
        <Card className="mb-4 border-warning/40">
          <CardContent className="flex items-center justify-between gap-3 py-4">
            <div>
              <p className="text-sm font-semibold">{pendentes} registo(s) por sincronizar</p>
              <p className="text-xs text-muted-foreground">
                Guardados no dispositivo até haver rede.
              </p>
            </div>
            <Button size="sm" onClick={sincronizar}>
              <RefreshCw className="size-4" /> Sincronizar
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!rota.data ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Não existe rota atribuída para hoje. Fale com a coordenação.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground">Progresso</p>
                <p className="text-2xl numeric-data">
                  {concluidas}/{lista.length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground">Proventos do dia</p>
                <p className="text-2xl numeric-data">{euro(ganho)}</p>
              </CardContent>
            </Card>
          </div>

          {pontos.length ? (
            <div className="mb-4">
              <FleetMap pontos={pontos} ligar altura={220} />
            </div>
          ) : null}

          <div className="space-y-2">
            {lista.map((s) => {
              const e = STOP_ESTADOS[s.estado as keyof typeof STOP_ESTADOS];
              return (
                <Link
                  key={s.id}
                  to="/app/parada/$id"
                  params={{ id: s.id }}
                  className="block rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-accent"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        #{s.ordem} {s.cliente}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.morada} {s.codigo_postal ? `· ${s.codigo_postal}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {s.tipo === "recolha" ? "Recolha" : "Entrega"} · {s.objetos} objeto(s)
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge label={e?.label ?? s.estado} tone={e?.tone ?? "muted"} />
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </MobileShell>
  );
}
