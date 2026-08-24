# Arquitetura do MVP

## 1. Objetivo e escopo

O sistema monitora taxas da rede Ethereum, transforma dados brutos em métricas
operacionais e estima custos em USD para perfis de transação. O painel deve
mostrar novos dados sem recarregar a página.

O MVP é somente leitura. Não assina nem envia transações, não implanta contratos
e não substitui a plataforma da Alphractal em produção.

## 2. Visão geral

A solução será um **monólito modular em Next.js**. Frontend, endpoints HTTP/SSE e
ingestão serão mantidos no mesmo repositório e executados no mesmo processo
Node.js. A separação é feita por módulos e interfaces, não por processos de rede.

```mermaid
flowchart LR
    RPC[Provedor RPC Ethereum] -->|WebSocket JSON-RPC| VIEM[ViemRpcAdapter]
    PRICE[Provedor ETH/USD] -->|HTTP a cada 30 s| PRICEADAPTER[HttpPriceAdapter]

    VIEM --> TELEMETRY[FeeTelemetry]
    PRICEADAPTER --> TELEMETRY
    TELEMETRY --> CALC[FeeCalculator]
    CALC --> STORE[SnapshotStore]
    CALC --> HUB[SseHub]

    STORE --> SNAPSHOT[GET /api/fees/snapshot]
    STORE --> HISTORY[GET /api/fees/history]
    TELEMETRY --> HEALTH[GET /api/health]
    HUB --> STREAM[GET /api/fees/stream]

    SNAPSHOT --> QUERY[TanStack Query]
    HISTORY --> QUERY
    STREAM --> QUERY
    QUERY --> DASHBOARD[Dashboard Fees]
```

## 3. Fluxo de dados

1. O processo Node.js inicia o módulo `FeeTelemetry`.
2. `ViemRpcAdapter` abre uma conexão WebSocket autenticada com o provedor RPC.
3. O adapter observa novos blocos e, quando disponível, transações pendentes.
4. `HttpPriceAdapter` consulta ETH/USD por HTTP a cada 30 segundos.
5. `FeeCalculator` combina taxas, atividade observada e preço em um
   `FeeSnapshot`.
6. `SnapshotStore` substitui o snapshot atual e adiciona um ponto ao histórico
   circular.
7. `SseHub` envia o snapshot aos navegadores conectados.
8. O hook de SSE do frontend valida o evento e usa `queryClient.setQueryData`.
9. React renderiza novamente apenas os elementos afetados.

Não existe uma conexão WebSocket entre navegador e servidor. O WebSocket fica
restrito ao caminho servidor -> blockchain. A entrega servidor -> navegador é
unidirecional e usa SSE.

## 4. Módulo principal e interface

`FeeTelemetry` concentra ciclo de vida, reconexão, agregação, cálculo,
deduplicação, histórico e distribuição. Chamadores e testes atravessam a mesma
interface:

```ts
export interface FeeTelemetry {
  start(): Promise<void>
  stop(): Promise<void>
  getSnapshot(): FeeSnapshot | null
  getHistory(): readonly FeeSnapshot[]
  getHealth(): TelemetryHealth
  subscribe(listener: (snapshot: FeeSnapshot) => void): () => void
}
```

As dependências externas são recebidas pelo módulo, em vez de serem criadas
dentro dele:

```ts
export type FeeTelemetryDependencies = {
  rpc: EthereumTelemetrySource
  price: EthUsdPriceSource
  store: SnapshotStore
  clock: Clock
}
```

Isso cria seams testáveis para o RPC e para o provedor de preço. Produção usa
adapters reais; testes usam adapters determinísticos em memória.

## 5. Responsabilidades dos módulos

| Módulo | Responsabilidade |
| --- | --- |
| `FeeTelemetry` | Orquestrar fontes, cálculo, armazenamento e publicação |
| `ViemRpcAdapter` | WebSocket RPC, assinatura de blocos, mempool e reconexão |
| `HttpPriceAdapter` | Polling HTTP, timeout, validação e último preço válido |
| `FeeCalculator` | Cálculo puro de percentis, custo e congestionamento |
| `SnapshotStore` | Snapshot atual e histórico circular limitado |
| `SseHub` | Fan-out dos eventos e remoção de assinantes desconectados |
| Route Handlers | Adaptar HTTP/SSE para a interface de `FeeTelemetry` |
| Hooks do frontend | Carregar estado inicial e aplicar eventos ao cache local |

## 6. Fontes de dados

### 6.1 Ethereum

