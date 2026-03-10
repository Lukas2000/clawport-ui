"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Agent, CronJob, CronRun, HeartbeatConfig, HeartbeatRun } from "@/lib/types";
import type { Pipeline } from "@/lib/cron-pipelines";
import { formatDuration } from "@/lib/cron-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, BarChart3, Calendar, GitBranch, Copy, Check, Heart } from "lucide-react";
import { WeeklySchedule } from "@/components/crons/WeeklySchedule";
import { PipelineGraph } from "@/components/crons/PipelineGraph";

/* ─── Time helpers ──────────────────────────────────────────────── */

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "never";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "\u2014";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (diff < 0) {
    const absDiff = Math.abs(diff);
    const m = Math.floor(absDiff / 60000);
    const h = Math.floor(absDiff / 3600000);
    const dy = Math.floor(absDiff / 86400000);
    if (m < 60) return `in ${m}m`;
    if (h < 24) return `in ${h}h`;
    return `in ${dy}d`;
  }
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

function nextRunLabel(dateStr: string | null): string {
  if (!dateStr) return "not scheduled";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "\u2014";
  const diff = d.getTime() - Date.now();
  if (diff < 0) return "overdue";
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `in ${mins}m`;
  if (hrs < 24) return `in ${hrs}h`;
  return `in ${days}d`;
}

/* ─── Types ─────────────────────────────────────────────────────── */

type Filter = "all" | "ok" | "error" | "idle";
type Tab = "overview" | "schedule" | "pipelines";

const STATUS_DOT: Record<string, string> = {
  ok: "var(--system-green)",
  error: "var(--system-red)",
  idle: "var(--text-tertiary)",
};

const PILLS: { key: Filter; label: string; dotColor: string }[] = [
  { key: "all", label: "All", dotColor: "var(--text-primary)" },
  { key: "ok", label: "OK", dotColor: "var(--system-green)" },
  { key: "error", label: "Errors", dotColor: "var(--system-red)" },
  { key: "idle", label: "Idle", dotColor: "var(--text-tertiary)" },
];

const TAB_ICONS: Record<Tab, React.ComponentType<{ size: number; className?: string }>> = {
  overview: BarChart3,
  schedule: Calendar,
  pipelines: GitBranch,
};

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "schedule", label: "Schedule" },
  { key: "pipelines", label: "Pipelines" },
];

/* ─── Delivery helpers ─────────────────────────────────────────── */

function DeliveryBadge({ cron }: { cron: CronJob }) {
  if (!cron.delivery) {
    return (
      <span style={{ fontSize: "var(--text-caption1)", color: "var(--text-tertiary)" }}>
        No delivery configured
      </span>
    );
  }

  const { delivery, lastDeliveryStatus } = cron;
  const hasMissingTarget = !delivery.to;

  if (hasMissingTarget) {
    return (
      <span style={{ fontSize: "var(--text-caption1)", color: "var(--system-red)" }}>
        Target missing — add &apos;to&apos; field to delivery config
      </span>
    );
  }

  const isDelivered = lastDeliveryStatus === "delivered";
  const isUnknown = !lastDeliveryStatus || lastDeliveryStatus === "unknown";
  const color = isDelivered ? "var(--system-green)" : isUnknown ? "var(--system-orange)" : "var(--system-orange)";
  const statusText = isDelivered ? "Delivered" : isUnknown ? "Unknown" : lastDeliveryStatus;

  // Truncate the "to" field for display
  const toDisplay = delivery.to && delivery.to.length > 20
    ? delivery.to.slice(0, 17) + "..."
    : delivery.to;

  return (
    <span style={{ fontSize: "var(--text-caption1)" }}>
      <span style={{ color }}>
        {isDelivered ? "\u2713" : "\u25CB"}{" "}
      </span>
      <span style={{ color: "var(--text-secondary)" }}>
        {delivery.channel}
      </span>
      {toDisplay && (
        <span style={{ color: "var(--text-tertiary)", marginLeft: 4 }}>
          {toDisplay}
        </span>
      )}
      <span style={{ color, marginLeft: 8, fontWeight: 500 }}>
        {statusText}
      </span>
    </span>
  );
}

/* ─── Summary Cards ──────────────────────────────────────────── */

