import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EXPENSE_TIPOS, dataCurta, euro } from "@/lib/domain";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/custos")({
  head: () => ({
    meta: [
      { title: "Custos operacionais — RotaPrime" },
      {
        name: "description",
        content: "Registo e consolidação de combustível, portagens e estacionamento em euros.",
      },
      { property: "og:title", content: "Custos operacionais — RotaPrime" },
      {
        property: "og:description",
        content: "Combustível, portagens e estacionamento consolidados em euros.",
      },
    ],
  }),
  component: Custos,
});

function Custos() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [tipo, setTipo] = useState<keyof typeof EXPENSE_TIPOS>("combustivel");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));

  const custos = useQuery({
    queryKey: ["custos"],
    queryFn: async () => {
      const { data: d, error } = await supabase
        .from("expenses")
        .select("id, tipo, valor, descricao, data, user_id")
        .order("data", { ascending: false });
      if (error) throw error;
      return d;
    },
  });

  const perfis = useQuery({
    queryKey: ["perfis"],
    queryFn: async () => {
      const { data: d, error } = await supabase.from("profiles").select("id, nome");
      if (error) throw error;
      return d;
    },
  });

  const criar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("expenses").insert({
        user_id: user!.id,
        tipo,
        valor: Number(valor.replace(",", ".")) || 0,
        descricao: descricao || null,
        data,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Custo registado.");
      setValor("");
      setDescricao("");
      void qc.invalidateQueries({ queryKey: ["custos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["custos"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const lista = custos.data ?? [];
  const total = lista.reduce((t, c) => t + Number(c.valor), 0);
  const porTipo = Object.keys(EXPENSE_TIPOS).map((k) => ({
    tipo: k as keyof typeof EXPENSE_TIPOS,
    total: lista.filter((c) => c.tipo === k).reduce((t, c) => t + Number(c.valor), 0),
  }));

  return (
    <AdminShell
      titulo="Custos operacionais"
      descricao="Combustível, portagens e estacionamento registados em euros."
    >
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registar custo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EXPENSE_TIPOS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="valor">Valor (€)</Label>
              <Input
                id="valor"
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="24,50"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="data">Data</Label>
              <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc">Descrição</Label>
              <Input id="desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>
            <Button
              className="w-full"
              disabled={!valor || criar.isPending}
              onClick={() => criar.mutate()}
            >
              Registar
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {porTipo.map((t) => (
              <Card key={t.tipo}>
                <CardContent className="py-5">
                  <p className="text-xs text-muted-foreground">{EXPENSE_TIPOS[t.tipo]}</p>
                  <p className="mt-1 text-xl numeric-data">{euro(t.total)}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Lançamentos</CardTitle>
              <span className="text-sm numeric-data">{euro(total)}</span>
            </CardHeader>
            <CardContent className="divide-y divide-border p-0">
              {lista.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">Sem custos registados.</p>
              ) : (
                lista.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {EXPENSE_TIPOS[c.tipo as keyof typeof EXPENSE_TIPOS] ?? c.tipo}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dataCurta(c.data)} ·{" "}
                        {(perfis.data ?? []).find((p) => p.id === c.user_id)?.nome ?? "—"}
                        {c.descricao ? ` · ${c.descricao}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm numeric-data">{euro(Number(c.valor))}</span>
                      <Button variant="ghost" size="sm" onClick={() => remover.mutate(c.id)}>
                        Remover
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}