O cliente público do Viem usa `webSocket(ETHEREUM_WS_RPC_URL)`. O fluxo de blocos
é baseado em `watchBlocks`, com início imediato e recuperação de blocos perdidos
quando suportado.

Dados mínimos por snapshot:

- número, hash e timestamp do bloco;
- `baseFeePerGas`;
- faixas de prioridade lenta, padrão e rápida;
- proporção de gás usado no bloco;
- quantidade observada de hashes pendentes por segundo;
- estado da conexão e instante do último evento.

O stream `newPendingTransactions` representa a visão do nó/provedor, não o
tamanho total e global da mempool. Por isso, o painel deve nomear a métrica como
**taxa observada de transações pendentes**.

Não se deve buscar os detalhes de todas as transações pendentes. Para o MVP, o
servidor conta hashes em janelas de um segundo. Uma amostragem limitada pode ser
adicionada posteriormente se for necessária para outra métrica.

### 6.2 ETH/USD

O adapter HTTP consulta inicialmente o endpoint `simple/price` do CoinGecko com:

```text
ids=ethereum
vs_currencies=usd
include_last_updated_at=true
```

Política inicial:

- intervalo: 30 segundos;
- timeout: 5 segundos;
- uma nova tentativa com pequeno atraso;
- manter o último preço válido após falha temporária;
- marcar o preço como degradado após 2 minutos sem atualização válida;
- nunca expor a chave do provedor ao navegador.

O adapter valida a resposta com Zod antes de atualizar o estado.

## 7. Contrato de dados

```ts
export type FeeSnapshot = {
  sequence: number
  timestamp: string
  blockNumber: string
  blockHash: `0x${string}`

  baseFeeGwei: number
  gasUsedRatio: number

  priorityFeeGwei: {
    slow: number
    standard: number
    fast: number
  }

  ethUsd: number
  priceUpdatedAt: string
  priceStatus: 'fresh' | 'stale'

  pendingTransactionsPerSecond: number | null
  congestionLevel: 'low' | 'normal' | 'high' | 'critical'

  estimatedCosts: Array<{
    operation: string
    gasUnits: number
    slowUsd: number
    standardUsd: number
    fastUsd: number
  }>
}
```

`blockNumber` é uma string porque `bigint` não é serializado por JSON. Valores
on-chain permanecem como `bigint` durante o cálculo e são formatados apenas na
saída.

`sequence` é crescente por processo e permite que o frontend descarte eventos
duplicados ou fora de ordem.

## 8. Cálculos

As faixas iniciais usam percentis em vez de somente média, reduzindo o impacto de
valores extremos:

- lenta: p25;
- padrão: p50;
- rápida: p90.

Para uma taxa expressa em Gwei:

```text
custo em USD = gasUnits x (baseFeeGwei + priorityFeeGwei) x 10^-9 x ethUsd
```

Os perfis de operação devem ser configuráveis. Exemplos iniciais podem incluir
transferência de ETH, transferência ERC-20 e swap, mas os valores de `gasUnits`
precisam ser validados com o parceiro antes de serem apresentados como estimativas
institucionais.

`congestionLevel` deve ser uma função pura e testada, combinando ao menos taxa de
pendentes observada, `gasUsedRatio` e variação recente da taxa padrão. Os limiares
ficam centralizados em configuração.

## 9. Endpoints

### `GET /api/fees/snapshot`

Retorna o snapshot atual. É usado na abertura do painel, após reconexão e como
fallback quando o stream estiver indisponível.

### `GET /api/fees/history`

Retorna a janela disponível no `SnapshotStore`. O histórico é limitado por
`HISTORY_MAX_POINTS` e não sobrevive ao reinício do processo no MVP.

### `GET /api/fees/stream`

Mantém uma resposta SSE aberta. Eventos previstos:

```text
event: snapshot
id: 152
data: {"sequence":152,"blockNumber":"..."}

event: health
data: {"rpcConnected":true,"priceStatus":"fresh"}
```

Requisitos do stream:

- `Content-Type: text/event-stream; charset=utf-8`;
- `Cache-Control: no-cache, no-transform`;
- `X-Accel-Buffering: no` quando houver proxy compatível;
- heartbeat em comentário (`: keep-alive`) a cada 15 segundos;
- `retry: 3000` para orientar a reconexão do navegador;
- enviar o snapshot atual logo após conectar;
- remover o assinante quando `request.signal` for abortado.

### `GET /api/health`

Expõe somente diagnóstico não sensível:

