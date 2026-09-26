import { createFileRoute, Link } from "@tanstack/react-router";
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
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { ROUTE_ESTADOS, dataCurta, euro } from "@/lib/domain";
import { geocodificar } from "@/lib/geocode";

export const Route = createFileRoute("/_authenticated/rotas/")({
  head: () => ({
    meta: [
      { title: "Rotas — RotaPrime" },
      {
        name: "description",
        content: "Criação, otimização e acompanhamento das rotas diárias de entrega e recolha.",
      },
      { property: "og:title", content: "Rotas — RotaPrime" },
      { property: "og:description", content: "Criação e acompanhamento das rotas diárias." },
    ],
  }),
  component: Rotas,
});

function Rotas() {
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [valor, setValor] = useState("0.85");
  const [estafeta, setEstafeta] = useState("nenhum");
  const [veiculo, setVeiculo] = useState("nenhum");
  const [moradas, setMoradas] = useState("");

  const rotas = useQuery({
    queryKey: ["rotas-todas"],
    queryFn: async () => {
      const { data: d, error } = await supabase
        .from("delivery_routes")
        .select("id, nome, data, estado, valor_por_parada, estafeta_id, vehicle_id")
        .order("data", { ascending: false });
      if (error) throw error;
      return d;
    },
  });

  const contagens = useQuery({
    queryKey: ["contagem-paradas"],
    queryFn: async () => {
      const { data: d, error } = await supabase.from("stops").select("route_id, estado");
      if (error) throw error;
      return d;
    },
  });

  const perfis = useQuery({
    queryKey: ["perfis"],
    queryFn: async () => {
      const { data: d, error } = await supabase.from("profiles").select("id, nome").order("nome");
      if (error) throw error;
      return d;
    },
  });

  const veiculos = useQuery({
    queryKey: ["veiculos"],
    queryFn: async () => {
      const { data: d, error } = await supabase.from("vehicles").select("id, matricula, estado");
      if (error) throw error;
      return d;
    },
  });

  const criar = useMutation({
    mutationFn: async () => {
      const { data: rota, error } = await supabase
        .from("delivery_routes")
        .insert({
          nome,
          data,
          valor_por_parada: Number(valor) || 0,
          estafeta_id: estafeta === "nenhum" ? null : estafeta,
          vehicle_id: veiculo === "nenhum" ? null : veiculo,
        })
        .select("id")
        .single();
      if (error) throw error;

      const linhas = moradas
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      let ordem = 1;
      for (const linha of linhas) {
        const [cliente = "", morada = "", codigo_postal = ""] = linha
          .split("|")
          .map((p) => p.trim());
        const coords = morada ? await geocodificar(`${morada} ${codigo_postal} Portugal`) : null;
        const { error: err2 } = await supabase.from("stops").insert({
          route_id: rota.id,
          ordem: ordem++,
          cliente: cliente || "Destinatário",
          morada: morada || cliente,
          codigo_postal: codigo_postal || null,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
        });
        if (err2) throw err2;
      }
      return rota.id;
    },
    onSuccess: () => {
      toast.success("Rota criada.");
      setAberto(false);
      setNome("");
      setMoradas("");
      void qc.invalidateQueries({ queryKey: ["rotas-todas"] });
      void qc.invalidateQueries({ queryKey: ["contagem-paradas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminShell
      titulo="Rotas"
      descricao="Criação da rota do dia, atribuição de estafeta e carrinha, e acompanhamento."
      acoes={
        <Dialog open={aberto} onOpenChange={setAberto}>
          <DialogTrigger asChild>
            <Button>Nova rota</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar rota</DialogTitle>
              <DialogDescription>
                As moradas são localizadas automaticamente no mapa a partir do código postal.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="nome">Nome da rota</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Lisboa Centro - Manhã"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="data">Data</Label>
                  <Input
                    id="data"
                    type="date"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="valor">Valor por parada (€)</Label>
                  <Input
                    id="valor"
                    type="number"
                    step="0.05"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Estafeta</Label>
                  <Select value={estafeta} onValueChange={setEstafeta}>
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
                  <Select value={veiculo} onValueChange={setVeiculo}>
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
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="moradas">Paradas (uma por linha)</Label>
                <Textarea
                  id="moradas"
                  rows={6}
                  value={moradas}
                  onChange={(e) => setMoradas(e.target.value)}
                  placeholder={"Ana Marques | Rua Augusta 24, Lisboa | 1100-048"}
                />
                <p className="text-xs text-muted-foreground">
                  Formato: nome do cliente | morada | código postal
                </p>
              </div>
              <Button
                className="w-full"
                disabled={!nome || criar.isPending}
                onClick={() => criar.mutate()}
              >
                {criar.isPending ? "A criar e localizar moradas…" : "Criar rota"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <Card>
        <CardContent className="divide-y divide-border p-0">
          {(rotas.data ?? []).length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Ainda não há rotas registadas.</p>
          ) : (
            (rotas.data ?? []).map((r) => {
              const paradas = (contagens.data ?? []).filter((s) => s.route_id === r.id);
              const feitas = paradas.filter((s) => s.estado === "concluida").length;
              const e = ROUTE_ESTADOS[r.estado as keyof typeof ROUTE_ESTADOS];
              return (
                <Link
                  key={r.id}
                  to="/rotas/$id"
                  params={{ id: r.id }}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{r.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {dataCurta(r.data)} · {euro(Number(r.valor_por_parada))} por parada
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="numeric-data">
                      {feitas}/{paradas.length}
                    </span>
                    <StatusBadge label={e?.label ?? r.estado} tone={e?.tone ?? "muted"} />
                  </div>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
