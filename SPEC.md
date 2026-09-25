# SPEC.md — RotaPrime (estado real, v2.0.0)

Especificação do sistema tal como está implementado. Substitui a SPEC original (React Native/Flutter, Mapbox, PostGIS), que serviu de ponto de partida.

## 1. Visão geral
Plataforma híbrida para gestão de entregas e recolhas de estafetas em Portugal:
- **Gestão (web)** — painel, rotas, estafetas, carrinhas, custos, relatórios/SLA e Studio.
- **App do estafeta (PWA, mobile-first)** — rota do dia, parada com geofencing, ponto, resumo; funciona sem rede.

Uma única base de dados e um único login; a área mostrada depende do papel.

## 2. Arquitetura real
| Camada | Implementação |
|---|---|
| Frontend | TanStack Start v1 (React 19, Vite 7), Tailwind CSS v4, shadcn/ui, lucide-react |
| Mapas | Leaflet + react-leaflet com OpenStreetMap (sem chave), carregado só no cliente |
| Geocodificação | Nominatim (OpenStreetMap) |
| Backend | Lovable Cloud (PostgreSQL, Auth, RLS) |
| Servidor | Server routes TanStack em `/api/public/*` (OpenAPI e MCP) |
| Offline | Fila local em `localStorage` (`ctt.fila-sincronizacao`) |
| Gráficos | recharts |

Diferenças face à SPEC original: app do estafeta é PWA (não React Native/Flutter); distâncias/geofencing calculados no cliente (Haversine) em vez de PostGIS; mapas OSM em vez de Mapbox/Google; tempo real via recarregamento de consultas.

## 3. Papéis e acesso
| Papel | Rótulo | Área |
|---|---|---|
| god | God (bypass invisível) | Gestão + Studio |
| super_admin | Super Administrador | Gestão + Studio |
| admin | Administrador Empresa | Gestão + Studio |
| colaborador | Colaborador | Gestão + Studio |
| estafeta | Estafeta | App |

- Papéis em tabela própria `user_roles`; verificação com `has_role` / `is_gestor` (SECURITY DEFINER).
- Sem registo público, sem login social. Acessos criados pela administração (Admin Empresa ou God).
- Confirmação de e-mail desativada: contas ficam prontas a usar.

## 4. Páginas
| Caminho | Área | Função |
|---|---|---|
| `/` | Pública | Página institucional |
| `/auth` | Pública | Entrada por e-mail/palavra-passe |
| `/dashboard` | Gestão | KPIs do dia, mapa, financeiro, alertas SLA |
| `/rotas`, `/rotas/$id` | Gestão | Criação (moradas "cliente \| morada \| código postal"), detalhe, atribuição, auditoria, otimização |
| `/estafetas` | Gestão | Cadastro e ponto do dia |
| `/veiculos` | Gestão | Carrinhas, atribuição, manutenção |
| `/custos` | Gestão | Custos em euros |
| `/relatorios` | Gestão | Produtividade, SLA, proventos |
| `/app` | Estafeta | Rota do dia, mapa, sincronização |
| `/app/parada/$id` | Estafeta | Geofencing, checklist, comprovativo, foto, insucesso, Waze/Maps |
| `/app/ponto` | Estafeta | Início/pausa/fim com localização |
| `/app/resumo` | Estafeta | Atendidas e proventos |
| `/studio/api` | Studio | OpenAPI / Swagger |
| `/studio/webhooks` | Studio | Catálogo de eventos |
| `/studio/mcp` | Studio | Servidor MCP (desenvolvimento assistido por IA) |
| `/studio/docs` | Studio | Documentação e design system |

Endpoints públicos (sem dados pessoais): `GET /api/public/openapi.json`, `GET|POST /api/public/mcp` (JSON-RPC 2.0).

## 5. Modelo de dados
- **profiles**: id, nome, telefone, carta_conducao, base, ativo.
- **user_roles**: user_id, role (enum app_role).
- **vehicles**: matricula, modelo, estado (ativa/manutencao/inativa), km, estafeta_id, proxima_manutencao.
- **delivery_routes**: nome, data, estado (planeada/em_curso/concluida/cancelada), estafeta_id, vehicle_id, valor_por_parada.
- **stops**: route_id, ordem, tipo (entrega/recolha), cliente, morada, codigo_postal, telefone, lat, lng, objetos, estado (pendente/em_curso/entregue/insucesso), checklist (JSONB), assinatura_nome, foto_url, motivo_insucesso, iniciada_em, concluida_em.
- **time_entries**: user_id, tipo (inicio_dia/pausa_inicio/pausa_fim/fim_dia), lat, lng.
- **expenses**: user_id, route_id, tipo, valor (€), descricao, data.
- **maintenance_requests**: vehicle_id, descricao, estado, criado_por.

RLS: gestores veem e gerem tudo; estafeta só as suas rotas, paradas e registos. Trigger `handle_new_user` cria perfil e papel.

## 6. Regras de negócio
- Pagamento por parada atendida: `valor_por_parada × paradas entregues`.
- Geofencing: parada só inicia dentro de **120 m**.
- SLA de permanência: **12 min** por parada.
- Otimização: vizinho mais próximo sobre as coordenadas.
- Insucesso exige motivo (logística reversa).
- Fotografia comprimida no aparelho antes de guardar.

## 7. Offline-first
Atualizações de paradas e ponto sem rede entram numa fila local e são enviadas por ordem quando a ligação volta (botão "Sincronizar" e evento `online`).

## 8. Eventos (Studio Webhook)
auth.sessao_iniciada, utilizador.criado, rota.criada, rota.atribuida, rota.estado_alterado, rota.otimizada, parada.iniciada, parada.proximidade, parada.entregue, parada.insucesso, parada.fora_sla, ponto.registado, sincronizacao.concluida, veiculo.registado, veiculo.manutencao_pedida, custo.registado.
Envelope: `{ "evento", "ocorrido_em", "dados" }`. Envio para n8n/WhatsApp pendente de configuração do destino.

## 9. Studio MCP
Ferramentas só de leitura: `get_spec`, `list_routes`, `get_schema`, `list_events`, `get_design_tokens`, `get_openapi`.

## 10. Design system
- Corporativo e minimalista, sem elementos lúdicos. Tipografia Inter.
- Cores (OKLCH): primário vermelho CTT `0.575 0.232 28.5`; secundário azul escuro `0.32 0.088 253`; sucesso `0.47 0.125 152`; aviso `0.73 0.165 65`; destrutivo `0.56 0.225 27`; info `0.52 0.12 253`.
- Só tokens semânticos (sem cores fixas nos componentes). Modo escuro automático.
- Alvos de toque ≥ 48 px (`touch-target`); números tabulares (`numeric-data`); moeda `pt-PT` em euros.

## 11. Fora do âmbito atual
Integração oficial CTT, n8n + Evolution API (WhatsApp), pagamentos, leitura de códigos de barras/OCR, telemetria em segundo plano nativa, PostGIS.
