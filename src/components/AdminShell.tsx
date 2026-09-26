import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Route as RouteIcon,
  Users,
  Truck,
  Euro,
  BarChart3,
  LogOut,
  Smartphone,
  Menu,
  Code2,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { to: "/rotas", label: "Rotas", icon: RouteIcon },
  { to: "/estafetas", label: "Estafetas", icon: Users },
  { to: "/veiculos", label: "Carrinhas", icon: Truck },
  { to: "/custos", label: "Custos", icon: Euro },
  { to: "/relatorios", label: "Relatórios e SLA", icon: BarChart3 },
  { to: "/studio/api", label: "Studio", icon: Code2 },
] as const;

export function AdminShell({
  titulo,
  descricao,
  acoes,
  children,
}: {
  titulo: string;
  descricao?: string;
  acoes?: ReactNode;
  children: ReactNode;
}) {
  const { nome, roles } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [aberto, setAberto] = useState(false);

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-[248px_1fr]">
      <aside
        className={cn(
          "bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:h-screen md:border-r md:border-sidebar-border",
          aberto ? "block" : "hidden md:block",
        )}
      >
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-extrabold text-primary-foreground">
            RC
          </span>
          <span className="text-sm font-bold tracking-wide uppercase">RotaPrime</span>
        </div>
        <nav className="space-y-1 px-3 pb-4">
          {nav.map((item) => {
            const base = item.to.startsWith("/studio") ? "/studio" : item.to;
            const ativo = pathname === base || pathname.startsWith(base + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setAberto(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  ativo
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
          <Link
            to="/app"
            className="mt-4 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-sidebar-accent"
          >
            <Smartphone className="size-4" />
            Ambiente do estafeta
          </Link>
        </nav>
        <div className="mt-auto border-t border-sidebar-border px-5 py-4">
          <p className="truncate text-sm font-semibold">{nome || "Utilizador"}</p>
          <p className="text-xs opacity-70">
            {roles.map((r) => ROLE_LABELS[r]).join(", ") || "Sem nível atribuído"}
          </p>
          <button
            onClick={sair}
            className="mt-3 inline-flex items-center gap-2 text-xs font-semibold opacity-80 hover:opacity-100"
          >
            <LogOut className="size-3.5" /> Terminar sessão
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="border-b border-border bg-card">
          <div className="flex items-start justify-between gap-4 px-4 py-4 md:px-8 md:py-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setAberto((v) => !v)}
                  aria-label="Menu"
                >
                  <Menu className="size-5" />
                </Button>
                <h1 className="truncate text-xl md:text-2xl">{titulo}</h1>
              </div>
              {descricao ? <p className="mt-1 text-sm text-muted-foreground">{descricao}</p> : null}
            </div>
            {acoes ? <div className="flex shrink-0 gap-2">{acoes}</div> : null}
          </div>
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
