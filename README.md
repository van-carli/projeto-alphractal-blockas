# Projeto Alphractal — Blockas

Dashboard em tempo real para monitoramento das taxas da rede Ethereum. A
aplicação é um monólito modular em Next.js: o backend observa a blockchain por
WebSocket, consulta ETH/USD por HTTP, mantém snapshots em memória e publica
atualizações ao navegador por SSE.

## Requisitos

- Node.js 20.9 ou superior;
- npm 11 ou superior;
- endpoint WebSocket JSON-RPC compatível com Ethereum.

Não são necessários banco de dados, autenticação, Socket.IO ou um servidor
Express separado.

## Configuração local

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Configure `ETHEREUM_WS_RPC_URL` em `.env.local`. As demais variáveis possuem
valores padrão seguros para desenvolvimento:

```dotenv
ETHEREUM_WS_RPC_URL=wss://seu-provedor-rpc
ETH_USD_API_URL=https://api.coingecko.com/api/v3/simple/price
ETH_USD_POLL_INTERVAL_MS=30000
HISTORY_MAX_POINTS=500
```

## Interfaces do backend

- `GET /api/fees/snapshot` — snapshot mais recente;
- `GET /api/fees/history` — histórico limitado, com `limit`, `from` e `to`;
- `GET /api/health` — saúde do RPC, preço e clientes SSE;
- `GET /api/fees/stream` — eventos SSE `snapshot` e `health`.

Os contratos TypeScript e schemas Zod compartilhados são exportados por
`src/modules/fees/index.ts`.

## Verificações

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Estrutura

```text
src/app/                    interface e Route Handlers
src/modules/fees/domain/    contratos e estado em memória
src/modules/fees/application/ orquestração e ports
src/server/                 adapters RPC, preço, SSE e runtime
src/instrumentation.ts      inicialização e encerramento do runtime Node.js
```

Mais detalhes estão em [docs/arquitetura.md](docs/arquitetura.md).
