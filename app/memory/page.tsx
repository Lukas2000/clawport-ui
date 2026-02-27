"use client";
import { useEffect, useState } from "react";
import type { MemoryFile } from "@/lib/types";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

function simpleMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^#### (.+)$/gm, '<h4 class="text-sm font-semibold text-[#f5c518] mt-4 mb-1">$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-[#f5c518] mt-5 mb-1.5">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-[#f5c518] mt-6 mb-2 border-b border-[#262632] pb-1">$2</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-white mt-4 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="bg-[#1a1a24] text-[#f5c518] px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-[#c8c8d4] text-sm leading-relaxed list-disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 text-[#c8c8d4] text-sm leading-relaxed list-decimal">$2</li>')
    .replace(/\n{2,}/g, '</p><p class="mb-3">')
    .replace(/\n/g, "<br/>");
}

export default function MemoryPage() {
  const [files, setFiles] = useState<MemoryFile[]>([]);
  const [selected, setSelected] = useState<MemoryFile | null>(null);
  const [loading, setLoading] = useState(true);

  function refresh() {
    fetch("/api/memory")
      .then((r) => r.json())
      .then((data: MemoryFile[]) => {
        setFiles(data);
        if (data.length > 0 && !selected) setSelected(data[0]);
        setLoading(false);
      });
  }

  useEffect(() => {
    refresh();
  }, []);

  const isJSON = selected?.label.includes("JSON") || selected?.path.endsWith(".json");

  let renderedContent: React.ReactNode = null;
  if (selected) {
    if (isJSON) {
      try {
        const pretty = JSON.stringify(JSON.parse(selected.content), null, 2);
        renderedContent = (
          <pre className="font-mono text-xs text-green-400 whitespace-pre-wrap leading-relaxed">{pretty}</pre>
        );
      } catch {
        renderedContent = <pre className="font-mono text-xs text-red-400 whitespace-pre-wrap">{selected.content}</pre>;
      }
    } else {
      renderedContent = (
        <div
          className="text-[#c8c8d4] text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: `<p class="mb-3">${simpleMarkdown(selected.content)}</p>` }}
        />
      );
    }
  }

  return (
    <div className="flex h-full bg-[#0a0a0f]">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-[#262632] bg-[#0d0d14] flex flex-col">
        <div className="p-4 border-b border-[#262632] flex items-center justify-between">
          <span className="font-bold text-white text-sm">🧠 Memory</span>
          <button onClick={refresh} className="text-xs text-[#86869b] hover:text-white transition-colors">↻</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-xs text-[#86869b] animate-pulse">Loading...</div>
          ) : (
            files.map((file) => (
              <button
                key={file.path}
                onClick={() => setSelected(file)}
                className={`w-full text-left px-4 py-3 border-b border-[#262632] hover:bg-[#13131a] transition-colors ${
                  selected?.path === file.path ? "border-l-2 border-l-[#f5c518] bg-[#13131a]" : ""
                }`}
              >
                <div className="text-xs font-medium text-[#f5f5f7] truncate">{file.label}</div>
                <div className="text-xs text-[#86869b] mt-0.5">{timeAgo(file.lastModified)}</div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selected ? (
          <>
            <div className="border-b border-[#262632] bg-[#0d0d14] px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div>
                <div className="font-semibold text-white">{selected.label}</div>
                <div className="text-xs text-[#86869b] mt-0.5 font-mono">{selected.path}</div>
                <div className="text-xs text-[#86869b] mt-0.5">{selected.content.split("\n").length} lines · {selected.content.length} characters</div>
              </div>
              <div className="text-xs text-[#86869b]">Modified {timeAgo(selected.lastModified)}</div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className={`${isJSON ? "bg-[#0d0d14] rounded-xl p-5 border border-[#262632]" : ""}`}>
                {renderedContent}
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-[#86869b] text-sm">
            Select a file from the sidebar
          </div>
        )}
      </div>
    </div>
  );
}
