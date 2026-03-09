/**
 * Format a date string as a relative time ago label.
 */
export function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "never"
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return "\u2014"
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (diff < 0) {
    const absDiff = Math.abs(diff)
    const m = Math.floor(absDiff / 60000)
    const h = Math.floor(absDiff / 3600000)
    const dy = Math.floor(absDiff / 86400000)
    if (m < 60) return `in ${m}m`
    if (h < 24) return `in ${h}h`
    return `in ${dy}d`
  }
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24) return `${hrs}h ago`
  return `${days}d ago`
}
