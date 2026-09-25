import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "god" | "super_admin" | "admin" | "colaborador" | "estafeta";

const GESTAO: AppRole[] = ["god", "super_admin", "admin", "colaborador"];

type AuthValue = {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  loading: boolean;
  isGestor: boolean;
  isGod: boolean;
  nome: string;
};

const AuthContext = createContext<AuthValue>({
  session: null,
  user: null,
  roles: [],
  loading: true,
  isGestor: false,
  isGod: false,
  nome: "",
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) {
      setRoles([]);
      setNome("");
      return;
    }
    let active = true;
    void (async () => {
      const [{ data: r }, { data: p }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("profiles").select("nome").eq("id", userId).maybeSingle(),
      ]);
      if (!active) return;
      setRoles(((r ?? []) as { role: AppRole }[]).map((x) => x.role));
      setNome(p?.nome ?? "");
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      user: session?.user ?? null,
      roles,
      loading,
      isGestor: roles.some((r) => GESTAO.includes(r)),
      isGod: roles.includes("god"),
      nome,
    }),
    [session, roles, loading, nome],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
