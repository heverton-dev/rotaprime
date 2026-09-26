import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Camera, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MobileShell } from "@/components/MobileShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GEOFENCE_RAIO_M, STOP_ESTADOS, distanciaM, hora } from "@/lib/domain";
import { useAuth } from "@/lib/auth";
import { useGeolocalizacao } from "@/lib/useGeolocalizacao";
import { guardarParada } from "@/lib/offline";

export const Route = createFileRoute("/_authenticated/app/parada/$id")({
  head: () => ({
    meta: [
      { title: "Parada — Estafeta CTT" },
      {
        name: "description",
        content:
          "Execução da parada: checklist, prova de entrega assinada, fotografia e motivo de insucesso.",
      },
      { property: "og:title", content: "Parada — Estafeta CTT" },
      {
        property: "og:description",
        content: "Checklist, prova de entrega assinada, fotografia e insucessos.",
      },
    ],
  }),
  component: Parada,
});

const CHECKLIST = [
  "Objetos conferidos com a guia",
  "Embalagem íntegra",
  "Destinatário identificado",
] as const;

function Parada() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { isGod } = useAuth();
  const { posicao, erro } = useGeolocalizacao();

  const [itens, setItens] = useState<Record<string, boolean>>({});
  const [assinatura, setAssinatura] = useState("");
  const [motivo, setMotivo] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
  const [aGuardar, setAGuardar] = useState(false);

  const parada = useQuery({
    queryKey: ["parada", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("stops").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const c = parada.data?.checklist;
    if (c && typeof c === "object") setItens(c as Record<string, boolean>);
    if (parada.data?.assinatura_nome) setAssinatura(parada.data.assinatura_nome);
  }, [parada.data]);

  const p = parada.data;
  const temCoords = p?.lat != null && p?.lng != null;
  const distancia =
    posicao && temCoords
      ? distanciaM(posicao, { lat: p!.lat as number, lng: p!.lng as number })
      : null;
  const dentroDoRaio = distancia != null && distancia <= GEOFENCE_RAIO_M;
  const podeConcluir = isGod || dentroDoRaio || !temCoords;
  const checklistOk = CHECKLIST.every((c) => itens[c]);

  async function iniciar() {
    setAGuardar(true);
    const r = await guardarParada(id, {
      estado: "em_curso",
      iniciada_em: new Date().toISOString(),
    });
    setAGuardar(false);
    toast[r.sincronizado ? "success" : "info"](
      r.sincronizado ? "Parada iniciada." : "Início guardado no dispositivo.",
    );
    void qc.invalidateQueries({ queryKey: ["parada", id] });
  }

  async function concluir() {
    if (!podeConcluir) {
      toast.error(`Aproxime-se do local: está a ${distancia} m (tolerância ${GEOFENCE_RAIO_M} m).`);
      return;
    }
    if (!checklistOk) {
      toast.error("Complete o checklist antes de concluir.");
      return;
    }
    if (!assinatura.trim()) {
      toast.error("Indique quem recebeu para a prova de entrega.");
      return;
    }
    setAGuardar(true);
    const r = await guardarParada(id, {
      estado: "concluida",
      concluida_em: new Date().toISOString(),
      checklist: itens,
      assinatura_nome: assinatura.trim(),
      foto_url: foto,
      motivo_insucesso: null,
    });
    setAGuardar(false);
    toast[r.sincronizado ? "success" : "info"](
      r.sincronizado ? "Parada concluída." : "Conclusão guardada no dispositivo.",
    );
    void qc.invalidateQueries();
    void navigate({ to: "/app" });
  }

  async function insucesso(reversa: boolean) {
    if (!motivo.trim()) {
      toast.error("Descreva o motivo do insucesso.");
      return;
    }
    setAGuardar(true);
    const r = await guardarParada(id, {
      estado: reversa ? "reversa" : "insucesso",
      concluida_em: new Date().toISOString(),
      motivo_insucesso: motivo.trim(),
      checklist: itens,
      foto_url: foto,
    });
    setAGuardar(false);
    toast[r.sincronizado ? "success" : "info"](
      r.sincronizado ? "Ocorrência registada." : "Ocorrência guardada no dispositivo.",
    );
    void qc.invalidateQueries();
    void navigate({ to: "/app" });
  }

  function lerFoto(file: File) {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const escala = Math.min(1, 800 / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setFoto(canvas.toDataURL("image/jpeg", 0.6));
        toast.success("Fotografia anexada.");
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  const estado = p ? STOP_ESTADOS[p.estado as keyof typeof STOP_ESTADOS] : undefined;
  const destino = temCoords ? `${p!.lat},${p!.lng}` : encodeURIComponent(p?.morada ?? "");

  return (
    <MobileShell titulo={p ? `#${p.ordem} ${p.cliente}` : "Parada"}>
      <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2">
        <Link to="/app">
          <ArrowLeft className="size-4" /> Rota do dia
        </Link>
      </Button>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">{p?.morada}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {p?.codigo_postal} · {p?.tipo === "recolha" ? "Recolha" : "Entrega"} · {p?.objetos}{" "}
              objeto(s)
            </p>
          </div>
          {estado ? <StatusBadge label={estado.label} tone={estado.tone} /> : null}
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {distancia != null
              ? `${distancia} m do local · tolerância ${GEOFENCE_RAIO_M} m`
              : (erro ?? "A obter localização…")}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="touch-target" asChild>
              <a
                href={`https://waze.com/ul?ll=${destino}&navigate=yes`}
                target="_blank"
                rel="noreferrer"
              >
                <Navigation className="size-4" /> Waze
              </a>
            </Button>
            <Button variant="outline" className="touch-target" asChild>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${destino}`}
                target="_blank"
                rel="noreferrer"
              >
                <Navigation className="size-4" /> Maps
              </a>
            </Button>
          </div>
          {p?.estado === "pendente" ? (
            <Button
              className="w-full touch-target"
              disabled={aGuardar}
              onClick={() => void iniciar()}
            >
              Iniciar parada
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Iniciada às {hora(p?.iniciada_em)}
              {p?.concluida_em ? ` · fechada às ${hora(p.concluida_em)}` : ""}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Checklist e prova de entrega</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {CHECKLIST.map((c) => (
              <label key={c} className="flex items-center gap-3 text-sm">
                <Checkbox
                  checked={!!itens[c]}
                  onCheckedChange={(v) => setItens((s) => ({ ...s, [c]: v === true }))}
                />
                {c}
              </label>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="assinatura">Recebido por</Label>
            <Input
              id="assinatura"
              className="touch-target"
              value={assinatura}
              onChange={(e) => setAssinatura(e.target.value)}
              placeholder="Nome de quem recebeu"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="foto">Fotografia do comprovativo</Label>
            <Input
              id="foto"
              type="file"
              accept="image/*"
              capture="environment"
              className="touch-target"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) lerFoto(f);
              }}
            />
            {foto ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Camera className="size-3.5" /> Fotografia pronta a enviar
              </p>
            ) : null}
          </div>
          <Button
            className="w-full touch-target"
            disabled={aGuardar || p?.estado === "concluida"}
            onClick={() => void concluir()}
          >
            Concluir parada
          </Button>
          {!podeConcluir ? (
            <p className="text-xs text-destructive">
              Conclusão bloqueada fora do raio de tolerância do local.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Ocorrência</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ausente, morada não encontrada, recusa do destinatário…"
          />
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="touch-target"
              disabled={aGuardar}
              onClick={() => void insucesso(false)}
            >
              Insucesso
            </Button>
            <Button
              variant="secondary"
              className="touch-target"
              disabled={aGuardar}
              onClick={() => void insucesso(true)}
            >
              Logística reversa
            </Button>
          </div>
        </CardContent>
      </Card>
    </MobileShell>
  );
}
