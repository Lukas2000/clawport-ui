import { Skeleton } from "@/components/ui/skeleton"

export default function AgentDetailLoading() {
  return (
    <div className="h-full overflow-y-auto" style={{ background: "var(--bg)" }}>
      {/* Header skeleton */}
      <div
        className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between"
        style={{
          background: "var(--material-regular)",
          borderBottom: "1px solid var(--separator)",
        }}
      >
        <Skeleton width={80} height={16} />
        <Skeleton width={100} height={36} style={{ borderRadius: "var(--radius-md)" }} />
      </div>
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "var(--space-8) var(--space-6)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-5)",
        }}
      >
        {/* Hero skeleton */}
        <div className="flex items-center gap-4">
          <Skeleton
            width={64}
            height={64}
            style={{ borderRadius: 16 }}
          />
          <div className="flex flex-col gap-2">
            <Skeleton width={140} height={22} />
            <Skeleton width={200} height={14} />
          </div>
        </div>
        {/* Card skeletons */}
        {[1, 2, 3].map((i) => (
          <Skeleton
            key={i}
            height={120}
            style={{
              width: "100%",
              borderRadius: "var(--radius-lg)",
            }}
          />
        ))}
      </div>
    </div>
  )
}
