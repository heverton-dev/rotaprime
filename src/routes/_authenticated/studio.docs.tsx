import { createFileRoute } from "@tanstack/react-router";
import { ROTAS_APP, TABELAS, TOKENS, EVENTOS } from "@/lib/studio";
import { ROLE_LABELS, GEOFENCE_RAIO_M, SLA_PARADA_MIN } from "@/lib/domain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/_authenticated/studio/docs")({
  head: () => ({
    meta: [
      { title: "Studio Doc — RotaPrime" },
      { name: "description", content: "Documentação completa da plataforma e design system." },
    ],
  }),
  component: StudioDocs,
});

const secoes = [
  "Visão geral",
  "Papéis",
  "Páginas",
  "Dados",
  "Regras de negócio",
  "Offline",
  "Eventos",
  "Design system",
];

function StudioDocs() {
  return (
    <div className="grid gap-6 lg:grid-cols-[180px_1fr]">
      <nav className="hidden space-y-1 text-sm lg:block">
        {secoes.map((s) => (
          <a
            key={s}
            href={`#${s}`}
            className="block rounded px-2 py-1 text-muted-foreground hover:bg-muted"
          >
            {s}
          </a>
        ))}
      </nav>
      <div className="space-y-6">
        <Sec t="Visão geral">
          <p>
            Plataforma híbrida de gestão de entregas em Portugal: área de gestão (web) e app do
            estafeta (telemóvel, instalável), com base de dados única, permissões por papel, mapas
            OpenStreetMap, geofencing e funcionamento sem rede.
          </p>
        </Sec>
        <Sec t="Papéis">
          <ul className="grid gap-1 sm:grid-cols-2">
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <li key={k}>
                <code>{k}</code> — {v}
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground">
            Acessos criados só pela administração. Sem registo público nem login social. E-mail
            confirmado automaticamente.
          </p>
        </Sec>
        <Sec t="Páginas">
          <table className="w-full text-left text-sm">
            <tbody>
              {ROTAS_APP.map((r) => (
                <tr key={r.caminho} className="border-b border-border">
                  <td className="py-1.5 font-mono">{r.caminho}</td>
                  <td>{r.area}</td>
                  <td className="text-muted-foreground">{r.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Sec>
        <Sec t="Dados">
          {TABELAS.map((t) => (
            <div key={t.nome} className="mb-3">
              <p className="font-mono font-semibold">{t.nome}</p>
              <p className="text-muted-foreground">
                {t.desc} {t.acesso}
              </p>
              <p className="font-mono text-xs">{t.colunas.map((c) => c.nome).join(", ")}</p>
            </div>
          ))}
        </Sec>
        <Sec t="Regras de negócio">
          <ul className="list-disc space-y-1 pl-5">
            <li>Pagamento por parada atendida (valor_por_parada × entregues).</li>
            <li>Geofencing: a parada só inicia dentro de {GEOFENCE_RAIO_M} m.</li>
            <li>SLA de permanência: {SLA_PARADA_MIN} min por parada.</li>
            <li>Otimização da ordem por vizinho mais próximo.</li>
            <li>Insucesso exige motivo (logística reversa).</li>
          </ul>
        </Sec>
        <Sec t="Offline">
          <p>
            Atualizações de paradas e ponto sem rede ficam numa fila no aparelho e são enviadas por
            ordem quando a ligação volta.
          </p>
        </Sec>
        <Sec t="Eventos">
          <p>{EVENTOS.length} eventos catalogados — ver Studio Webhook.</p>
        </Sec>
        <Sec t="Design system">
          <p className="text-muted-foreground">
            Corporativo, minimalista, sem elementos lúdicos. Tipografia Inter. Alvos de toque ≥ 48
            px. Modo escuro automático.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {TOKENS.map((t) => (
              <div
                key={t.nome}
                className="flex items-center gap-3 rounded-md border border-border p-2"
              >
                <span
                  className="h-10 w-10 shrink-0 rounded-md border border-border"
                  style={{ background: `var(${t.nome})` }}
                />
                <div className="text-xs">
                  <p className="font-mono font-semibold">{t.nome}</p>
                  <p className="text-muted-foreground">{t.uso}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button>Primário</Button>
            <Button variant="secondary">Secundário</Button>
            <Button variant="outline">Contorno</Button>
            <Button variant="destructive">Remover</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge label="Pendente" />
            <StatusBadge label="Em curso" tone="warning" />
            <StatusBadge label="Entregue" tone="success" />
            <StatusBadge label="Insucesso" tone="destructive" />
            <StatusBadge label="Info" tone="info" />
          </div>
          <p className="numeric-data text-2xl font-bold">1 234,56 €</p>
        </Sec>
      </div>
    </div>
  );
}

function Sec({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <Card id={t}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">{children}</CardContent>
    </Card>
  );
}
