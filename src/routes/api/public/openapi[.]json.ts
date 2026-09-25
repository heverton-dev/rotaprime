import { createFileRoute } from "@tanstack/react-router";
import { buildOpenApi } from "@/lib/studio";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "content-type" };

export const Route = createFileRoute("/api/public/openapi.json")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async () => Response.json(buildOpenApi(process.env["SUPABASE_URL"] ?? ""), { headers: cors }),
    },
  },
});
