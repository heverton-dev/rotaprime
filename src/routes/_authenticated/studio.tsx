import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/studio")({
  head: () => ({
    meta: [
      { title: "Studio — RotaPrime" },
      {
        name: "description",
        content: "Studio de desenvolvimento: API, eventos, MCP e documentação.",
      },
      { property: "og:title", content: "Studio — RotaPrime" },
      { property: "og:description", content: "API, eventos, MCP e documentação da plataforma." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StudioLayout,
});

const tabs = [
  { to: "/studio/api", label: "Studio API" },
  { to: "/studio/webhooks", label: "Studio Webhook" },
  { to: "/studio/mcp", label: "Studio MCP" },
  { to: "/studio/docs", label: "Studio Doc" },
] as const;

function StudioLayout() {
  const { isGestor, loading, roles } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && roles.length && !isGestor) void navigate({ to: "/app" });
  }, [loading, roles, isGestor, navigate]);

  return (
    <AdminShell
      titulo="Studio"
      descricao="Ferramentas de desenvolvimento e documentação da plataforma."
    >
      <div className="mb-6 flex flex-wrap gap-2 border-b border-border pb-3">
        {tabs.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted",
            )}
            activeProps={{ className: "bg-secondary text-secondary-foreground hover:bg-secondary" }}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <Outlet />
    </AdminShell>
  );
}
