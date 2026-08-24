import { describe, expect, it } from 'vitest'

import {
  InvalidServerEnvironmentError,
  parseServerEnv,
} from './env'

describe('parseServerEnv', () => {
  it('converte e valida uma configuração completa', () => {
    const env = parseServerEnv({
      NODE_ENV: 'test',
      ETHEREUM_WS_RPC_URL: 'wss://ethereum.example.invalid/rpc',
      DATABASE_URL: 'postgresql://app:secret@localhost:5432/alphractal',
      ETH_USD_POLL_INTERVAL_MS: '45000',
      HISTORY_MAX_POINTS: '900',
    })

    expect(env).toMatchObject({
      NODE_ENV: 'test',
      ETH_USD_POLL_INTERVAL_MS: 45000,
      HISTORY_MAX_POINTS: 900,
    })
  })

  it('falha com mensagem segura quando variáveis obrigatórias faltam', () => {
    expect(() => parseServerEnv({ NODE_ENV: 'production' })).toThrow(
      InvalidServerEnvironmentError,
    )
  })

  it('não inclui valores de credenciais na mensagem de erro', () => {
    expect.assertions(3)
    const invalidDatabaseUrl = 'https://user:super-secret@example.com/database'

    try {
      parseServerEnv({
        ETHEREUM_WS_RPC_URL: 'https://rpc-secret.example.com',
        DATABASE_URL: invalidDatabaseUrl,
      })
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidServerEnvironmentError)
      expect(String(error)).not.toContain('super-secret')
      expect(String(error)).not.toContain('rpc-secret')
    }
  })
})
