import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, Truck, ClipboardCheck, Timer, Euro, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RotaPrime — Gestão e Roteirização de Entregas" },
      {
        name: "description",
        content:
          "Painel de gestão de frota e aplicação para estafetas: roteirização, ponto, geofencing, custos e comprovativos de entrega em Portugal.",
      },
      { property: "og:title", content: "RotaPrime — Gestão e Roteirização de Entregas" },
      {
        property: "og:description",
        content:
          "Painel de gestão de frota e aplicação para estafetas: roteirização, ponto, geofencing, custos e comprovativos de entrega.",
      },
    ],
  }),
  component: Landing,
});

const modulos = [
  {
    icon: Truck,
    titulo: "Frota e carrinhas",
    texto: "Atribuição de veículos e pedidos de manutenção.",
  },
  { icon: MapPin, titulo: "Roteirização", texto: "Rota do dia ordenada e acompanhamento no mapa." },
  {
    icon: ClipboardCheck,
    titulo: "Prova de entrega",
    texto: "Checklist, assinatura, fotografia e insucessos.",
  },
  { icon: Timer, titulo: "Ponto e SLA", texto: "Entrada, pausa, saída e alertas de permanência." },
  {
    icon: Euro,
    titulo: "Custos e proventos",
    texto: "Pagamento por parada, combustível e portagens.",
  },
  {
    icon: ShieldCheck,
    titulo: "Permissões",
    texto: "Níveis de acesso por empresa, colaborador e estafeta.",
  },
];

function Landing() {
  const { session, isGestor, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-secondary text-secondary-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-extrabold text-primary-foreground">
              RC
            </span>
            <span className="text-sm font-bold tracking-wide uppercase">RotaPrime</span>
          </div>
          {loading ? null : session ? (
            <Button asChild variant="default" size="sm">
              <Link to={isGestor ? "/dashboard" : "/app"}>Abrir plataforma</Link>
            </Button>
          ) : (
            <Button asChild variant="default" size="sm">
              <Link to="/auth">Entrar</Link>
            </Button>
          )}
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <p className="text-xs font-bold tracking-[0.18em] text-primary uppercase">
            Gestão operacional de entregas · Portugal
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl leading-tight md:text-5xl">
            Frota, rotas e estafetas sob controlo — do check-in ao comprovativo de entrega.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground">
            Painel corporativo para a gestão e aplicação móvel para o estafeta, com validação de
            proximidade por satélite, registo de custos e pagamento por parada atendida.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to={session ? (isGestor ? "/dashboard" : "/app") : "/auth"}>
                {session ? "Abrir plataforma" : "Entrar na plataforma"}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/app">Ambiente do estafeta</Link>
            </Button>
          </div>
        </section>

        <section className="border-t border-border bg-card">
          <div className="mx-auto grid max-w-6xl gap-px px-4 py-14 sm:grid-cols-2 lg:grid-cols-3">
            {modulos.map((m) => (
              <div key={m.titulo} className="p-5">
                <m.icon className="size-5 text-primary" />
                <h3 className="mt-3 text-base">{m.titulo}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{m.texto}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-4 text-xs text-muted-foreground">
          RotaPrime · Sistema de gestão e roteirização de entregas
        </div>
      </footer>
    </div>
  );
}
