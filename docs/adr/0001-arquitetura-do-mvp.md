# ADR 0001 - Arquitetura do MVP de telemetria

- **Status:** aceito
- **Data:** 2026-08-24
- **Escopo:** protótipo de monitoramento de taxas Ethereum

## Contexto

O projeto precisa ingerir continuamente dados da Ethereum, acompanhar indicadores
relacionados à mempool, converter taxas em USD e atualizar um dashboard sem reload.
O prazo é de uma semana e a entrega é uma prova de conceito isolada, somente
leitura e sem implantação de contratos.

As escolhas precisam minimizar infraestrutura sem impedir que ingestão, cálculo,
entrega e apresentação sejam testados separadamente.

## Decisão

### 1. Monólito modular em Next.js

Frontend e lógica de servidor serão mantidos no mesmo projeto Next.js com App
Router e TypeScript. O código será separado em módulos internos, com
`FeeTelemetry` apresentando uma interface pequena para Route Handlers e testes.

### 2. Processo Node.js persistente e uma réplica

O MVP será executado em uma única instância Node.js persistente. O processo será
responsável pelo ciclo de vida da ingestão e pelos streams SSE.

### 3. WebSocket RPC somente entre servidor e Ethereum

O Viem manterá uma única conexão WebSocket JSON-RPC por instância. Essa conexão
receberá novos blocos e, quando suportado pelo provedor, hashes de transações
pendentes.

A conexão não será criada por requisição e não será exposta ao navegador.

### 4. ETH/USD por HTTP

A cotação será consultada no servidor por HTTP a cada 30 segundos. O adapter terá
timeout, validação, indicador de idade e preservação do último preço válido.

HTTP foi escolhido porque a cotação não precisa de granularidade subsegundo para
este painel e porque uma segunda conexão WebSocket aumentaria o ciclo de vida e os
modos de falha sem reduzir a arquitetura lógica.

### 5. Atualização do navegador por SSE

O servidor enviará snapshots ao frontend usando *Server-Sent Events*. O dashboard
é somente consumidor, portanto não precisa de um canal bidirecional.

O frontend usa HTTP para o estado inicial e SSE para atualizações subsequentes.

### 6. TanStack Query como cache remoto do navegador

Quando o SSE carregar um snapshot completo, o hook do frontend chamará
`setQueryData`. O backend não invalida diretamente esse cache, pois ele existe em
cada navegador.

`invalidateQueries` será reservado para reconexão ou eventos que não contenham os
novos dados.

### 7. Armazenamento em memória

O snapshot atual e um histórico circular limitado serão mantidos em memória. A
perda do histórico após reinício é aceita no MVP.

Não será usado banco de dados durante o MVP. MongoDB não apresenta vantagem clara
para a janela curta de dados e adicionaria configuração, operação e uma nova
dependência sem atender a um requisito atual.

### 8. Gestão por Kanban

O trabalho de uma semana será organizado exclusivamente no Kanban do projeto. O
repositório registra decisões arquiteturais, mas não mantém um plano de execução
paralelo ao quadro.

## Consequências positivas

- um repositório, um processo e uma implantação;
- ausência de Socket.IO, Express, banco, Redis e fila;
- segredos RPC e de preço permanecem no servidor;
- comunicação adequada a cada direção: WebSocket na ingestão e SSE na entrega;
- cálculos e regras permanecem testáveis sem rede;
- o frontend recebe atualizações sem polling e sem refresh;
- fontes externas podem ser substituídas por adapters sem alterar os chamadores.

## Consequências negativas e limites

- o processo precisa permanecer ativo;
- implantação efêmera ou com timeout não atende ao ciclo de vida da ingestão;
- o histórico é perdido ao reiniciar;
- múltiplas réplicas criariam múltiplas conexões RPC e estados independentes;
- SSE exige suporte a streaming sem buffering em toda a infraestrutura;
- a métrica de pendentes representa a visão do provedor, não a mempool global.

## Alternativas consideradas

### Backend Node.js separado do frontend

Rejeitado para o MVP porque adiciona um segundo projeto, implantação e contrato de
rede. Deve ser reconsiderado se a ingestão precisar escalar independentemente.

### Criar o WebSocket dentro de `/api`

Rejeitado porque uma rota é acionada por requisição e poderia abrir conexões
duplicadas. As rotas apenas leem ou assinam o módulo já inicializado.

### Socket.IO entre servidor e navegador

Rejeitado porque o fluxo é unidirecional. SSE atende ao requisito com protocolos e
interfaces nativas do navegador.

### WebSocket também para ETH/USD

Rejeitado porque a granularidade adicional não é necessária. HTTP periódico é
mais simples e o adapter pode ser substituído futuramente sem alterar
`FeeTelemetry`.

### Polling HTTP no frontend

Rejeitado como mecanismo principal porque cria requisições mesmo sem mudança e
aumenta a latência percebida. HTTP permanece como bootstrap e fallback.

### Banco de dados no MVP

Rejeitado porque não há requisito de histórico durável. Um buffer em memória é
suficiente para a demonstração.

### MongoDB

Rejeitado no MVP porque o modelo atual é pequeno, estruturado e temporário. Se
retenção durável se tornar necessária, MongoDB poderá ser comparado com opções
relacionais ou especializadas em séries temporais a partir dos padrões reais de
consulta.

## Gatilhos para revisar esta decisão

Revisar a arquitetura quando qualquer condição abaixo ocorrer:

- necessidade de mais de uma réplica;
- histórico precisa sobreviver a reinícios;
- múltiplos consumidores além do dashboard;
- ingestão de várias redes L1/L2;
- retenção ou análise histórica prolongada;
- requisitos formais de disponibilidade;
- volume de SSE ou RPC excede a capacidade de um processo;
- implantação disponível não suporta processo persistente e streaming.
