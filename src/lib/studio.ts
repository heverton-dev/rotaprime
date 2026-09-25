/**
 * Fonte única de verdade do STUDIO: rotas da app, tabelas, eventos e design tokens.
 * Alimenta o OpenAPI (Studio API), o catálogo de eventos (Studio Webhook),
 * o servidor MCP (Studio MCP) e a documentação (Studio Doc).
 */

export const APP_NAME = "RotaPrime";
export const APP_VERSION = "2.0.0";

type Col = { nome: string; tipo: "string" | "number" | "boolean" | "object"; nulo?: boolean; desc?: string | undefined };
export type Tabela = { nome: string; desc: string; acesso: string; colunas: Col[] };

const c = (nome: string, tipo: Col["tipo"], nulo = false, desc?: string): Col => ({ nome, tipo, nulo, desc });

export const TABELAS: Tabela[] = [
  {
    nome: "profiles",
    desc: "Perfil de cada utilizador (criado automaticamente no registo).",
    acesso: "Gestores leem/editam todos; cada utilizador lê o seu.",
    colunas: [c("id", "string"), c("nome", "string"), c("telefone", "string", true), c("carta_conducao", "string", true), c("base", "string", true), c("ativo", "boolean"), c("created_at", "string"), c("updated_at", "string")],
  },
  {
    nome: "user_roles",
    desc: "Papéis de acesso (god, super_admin, admin, colaborador, estafeta).",
    acesso: "Leitura pelo próprio e gestores; escrita só gestores.",
    colunas: [c("id", "string"), c("user_id", "string"), c("role", "string", false, "god | super_admin | admin | colaborador | estafeta"), c("created_at", "string")],
  },
  {
    nome: "vehicles",
    desc: "Carrinhas da frota.",
    acesso: "Gestores: tudo. Estafeta: lê a carrinha atribuída.",
    colunas: [c("id", "string"), c("matricula", "string"), c("modelo", "string"), c("estado", "string", false, "ativa | manutencao | inativa"), c("km", "number"), c("estafeta_id", "string", true), c("proxima_manutencao", "string", true), c("created_at", "string")],
  },
  {
    nome: "delivery_routes",
    desc: "Rotas diárias com valor pago por parada atendida.",
    acesso: "Gestores: tudo. Estafeta: lê as suas rotas.",
    colunas: [c("id", "string"), c("nome", "string"), c("data", "string"), c("estado", "string", false, "planeada | em_curso | concluida | cancelada"), c("estafeta_id", "string", true), c("vehicle_id", "string", true), c("valor_por_parada", "number"), c("created_at", "string")],
  },
  {
    nome: "stops",
    desc: "Paradas (entregas/recolhas) de cada rota, com checklist JSONB e comprovativo.",
    acesso: "Gestores: tudo. Estafeta: lê/atualiza paradas das suas rotas.",
    colunas: [c("id", "string"), c("route_id", "string"), c("ordem", "number"), c("tipo", "string", false, "entrega | recolha"), c("cliente", "string"), c("morada", "string"), c("codigo_postal", "string", true), c("telefone", "string", true), c("lat", "number", true), c("lng", "number", true), c("objetos", "number"), c("estado", "string", false, "pendente | em_curso | entregue | insucesso"), c("checklist", "object"), c("assinatura_nome", "string", true), c("foto_url", "string", true), c("motivo_insucesso", "string", true), c("iniciada_em", "string", true), c("concluida_em", "string", true), c("created_at", "string")],
  },
  {
    nome: "time_entries",
    desc: "Registos de ponto com geolocalização.",
    acesso: "Gestores leem tudo; estafeta insere/lê os seus.",
    colunas: [c("id", "string"), c("user_id", "string"), c("tipo", "string", false, "inicio_dia | pausa_inicio | pausa_fim | fim_dia"), c("lat", "number", true), c("lng", "number", true), c("created_at", "string")],
  },
  {
    nome: "expenses",
    desc: "Custos operacionais em euros.",
    acesso: "Gestores: tudo.",
    colunas: [c("id", "string"), c("user_id", "string"), c("route_id", "string", true), c("tipo", "string", false, "combustivel | portagem | manutencao | outro"), c("valor", "number"), c("descricao", "string", true), c("data", "string"), c("created_at", "string")],
  },
  {
    nome: "maintenance_requests",
    desc: "Pedidos de manutenção de carrinhas.",
    acesso: "Gestores: tudo.",
    colunas: [c("id", "string"), c("vehicle_id", "string"), c("descricao", "string"), c("estado", "string"), c("criado_por", "string", true), c("created_at", "string")],
  },
];

