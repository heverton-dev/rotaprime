import { createFileRoute } from "@tanstack/react-router";
import { EVENTOS } from "@/lib/studio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/studio/webhooks")({
  head: () => ({ meta: [{ title: "Studio Webhook — RotaPrime" }, { name: "description", content: "Catálogo de todos os eventos da plataforma." }] }),
  component: StudioWebhooks,
});

function StudioWebhooks() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {EVENTOS.length} eventos. Envelope comum: <code className="numeric-data">{`{ "evento", "ocorrido_em", "dados" }`}</code>. O envio para n8n / WhatsApp fica ativo quando o destino for configurado.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {EVENTOS.map((e) => (
          <Card key={e.nome}>
            <CardHeader className="pb-2">
              <CardTitle className="font-mono text-sm">{e.nome}</CardTitle>
              <p className="text-xs text-muted-foreground">{e.quando} · origem: {e.origem}</p>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify({ evento: e.nome, ocorrido_em: "2026-09-25T09:00:00Z", dados: e.exemplo }, null, 2)}
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
