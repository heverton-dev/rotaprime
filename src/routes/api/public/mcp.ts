import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import spec from "../../../../SPEC.md?raw";
import {
  APP_NAME,
  APP_VERSION,
  EVENTOS,
  MCP_TOOLS,
  ROTAS_APP,
  TABELAS,
  TOKENS,
  buildOpenApi,
} from "@/lib/studio";

/**
 * Servidor MCP (JSON-RPC 2.0 sobre HTTP) — só leitura, sem dados pessoais.
 * Destina-se exclusivamente a desenvolvimento assistido por IA.
 */
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, mcp-session-id, mcp-protocol-version",
};

const Rpc = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string().max(100), z.number()]).optional(),
  method: z.string().max(100),
  params: z.record(z.string(), z.unknown()).optional(),
});

function texto(dados: unknown) {
  return {
    content: [
      { type: "text", text: typeof dados === "string" ? dados : JSON.stringify(dados, null, 2) },
    ],
  };
}

function chamar(nome: string, args: Record<string, unknown>) {
  switch (nome) {
    case "get_spec":
      return texto(spec);
    case "list_routes":
      return texto(ROTAS_APP);
    case "get_schema": {
      const t =
        typeof args["table"] === "string"
          ? TABELAS.filter((x) => x.nome === args["table"])
          : TABELAS;
      return texto(t);
    }
    case "list_events":
      return texto(EVENTOS);
    case "get_design_tokens":
      return texto(TOKENS);
    case "get_openapi":
      return texto(buildOpenApi(process.env["SUPABASE_URL"] ?? ""));
    default:
      return null;
  }
}

export const Route = createFileRoute("/api/public/mcp")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async () =>
        Response.json(
          {
            name: APP_NAME,
            version: APP_VERSION,
            transport: "http (JSON-RPC 2.0)",
            tools: MCP_TOOLS.map((t) => t.name),
          },
          { headers: cors },
        ),
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json(
            { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
            { status: 400, headers: cors },
          );
        }
        const parsed = Rpc.safeParse(body);
        if (!parsed.success)
          return Response.json(
            { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid Request" } },
            { status: 400, headers: cors },
          );
        const { id, method, params } = parsed.data;
        if (id === undefined) return new Response(null, { status: 202, headers: cors });
        const ok = (result: unknown) =>
          Response.json({ jsonrpc: "2.0", id, result }, { headers: cors });
        const err = (code: number, message: string) =>
          Response.json({ jsonrpc: "2.0", id, error: { code, message } }, { headers: cors });
        switch (method) {
          case "initialize":
            return ok({
              protocolVersion: "2025-06-18",
              capabilities: { tools: {} },
              serverInfo: { name: "rotas-ctt-studio", version: APP_VERSION },
            });
          case "ping":
            return ok({});
          case "tools/list":
            return ok({ tools: MCP_TOOLS });
          case "tools/call": {
            const nome = String(params?.["name"] ?? "");
            const res = chamar(nome, (params?.["arguments"] as Record<string, unknown>) ?? {});
            return res ? ok(res) : err(-32602, `Ferramenta desconhecida: ${nome}`);
          }
          default:
            return err(-32601, `Método não suportado: ${method}`);
        }
      },
    },
  },
});