export type RotaApp = { caminho: string; area: "Pública" | "Gestão" | "Estafeta" | "Studio"; desc: string };

export const ROTAS_APP: RotaApp[] = [
  { caminho: "/", area: "Pública", desc: "Página institucional." },
  { caminho: "/auth", area: "Pública", desc: "Entrada por e-mail e palavra-passe (sem registo público)." },
  { caminho: "/dashboard", area: "Gestão", desc: "KPIs do dia, mapa, financeiro e alertas de SLA." },
  { caminho: "/rotas", area: "Gestão", desc: "Lista e criação de rotas (moradas geocodificadas)." },
  { caminho: "/rotas/$id", area: "Gestão", desc: "Detalhe, atribuição, auditoria e otimização da ordem." },
  { caminho: "/estafetas", area: "Gestão", desc: "Cadastro de estafetas e ponto do dia." },
  { caminho: "/veiculos", area: "Gestão", desc: "Carrinhas, atribuição e manutenção." },
  { caminho: "/custos", area: "Gestão", desc: "Registo de custos em euros." },
  { caminho: "/relatorios", area: "Gestão", desc: "Produtividade, SLA e proventos." },
  { caminho: "/app", area: "Estafeta", desc: "Rota do dia, mapa e sincronização." },
  { caminho: "/app/parada/$id", area: "Estafeta", desc: "Geofencing, checklist, comprovativo, foto, insucesso." },
  { caminho: "/app/ponto", area: "Estafeta", desc: "Início/pausa/fim de expediente com localização." },
  { caminho: "/app/resumo", area: "Estafeta", desc: "Resumo de atendidas e proventos." },
  { caminho: "/studio/api", area: "Studio", desc: "OpenAPI / Swagger." },
  { caminho: "/studio/webhooks", area: "Studio", desc: "Catálogo de eventos." },
  { caminho: "/studio/mcp", area: "Studio", desc: "Servidor MCP para desenvolvimento assistido por IA." },
  { caminho: "/studio/docs", area: "Studio", desc: "Documentação completa e design system." },
];

export type Evento = { nome: string; origem: string; quando: string; exemplo: Record<string, unknown> };

