import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/studio/api")({
  head: () => ({
    meta: [
      { title: "Studio API — RotaPrime" },
      { name: "description", content: "OpenAPI / Swagger com todas as rotas de dados." },
    ],
  }),
  component: StudioApi,
});

const CDN = "https://unpkg.com/swagger-ui-dist@5";

function StudioApi() {
  const ref = useRef<HTMLDivElement>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!document.querySelector(`link[data-swagger]`)) {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = `${CDN}/swagger-ui.css`;
      l.dataset["swagger"] = "1";
      document.head.appendChild(l);
    }
    const iniciar = () => {
      const w = window as unknown as { SwaggerUIBundle?: (o: Record<string, unknown>) => void };
      if (w.SwaggerUIBundle && ref.current)
        w.SwaggerUIBundle({
          url: "/api/public/openapi.json",
          domNode: ref.current,
          deepLinking: true,
        });
    };
    const existente = document.querySelector<HTMLScriptElement>("script[data-swagger]");
    if (existente) {
      iniciar();
      return;
    }
    const s = document.createElement("script");
    s.src = `${CDN}/swagger-ui-bundle.js`;
    s.dataset["swagger"] = "1";
    s.onload = iniciar;
    s.onerror = () => setErro(true);
    document.body.appendChild(s);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Documento OpenAPI 3 gerado a partir do esquema real da base de dados.
        </p>
        <Button asChild variant="outline" size="sm">
          <a href="/api/public/openapi.json" target="_blank" rel="noreferrer">
            Abrir openapi.json
          </a>
        </Button>
      </div>
      {erro && (
        <p className="text-sm text-destructive">
          Não foi possível carregar o visualizador. Use o link openapi.json.
        </p>
      )}
      <div ref={ref} className="rounded-lg border border-border bg-card p-2" />
    </div>
  );
}
