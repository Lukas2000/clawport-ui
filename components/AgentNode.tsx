"use client";
import { Handle, Position } from "@xyflow/react";
import type { Agent } from "@/lib/types";

interface AgentNodeProps {
  data: Agent & Record<string, unknown>;
}

export function AgentNode({ data }: AgentNodeProps) {
  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: data.color, border: "none", width: 8, height: 8 }}
      />
      <div
        style={{ borderLeft: `3px solid ${data.color}` }}
        className="bg-[#13131a] border border-[#262632] rounded-lg px-3 py-2.5 w-44 shadow-lg cursor-pointer hover:border-[#3a3a4a] transition-all select-none"
      >
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-base leading-none">{data.emoji}</span>
          <span className="font-semibold text-sm text-white truncate">{data.name}</span>
          {data.voiceId && (
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" title="Has voice" />
          )}
        </div>
        <div className="text-[#86869b] text-xs leading-tight truncate">{data.title}</div>
        {data.crons && data.crons.length > 0 && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="text-xs bg-[#1e1e2a] text-[#86869b] px-1.5 py-0.5 rounded-full">
              {data.crons.length} cron{data.crons.length > 1 ? "s" : ""}
            </span>
            {data.crons.some((c) => c.status === "error") && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="Cron error" />
            )}
            {!data.crons.some((c) => c.status === "error") && data.crons.some((c) => c.status === "ok") && (
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="All crons OK" />
            )}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: data.color, border: "none", width: 8, height: 8 }}
      />
    </>
  );
}

export const nodeTypes = { agentNode: AgentNode };
