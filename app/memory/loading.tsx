import { Skeleton } from "@/components/ui/skeleton"

export default function MemoryLoading() {
  return (
    <div className="h-full overflow-y-auto" style={{ background: "var(--bg)" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "var(--space-8) var(--space-6)" }}>
        <Skeleton width={160} height={28} style={{ marginBottom: "var(--space-2)" }} />
        <Skeleton width={240} height={16} style={{ marginBottom: "var(--space-6)" }} />
        {/* Tab bar */}
        <div className="flex gap-4" style={{ marginBottom: "var(--space-6)" }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} width={80} height={32} style={{ borderRadius: "var(--radius-sm)" }} />
          ))}
        </div>
        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ marginBottom: "var(--space-6)" }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={80} style={{ width: "100%", borderRadius: "var(--radius-md)" }} />
          ))}
        </div>
        {/* Content area */}
        <Skeleton height={300} style={{ width: "100%", borderRadius: "var(--radius-lg)" }} />
      </div>
    </div>
  )
}
