'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { FeesStreamController } from './feesStreamController'
import type { FeesStreamConnectionState } from './connectionState'

export function useFeesStream(url?: string): FeesStreamConnectionState {
  const queryClient = useQueryClient()
  const [state, setState] = useState<FeesStreamConnectionState>('connecting')

  useEffect(() => {
    const controller = new FeesStreamController({
      queryClient,
      url,
      onStateChange: setState,
      onInvalidEvent: (reason, raw) => {
        console.warn(`[useFeesStream] evento SSE inválido (${reason})`, raw)
      },
    })

    controller.connect()

    return () => {
      controller.disconnect()
    }
  }, [queryClient, url])

  return state
}
