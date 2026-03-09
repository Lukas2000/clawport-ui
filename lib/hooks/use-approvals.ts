import useSWR from 'swr'
import type { Approval } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) return []
  return r.json().then((data: { approvals?: Approval[] }) => data.approvals ?? [])
})

export function useApprovals() {
  return useSWR<Approval[]>('/api/approvals', fetcher, {
    dedupingInterval: 30000,
    revalidateOnFocus: false,
  })
}
