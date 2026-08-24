# Plano de desenvolvimento

## 1. Baseline técnico

- Next.js com App Router;
- React e TypeScript em modo estrito;
- Node.js em versão suportada pela versão escolhida do Next.js;
- pnpm e lockfile versionado;
- Tailwind CSS para a interface;
- processo Node.js persistente em desenvolvimento e implantação.

Bootstrap sugerido:

```bash
pnpm create next-app@latest . --typescript --eslint --tailwind --app --src-dir
```

As versões estáveis devem ser instaladas e fixadas pelo `pnpm-lock.yaml`. Atualizar
dependências durante as quatro semanas somente quando houver motivo explícito.

## 2. Dependências

### 2.1 Execução

```bash
pnpm add viem @tanstack/react-query zod recharts
```

| Pacote | Uso |
| --- | --- |
| `next`, `react`, `react-dom` | Aplicação, renderização e Route Handlers |
| `viem` | Cliente Ethereum e transporte WebSocket JSON-RPC |
| `@tanstack/react-query` | Estado remoto e cache no navegador |
| `zod` | Validação de ambiente, preço HTTP e eventos SSE |
| `recharts` | Gráficos responsivos do painel |
| `tailwindcss` | Layout e identidade visual |

Opcional em desenvolvimento:

```bash
pnpm add -D @tanstack/react-query-devtools
```

### 2.2 Testes

```bash
pnpm add -D vitest jsdom @testing-library/react \
  @testing-library/jest-dom msw @playwright/test
```

| Pacote | Uso |
| --- | --- |
| `vitest` | Cálculos, schemas, store e módulo de telemetria |
| `jsdom` | Ambiente DOM para testes de hooks e UI |
| `@testing-library/react` | Comportamento dos elementos React |
| `@testing-library/jest-dom` | Assertions de acessibilidade e DOM |
| `msw` | Simulação da fonte HTTP de preço |
| `@playwright/test` | Fluxo ponta a ponta no navegador |

### 2.3 Dependências que não serão adicionadas inicialmente

- Socket.IO ou `ws`: o Viem gerencia o WebSocket RPC e o navegador possui
  `EventSource` nativo;
- Axios: o `fetch` nativo atende à consulta de preço;
- Express: Route Handlers atendem aos endpoints do MVP;
- Redux ou Zustand: TanStack Query cobre o estado remoto e o estado visual local é
  pequeno;
- ORM e banco de dados: snapshot e histórico recente ficam em memória;
- Redis ou fila: existe somente uma instância no MVP.

## 3. Configuração

Arquivo `.env.example` planejado:

```dotenv
ETHEREUM_WS_RPC_URL=wss://seu-provedor-rpc

COINGECKO_BASE_URL=https://api.coingecko.com/api/v3
COINGECKO_API_KEY=

PRICE_POLL_INTERVAL_MS=30000
PRICE_REQUEST_TIMEOUT_MS=5000
PRICE_STALE_AFTER_MS=120000

SSE_HEARTBEAT_INTERVAL_MS=15000
HISTORY_MAX_POINTS=900
MEMPOOL_EMIT_INTERVAL_MS=1000
```

Regras:

- validar ambiente no bootstrap com Zod;
- falhar cedo quando `ETHEREUM_WS_RPC_URL` estiver ausente;
- não usar `NEXT_PUBLIC_` para segredos;
- fornecer defaults somente para intervalos e limites seguros;
- nunca commitar `.env.local`.

## 4. Organização planejada

```text
src/
├── app/
│   ├── api/
│   │   ├── fees/
│   │   │   ├── snapshot/route.ts
│   │   │   ├── history/route.ts
│   │   │   └── stream/route.ts
│   │   └── health/route.ts
│   ├── layout.tsx
│   └── page.tsx
├── features/
│   └── fees/
│       ├── fee-dashboard.tsx
│       ├── fee-cards.tsx
│       ├── fee-chart.tsx
│       ├── use-fees-query.ts
│       ├── use-fees-stream.ts
│       └── query-keys.ts
├── providers/
│   └── query-provider.tsx
├── server/
│   └── telemetry/
│       ├── fee-telemetry.ts
│       ├── fee-calculator.ts
│       ├── http-price-adapter.ts
│       ├── viem-rpc-adapter.ts
│       ├── snapshot-store.ts
│       ├── sse-hub.ts
│       ├── schemas.ts
│       └── types.ts
└── instrumentation.ts

tests/
├── unit/
├── integration/
└── e2e/
```

O código específico de servidor fica em `src/server` e deve importar `server-only`
quando apropriado, impedindo inclusão acidental no bundle do navegador.

## 5. Estratégia incremental

### Semana 1 - Contratos, cálculos e protótipo

Objetivo: fechar o que será exibido antes de integrar fontes externas.

Entregas:

