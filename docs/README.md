# Documentação do projeto

Esta pasta registra a arquitetura e o planejamento do protótipo de monitoramento
em tempo quase real de taxas da rede Ethereum para a área *Fees* da Alphractal.

O escopo foi derivado do
[TAP do projeto](https://github.com/InteliBlockchain-IBC/projeto-alphractal/blob/main/docs/TAP-Alphractal.pdf)
e das decisões técnicas tomadas para manter o MVP simples, demonstrável e
preparado para evolução.

## Documentos

- [Arquitetura](arquitetura.md): módulos, interfaces, fluxo de dados, endpoints,
  atualização do dashboard e implantação.
- [Plano de desenvolvimento](plano-de-desenvolvimento.md): bibliotecas,
  configuração, organização do código, etapas e estratégia de testes.
- [ADR 0001](adr/0001-arquitetura-do-mvp.md): registro das principais decisões e
  alternativas consideradas.

## Decisões principais

1. O MVP será um monólito modular em Next.js com App Router e TypeScript.
2. A aplicação será executada em uma única instância Node.js persistente.
3. Haverá uma única conexão WebSocket JSON-RPC com o provedor Ethereum por
   instância.
4. A cotação ETH/USD será consultada por HTTP, inicialmente a cada 30 segundos.
5. O servidor entregará atualizações ao navegador por SSE (*Server-Sent Events*).
6. O frontend carregará o estado inicial por HTTP e receberá as atualizações por
   SSE.
7. O TanStack Query armazenará o estado remoto no navegador; eventos completos
   usarão `setQueryData`, evitando uma segunda requisição a cada atualização.
8. Snapshot e histórico recente ficarão em memória no MVP.
9. Não serão usados Socket.IO, Express, Axios, Redux, banco de dados, Redis ou
   filas enquanto os requisitos não justificarem essas dependências.

## Significado de "tempo real"

O dashboard será atualizado em **tempo quase real**:

- blocos: assim que o provedor RPC emitir um novo cabeçalho, normalmente no
  ritmo de produção de blocos da Ethereum;
- mempool: métricas agregadas no servidor e publicadas no máximo uma vez por
  segundo;
- ETH/USD: atualização por HTTP a cada 30 segundos;
- saúde das conexões: atualização quando o estado mudar.

Esse comportamento evita polling no frontend. A pequena latência entre a origem,
o servidor e o navegador impede que o sistema seja classificado como tempo real
duro, mas atende ao objetivo operacional do painel.
