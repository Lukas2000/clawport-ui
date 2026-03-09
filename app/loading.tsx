import { Skeleton } from "@/components/ui/skeleton"

export default function HomeLoading() {
  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-6"
      style={{ padding: "var(--space-8)" }}
    >
      {/* Fake root node */}
      <Skeleton width={160} height={80} style={{ borderRadius: "var(--radius-md)" }} />
      {/* Fake second row */}
      <div className="flex gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton
            key={i}
            width={140}
            height={72}
            style={{ borderRadius: "var(--radius-md)" }}
          />
        ))}
      </div>
      {/* Fake third row */}
      <div className="flex gap-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton
            key={i}
            width={130}
            height={64}
            style={{ borderRadius: "var(--radius-md)" }}
          />
        ))}
      </div>
    </div>
  )
}
