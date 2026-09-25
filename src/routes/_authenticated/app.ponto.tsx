import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MobileShell } from "@/components/MobileShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TIME_TIPOS, hora, minutosEntre } from "@/lib/domain";
import { useAuth } from "@/lib/auth";
import { useGeolocalizacao } from "@/lib/useGeolocalizacao";
import { guardarPonto } from "@/lib/offline";

export const Route = createFileRoute("/_authenticated/app/ponto")({
  head: () => ({
    meta: [
      { title: "Registo de ponto — Estafeta CTT" },
      {
        name: "description",
        content: "Início de dia, pausas e fim de expediente com registo de localização.",
      },
      { property: "og:title", content: "Registo de ponto — Estafeta CTT" },
      {
        property: "og:description",
        content: "Início de dia, pausas e fim de expediente com localização.",
      },
    ],
  }),
  component: Ponto,
});

function Ponto() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { posicao, erro } = useGeolocalizacao();

  const registos = useQuery({
    queryKey: ["meu-ponto", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const inicio = new Date();
      inicio.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("time_entries")
        .select("id, tipo, created_at")
        .eq("user_id", user!.id)
        .gte("created_at", inicio.toISOString())
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const lista = registos.data ?? [];
  const ultimo = lista[lista.length - 1];
  const checkin = lista.find((r) => r.tipo === "checkin");
  const checkout = lista.find((r) => r.tipo === "checkout");
  const emPausa = ultimo?.tipo === "pausa_inicio";
  const decorrido = checkin ? minutosEntre(checkin.created_at, checkout?.created_at) : null;

  async function marcar(tipo: keyof typeof TIME_TIPOS) {
    const r = await guardarPonto({
      user_id: user!.id,
      tipo,
      lat: posicao?.lat ?? null,
      lng: posicao?.lng ?? null,
    });
    toast[r.sincronizado ? "success" : "info"](
      r.sincronizado
        ? `${TIME_TIPOS[tipo]} registado.`
        : `${TIME_TIPOS[tipo]} guardado no dispositivo até haver rede.`,
    );
    void qc.invalidateQueries({ queryKey: ["meu-ponto", user?.id] });
  }

  return (
    <MobileShell titulo="Registo de ponto">
      <Card>
        <CardContent className="space-y-3 py-5">
          <p className="text-xs text-muted-foreground">
            {posicao
              ? `Localização confirmada (±${posicao.precisao} m)`
              : (erro ?? "A obter localização…")}
          </p>
          {decorrido != null ? (
            <p className="text-sm">
              Tempo de expediente:{" "}
              <span className="numeric-data font-semibold">
                {Math.floor(decorrido / 60)}h{String(decorrido % 60).padStart(2, "0")}
              </span>
            </p>
          ) : null}
          <div className="grid gap-2">
            <Button
              className="touch-target"
              disabled={!!checkin}
              onClick={() => void marcar("checkin")}
            >
              Iniciar dia
            </Button>
            <Button
              className="touch-target"
              variant="outline"
              disabled={!checkin || !!checkout}
              onClick={() => void marcar(emPausa ? "pausa_fim" : "pausa_inicio")}
            >
              {emPausa ? "Terminar pausa" : "Iniciar pausa"}
            </Button>
            <Button
              className="touch-target"
              variant="secondary"
              disabled={!checkin || !!checkout}
              onClick={() => void marcar("checkout")}
            >
              Terminar expediente
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Registos de hoje</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border p-0">
          {lista.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">Sem registos hoje.</p>
          ) : (
            lista.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>{TIME_TIPOS[r.tipo as keyof typeof TIME_TIPOS] ?? r.tipo}</span>
                <span className="numeric-data text-muted-foreground">{hora(r.created_at)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </MobileShell>
  );
}
