import useSWR from 'swr'
import type { Agent } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error('Failed to fetch agents')
  return r.json()
})

export function useAgents() {
  return useSWR<Agent[]>('/api/agents', fetcher, {
    dedupingInterval: 30000,
    revalidateOnFocus: false,
  })
}
