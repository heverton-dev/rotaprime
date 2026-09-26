/// <reference types="node" />
// Regressao dos problemas de POSTMORTEM.md: cada regra do gate
// gates/G_SEGURANCA_ROTAPRIME.py tem de passar no repo e morder num caso mau.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const RAIZ = process.cwd();
const GATE = join(RAIZ, "gates", "G_SEGURANCA_ROTAPRIME.py");
const PYTHON = process.env["PYTHON"] ?? "python";

function correrGate(root: string) {
  const r = spawnSync(PYTHON, [GATE, root], { encoding: "utf-8" });
  return { codigo: r.status, saida: `${r.stdout}${r.stderr}` };
}

const temporarios: string[] = [];

function projeto(ficheiros: Record<string, string>, git = false) {
  const dir = mkdtempSync(join(tmpdir(), "rotaprime-gate-"));
  temporarios.push(dir);
  const base: Record<string, string> = { ".env.example": "SUPABASE_URL=\n", ...ficheiros };
  for (const [rel, conteudo] of Object.entries(base)) {
    const destino = join(dir, rel);
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, conteudo);
  }
  if (git) {
    spawnSync("git", ["init", "-q"], { cwd: dir });
    spawnSync("git", ["add", "-A", "-f"], { cwd: dir });
  }
  return dir;
}

afterEach(() => {
  for (const dir of temporarios.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("G_SEGURANCA_ROTAPRIME", () => {
  it("passa no repositorio atual", () => {
    const r = correrGate(RAIZ);
    expect(r.saida).toContain("R1-R6 cumpridas");
    expect(r.codigo).toBe(0);
  });

  it("PM-01: bloqueia .env versionado", () => {
    const r = correrGate(projeto({ ".env": "SUPABASE_URL=x\n" }, true));
    expect(r.codigo).toBe(1);
    expect(r.saida).toContain("R1:");
  });

  it("PM-01: bloqueia ausencia de .env.example", () => {
    const dir = projeto({});
    rmSync(join(dir, ".env.example"));
    const r = correrGate(dir);
    expect(r.codigo).toBe(1);
    expect(r.saida).toContain("R2:");
  });

  it("PM-03: bloqueia service role fora de *.server.ts e como VITE_", () => {
    const r = correrGate(
      projeto({
        "src/lib/cliente.ts": "const k = process.env.SUPABASE_SERVICE_ROLE_KEY;\n",
        "src/lib/outro.ts": "const k = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;\n",
      }),
    );
    expect(r.codigo).toBe(1);
    expect(r.saida).toContain("cliente.ts usa SUPABASE_SERVICE_ROLE_KEY");
    expect(r.saida).toContain("outro.ts expoe VITE_SUPABASE_SERVICE_ROLE_KEY");
  });

  it("PM-03: aceita service role em *.server.ts", () => {
    const r = correrGate(
      projeto({ "src/x/client.server.ts": "process.env.SUPABASE_SERVICE_ROLE_KEY;\n" }),
    );
    expect(r.codigo).toBe(0);
  });

  it("PM-04: bloqueia tabela sem RLS", () => {
    const r = correrGate(
      projeto({ "supabase/migrations/001.sql": "CREATE TABLE public.segredos (id int);\n" }),
    );
    expect(r.codigo).toBe(1);
    expect(r.saida).toContain("R4: public.segredos");
  });

  it("PM-02: bloqueia senha de utilizador numa migration nova", () => {
    const r = correrGate(
      projeto({
        "supabase/migrations/002.sql":
          "UPDATE auth.users SET encrypted_password = extensions.crypt('x', gen_salt('bf'));\n",
      }),
    );
    expect(r.codigo).toBe(1);
    expect(r.saida).toContain("R5: 002.sql");
  });

  it("PM-05: bloqueia escrita em user_roles para authenticated", () => {
    const r = correrGate(
      projeto({
        "supabase/migrations/003.sql":
          "GRANT SELECT, INSERT ON public.user_roles TO authenticated;\n",
      }),
    );
    expect(r.codigo).toBe(1);
    expect(r.saida).toContain("R6: 003.sql");
  });
});
