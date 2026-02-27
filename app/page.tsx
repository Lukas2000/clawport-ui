"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { Agent, CronJob } from "@/lib/types";

const ManorMap = dynamic(() => import("@/components/ManorMap").then((m) => ({ default: m.ManorMap })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-[#f5c518] text-sm animate-pulse">Scanning the manor...</div>
    </div>
  ),
});

function StatusDot({ status }: { status: CronJob["status"] }) {
  const colors = { ok: "bg-green-500", error: "bg-red-500", idle: "bg-[#86869b]" };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status]}`} />;
}

export default function ManorPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [crons, setCrons] = useState<CronJob[]>([]);
  const [selected, setSelected] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetch("/api/agents").then((r) => r.json()), fetch("/api/crons").then((r) => r.json())])
      .then(([a, c]) => {
        setAgents(a);
        setCrons(c);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const agentCrons = selected ? crons.filter((c) => c.agentId === selected.id) : [];

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-400 text-sm">
        Error loading manor: {error}
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Map */}
      <div className="flex-1 h-full">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-[#f5c518] text-sm animate-pulse">Scanning the manor...</div>
          </div>
        ) : (
          <ManorMap agents={agents} crons={crons} onNodeClick={setSelected} />
        )}
      </div>

      {/* Agent detail panel */}
      {selected && (
        <div className="w-80 flex-shrink-0 border-l border-[#262632] bg-[#0d0d14] flex flex-col overflow-y-auto">
          {/* Header */}
          <div className="p-4 border-b border-[#262632] flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-1 h-10 rounded-full flex-shrink-0"
                style={{ backgroundColor: selected.color }}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{selected.emoji}</span>
                  <span className="font-bold text-[#f5c518]">{selected.name}</span>
                </div>
                <div className="text-[#86869b] text-xs">{selected.title}</div>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-[#86869b] hover:text-white text-lg leading-none">
              ×
            </button>
          </div>

          {/* Description */}
          <div className="p-4 border-b border-[#262632]">
            <p className="text-sm text-[#c8c8d4] leading-relaxed">{selected.description}</p>
          </div>

          {/* Tools */}
          <div className="p-4 border-b border-[#262632]">
            <div className="text-xs font-semibold text-[#86869b] uppercase tracking-wider mb-2">Tools</div>
            <div className="flex flex-wrap gap-1.5">
              {selected.tools.map((t) => (
                <span key={t} className="text-xs bg-[#1a1a24] border border-[#262632] text-[#c8c8d4] px-2 py-0.5 rounded-full">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Crons */}
          {agentCrons.length > 0 && (
            <div className="p-4 border-b border-[#262632]">
              <div className="text-xs font-semibold text-[#86869b] uppercase tracking-wider mb-2">
                Crons ({agentCrons.length})
              </div>
              <div className="space-y-1.5">
                {agentCrons.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 text-xs">
                    <StatusDot status={c.status} />
                    <span className="font-mono text-[#c8c8d4] truncate flex-1">{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="p-4 mt-auto space-y-2">
            <button
              onClick={() => router.push(`/chat/${selected.id}`)}
              className="w-full bg-[#f5c518] text-black font-semibold text-sm py-2.5 rounded-lg hover:bg-[#f5c518]/90 transition-colors"
            >
              💬 Open Chat
            </button>
            <button
              onClick={() => router.push(`/agents/${selected.id}`)}
              className="w-full bg-[#1a1a24] border border-[#262632] text-[#f5f5f7] text-sm py-2.5 rounded-lg hover:bg-[#222230] transition-colors"
            >
              📄 View Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
