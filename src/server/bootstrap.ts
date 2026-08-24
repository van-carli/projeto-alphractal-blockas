import { startApplicationRuntime } from './application-runtime'
import {
  createServerBootstrap,
  type ServerBootstrap,
  type ServerBootstrapState,
} from './bootstrap-core'

const bootstrapGlobalKey = '__alphractalServerBootstrap__' as const

type BootstrapGlobal = typeof globalThis & {
  [bootstrapGlobalKey]?: ServerBootstrap
}

function getServerBootstrap(): ServerBootstrap {
  const globalScope = globalThis as BootstrapGlobal

  globalScope[bootstrapGlobalKey] ??= createServerBootstrap(
    startApplicationRuntime,
  )

  return globalScope[bootstrapGlobalKey]
}

export async function bootstrapServer(): Promise<void> {
  await getServerBootstrap().start()
}

export async function shutdownServer(): Promise<void> {
  await getServerBootstrap().stop()
}

export function getServerBootstrapState(): ServerBootstrapState {
  return getServerBootstrap().getState()
}