function HealthCard({ ok, total }: { ok: number; total: number }) {
  const pct = total === 0 ? 100 : Math.round((ok / total) * 100);
  const r = 20;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div
      style={{
        background: "var(--material-regular)",
        border: "1px solid var(--separator)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-4)",
      }}
    >
      <div className="flex items-center" style={{ gap: "var(--space-3)" }}>
        <svg width="48" height="48" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r={r} fill="none" stroke="var(--fill-tertiary)" strokeWidth="5" />
          <circle
            cx="24" cy="24" r={r} fill="none"
            stroke="var(--system-green)" strokeWidth="5"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" transform="rotate(-90 24 24)"
            style={{ transition: "stroke-dashoffset 600ms var(--ease-smooth)" }}
          />
          <text x="24" y="24" textAnchor="middle" dominantBaseline="central"
            fill="var(--text-primary)" fontSize="11" fontWeight="700">{pct}%</text>
        </svg>
        <div>
          <div style={{ fontSize: "var(--text-caption1)", color: "var(--text-tertiary)", fontWeight: "var(--weight-medium)" }}>
            Health
          </div>
          <div style={{ fontSize: "var(--text-footnote)", color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>
            {ok}/{total} healthy
          </div>
        </div>
      </div>
    </div>
  );
}

function AttentionCard({ errors }: { errors: CronJob[] }) {
  const hasErrors = errors.length > 0;
  return (
    <div
      style={{
        background: "var(--material-regular)",
        border: "1px solid var(--separator)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-4)",
      }}
    >
      <div style={{ fontSize: "var(--text-caption1)", color: "var(--text-tertiary)", fontWeight: "var(--weight-medium)", marginBottom: "var(--space-1)" }}>
        Attention
      </div>
      {hasErrors ? (
        <>
          <div style={{ fontSize: "var(--text-footnote)", color: "var(--system-red)", fontWeight: "var(--weight-semibold)" }}>
            {errors.length} need{errors.length === 1 ? "s" : ""} fix
          </div>
          <div className="truncate" style={{ fontSize: "var(--text-caption2)", color: "var(--text-tertiary)", marginTop: 2 }}>
            {errors[0].name}
          </div>
        </>
      ) : (
        <div className="flex items-center" style={{ gap: "var(--space-1)" }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="var(--system-green)" strokeWidth="1.5" />
            <polyline points="5 8 7 10 11 6" stroke="var(--system-green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
          <span style={{ fontSize: "var(--text-footnote)", color: "var(--system-green)", fontWeight: "var(--weight-semibold)" }}>
            All clear
          </span>
        </div>
      )}
    </div>
  );
}

function DeliveryCard({ crons }: { crons: CronJob[] }) {
  const withDelivery = crons.filter(c => c.delivery);
  const configured = withDelivery.filter(c => c.delivery?.to);
  const missing = withDelivery.filter(c => !c.delivery?.to);

  return (
    <div
      style={{
        background: "var(--material-regular)",
        border: "1px solid var(--separator)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-4)",
      }}
    >
      <div style={{ fontSize: "var(--text-caption1)", color: "var(--text-tertiary)", fontWeight: "var(--weight-medium)", marginBottom: "var(--space-1)" }}>
        Delivery
      </div>
      <div style={{ fontSize: "var(--text-footnote)", color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>
        {configured.length} configured
      </div>
      {missing.length > 0 && (
        <div style={{ fontSize: "var(--text-caption2)", color: "var(--system-orange)", marginTop: 2 }}>
          {missing.length} missing target
        </div>
      )}
    </div>
  );
}

/* ─── Categorized Error Banners ──────────────────────────────── */

function ErrorsBanners({
  crons,
  agentMap,
  onCopy,
  copiedId,
}: {
  crons: CronJob[];
  agentMap: Map<string, Agent>;
  onCopy: (id: string, text: string) => void;
  copiedId: string | null;
}) {
  // Execution errors: status=error with actual error messages (not delivery target issues)
  const execErrors = crons.filter(c => c.status === "error" && c.lastError && !c.lastError.includes("delivery target is missing"));
  // Config issues: delivery target missing
  const configIssues = crons.filter(c => c.delivery && !c.delivery.to);

  if (execErrors.length === 0 && configIssues.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
      {/* Execution Errors */}
      {execErrors.length > 0 && (
        <div
          style={{
            background: "rgba(255,69,58,0.04)",
            borderLeft: "3px solid var(--system-red)",
            borderRadius: "var(--radius-sm)",
            padding: "var(--space-3) var(--space-4)",
          }}
        >
          <div style={{ fontSize: "var(--text-footnote)", color: "var(--system-red)", fontWeight: "var(--weight-semibold)", marginBottom: "var(--space-2)" }}>
            {execErrors.length} execution error{execErrors.length !== 1 ? "s" : ""}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {execErrors.map((cron) => {
              const agent = cron.agentId ? agentMap.get(cron.agentId) : null;
              return (
                <div key={cron.id} className="flex items-center" style={{ gap: "var(--space-2)", fontSize: "var(--text-caption1)", minHeight: 28 }}>
                  <span className="flex-shrink-0 rounded-full animate-error-pulse" style={{ width: 6, height: 6, background: "var(--system-red)" }} />
                  <span className="flex-shrink-0" style={{ fontWeight: "var(--weight-semibold)", color: "var(--text-primary)" }}>{cron.name}</span>
                  {cron.lastError && (
                    <span className="truncate" style={{ color: "var(--text-tertiary)", flex: 1, minWidth: 0 }}>{cron.lastError}</span>
                  )}
                  {cron.consecutiveErrors > 1 && (
                    <span style={{ fontSize: "var(--text-caption2)", color: "var(--system-orange)", flexShrink: 0 }}>
                      {cron.consecutiveErrors}x
                    </span>
                  )}
                  {cron.lastError && (
                    <button
                      onClick={() => onCopy(cron.id, cron.lastError!)}
                      className="btn-ghost focus-ring flex-shrink-0"
                      aria-label={`Copy error for ${cron.name}`}
                      style={{ padding: "2px 8px", borderRadius: "var(--radius-sm)", fontSize: "var(--text-caption2)", fontWeight: "var(--weight-medium)", display: "inline-flex", alignItems: "center", gap: 3 }}
                    >
                      {copiedId === cron.id ? <Check size={12} /> : <Copy size={12} />}
                      {copiedId === cron.id ? "Copied" : "Copy"}
                    </button>
                  )}
                  {agent && (
                    <Link href={`/chat/${agent.id}`} className="flex-shrink-0 focus-ring" style={{ fontSize: "var(--text-caption2)", color: "var(--system-blue)", textDecoration: "none" }}>
                      {agent.name}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Configuration Issues */}
      {configIssues.length > 0 && (
        <div
          style={{
            background: "rgba(255,149,0,0.04)",
            borderLeft: "3px solid var(--system-orange)",
            borderRadius: "var(--radius-sm)",
            padding: "var(--space-3) var(--space-4)",
          }}
        >
          <div style={{ fontSize: "var(--text-footnote)", color: "var(--system-orange)", fontWeight: "var(--weight-semibold)", marginBottom: "var(--space-2)" }}>
            {configIssues.length} delivery target{configIssues.length !== 1 ? "s" : ""} missing
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
            {configIssues.map((cron) => (
              <div key={cron.id} className="flex items-center" style={{ gap: "var(--space-2)", fontSize: "var(--text-caption1)" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--system-orange)", flexShrink: 0 }} />
                <span style={{ color: "var(--text-primary)", fontWeight: "var(--weight-medium)" }}>{cron.name}</span>
                <span style={{ color: "var(--text-tertiary)" }}>
                  {cron.delivery?.channel} — no &apos;to&apos; field
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Recent Runs (lazy-loaded) ──────────────────────────────── */

function RecentRuns({ jobId }: { jobId: string }) {
  const [runs, setRuns] = useState<CronRun[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/cron-runs?jobId=${encodeURIComponent(jobId)}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setRuns((data as CronRun[]).slice(0, 5)); setLoading(false); })
      .catch(() => { setRuns([]); setLoading(false); });
  }, [jobId]);

  if (loading) {
    return (
      <div style={{ marginTop: "var(--space-3)" }}>
        <div style={{ fontSize: "var(--text-caption1)", color: "var(--text-tertiary)", fontWeight: "var(--weight-semibold)", marginBottom: "var(--space-2)" }}>
          Recent Runs
        </div>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} style={{ height: 16, marginBottom: 4, width: "80%" }} />
        ))}
      </div>
    );
  }

  if (!runs || runs.length === 0) {
    return (
      <div style={{ marginTop: "var(--space-3)" }}>
        <div style={{ fontSize: "var(--text-caption1)", color: "var(--text-tertiary)", fontWeight: "var(--weight-semibold)", marginBottom: "var(--space-2)" }}>
          Recent Runs
        </div>
        <div style={{ fontSize: "var(--text-caption2)", color: "var(--text-tertiary)" }}>No run history</div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: "var(--space-3)" }}>
      <div style={{ fontSize: "var(--text-caption1)", color: "var(--text-tertiary)", fontWeight: "var(--weight-semibold)", marginBottom: "var(--space-2)" }}>
        Recent Runs
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {runs.map((run, i) => {
          const statusDot = run.status === "ok" ? "var(--system-green)" : "var(--system-red)";
          const ago = timeAgo(new Date(run.ts).toISOString());
          const duration = formatDuration(run.durationMs);
          const deliveryStat = run.deliveryStatus === "delivered" ? "Delivered" : run.deliveryStatus === "unknown" ? "Unknown" : run.deliveryStatus || "—";
          const summaryText = run.status === "error" ? (run.error || "Error") : (run.summary || "—");
          const truncatedSummary = summaryText.length > 60 ? summaryText.slice(0, 57) + "..." : summaryText;

          return (
            <div
              key={`${run.ts}-${i}`}
              className="flex items-center"
              style={{
                gap: "var(--space-2)",
                fontSize: "var(--text-caption2)",
                minHeight: 22,
                padding: "2px 0",
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusDot, flexShrink: 0 }} />
              <span style={{ color: "var(--text-tertiary)", minWidth: 52, flexShrink: 0 }}>{ago}</span>
              <span style={{ color: "var(--text-secondary)", minWidth: 52, flexShrink: 0 }}>{duration}</span>
              <span style={{ color: run.deliveryStatus === "delivered" ? "var(--system-green)" : "var(--text-tertiary)", minWidth: 60, flexShrink: 0 }}>
                {deliveryStat}
              </span>
              <span className="truncate" style={{ color: "var(--text-tertiary)", minWidth: 0, flex: 1 }}>
                {truncatedSummary}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Heartbeat Agents Section ─────────────────────────────────── */

const HB_STATUS_COLORS: Record<string, string> = {
  queued: "var(--text-tertiary)",
  running: "#06B6D4",
  succeeded: "var(--system-green)",
  failed: "var(--system-red)",
  cancelled: "var(--text-tertiary)",
  timed_out: "var(--system-orange)",
};

function HeartbeatAgentsSection({ agents }: { agents: Agent[] }) {
  const [configs, setConfigs] = useState<(HeartbeatConfig & { runs: HeartbeatRun[] })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/heartbeat");
        if (!res.ok) { setLoading(false); return; }
        const allConfigs: HeartbeatConfig[] = await res.json();
        const enabled = allConfigs.filter(c => c.enabled);
        if (enabled.length === 0) { setConfigs([]); setLoading(false); return; }

        // Fetch recent runs for each enabled agent
        const withRuns = await Promise.all(
          enabled.map(async (cfg) => {
            try {
              const runsRes = await fetch(`/api/heartbeat/${cfg.agentId}/runs?limit=3`);
              const runs = runsRes.ok ? await runsRes.json() : [];
              return { ...cfg, runs };
            } catch {
              return { ...cfg, runs: [] as HeartbeatRun[] };
            }
          })
        );
        setConfigs(withRuns);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ marginTop: "var(--space-4)" }}>
        <Skeleton style={{ width: 140, height: 14, marginBottom: 8 }} />
        <Skeleton style={{ width: "100%", height: 48 }} />
      </div>
    );
  }

  const agentMap = new Map(agents.map(a => [a.id, a]));

  if (configs.length === 0) {
    return (
      <div style={{ marginTop: "var(--space-5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
          <Heart size={14} style={{ color: "var(--text-tertiary)" }} />
          <span style={{ fontSize: "var(--text-footnote)", fontWeight: "var(--weight-semibold)", color: "var(--text-secondary)" }}>
            Heartbeat Agents
          </span>
        </div>
        <div style={{
          borderRadius: "var(--radius-md)",
          background: "var(--material-regular)",
          border: "1px solid var(--separator)",
          padding: "var(--space-4)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
        }}>
          <span style={{ fontSize: "var(--text-caption1)", color: "var(--text-tertiary)" }}>
            No heartbeat agents configured. Enable heartbeat on an agent&apos;s detail page to schedule autonomous runs.
          </span>
          {agents.length > 0 && (
            <Link
              href={`/agents/${agents[0].id}`}
              className="focus-ring"
              style={{ fontSize: "var(--text-caption1)", color: "var(--system-blue)", textDecoration: "none", flexShrink: 0, fontWeight: "var(--weight-medium)" }}
            >
              Go to agent &rarr;
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: "var(--space-5)" }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        marginBottom: "var(--space-3)",
      }}>
        <Heart size={14} style={{ color: "var(--system-green)" }} />
        <span style={{
          fontSize: "var(--text-footnote)",
          fontWeight: "var(--weight-semibold)",
          color: "var(--text-primary)",
        }}>
          Heartbeat Agents ({configs.length})
        </span>
      </div>

      <div style={{
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        background: "var(--material-regular)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}>
        {configs.map((cfg, idx) => {
          const agent = agentMap.get(cfg.agentId);
          const lastRun = cfg.runs[0];
          const hasErrors = cfg.consecutiveErrors > 0;

          return (
            <div key={cfg.agentId}>
              {idx > 0 && (
                <div style={{ height: 1, background: "var(--separator)", marginLeft: "var(--space-4)", marginRight: "var(--space-4)" }} />
              )}
              <div
                style={{
                  padding: "var(--space-3) var(--space-4)",
                  background: hasErrors ? "rgba(255,69,58,0.04)" : undefined,
                  borderLeft: `3px solid ${hasErrors ? "var(--system-red)" : cfg.enabled ? "var(--system-green)" : "transparent"}`,
                }}
              >
                <div className="flex items-center" style={{ gap: "var(--space-3)", minHeight: 32 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: hasErrors ? "var(--system-red)" : "var(--system-green)",
                      flexShrink: 0,
                      animation: lastRun?.status === "running" ? "pulse-cyan 1.5s ease-in-out infinite" : undefined,
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center" style={{ gap: "var(--space-2)" }}>
                      <span style={{ fontSize: "var(--text-footnote)", fontWeight: "var(--weight-semibold)", color: "var(--text-primary)" }}>
                        {agent?.name ?? cfg.agentId}
                      </span>
                      <span style={{
                        fontSize: "var(--text-caption2)",
                        fontFamily: "var(--font-mono)",
                        color: "var(--text-tertiary)",
                      }}>
                        every {cfg.intervalMinutes < 60 ? `${cfg.intervalMinutes}m` : cfg.intervalMinutes < 1440 ? `${cfg.intervalMinutes / 60}h` : `${cfg.intervalMinutes / 1440}d`}
                      </span>
                    </div>
                    {hasErrors && cfg.lastError && (
                      <div style={{ fontSize: "var(--text-caption2)", color: "var(--system-red)", marginTop: 2 }}>
                        {cfg.consecutiveErrors}x errors: {cfg.lastError.length > 80 ? cfg.lastError.slice(0, 77) + "..." : cfg.lastError}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center flex-shrink-0" style={{ gap: "var(--space-3)" }}>
                    {agent && (
                      <Link
                        href={`/agents/${agent.id}`}
                        className="focus-ring"
                        style={{ fontSize: "var(--text-caption1)", color: "var(--system-blue)", textDecoration: "none" }}
                      >
                        Configure
                      </Link>
                    )}
                    <span style={{ fontSize: "var(--text-caption1)", color: "var(--text-tertiary)" }}>
                      Last: {cfg.lastBeatAt ? timeAgo(cfg.lastBeatAt) : "never"}
                    </span>
                  </div>
                </div>

                {/* Recent runs inline */}
                {cfg.runs.length > 0 && (
                  <div className="flex items-center" style={{ gap: "var(--space-2)", marginTop: "var(--space-2)", marginLeft: 20 }}>
                    {cfg.runs.map(run => (
                      <span
                        key={run.id}
                        title={`${run.trigger} — ${run.status} — ${run.tasksExecuted}/${run.tasksChecked} tasks`}
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 2,
                          background: HB_STATUS_COLORS[run.status] ?? "var(--text-tertiary)",
                        }}
                      />
                    ))}
                    <span style={{ fontSize: "var(--text-caption2)", color: "var(--text-quaternary)", marginLeft: 2 }}>
                      recent runs
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Component ─────────────────────────────────────────────────── */

export default function CronsPage() {
  const [crons, setCrons] = useState<CronJob[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [tab, setTab] = useState<Tab>("overview");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAgo, setUpdatedAgo] = useState("just now");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const pillsRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setError(null);

    const fetchCrons = fetch("/api/crons").then(async (r) => {
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load crons");
      }
      return r.json();
    });

    const fetchAgents = fetch("/api/agents").then((r) => {
      if (!r.ok) return [] as Agent[];
      return r.json().catch(() => [] as Agent[]);
    });

    fetchCrons
      .then(async (cronData) => {
        const a = await fetchAgents.catch(() => [] as Agent[]);
        // Backward compat: if response is a plain array, treat as crons-only
        if (Array.isArray(cronData)) {
          setCrons(cronData);
          setPipelines([]);
        } else {
          setCrons(cronData.crons);
          setPipelines(cronData.pipelines || []);
        }
        setAgents(a);
        setLastRefresh(new Date());
        setLoading(false);
        setRefreshing(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Unknown error");
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    const tick = () => setUpdatedAgo(timeAgo(lastRefresh.toISOString()));
    tick();
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, [lastRefresh]);

  /* Derived data */
  const agentMap = new Map(agents.map((a) => [a.id, a]));
  const statusOrder: Record<string, number> = { error: 0, idle: 1, ok: 2 };
  const filtered = crons
    .filter((c) => filter === "all" || c.status === filter)
    .sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9));
  const counts = {
    all: crons.length,
    ok: crons.filter((c) => c.status === "ok").length,
    error: crons.filter((c) => c.status === "error").length,
    idle: crons.filter((c) => c.status === "idle").length,
  };
  const errorCrons = crons.filter((c) => c.status === "error");

  function handlePillKeyDown(e: React.KeyboardEvent) {
    const pills = pillsRef.current;
    if (!pills) return;
    const buttons = Array.from(pills.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const current = buttons.findIndex((b) => b.getAttribute("aria-selected") === "true");
    let next = current;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); next = (current + 1) % buttons.length; }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); next = (current - 1 + buttons.length) % buttons.length; }
    if (next !== current) { buttons[next].focus(); buttons[next].click(); }
  }

  function copyError(cronId: string, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(cronId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  return (
    <div className="h-full flex flex-col overflow-hidden animate-fade-in" style={{ background: "var(--bg)" }}>
      {/* ── Sticky header ──────────────────────────────────────── */}
      <header
        className="sticky top-0 z-10 flex-shrink-0"
        style={{
          background: "var(--material-regular)",
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
          borderBottom: "1px solid var(--separator)",
        }}
      >
        <div className="flex items-center justify-between" style={{ padding: "var(--space-4) var(--space-6)" }}>
          <div>
            <h1 style={{ fontSize: "var(--text-title1)", fontWeight: "var(--weight-bold)", color: "var(--text-primary)", letterSpacing: "-0.5px", lineHeight: "var(--leading-tight)" }}>
              Scheduling
            </h1>
            {!loading && (
              <p style={{ fontSize: "var(--text-footnote)", color: "var(--text-secondary)", marginTop: "var(--space-1)" }}>
                {counts.all} job{counts.all !== 1 ? "s" : ""}
                {counts.error > 0 && (
                  <span style={{ color: "var(--system-red)" }}>{" \u00b7 "}{counts.error} error{counts.error !== 1 ? "s" : ""}</span>
                )}
                {" \u00b7 "}{counts.ok} ok
              </p>
            )}
          </div>
          <div className="flex items-center" style={{ gap: "var(--space-3)" }}>
            <span style={{ fontSize: "var(--text-caption1)", color: "var(--text-tertiary)" }}>Updated {updatedAgo}</span>
            <button
              onClick={refresh}
              className="focus-ring"
              aria-label="Refresh cron data"
              style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-sm)", border: "none", background: "transparent", color: "var(--text-tertiary)", cursor: "pointer", transition: "color 150ms var(--ease-smooth)" }}
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* ── Tab navigation ─────────────────────────────────── */}
        <div className="flex items-center" style={{ padding: "0 var(--space-6) var(--space-3)", gap: "var(--space-1)" }}>
          {TABS.map((t) => {
            const isActive = tab === t.key;
            const TabIcon = TAB_ICONS[t.key];
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="focus-ring"
                style={{
                  padding: "6px 16px",
                  fontSize: "var(--text-footnote)",
                  fontWeight: isActive ? "var(--weight-semibold)" : "var(--weight-medium)",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  transition: "all 200ms var(--ease-smooth)",
                  background: isActive ? "var(--accent-fill)" : "transparent",
                  color: isActive ? "var(--accent)" : "var(--text-secondary)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <TabIcon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* ── Scrollable content ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto" style={{ padding: "var(--space-4) var(--space-6) var(--space-6)" }}>
        {loading ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ background: "var(--material-regular)", border: "1px solid var(--separator)", borderRadius: "var(--radius-md)", padding: "var(--space-4)" }}>
                  <Skeleton style={{ width: 60, height: 10, marginBottom: 8 }} />
                  <Skeleton style={{ width: 80, height: 14 }} />
                </div>
              ))}
            </div>
            <div style={{ borderRadius: "var(--radius-md)", overflow: "hidden", background: "var(--material-regular)" }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center" style={{ padding: "var(--space-3) var(--space-4)", borderBottom: i < 5 ? "1px solid var(--separator)" : undefined, gap: "var(--space-3)" }}>
                  <Skeleton className="flex-shrink-0" style={{ width: 8, height: 8, borderRadius: "50%" }} />
                  <Skeleton style={{ width: 180, height: 14 }} />
                  <div className="ml-auto flex items-center" style={{ gap: "var(--space-3)" }}>
                    <Skeleton style={{ width: 48, height: 12 }} />
                    <Skeleton style={{ width: 64, height: 12 }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* ─── Crons load error banner ──────────────────── */}
            {error && (
              <div style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "var(--space-3)",
                background: "rgba(255,69,58,0.06)",
                borderLeft: "3px solid var(--system-red)",
                borderRadius: "var(--radius-sm)",
                padding: "var(--space-3) var(--space-4)",
                marginBottom: "var(--space-4)",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "var(--text-footnote)", fontWeight: "var(--weight-semibold)", color: "var(--system-red)", marginBottom: 2 }}>
                    Failed to load scheduled jobs
                  </div>
                  <div style={{ fontSize: "var(--text-caption1)", color: "var(--text-tertiary)", wordBreak: "break-word" }}>
                    {error}
                  </div>
                </div>
                <button
                  onClick={refresh}
                  className="btn-ghost focus-ring flex-shrink-0"
                  style={{ padding: "4px 10px", borderRadius: "var(--radius-sm)", fontSize: "var(--text-caption1)", fontWeight: "var(--weight-medium)", display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <RefreshCw size={12} />
                  Retry
                </button>
              </div>
            )}

            {/* ─── OVERVIEW TAB ─────────────────────────────── */}
            {tab === "overview" && (
              <>
                {/* Summary cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-3)", marginBottom: "var(--space-4)" }} className="summary-cards-grid">
                  <HealthCard ok={counts.ok} total={counts.all} />
                  <AttentionCard errors={errorCrons} />
                  <DeliveryCard crons={crons} />
                </div>

                {/* Categorized error banners */}
                <ErrorsBanners crons={crons} agentMap={agentMap} onCopy={copyError} copiedId={copiedId} />

                {/* Filter pills */}
                <div
                  ref={pillsRef}
                  role="tablist"
                  aria-label="Filter cron jobs by status"
                  onKeyDown={handlePillKeyDown}
                  className="flex items-center overflow-x-auto flex-shrink-0"
                  style={{ marginBottom: "var(--space-3)", gap: "var(--space-2)" }}
                >
                  {PILLS.map((pill) => {
                    const isActive = filter === pill.key;
                    return (
                      <button
                        key={pill.key}
                        role="tab"
                        aria-selected={isActive}
                        tabIndex={isActive ? 0 : -1}
                        onClick={() => setFilter(pill.key)}
                        className="focus-ring flex items-center flex-shrink-0"
                        style={{
                          borderRadius: 20,
                          padding: "6px 14px",
                          fontSize: "var(--text-footnote)",
                          fontWeight: "var(--weight-medium)",
                          border: "none",
                          cursor: "pointer",
                          gap: "var(--space-2)",
                          transition: "all 200ms var(--ease-smooth)",
                          ...(isActive
                            ? { background: "var(--accent-fill)", color: "var(--accent)", boxShadow: "0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent)" }
                            : { background: "var(--fill-secondary)", color: "var(--text-primary)" }),
                        }}
                      >
                        <span className={`flex-shrink-0 rounded-full ${pill.key === "error" && counts.error > 0 ? "animate-error-pulse" : ""}`} style={{ width: 6, height: 6, background: pill.dotColor }} />
                        <span>{pill.label}</span>
                        <span style={{ fontWeight: "var(--weight-semibold)", color: isActive ? "var(--accent)" : "var(--text-secondary)" }}>{counts[pill.key]}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Cron list */}
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center" style={{ height: 200, color: "var(--text-secondary)", gap: "var(--space-2)" }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-tertiary)", marginBottom: "var(--space-2)" }}>
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span style={{ fontSize: "var(--text-subheadline)", fontWeight: "var(--weight-medium)" }}>
                      {crons.length === 0 ? "No scheduled tasks yet" : "No crons match this filter"}
                    </span>
                    <span style={{ fontSize: "var(--text-footnote)", color: "var(--text-tertiary)", textAlign: "center", maxWidth: 360, lineHeight: "var(--leading-relaxed)" }}>
                      {crons.length === 0 ? "Cron jobs are automated tasks that run on a schedule. They will appear here once your agents have scheduled tasks configured." : "Try selecting a different status filter"}
                    </span>
                  </div>
                ) : (
                  <div style={{ borderRadius: "var(--radius-md)", overflow: "hidden", background: "var(--material-regular)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
                    {filtered.map((cron, idx) => {
                      const agent = cron.agentId ? agentMap.get(cron.agentId) : null;
                      const isExpanded = expanded === cron.id;
                      const isError = cron.status === "error";
                      const isOverdue = cron.nextRun && nextRunLabel(cron.nextRun) === "overdue";

                      return (
                        <div key={cron.id}>
                          {idx > 0 && (
                            <div style={{ height: 1, background: "var(--separator)", marginLeft: "var(--space-4)", marginRight: "var(--space-4)" }} />
                          )}

                          {/* Collapsed row */}
                          <div
                            role="button"
                            tabIndex={0}
                            aria-expanded={isExpanded}
                            aria-label={`${cron.name}, status ${cron.status}${agent ? `, agent ${agent.name}` : ""}`}
                            onClick={() => setExpanded(isExpanded ? null : cron.id)}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded(isExpanded ? null : cron.id); } }}
                            className="flex items-center cursor-pointer hover-bg focus-ring"
                            style={{
                              minHeight: 48,
                              padding: "0 var(--space-4)",
                              background: isError ? "rgba(255,69,58,0.06)" : undefined,
                              borderLeft: `3px solid ${isError ? "var(--system-red)" : cron.status === "ok" ? "var(--system-green)" : "transparent"}`,
                            }}
                          >
                            <span className={`flex-shrink-0 rounded-full ${isError ? "animate-error-pulse" : ""}`} style={{ width: 8, height: 8, background: STATUS_DOT[cron.status] ?? "var(--text-tertiary)" }} />
                            <div className="ml-3 min-w-0 flex-1" style={{ display: "flex", flexDirection: "column" }}>
                              <span className="truncate" style={{ fontSize: "var(--text-footnote)", fontWeight: "var(--weight-semibold)", color: "var(--text-primary)" }}>{cron.name}</span>
                              {agent && (
                                <Link href={`/chat/${agent.id}`} onClick={(e) => e.stopPropagation()} className="md:hidden focus-ring" aria-label={`Chat with ${agent.name}`} style={{ fontSize: "var(--text-caption1)", color: "var(--system-blue)", textDecoration: "none", lineHeight: "var(--leading-snug)" }}>
                                  {agent.name}
                                </Link>
                              )}
                            </div>
                            <div className="ml-auto flex items-center flex-shrink-0" style={{ gap: "var(--space-3)" }}>
                              {agent ? (
                                <Link href={`/chat/${agent.id}`} onClick={(e) => e.stopPropagation()} className="hidden md:inline focus-ring" aria-label={`Chat with ${agent.name}`} style={{ fontSize: "var(--text-caption1)", color: "var(--system-blue)", textDecoration: "none" }}>
                                  {agent.name}
                                </Link>
                              ) : (
                                <span className="hidden md:inline" style={{ fontSize: "var(--text-caption1)", color: "var(--text-tertiary)" }}>{"\u2014"}</span>
                              )}
                              <span className="hidden md:inline" style={{ fontSize: "var(--text-caption1)", color: "var(--text-tertiary)" }}>
                                {cron.scheduleDescription || cron.schedule}
                              </span>
                              <span aria-hidden="true" style={{ fontSize: "var(--text-footnote)", color: "var(--text-tertiary)", transition: "transform 200ms var(--ease-smooth)", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block" }}>
                                &#8250;
                              </span>
                            </div>
                          </div>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <div className="animate-slide-down" style={{ padding: "0 var(--space-4) var(--space-4) var(--space-4)", marginLeft: 3 }}>
                              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "var(--space-1) var(--space-4)", marginTop: "var(--space-2)", marginBottom: "var(--space-3)" }}>
                                {/* Description */}
                                {cron.description && (
                                  <>
                                    <span style={{ fontSize: "var(--text-caption1)", color: "var(--text-tertiary)" }}>Description</span>
                                    <span style={{ fontSize: "var(--text-caption1)", color: "var(--text-secondary)" }}>{cron.description}</span>
                                  </>
                                )}

                                {/* Last run */}
                                <span style={{ fontSize: "var(--text-caption1)", color: "var(--text-tertiary)" }}>Last run</span>
                                <span style={{ fontSize: "var(--text-caption1)", color: "var(--text-secondary)" }}>{timeAgo(cron.lastRun)}</span>

                                {/* Next run */}
                                <span style={{ fontSize: "var(--text-caption1)", color: "var(--text-tertiary)" }}>Next run</span>
                                <span style={{ fontSize: "var(--text-caption1)", color: isOverdue ? "var(--system-orange)" : "var(--text-secondary)", fontWeight: isOverdue ? "var(--weight-semibold)" : undefined }}>
                                  {nextRunLabel(cron.nextRun)}
                                </span>

                                {/* Duration */}
                                {cron.lastDurationMs != null && (
                                  <>
                                    <span style={{ fontSize: "var(--text-caption1)", color: "var(--text-tertiary)" }}>Duration</span>
                                    <span style={{ fontSize: "var(--text-caption1)", color: "var(--text-secondary)" }}>{formatDuration(cron.lastDurationMs)}</span>
                                  </>
                                )}

                                {/* Status */}
                                <span style={{ fontSize: "var(--text-caption1)", color: "var(--text-tertiary)" }}>Status</span>
                                <span style={{ fontSize: "var(--text-caption1)", color: cron.status === "error" ? "var(--system-red)" : cron.status === "ok" ? "var(--system-green)" : "var(--text-secondary)", fontWeight: "var(--weight-medium)", textTransform: "capitalize" }}>
                                  {cron.status}
                                </span>

                                {/* Schedule */}
                                <span style={{ fontSize: "var(--text-caption1)", color: "var(--text-tertiary)" }}>Schedule</span>
                                <div>
                                  {cron.scheduleDescription && (
                                    <div style={{ fontSize: "var(--text-caption1)", color: "var(--text-secondary)" }}>{cron.scheduleDescription}</div>
                                  )}
                                  <div className="font-mono" style={{ fontSize: "var(--text-caption2)", color: "var(--text-tertiary)", marginTop: cron.scheduleDescription ? 2 : 0 }}>
                                    {cron.schedule}
                                    {cron.timezone && <span style={{ marginLeft: 8 }}>({cron.timezone})</span>}
                                  </div>
                                </div>

                                {/* Delivery */}
                                <span style={{ fontSize: "var(--text-caption1)", color: "var(--text-tertiary)" }}>Delivery</span>
                                <DeliveryBadge cron={cron} />

                                {/* Consecutive errors */}
                                {cron.consecutiveErrors > 0 && (
                                  <>
                                    <span style={{ fontSize: "var(--text-caption1)", color: "var(--text-tertiary)" }}>Errors</span>
                                    <span style={{ fontSize: "var(--text-caption1)", color: "var(--system-orange)", fontWeight: "var(--weight-medium)" }}>
                                      {cron.consecutiveErrors} consecutive
                                    </span>
                                  </>
                                )}
                              </div>

                              {/* Error box */}
                              {cron.lastError && (
                                <div style={{ borderRadius: "var(--radius-sm)", background: "var(--code-bg)", border: "1px solid var(--code-border)", padding: "var(--space-3)", marginBottom: "var(--space-3)" }}>
                                  <div className="flex items-start justify-between" style={{ gap: "var(--space-2)" }}>
                                    <pre className="font-mono" style={{ fontSize: "var(--text-caption1)", color: "var(--system-red)", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0, flex: 1, lineHeight: "var(--leading-relaxed)" }}>
                                      {cron.lastError}
                                    </pre>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); copyError(cron.id, cron.lastError!); }}
                                      className="btn-ghost focus-ring flex-shrink-0"
                                      aria-label="Copy error text"
                                      style={{ padding: "4px 10px", borderRadius: "var(--radius-sm)", fontSize: "var(--text-caption2)", fontWeight: "var(--weight-medium)", display: "inline-flex", alignItems: "center", gap: 3 }}
                                    >
                                      {copiedId === cron.id ? <Check size={12} /> : <Copy size={12} />}
                                      {copiedId === cron.id ? "Copied" : "Copy"}
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Recent runs */}
                              <RecentRuns jobId={cron.id} />

                              {/* Actions */}
                              <div className="flex items-center" style={{ gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
                                {agent && (
                                  <Link
                                    href={`/chat/${agent.id}`}
                                    className="btn-ghost focus-ring"
                                    aria-label={`Chat with ${agent.name}`}
                                    style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)", padding: "6px 12px", borderRadius: "var(--radius-sm)", fontSize: "var(--text-caption1)", fontWeight: "var(--weight-medium)", textDecoration: "none", color: "var(--system-blue)" }}
                                  >
                                    Chat with {agent.name}
                                    <span aria-hidden="true" style={{ fontSize: "var(--text-caption1)" }}>{"\u2192"}</span>
                                  </Link>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Heartbeat agents */}
                <HeartbeatAgentsSection agents={agents} />
              </>
            )}

            {/* ─── SCHEDULE TAB ──────────────────────────────── */}
            {tab === "schedule" && <WeeklySchedule crons={crons} />}

            {/* ─── PIPELINES TAB ─────────────────────────────── */}
            {tab === "pipelines" && <PipelineGraph crons={crons} agents={agents} pipelines={pipelines} />}
          </>
        )}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .summary-cards-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
