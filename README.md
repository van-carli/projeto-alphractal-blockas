# Projeto Alphractal - Blockas

Protótipo de monitoramento em tempo real das taxas da rede Ethereum para a
área *Fees* da Alphractal.

## Requisitos

- Node.js 20.9 ou superior;
- npm 11 ou superior;
- PostgreSQL para as funcionalidades de persistência.

## Configuração local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Preencha `ETHEREUM_WS_RPC_URL` e `DATABASE_URL` em `.env.local` com credenciais
do ambiente de desenvolvimento. O arquivo `.env.example` contém somente valores
de referência e pode permanecer versionado.

## Verificações

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Estrutura

```text
src/app/                    rotas e interface Next.js
src/modules/fees/domain/    contratos e regras independentes de framework
src/modules/fees/application/ seams para adapters externos
src/server/                 configuração, bootstrap e infraestrutura Node.js
src/instrumentation.ts      entrada idempotente do runtime persistente
```

O módulo `src/modules/fees` é a interface pública dos contratos compartilhados.
Frontend e backend devem importar por essa interface, sem alcançar arquivos
internos do domínio.

## Documentação

- [Visão geral](docs/README.md)
- [Arquitetura](docs/arquitetura.md)
