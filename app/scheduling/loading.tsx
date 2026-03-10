import { Skeleton } from "@/components/ui/skeleton"

export default function CronsLoading() {
  return (
    <div className="h-full overflow-y-auto" style={{ background: "var(--bg)" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "var(--space-8) var(--space-6)" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-6)" }}>
          <Skeleton width={140} height={28} />
          <Skeleton width={100} height={36} style={{ borderRadius: "var(--radius-md)" }} />
        </div>
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ marginBottom: "var(--space-6)" }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={72} style={{ width: "100%", borderRadius: "var(--radius-md)" }} />
          ))}
        </div>
        {/* Cron job rows */}
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} height={56} style={{ width: "100%", borderRadius: "var(--radius-sm)", marginBottom: "var(--space-2)" }} />
        ))}
      </div>
    </div>
  )
}