- scaffold do Next.js;
- layout inicial do dashboard;
- schemas `FeeSnapshot` e `TelemetryHealth`;
- perfis de operação e unidades de gás alinhados;
- função pura de custo em USD;
- percentis de taxa lenta, padrão e rápida;
- regra inicial e testada de congestionamento;
- prova isolada de conexão RPC e consulta de ETH/USD.

Critério de saída: o painel renderiza fixtures realistas e todos os cálculos
possuem testes determinísticos.

### Semana 2 - Ingestão e estado do servidor

Objetivo: produzir snapshots reais sem depender do frontend.

Entregas:

- `ViemRpcAdapter` e assinatura de blocos;
- contagem agregada de transações pendentes quando suportada;
- `HttpPriceAdapter` com timeout, validação e último preço válido;
- `SnapshotStore` circular;
- `FeeTelemetry` com dependências injetadas;
- bootstrap idempotente em `instrumentation.ts`;
- diagnóstico de saúde;
- logs de conexão e atualização sem segredos.

Critério de saída: um teste de integração com adapters falsos produz a sequência
esperada de snapshots; execução local recebe dados reais por pelo menos 30 minutos
sem criar conexões duplicadas.

### Semana 3 - Endpoints e dashboard em tempo quase real

Objetivo: completar o fluxo servidor -> navegador.

Entregas:

- `/api/fees/snapshot`;
- `/api/fees/history`;
- `/api/fees/stream` com SSE e heartbeat;
- `/api/health`;
- `QueryClientProvider`;
- hooks de snapshot, histórico e EventSource;
- atualização com `setQueryData` e proteção por `sequence`;
- cards de taxas e custos;
- gráfico recente;
- estados conectado, reconectando, degradado e offline.

Critério de saída: um novo snapshot aparece no painel sem refresh e sem uma nova
requisição HTTP causada por cada evento SSE.

### Semana 4 - Resiliência, qualidade e demonstração

Objetivo: provar que o protótipo se recupera das falhas esperadas.

Entregas:

- testes de queda e reconexão do RPC;
- teste de falha e envelhecimento da cotação;
- deduplicação e tratamento de reorganização de bloco;
- encerramento gracioso;
- teste ponta a ponta do dashboard;
- acessibilidade básica e responsividade;
- Dockerfile e instruções de execução;
- roteiro e dados de demonstração;
- revisão final da documentação.

Critério de saída: build, testes e cenário ponta a ponta passam; após uma falha
temporária o dashboard informa degradação e recupera a atualização sem reload.

## 6. Estratégia de testes

### 6.1 Testes de `FeeCalculator`

- conversão Gwei -> ETH -> USD;
- percentis com amostras pares, ímpares e vazias;
- valores extremos;
- perfis de operação;
- classificação de congestionamento;
- arredondamento apenas na apresentação.

### 6.2 Testes do módulo `FeeTelemetry`

Usar adapters falsos em memória para simular:

- novo bloco;
- rajada de pendentes;
- atualização de preço;
- preço atrasado;
- erro e reconexão do RPC;
- bloco duplicado;
- reorganização com mesmo número e hash diferente.

Os testes verificam resultados pela interface pública, não pelo estado interno.

### 6.3 Testes dos endpoints

- status e schema do snapshot;
- histórico limitado;
- cabeçalhos SSE;
- snapshot inicial do stream;
- heartbeat;
- remoção após abort;
- diagnóstico sem dados sensíveis.

### 6.4 Testes do frontend

- loading, erro e estado vazio;
- evento SSE atualiza cards e gráfico;
- evento antigo é ignorado;
- stream interrompido exibe reconexão;
- preço antigo exibe aviso;
- layout utilizável em desktop e mobile.

### 6.5 Teste ponta a ponta

O Playwright abre o dashboard, confirma o snapshot inicial, injeta ou aguarda um
novo evento e verifica que a tela muda sem recarregar a página.

## 7. Critérios de conclusão do MVP

- uma única conexão WebSocket RPC por instância;
- dashboard atualizado sem polling do frontend;
- preço ETH/USD consultado por HTTP no servidor;
- atualização imediata do cache após evento SSE;
- nenhum segredo no bundle ou nas respostas;
- nenhuma assinatura ou transmissão de transação;
- histórico com limite de memória;
- falhas externas representadas no estado de saúde;
- reconexão automática e observável;
- testes de cálculo, módulo, endpoints e fluxo principal aprovados;
- documentação de execução e decisões atualizada.

## 8. Referências

- [Next.js - App Router](https://nextjs.org/docs/app)
- [Next.js - Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)
- [Viem - WebSocket transport](https://viem.sh/docs/clients/transports/websocket)
- [TanStack Query - QueryClient](https://tanstack.com/query/latest/docs/reference/QueryClient)
- [Zod](https://zod.dev/)
- [Recharts](https://recharts.github.io/en-US/guide/installation/)
- [Vitest](https://vitest.dev/guide/)
- [Playwright](https://playwright.dev/docs/intro)
