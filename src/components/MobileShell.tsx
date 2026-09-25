import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { MapPin, Clock, BarChart3, LogOut, LayoutDashboard } from "lucide-react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/app", label: "Rota", icon: MapPin, exact: true },
  { to: "/app/ponto", label: "Ponto", icon: Clock, exact: false },
  { to: "/app/resumo", label: "Resumo", icon: BarChart3, exact: false },
] as const;

export function MobileShell({ titulo, children }: { titulo: string; children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { nome, isGestor } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 bg-secondary text-secondary-foreground">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] tracking-wide uppercase opacity-75">{nome || "Estafeta"}</p>
            <h1 className="truncate text-lg font-bold">{titulo}</h1>
          </div>
          <div className="flex items-center gap-1">
            {isGestor ? (
              <Link
                to="/dashboard"
                aria-label="Painel de gestão"
                className="touch-target flex items-center justify-center rounded-md hover:bg-white/10"
              >
                <LayoutDashboard className="size-5" />
              </Link>
            ) : null}
            <button
              onClick={sair}
              aria-label="Terminar sessão"
              className="touch-target flex items-center justify-center rounded-md hover:bg-white/10"
            >
              <LogOut className="size-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-4 pb-28">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card">
        <div className="mx-auto flex w-full max-w-2xl">
          {tabs.map((t) => {
            const ativo = t.exact ? pathname === t.to : pathname.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to}
                className={cn(
                  "touch-target flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-xs font-semibold",
                  ativo ? "text-primary" : "text-muted-foreground",
                )}
              >
                <t.icon className="size-5" />
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
