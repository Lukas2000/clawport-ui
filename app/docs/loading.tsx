import { Skeleton } from "@/components/ui/skeleton"

export default function DocsLoading() {
  return (
    <div className="flex h-full" style={{ background: "var(--bg)" }}>
      {/* Sidebar */}
      <div style={{ width: 280, borderRight: "1px solid var(--separator)", padding: "var(--space-4)" }}>
        <Skeleton height={36} style={{ width: "100%", borderRadius: "var(--radius-md)", marginBottom: "var(--space-4)" }} />
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Skeleton key={i} height={24} style={{ width: `${70 + Math.random() * 30}%`, borderRadius: "var(--radius-sm)", marginBottom: "var(--space-2)" }} />
        ))}
      </div>
      {/* Content area */}
      <div className="flex-1" style={{ padding: "var(--space-6)" }}>
        <Skeleton width={200} height={24} style={{ marginBottom: "var(--space-4)" }} />
        <Skeleton height={16} style={{ width: "90%", marginBottom: "var(--space-2)" }} />
        <Skeleton height={16} style={{ width: "75%", marginBottom: "var(--space-2)" }} />
        <Skeleton height={16} style={{ width: "85%", marginBottom: "var(--space-2)" }} />
      </div>
    </div>
  )
}
