import { Skeleton } from "@/components/ui/skeleton"

export default function ActivityLoading() {
  return (
    <div className="h-full overflow-y-auto" style={{ background: "var(--bg)" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "var(--space-8) var(--space-6)" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-6)" }}>
          <Skeleton width={120} height={28} />
          <Skeleton width={140} height={36} style={{ borderRadius: "var(--radius-md)" }} />
        </div>
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4" style={{ marginBottom: "var(--space-6)" }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height={72} style={{ width: "100%", borderRadius: "var(--radius-md)" }} />
          ))}
        </div>
        {/* Log rows */}
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Skeleton key={i} height={44} style={{ width: "100%", borderRadius: "var(--radius-sm)", marginBottom: "var(--space-2)" }} />
        ))}
      </div>
    </div>
  )
}
