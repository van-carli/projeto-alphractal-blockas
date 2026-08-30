import { useQuery } from '@tanstack/react-query'

import {
  getFeesHistory,
  getFeesSnapshot,
  getHealth,
} from './feesApi'

export const feesQueryKeys = {
  all: ['fees'] as const,
  snapshot: () => [...feesQueryKeys.all, 'snapshot'] as const,
  history: () => [...feesQueryKeys.all, 'history'] as const,
  health: () => [...feesQueryKeys.all, 'health'] as const,
}

export function useFeesSnapshot() {
  return useQuery({
    queryKey: feesQueryKeys.snapshot(),
    queryFn: getFeesSnapshot,
  })
}

export function useFeesHistory() {
  return useQuery({
    queryKey: feesQueryKeys.history(),
    queryFn: getFeesHistory,
  })
}

export function useHealth() {
  return useQuery({
    queryKey: feesQueryKeys.health(),
    queryFn: getHealth,
  })
}
