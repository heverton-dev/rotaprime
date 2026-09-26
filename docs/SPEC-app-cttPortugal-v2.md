# Especificação Técnica (SPEC.md) - Sistema de Gestão e Roteirização de Entregas (App CTT)

## 1. Visão Geral do Sistema
O sistema é uma plataforma híbrida composta por um Painel Administrativo (Web) e um Aplicativo (Mobile-First / PWA) voltado para a gestão de frota, roteirização, monitoramento de telemetria e controle de entregas e recolhas de estafetas em Portugal. O sistema será preparado para integração oficial com os CTT, possuindo tolerância a falhas de rede (offline-first) e automação de comunicação com o cliente final.

---

## 2. Arquitetura e Camadas (Tech Stack Recomendado)

### 2.1. Frontend (Mobile - Ambiente do Entregador)
* **Tecnologia:** React Native (Expo) ou Flutter.
* **Funcionalidades Core:** 
  * **Offline-First e Sincronização em Lote:** Uso de banco de dados local para armazenar check-ins, assinaturas e status em áreas sem rede. Uma fila de sincronização (offline queueing) enviará os dados sequencialmente assim que a conexão retornar.
  * **Acesso Nativo:** Câmera (para OCR, fotos e escaneamento de códigos de barras), GPS em background para telemetria contínua.
  * **Deep Linking:** Abertura direta de rotas no Waze, Google Maps ou Apple Maps.

### 2.2. Frontend (Web - Ambiente Corporativo/Admin)
* **Tecnologia:** React com Tailwind CSS (build com Vite).
* **Funcionalidade Core:** Dashboards administrativos complexos, criação de formulários dinâmicos e renderização de mapas em tempo real (Mapbox GL JS ou Google Maps JS API) para acompanhamento da frota.

### 2.3. Backend (APIs) e Banco de Dados (BaaS)
* **Plataforma Base:** Supabase (BaaS).
* **Banco de Dados:** PostgreSQL com a extensão PostGIS (essencial para dados geoespaciais, geofencing e cálculo de distâncias).
* **Tempo Real:** Utilização dos WebSockets nativos do Supabase para refletir a localização dos estafetas instantaneamente no mapa do painel administrativo.
* **Formulários Dinâmicos:** Uso de colunas JSONB no PostgreSQL para armazenar checklists variáveis definidos pelo Admin.
* **Segurança:** Autenticação e Row Level Security (RLS) gerenciados no Supabase para isolar dados entre empresas e estafetas.

### 2.4. Orquestração e Mensageria (Middlewares)
* **Automação de Webhooks:** n8n para desenhar os fluxos de integração bidirecional com a API dos CTT e com os gateways de pagamento.
* **Comunicação com Cliente:** Evolution API orquestrada via n8n para disparos automáticos de notificações (aviso de proximidade de entrega).

---

## 3. Design System e Identidade Visual (UI/UX)

### 3.1. Diretrizes Gerais
A interface de ambas as plataformas (Web e Mobile) seguirá uma abordagem estritamente corporativa, utilitária e minimalista. O design deve priorizar a legibilidade, a eficiência operacional e a clareza dos dados, sem o uso de elementos lúdicos, ilustrações desnecessárias ou caracteres informais.

### 3.2. Identidade Visual (Baseada nos CTT Portugal)
* **Cor Primária (Ação e Branding):** Vermelho CTT. Utilizado em botões de ação principal (Call to Action), indicativos de urgência e logomarca.
* **Cor Secundária (Apoio e Estrutura):** Azul Escuro CTT. Utilizado em cabeçalhos, barras de navegação e tipografia de destaque.
* **Cores de Feedback (Semântica):**
  * Verde Escuro: Sucesso, entrega concluída, status operacional.
  * Laranja/Amarelo: Alertas de atraso (SLA), pausas, avisos de trânsito.
  * Vermelho Alerta: Falha na entrega, erros de sistema, logística reversa.

### 3.3. Modos de Visualização (Claro e Escuro)
O sistema deve possuir suporte nativo e automático (baseado no sistema operacional) aos modos Claro e Escuro, fundamentais para a ergonomia do estafeta em diferentes condições de iluminação.
* **Modo Claro (Light Mode):** Fundos em tons de branco e cinza muito claro, criando alto contraste com textos em cinza grafite e preto. Sombras sutis para delimitar componentes e modais (elevação).
* **Modo Escuro (Dark Mode):** Fundos em cinza chumbo e preto absoluto. Textos em tons de cinza claro e branco. As cores primárias (Vermelho e Azul) devem ter sua saturação levemente ajustada para não causar fadiga visual. Este modo é crucial para economia de bateria nos dispositivos móveis dos estafetas.

### 3.4. Tipografia e Componentes
* **Tipografia:** Família sem serifa, limpa e moderna (como Inter, Roboto ou Helvetica). Uso rigoroso de hierarquia de pesos (Bold para títulos e dados numéricos críticos, Regular para textos de apoio).
* **Acessibilidade (Touch Targets):** No ambiente mobile, os botões e áreas de toque devem ser amplos (mínimo de 48x48dp) para facilitar o uso do aplicativo com apenas uma mão e em movimento.

---

## 4. Integrações e APIs Externas

