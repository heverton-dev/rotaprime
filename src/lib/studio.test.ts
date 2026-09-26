/// <reference types="node" />
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildOpenApi, MCP_TOOLS, TABELAS } from "./studio";

// studio.ts e a fonte unica de tabelas (AGENTS.md); tem de bater com as migrations.
const MIGRATIONS = join(process.cwd(), "supabase", "migrations");
const sql = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => readFileSync(join(MIGRATIONS, f), "utf-8"))
  .join("\n");
const tabelasSql = [...sql.matchAll(/CREATE TABLE\s+public\.(\w+)/gi)].map((m) => m[1]);

describe("studio.ts x migrations", () => {
  it("lista exatamente as tabelas criadas nas migrations", () => {
    expect(TABELAS.map((t) => t.nome).sort()).toEqual([...tabelasSql].sort());
  });

  it("OpenAPI expoe um schema por tabela", () => {
    const doc = buildOpenApi("https://exemplo.supabase.co") as {
      components: { schemas: Record<string, unknown> };
    };
    expect(Object.keys(doc.components.schemas).sort()).toEqual([...tabelasSql].sort());
  });
});

describe("MCP publico", () => {
  it("so expoe ferramentas de leitura (get_/list_)", () => {
    for (const tool of MCP_TOOLS) expect(tool.name).toMatch(/^(get|list)_/);
  });
});
