# Documentação do projeto

O Blockas monitora taxas da rede Ethereum e entrega ao dashboard dados em tempo
real, sem banco de dados e sem autenticação de usuários.

## Decisões principais

1. Monólito modular em Next.js, TypeScript e App Router.
2. Uma instância Node.js persistente e um cliente Viem WebSocket compartilhado.
3. Blocos e hashes de transações pendentes observados pelo servidor.
4. Cotação ETH/USD consultada por HTTP e mantida em cache.
5. Snapshot atual e histórico circular armazenados em memória.
6. Estado inicial carregado por HTTP e atualizações entregues por SSE.
7. Contratos compartilhados e validados com Zod.
8. Testes usam adapters determinísticos, sem depender da rede pública.

## Documento

- [Arquitetura](arquitetura.md): fluxo, componentes, contratos, endpoints,
  resiliência, integração do frontend e operação.