```ts
export type TelemetryHealth = {
  status: 'healthy' | 'degraded' | 'unhealthy'
  rpcConnected: boolean
  lastBlock: string | null
  lastBlockAt: string | null
  priceUpdatedAt: string | null
  priceStatus: 'fresh' | 'stale' | 'unavailable'
  sseClients: number
}
```

## 10. Atualização do dashboard

O estado inicial usa TanStack Query:

```ts
useQuery({
  queryKey: ['fees', 'snapshot'],
  queryFn: fetchFeeSnapshot,
  staleTime: 30_000,
})
```

O hook de stream abre `EventSource('/api/fees/stream')`. Quando recebe um snapshot
completo, atualiza diretamente o cache:

```ts
eventSource.addEventListener('snapshot', (event) => {
  const snapshot = FeeSnapshotSchema.parse(JSON.parse(event.data))

  queryClient.setQueryData(['fees', 'snapshot'], (current?: FeeSnapshot) => {
    if (current && current.sequence >= snapshot.sequence) return current
    return snapshot
  })
})
```

Não se usa `invalidateQueries` a cada evento completo, pois isso causaria uma nova
requisição HTTP desnecessária. A invalidação é adequada após uma reconexão ou
quando o SSE carregar apenas uma notificação sem os dados.

O dashboard apresenta explicitamente:

- conectado, reconectando, degradado ou offline;
- instante da última atualização;
- preço ETH/USD e sua idade;
- cards de taxa lenta, padrão e rápida;
- custo estimado por perfil de operação;
- série recente de taxa e congestionamento.

## 11. Inicialização e ciclo de vida

`src/instrumentation.ts` importa o bootstrap apenas no runtime Node.js. O bootstrap
é idempotente e retorna rapidamente após registrar os listeners; ele não aguarda
indefinidamente o stream.

Durante desenvolvimento, um símbolo em `globalThis` impede que hot reload abra
conexões duplicadas. Em produção, a premissa é uma instância Node.js e uma conexão
RPC.

O encerramento gracioso chama as funções retornadas pelo Viem, interrompe o
polling de preço e fecha os streams SSE.

## 12. Resiliência

- reconexão WebSocket com atraso crescente e limite observável;
- keep-alive fornecido pelo transporte do Viem;
- deduplicação por número e hash do bloco;
- substituição do último bloco quando houver reorganização;
- último preço válido preservado durante falha temporária;
- status degradado quando RPC ou preço estiverem atrasados;
- histórico circular para limitar memória;
- heartbeat SSE e limpeza de conexões fechadas;
- logs estruturados sem URLs completas, chaves ou payloads sensíveis.

## 13. Implantação e limites de escala

O MVP deve rodar em um servidor Node.js persistente, preferencialmente em um
container, com uma única réplica. O ambiente precisa suportar respostas em
streaming sem buffering intermediário.

Premissas do MVP:

```text
1 container
1 processo Next.js
1 instância de FeeTelemetry
1 WebSocket RPC
N conexões SSE
```

Se o sistema passar a usar múltiplas réplicas, cada processo teria seu próprio
WebSocket, histórico e conjunto de clientes. Nesse momento, a ingestão deve ser
extraída para um worker persistente ou coordenada por um mecanismo compartilhado,
como Redis/PubSub. Essa infraestrutura não faz parte do MVP.

## 14. Segurança

- chaves RPC e de preço ficam apenas em variáveis de ambiente do servidor;
- nenhuma chave recebe o prefixo `NEXT_PUBLIC_`;
- o código não contém carteira, chave privada ou método de envio de transação;
- respostas e logs não incluem a URL RPC autenticada;
- dados externos são validados em runtime;
- endpoints públicos retornam somente dados de telemetria necessários ao painel.

## 15. Referências

- [Next.js - Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)
- [Next.js - Instrumentation](https://nextjs.org/docs/app/guides/instrumentation)
- [Next.js - Self-hosting e streaming](https://nextjs.org/docs/app/guides/self-hosting)
- [Viem - WebSocket transport](https://viem.sh/docs/clients/transports/websocket)
- [Viem - watchBlocks](https://viem.sh/docs/actions/public/watchBlocks)
- [TanStack Query - QueryClient](https://tanstack.com/query/latest/docs/reference/QueryClient)
- [MDN - Server-sent events](https://developer.mozilla.org/docs/Web/API/Server-sent_events/Using_server-sent_events)
- [CoinGecko - Simple Price](https://docs.coingecko.com/reference/simple-price)
