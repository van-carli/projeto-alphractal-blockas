import type { ServerRuntimeStop } from './bootstrap-core'

export async function startApplicationRuntime(): Promise<ServerRuntimeStop> {
  return async () => undefined
}
