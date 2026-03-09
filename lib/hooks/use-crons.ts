import useSWR from 'swr'
import type { CronJob } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error('Failed to fetch crons')
  return r.json().then(data => {
    const list: CronJob[] = Array.isArray(data) ? data : data.crons ?? []
    return list
  })
})

export function useCrons() {
  return useSWR<CronJob[]>('/api/crons', fetcher, {
    dedupingInterval: 30000,
    revalidateOnFocus: false,
  })
}
