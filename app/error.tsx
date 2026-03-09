"use client"

import { ErrorState } from "@/components/ErrorState"

export default function HomeError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorState message={error.message} onRetry={reset} />
}
