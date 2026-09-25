import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — RotaPrime" },
      { name: "description", content: "Acesso ao painel de gestão e à aplicação do estafeta." },
      { property: "og:title", content: "Entrar — RotaPrime" },
      { property: "og:description", content: "Acesso ao painel de gestão e à aplicação do estafeta." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, isGestor, roles } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [pronto, setPronto] = useState(false);
  useEffect(() => setPronto(true), []);


  useEffect(() => {
    if (session && roles.length > 0) {
      void navigate({ to: isGestor ? "/dashboard" : "/app", replace: true });
    }
  }, [session, roles, isGestor, navigate]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error("Credenciais inválidas. Contacte a administração.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2.5 text-secondary-foreground">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-extrabold text-primary-foreground">
            RC
          </span>
          <span className="text-sm font-bold tracking-wide uppercase">RotaPrime</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Acesso à plataforma</CardTitle>
            <CardDescription>
              Área reservada. Os acessos são criados e geridos pela administração da empresa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={entrar} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pass">Palavra-passe</Label>
                <Input
                  id="pass"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full touch-target" disabled={busy || !pronto}>
                Entrar
              </Button>
              <p className="text-xs text-muted-foreground">
                Não há registo público. Para obter ou recuperar credenciais, fale com o
                administrador da empresa.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