1. **Integração CTT:** Endpoints REST e webhooks para rastreamento de objetos, mudança de status (entregue ou devolvido) e validação de Códigos Postais.
2. **Motor de Roteirização:** Vroom (Open-Source) ou Google Route Optimization API para ordenação das paradas por trânsito e distância.
3. **Gateways de Pagamento (Contexto Portugal):** Estruturas preparadas para comunicação com Stripe, PayPal, SIBS e MB Way. Moeda base: Euro.
4. **Mensageria Automática:** Disparo de notificações ("Sua encomenda é a próxima parada") para redução da taxa de insucesso.

---

## 5. Módulos do Sistema

* **MOD 01: Gestão de Estafetas:** Cadastro de motoristas, Carta de Condução e definição de base.
* **MOD 02: Gestão de Custos Operacionais:** Registro de combustível, portagens e estacionamento.
* **MOD 03: Gestão de Pagamentos:** Controle de valor pago por entrega e parada (global ou individual).
* **MOD 04: Relatórios e SLA:** Dashboards consolidados. Alertas visuais de SLA (tempo de permanência na parada excedido).
* **MOD 05: Gestão de Rotas (Roteirização):** Criação, otimização da rota do dia e monitoramento no mapa em tempo real.
* **MOD 06: Ponto (Time Tracking):** Check-in de início de dia, Pausa para Almoço e Check-out.
* **MOD 07: Manutenção de Carrinhas:** Atribuição fixa ou dinâmica de veículos e acionamento de manutenção.
* **MOD 08: Permissões Granulares:** Níveis de acesso para Super Admin, Admin-Empresa, Colaborador, Estafeta e Usuário GOD.
* **MOD 09: Logística Reversa:** Fluxo obrigatório de registro para devoluções à base com sincronização CTT.

---

## 6. Regras de Negócio Core

1. **Pagamento Baseado em Paradas:** Pagamento processado por morada atendida, e não pelo volume de objetos.
2. **Agrupamento Dinâmico:** Endereços localizados no mesmo edifício são consolidados como uma única tarefa logística.
3. **Validação por Geofencing (Cerca Virtual):** A ação "Concluir Entrega" exige validação via satélite de que o estafeta está no raio de tolerância da coordenada de destino, prevenindo fraudes.
4. **Definições de Frota e Rota:** A empresa detém autoridade sobre a flexibilidade de roteirização do estafeta e a designação das carrinhas.
5. **Check-list e Exigências:** A gestão estabelece regras mandatórias por entrega (Assinatura Eletrônica, Registro Fotográfico).
6. **Bypass e God Mode (Anti-Telemetria):** O Usuário GOD possui controles exclusivos no sistema para inativar restrições de geofencing e rastreamento (destinado a testes e auditorias técnicas). Inacessível e invisível aos usuários regulares.
7. **Cross-Docking Móvel:** Funcionalidade de transferência de custódia de pacotes entre estafetas em trânsito, mediada por escaneamento cruzado de código de barras.
8. **Proof of Delivery (PoD):** Emissão de comprovante digital pós-entrega para auditoria e envio aos clientes.

---

## 7. Jornadas do Usuário

### 7.1. Jornada do Estafeta (App Mobile)
1. **Ponto Inicial:** Autenticação no sistema e registro de Check-in. Captura de identificador, data, hora e geolocalização.
2. **Escaneamento em Lote:** Opcionalmente, utilização do dispositivo móvel para registrar e conferir a carga física contra o manifesto digital da empresa.
3. **Setup da Rota:** Acesso à "Rota do Dia". Exibição cartográfica das paradas ordenadas pelo motor de roteirização.
4. **Navegação:** Acionamento de "Iniciar Rota". Disparo automático de webhook para notificação do próximo destinatário.
5. **Chegada ao Destino (Geofencing ativado):** Validação de proximidade. Acionamento de "Iniciar Entrega/Recolha".
   * **Sucesso:** Cumprimento do Check-list, assinatura, captura fotográfica. Conclusão da etapa e geração do PoD.
   * **Insucesso:** Preenchimento de justificativa de falha, captura fotográfica mandatória do local, transição do pacote para Logística Reversa.
   * *(Nota: Em caso de falha de conectividade, as transações são armazenadas em cache local para processamento assíncrono).*
6. **Rotina e Pausas:** Repetição estruturada do fluxo e acionamento do registro de "Pausa de Almoço".
7. **Fim do Expediente:** Retorno à base operacional, execução do Check-out e submissão de custos de operação.
8. **Resumo:** Exibição de métricas de produtividade, tempos registrados e proventos do período.

### 7.2. Jornada do Admin Corporativo (Web)
1. **Painel de Controle:** Acesso a indicadores financeiros, dados operacionais e monitoramento de SLAs.
2. **Monitoramento em Tempo Real:** Visualização da frota ativa no mapa com alertas instantâneos de desvios operacionais ou atrasos de cronograma.
3. **Auditoria de Rota:** Inspeção detalhada do trajeto de cada estafeta, verificando entregas efetuadas, tempos de permanência e ocorrências de insucesso.
4. **Gestão Estrutural:** Administração de cadastros, parametrização de formulários dinâmicos, controle de tabelas de remuneração e gerência estrita de níveis de permissão.