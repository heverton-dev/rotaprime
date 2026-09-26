import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MCP_TOOLS } from "@/lib/studio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/studio/mcp")({
  head: () => ({
    meta: [
      { title: "Studio MCP — RotaPrime" },
      { name: "description", content: "Servidor MCP para desenvolvimento assistido por IA." },
    ],
  }),
  component: StudioMcp,
});

function StudioMcp() {
  const [origem, setOrigem] = useState("");
  const [saida, setSaida] = useState("");
  useEffect(() => setOrigem(window.location.origin), []);
  const url = `${origem}/api/public/mcp`;

  async function testar(nome: string) {
    const r = await fetch("/api/public/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: nome, arguments: {} },
      }),
    });
    const j = await r.json();
    setSaida(j.result?.content?.[0]?.text ?? JSON.stringify(j, null, 2));
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ligação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Exclusivo para desenvolvimento assistido por IA. Só leitura: especificação, esquema,
            rotas, eventos e design system — nunca dados de clientes.
          </p>
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify({ mcpServers: { "rotas-ctt": { type: "http", url } } }, null, 2)}
          </pre>
        </CardContent>
      </Card>
      <div className="grid gap-3 md:grid-cols-2">
        {MCP_TOOLS.map((t) => (
          <Card key={t.name}>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-mono text-sm font-semibold">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.description}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => void testar(t.name)}>
                Testar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      {saida && (
        <pre className="max-h-[480px] overflow-auto rounded-md border border-border bg-card p-3 text-xs">
          {saida}
        </pre>
      )}
    </div>
  );
}