export const EVENTOS: Evento[] = [
  { nome: "auth.sessao_iniciada", origem: "auth", quando: "Utilizador entra na plataforma.", exemplo: { user_id: "uuid", email: "empresa@ctt.com" } },
  { nome: "utilizador.criado", origem: "profiles / user_roles", quando: "Novo acesso criado pela administração.", exemplo: { user_id: "uuid", nome: "Ana Silva", role: "estafeta" } },
  { nome: "rota.criada", origem: "delivery_routes", quando: "Gestor cria uma rota.", exemplo: { route_id: "uuid", nome: "Lisboa Centro - Manhã", data: "2026-09-25", paradas: 6 } },
  { nome: "rota.atribuida", origem: "delivery_routes", quando: "Estafeta ou carrinha atribuídos.", exemplo: { route_id: "uuid", estafeta_id: "uuid", vehicle_id: "uuid" } },
  { nome: "rota.estado_alterado", origem: "delivery_routes", quando: "planeada → em_curso → concluida/cancelada.", exemplo: { route_id: "uuid", de: "planeada", para: "em_curso" } },
  { nome: "rota.otimizada", origem: "delivery_routes / stops", quando: "Ordem das paradas recalculada.", exemplo: { route_id: "uuid", ordem: ["stop_uuid_1", "stop_uuid_2"] } },
  { nome: "parada.iniciada", origem: "stops", quando: "Estafeta chega dentro do raio (120 m) e inicia.", exemplo: { stop_id: "uuid", route_id: "uuid", lat: 38.71, lng: -9.14, iniciada_em: "2026-09-25T09:12:00Z" } },
  { nome: "parada.proximidade", origem: "telemetria", quando: "Estafeta a aproximar-se — aviso ao cliente (n8n + WhatsApp).", exemplo: { stop_id: "uuid", telefone: "+351912345678", eta_min: 10 } },
  { nome: "parada.entregue", origem: "stops", quando: "Entrega/recolha concluída com comprovativo.", exemplo: { stop_id: "uuid", assinatura_nome: "João Costa", foto: true, checklist: { embalagem_intacta: true } } },
  { nome: "parada.insucesso", origem: "stops", quando: "Insucesso / logística reversa.", exemplo: { stop_id: "uuid", motivo_insucesso: "Destinatário ausente" } },
  { nome: "parada.fora_sla", origem: "stops", quando: "Permanência superior a 12 min.", exemplo: { stop_id: "uuid", minutos: 18 } },
  { nome: "ponto.registado", origem: "time_entries", quando: "Início de dia, pausa ou fim de expediente.", exemplo: { user_id: "uuid", tipo: "inicio_dia", lat: 38.72, lng: -9.13 } },
  { nome: "sincronizacao.concluida", origem: "app offline", quando: "Fila local enviada após regresso da rede.", exemplo: { user_id: "uuid", enviados: 4 } },
  { nome: "veiculo.registado", origem: "vehicles", quando: "Nova carrinha.", exemplo: { vehicle_id: "uuid", matricula: "AA-12-BB" } },
  { nome: "veiculo.manutencao_pedida", origem: "maintenance_requests", quando: "Pedido de manutenção acionado.", exemplo: { vehicle_id: "uuid", descricao: "Revisão 60 000 km" } },
  { nome: "custo.registado", origem: "expenses", quando: "Novo custo em euros.", exemplo: { expense_id: "uuid", tipo: "combustivel", valor: 42.5 } },
];

export const TOKENS = [
  { nome: "--primary", valor: "oklch(0.575 0.232 28.5)", uso: "Vermelho CTT — ações principais, marca" },
  { nome: "--secondary", valor: "oklch(0.32 0.088 253)", uso: "Azul escuro CTT — navegação, cabeçalhos" },
  { nome: "--success", valor: "oklch(0.47 0.125 152)", uso: "Entregue / concluído" },
  { nome: "--warning", valor: "oklch(0.73 0.165 65)", uso: "Em curso / atenção / SLA" },
  { nome: "--destructive", valor: "oklch(0.56 0.225 27)", uso: "Insucesso / remoção" },
  { nome: "--info", valor: "oklch(0.52 0.12 253)", uso: "Informação" },
  { nome: "--background", valor: "oklch(0.985 0.002 250)", uso: "Fundo da aplicação" },
  { nome: "--foreground", valor: "oklch(0.22 0.02 255)", uso: "Texto principal" },
  { nome: "--muted", valor: "oklch(0.955 0.005 255)", uso: "Superfícies secundárias" },
  { nome: "--border", valor: "oklch(0.905 0.008 255)", uso: "Contornos" },
];

const tipoOpenApi = (col: Col) => ({
  type: col.tipo,
  ...(col.nulo ? { nullable: true } : {}),
  ...(col.desc ? { description: col.desc } : {}),
});

