"use client"

import { useCallback, useEffect, useState } from "react"
import { renderMarkdown } from "@/lib/sanitize"

interface DocNode {
  name: string
  relativePath: string
  isDir: boolean
  tags: string[]
  children?: DocNode[]
}

function BackArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="10 3 5 8 10 13" />
    </svg>
  )
}

export default function DocsPage() {
  const [tree, setTree] = useState<DocNode[]>([])
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [content, setContent] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [mobileShowContent, setMobileShowContent] = useState(false)
  const [loading, setLoading] = useState(true)
  const [emptyWorkspace, setEmptyWorkspace] = useState(false)

  useEffect(() => {
    fetch("/api/docs-browser")
      .then((r) => r.json())
      .then((d: unknown) => {
        const nodes = Array.isArray(d) ? d as DocNode[] : []
        setTree(nodes)
        setEmptyWorkspace(nodes.length === 0)
      })
      .catch(() => setEmptyWorkspace(true))
      .finally(() => setLoading(false))
  }, [])

  const selectFile = useCallback((path: string) => {
    setSelectedPath(path)
    setMobileShowContent(true)
    setContent(null)
    fetch(`/api/docs-browser/${path}`)
      .then((r) => r.json())
      .then((d) => setContent(d.content ?? null))
      .catch(() => setContent("Failed to load document."))
  }, [])

  // Collect all unique tags
  const allTags = new Set<string>()
  function collectTags(nodes: DocNode[]) {
    for (const n of nodes) {
      for (const t of n.tags) allTags.add(t)
      if (n.children) collectTags(n.children)
    }
  }
  collectTags(tree)

  // Filter tree
  function filterNodes(nodes: DocNode[]): DocNode[] {
    return nodes
      .map((n) => {
        if (n.isDir) {
          const children = filterNodes(n.children ?? [])
          if (children.length === 0) return null
          return { ...n, children }
        }
        const matchesSearch = !search || n.name.toLowerCase().includes(search.toLowerCase())
        const matchesTag = !tagFilter || n.tags.includes(tagFilter)
        return matchesSearch && matchesTag ? n : null
      })
      .filter(Boolean) as DocNode[]
  }

  const filtered = filterNodes(tree)

  return (
    <div className="flex h-full animate-fade-in" style={{ background: "var(--bg)" }}>
      {/* File list sidebar */}
      <aside
        className={`flex-shrink-0 flex flex-col ${mobileShowContent ? "hidden md:flex" : "flex"}`}
        style={{
          width: "100%",
          maxWidth: "100%",
          background: "var(--material-regular)",
          backdropFilter: "var(--sidebar-backdrop)",
          WebkitBackdropFilter: "var(--sidebar-backdrop)",
          borderRight: "1px solid var(--separator)",
        }}
      >
        <style>{`@media (min-width: 768px) { aside { width: 280px !important; min-width: 280px !important; } }`}</style>

        <div
          className="flex items-center justify-between flex-shrink-0"
          style={{ padding: "var(--space-3) var(--space-4)", borderBottom: "1px solid var(--separator)" }}
        >
          <span style={{ fontSize: "var(--text-body)", fontWeight: "var(--weight-semibold)", color: "var(--text-primary)" }}>
            Docs
          </span>
        </div>

        {/* Search */}
        <div style={{ padding: "var(--space-2) var(--space-3)" }}>
          <input
            type="search"
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="apple-input focus-ring"
            style={{ width: "100%", height: 32, fontSize: "var(--text-footnote)", padding: "0 var(--space-3)", borderRadius: "var(--radius-sm)" }}
          />
        </div>

        {/* Tag filters */}
        {allTags.size > 0 && (
          <div style={{ padding: "0 var(--space-3) var(--space-2)", display: "flex", flexWrap: "wrap", gap: "4px" }}>
            <button
              onClick={() => setTagFilter(null)}
              style={{
                fontSize: "10px",
                padding: "2px 8px",
                borderRadius: "10px",
                border: "none",
                background: !tagFilter ? "var(--accent-fill)" : "var(--fill-quaternary)",
                color: !tagFilter ? "var(--accent)" : "var(--text-tertiary)",
                cursor: "pointer",
              }}
            >
              All
            </button>
            {Array.from(allTags).sort().map((tag) => (
              <button
                key={tag}
                onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                style={{
                  fontSize: "10px",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  border: "none",
                  background: tagFilter === tag ? "var(--accent-fill)" : "var(--fill-quaternary)",
                  color: tagFilter === tag ? "var(--accent)" : "var(--text-tertiary)",
                  cursor: "pointer",
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* File tree */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div style={{ padding: "var(--space-4)", color: "var(--text-tertiary)", fontSize: "var(--text-footnote)" }}>
              Loading...
            </div>
          ) : emptyWorkspace ? (
            <div style={{ padding: "var(--space-6)", textAlign: "center", color: "var(--text-tertiary)", fontSize: "var(--text-footnote)" }}>
              No docs/ directory found in workspace.
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "var(--space-4)", textAlign: "center", color: "var(--text-tertiary)", fontSize: "var(--text-footnote)" }}>
              No files match.
            </div>
          ) : (
            <FileTree nodes={filtered} selectedPath={selectedPath} onSelect={selectFile} depth={0} />
          )}
        </div>
      </aside>

      {/* Content view */}
      <main className={`flex-1 flex flex-col overflow-hidden ${!mobileShowContent ? "hidden md:flex" : "flex"}`} style={{ background: "var(--bg)" }}>
        <div className="flex-shrink-0" style={{ padding: "var(--space-3) var(--space-6)", borderBottom: "1px solid var(--separator)", background: "var(--material-regular)" }}>
          <button
            onClick={() => setMobileShowContent(false)}
            className="md:hidden btn-ghost focus-ring"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-1)",
              padding: "4px 8px",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--text-footnote)",
              color: "var(--system-blue)",
              marginBottom: "var(--space-2)",
              marginLeft: "-8px",
            }}
          >
            <BackArrow />
            Files
          </button>
          <div style={{ fontSize: "var(--text-body)", fontWeight: "var(--weight-semibold)", color: "var(--text-primary)" }}>
            {selectedPath ?? "Select a document"}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ padding: "var(--space-6) var(--space-10)" }}>
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            {content === null && !selectedPath && (
              <div style={{ color: "var(--text-tertiary)", fontSize: "var(--text-body)", textAlign: "center", paddingTop: "var(--space-10)" }}>
                Select a document from the sidebar to view it here.
              </div>
            )}
            {content === null && selectedPath && (
              <div style={{ color: "var(--text-tertiary)" }}>Loading...</div>
            )}
            {content !== null && (
              <div
                style={{ fontSize: "var(--text-body)", lineHeight: 1.65, color: "var(--text-secondary)" }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function FileTree({ nodes, selectedPath, onSelect, depth }: { nodes: DocNode[]; selectedPath: string | null; onSelect: (path: string) => void; depth: number }) {
  return (
    <div>
      {nodes.map((node) => (
        <FileTreeNode key={node.relativePath} node={node} selectedPath={selectedPath} onSelect={onSelect} depth={depth} />
      ))}
    </div>
  )
}

function FileTreeNode({ node, selectedPath, onSelect, depth }: { node: DocNode; selectedPath: string | null; onSelect: (path: string) => void; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2)
  const isSelected = selectedPath === node.relativePath

  if (node.isDir) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-1)",
            width: "100%",
            padding: `var(--space-1) var(--space-3)`,
            paddingLeft: `${12 + depth * 16}px`,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: "var(--text-caption1)",
            fontWeight: 600,
            color: "var(--text-secondary)",
            textAlign: "left",
          }}
        >
          <span style={{ fontSize: "10px", width: "12px", flexShrink: 0 }}>
            {expanded ? "\u25BC" : "\u25B6"}
          </span>
          {node.name}
        </button>
        {expanded && node.children && (
          <FileTree nodes={node.children} selectedPath={selectedPath} onSelect={onSelect} depth={depth + 1} />
        )}
      </div>
    )
  }

  return (
    <button
      onClick={() => onSelect(node.relativePath)}
      style={{
        display: "block",
        width: "100%",
        padding: `var(--space-1) var(--space-3)`,
        paddingLeft: `${24 + depth * 16}px`,
        border: "none",
        background: isSelected ? "var(--fill-secondary)" : "transparent",
        cursor: "pointer",
        fontSize: "var(--text-caption1)",
        color: isSelected ? "var(--accent)" : "var(--text-primary)",
        fontWeight: isSelected ? 600 : 400,
        textAlign: "left",
        borderLeft: isSelected ? "3px solid var(--accent)" : "3px solid transparent",
      }}
    >
      {node.name}
    </button>
  )
}
