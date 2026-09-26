import { beforeEach, describe, expect, it, vi } from "vitest";

const respostas: Array<{ error: unknown }> = [];
const chamadas: Array<{ tabela: string; op: string; dados: unknown; id?: string }> = [];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (tabela: string) => ({
      update: (dados: unknown) => ({
        eq: async (_col: string, id: string) => {
          chamadas.push({ tabela, op: "update", dados, id });
          return respostas.shift() ?? { error: null };
        },
      }),
      insert: async (dados: unknown) => {
        chamadas.push({ tabela, op: "insert", dados });
        return respostas.shift() ?? { error: null };
      },
    }),
  },
}));

const { guardarParada, guardarPonto, sincronizarFila, tamanhoFila } = await import("./offline");

function ambiente(online: boolean) {
  const memoria = new Map<string, string>();
  vi.stubGlobal("navigator", { onLine: online });
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => memoria.get(k) ?? null,
      setItem: (k: string, v: string) => void memoria.set(k, v),
    },
    dispatchEvent: () => true,
  });
}

beforeEach(() => {
  respostas.length = 0;
  chamadas.length = 0;
  vi.unstubAllGlobals();
});

describe("fila offline do estafeta", () => {
  it("sem rede guarda na fila e nao chama o Supabase", async () => {
    ambiente(false);
    expect(await guardarParada("p1", { estado: "concluida" })).toEqual({ sincronizado: false });
    expect(tamanhoFila()).toBe(1);
    expect(chamadas).toHaveLength(0);
  });

  it("com rede envia logo", async () => {
    ambiente(true);
    expect(await guardarPonto({ tipo: "checkin" })).toEqual({ sincronizado: true });
    expect(chamadas).toEqual([
      { tabela: "time_entries", op: "insert", dados: { tipo: "checkin" } },
    ]);
    expect(tamanhoFila()).toBe(0);
  });

  it("falha do servidor nao perde a escrita", async () => {
    ambiente(true);
    respostas.push({ error: new Error("503") });
    expect(await guardarParada("p1", { estado: "insucesso" })).toEqual({ sincronizado: false });
    expect(tamanhoFila()).toBe(1);
  });

  it("sincroniza por ordem e para no primeiro erro, mantendo o resto", async () => {
    ambiente(false);
    await guardarParada("p1", { estado: "concluida" });
    await guardarPonto({ tipo: "pausa_inicio" });
    await guardarParada("p2", { estado: "concluida" });
    vi.stubGlobal("navigator", { onLine: true });

    respostas.push({ error: null }, { error: new Error("rede") });
    expect(await sincronizarFila()).toBe(1);
    expect(tamanhoFila()).toBe(2);
    expect(chamadas.map((c) => c.id ?? c.op)).toEqual(["p1", "insert"]);

    expect(await sincronizarFila()).toBe(2);
    expect(tamanhoFila()).toBe(0);
  });
});