export function buildOpenApi(supabaseUrl: string) {
  const schemas: Record<string, unknown> = {};
  const paths: Record<string, unknown> = {};
  for (const t of TABELAS) {
    schemas[t.nome] = {
      type: "object",
      description: t.desc,
      properties: Object.fromEntries(t.colunas.map((col) => [col.nome, tipoOpenApi(col)])),
    };
    const ref = { $ref: `#/components/schemas/${t.nome}` };
    const filtro = { name: "id", in: "query", schema: { type: "string" }, description: "Filtro PostgREST, ex.: eq.<uuid>" };
    paths[`/rest/v1/${t.nome}`] = {
      get: {
        tags: [t.nome], summary: `Listar ${t.nome}`, description: `${t.desc} Acesso: ${t.acesso}`,
        parameters: [{ name: "select", in: "query", schema: { type: "string", default: "*" } }, filtro],
        responses: { "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: ref } } } } },
      },
      post: {
        tags: [t.nome], summary: `Criar ${t.nome}`,
        requestBody: { content: { "application/json": { schema: ref } } },
        responses: { "201": { description: "Criado" } },
      },
      patch: {
        tags: [t.nome], summary: `Atualizar ${t.nome}`, parameters: [filtro],
        requestBody: { content: { "application/json": { schema: ref } } },
        responses: { "204": { description: "Atualizado" } },
      },
      delete: { tags: [t.nome], summary: `Remover ${t.nome}`, parameters: [filtro], responses: { "204": { description: "Removido" } } },
    };
  }
  paths["/auth/v1/token?grant_type=password"] = {
    post: {
      tags: ["auth"], summary: "Entrar com e-mail e palavra-passe", security: [{ apikey: [] }],
      requestBody: { content: { "application/json": { schema: { type: "object", properties: { email: { type: "string" }, password: { type: "string" } } } } } },
      responses: { "200": { description: "Sessão (access_token)" } },
    },
  };
  paths["/rpc/v1/has_role"] = {
    post: { tags: ["rpc"], summary: "Verificar papel (via /rest/v1/rpc/has_role)", responses: { "200": { description: "boolean" } } },
  };
  return {
    openapi: "3.0.3",
    info: { title: `${APP_NAME} API`, version: APP_VERSION, description: "API de dados da plataforma. Todas as chamadas exigem o cabeçalho apikey e, para dados protegidos, Authorization: Bearer <access_token>. O acesso é filtrado por RLS conforme o papel." },
    servers: [{ url: supabaseUrl }],
    security: [{ apikey: [], bearer: [] }],
    tags: [...TABELAS.map((t) => ({ name: t.nome, description: t.desc })), { name: "auth" }, { name: "rpc" }],
    paths: Object.fromEntries(Object.entries(paths).map(([k, v]) => [k.replace("/rpc/v1/has_role", "/rest/v1/rpc/has_role"), v])),
    components: {
      securitySchemes: {
        apikey: { type: "apiKey", in: "header", name: "apikey" },
        bearer: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas,
    },
  };
}

export const MCP_TOOLS = [
  { name: "get_spec", description: "Devolve a SPEC.md atual do projeto.", inputSchema: { type: "object", properties: {} } },
  { name: "list_routes", description: "Lista as páginas da app com área e descrição.", inputSchema: { type: "object", properties: {} } },
  { name: "get_schema", description: "Devolve o esquema de dados (tabelas, colunas, regras de acesso). Opcional: table.", inputSchema: { type: "object", properties: { table: { type: "string" } } } },
  { name: "list_events", description: "Catálogo de eventos da app com exemplos de payload.", inputSchema: { type: "object", properties: {} } },
  { name: "get_design_tokens", description: "Tokens do design system (cores, uso).", inputSchema: { type: "object", properties: {} } },
  { name: "get_openapi", description: "Documento OpenAPI 3 completo.", inputSchema: { type: "object", properties: {} } },
];
