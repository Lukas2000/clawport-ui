import { Skeleton } from "@/components/ui/skeleton"

export default function CostsLoading() {
  return (
    <div className="h-full overflow-y-auto" style={{ background: "var(--bg)" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "var(--space-8) var(--space-6)" }}>
        <Skeleton width={120} height={28} style={{ marginBottom: "var(--space-6)" }} />
        {/* Summary cards row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ marginBottom: "var(--space-6)" }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={80} style={{ width: "100%", borderRadius: "var(--radius-md)" }} />
          ))}
        </div>
        {/* Chart area */}
        <Skeleton height={240} style={{ width: "100%", borderRadius: "var(--radius-lg)", marginBottom: "var(--space-6)" }} />
        {/* Table rows */}
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} height={48} style={{ width: "100%", borderRadius: "var(--radius-sm)", marginBottom: "var(--space-2)" }} />
        ))}
      </div>
    </div>
  )
}
