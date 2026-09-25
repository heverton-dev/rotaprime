import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VEHICLE_ESTADOS } from "@/lib/domain";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/veiculos")({
  head: () => ({
    meta: [
      { title: "Carrinhas e manutenção — RotaPrime" },
      {
        name: "description",
        content: "Atribuição de carrinhas a estafetas, quilómetros e pedidos de manutenção.",
      },
      { property: "og:title", content: "Carrinhas e manutenção — RotaPrime" },
      {
        property: "og:description",
        content: "Atribuição de carrinhas, quilómetros e pedidos de manutenção.",
      },
    ],
  }),
  component: Veiculos,
});

function Veiculos() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [matricula, setMatricula] = useState("");
  const [modelo, setModelo] = useState("");
  const [km, setKm] = useState("0");
  const [aberto, setAberto] = useState(false);

  const veiculos = useQuery({
    queryKey: ["veiculos-lista"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, matricula, modelo, estado, km, proxima_manutencao, estafeta_id")
        .order("matricula");
      if (error) throw error;
      return data;
    },
  });

  const estafetas = useQuery({
    queryKey: ["perfis"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, nome").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const manutencoes = useQuery({
    queryKey: ["manutencoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_requests")
        .select("id, vehicle_id, descricao, estado, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const criar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("vehicles")
        .insert({ matricula, modelo, km: Number(km) || 0 });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Carrinha registada.");
      setMatricula("");
      setModelo("");
      setKm("0");
      setAberto(false);
      void qc.invalidateQueries({ queryKey: ["veiculos-lista"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const atualizar = useMutation({
    mutationFn: async (v: { id: string; campos: Record<string, unknown> }) => {
      const { error } = await supabase.from("vehicles").update(v.campos as never).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["veiculos-lista"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const pedirManutencao = useMutation({
    mutationFn: async (v: { vehicle_id: string; descricao: string }) => {
      const { error } = await supabase.from("maintenance_requests").insert({
        vehicle_id: v.vehicle_id,
        descricao: v.descricao,
        criado_por: user?.id ?? null,
      });
      if (error) throw error;
      await supabase.from("vehicles").update({ estado: "manutencao" }).eq("id", v.vehicle_id);
    },
    onSuccess: () => {
      toast.success("Manutenção acionada.");
      void qc.invalidateQueries({ queryKey: ["manutencoes"] });
      void qc.invalidateQueries({ queryKey: ["veiculos-lista"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminShell
      titulo="Carrinhas"
      descricao="Frota, atribuição de veículos e acionamento de manutenção."
      acoes={
        <Dialog open={aberto} onOpenChange={setAberto}>
          <DialogTrigger asChild>
            <Button>Nova carrinha</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registar carrinha</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="mat">Matrícula</Label>
                <Input
                  id="mat"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value.toUpperCase())}
                  placeholder="AA-00-BB"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mod">Modelo</Label>
                <Input id="mod" value={modelo} onChange={(e) => setModelo(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="km">Quilómetros</Label>
                <Input id="km" type="number" value={km} onChange={(e) => setKm(e.target.value)} />
              </div>
              <Button
                className="w-full"
                disabled={!matricula || criar.isPending}
                onClick={() => criar.mutate()}
              >
                Guardar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        {(veiculos.data ?? []).map((v) => {
          const e = VEHICLE_ESTADOS[v.estado as keyof typeof VEHICLE_ESTADOS];
          const pedidos = (manutencoes.data ?? []).filter((m) => m.vehicle_id === v.id);
          return (
            <Card key={v.id}>
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{v.matricula}</CardTitle>
                  <p className="text-sm text-muted-foreground">{v.modelo || "Sem modelo"}</p>
                </div>
                <StatusBadge label={e?.label ?? v.estado} tone={e?.tone ?? "muted"} />
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quilómetros</span>
                  <span className="numeric-data">{v.km.toLocaleString("pt-PT")} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Próxima manutenção</span>
                  <span className="numeric-data">{v.proxima_manutencao ?? "—"}</span>
                </div>

                <div className="space-y-1.5">
                  <Label>Estafeta atribuído</Label>
                  <Select
                    value={v.estafeta_id ?? "nenhum"}
                    onValueChange={(val) =>
                      atualizar.mutate({
                        id: v.id,
                        campos: { estafeta_id: val === "nenhum" ? null : val },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nenhum">Sem atribuição</SelectItem>
                      {(estafetas.data ?? []).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome || "Sem nome"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Estado</Label>
                  <Select
                    value={v.estado}
                    onValueChange={(val) => atualizar.mutate({ id: v.id, campos: { estado: val } })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(VEHICLE_ESTADOS).map(([k, val]) => (
                        <SelectItem key={k} value={k}>
                          {val.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <ManutencaoForm
                  onSubmit={(descricao) => pedirManutencao.mutate({ vehicle_id: v.id, descricao })}
                />

                {pedidos.length > 0 ? (
                  <ul className="space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                    {pedidos.slice(0, 3).map((m) => (
                      <li key={m.id} className="flex justify-between gap-2">
                        <span className="truncate">{m.descricao}</span>
                        <span className="shrink-0 font-semibold">{m.estado}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AdminShell>
  );
}

function ManutencaoForm({ onSubmit }: { onSubmit: (descricao: string) => void }) {
  const [texto, setTexto] = useState("");
  return (
    <div className="space-y-2 border-t border-border pt-3">
      <Label>Acionar manutenção</Label>
      <Textarea
        rows={2}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Descreva a avaria ou revisão necessária"
      />
      <Button
        variant="secondary"
        size="sm"
        disabled={!texto.trim()}
        onClick={() => {
          onSubmit(texto.trim());
          setTexto("");
        }}
      >
        Abrir pedido
      </Button>
    </div>
  );
}
