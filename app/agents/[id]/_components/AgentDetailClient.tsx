"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Trash2, Upload, X } from "lucide-react"
import type { Agent, CronJob } from "@/lib/types"
import { AgentAvatar } from "@/components/AgentAvatar"
import { useSettings } from "@/app/settings-provider"
import { ConfigFileEditor, type SaveResult } from "@/components/agents/ConfigFileEditor"
import { ConfigFileSidebar } from "@/components/agents/ConfigFileSidebar"
import { InlineEditField } from "@/components/agents/InlineEditField"
import { SaveTemplateModal } from "@/components/agents/SaveTemplateModal"

function resizeImage(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()
    reader.onload = () => {
      img.onload = () => {
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1)
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement("canvas")
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext("2d")!
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL("image/jpeg", 0.85))
      }
      img.onerror = reject
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const TOOL_ICONS: Record<string, string> = {
  web_search: "\uD83D\uDD0D",
  read: "\uD83D\uDCC1",
  write: "\u270F\uFE0F",
  exec: "\uD83D\uDCBB",
  web_fetch: "\uD83C\uDF10",
  message: "\uD83D\uDD14",
  tts: "\uD83D\uDCAC",
  edit: "\u2702\uFE0F",
  sessions_spawn: "\uD83D\uDD04",
  memory_search: "\uD83E\udDE0",
}

function StatusDot({ status }: { status: CronJob["status"] }) {
  return (
    <span
      className={status === "error" ? "animate-error-pulse" : ""}
      style={{
        display: "inline-block",
        width: 6,
        height: 6,
        borderRadius: "50%",
        flexShrink: 0,
        background:
          status === "ok"
            ? "var(--system-green)"
            : status === "error"
              ? "var(--system-red)"
              : "var(--text-tertiary)",
      }}
    />
  )
}

function SoulViewer({ content }: { content: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [content])

  return (
    <div
      style={{
        background: "var(--bg)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <pre
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-caption1)",
          whiteSpace: "pre-wrap",
          lineHeight: 1.6,
          padding: "var(--space-4)",
          color: "var(--text-secondary)",
          margin: 0,
          maxHeight: 400,
          overflowY: "auto",
        }}
      >
        {content}
      </pre>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "var(--space-2)",
          padding: "var(--space-2) var(--space-3)",
          borderTop: "1px solid var(--separator)",
        }}
      >
        <button
          onClick={handleCopy}
          className="focus-ring"
          aria-label="Copy SOUL.md content"
          style={{
            background: "var(--fill-tertiary)",
            color: "var(--text-secondary)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            padding: "var(--space-1) var(--space-3)",
            fontSize: "var(--text-caption2)",
            fontWeight: "var(--weight-medium)",
            cursor: "pointer",
            transition: "all 150ms var(--ease-spring)",
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  )
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [text])

  return (
    <button
      onClick={handleCopy}
      className="focus-ring"
      aria-label={label}
      style={{
        background: "var(--fill-tertiary)",
        color: "var(--text-secondary)",
        border: "none",
        borderRadius: "var(--radius-sm)",
        padding: "var(--space-1) var(--space-2)",
        fontSize: "var(--text-caption2)",
        fontWeight: "var(--weight-medium)",
        cursor: "pointer",
        transition: "all 150ms var(--ease-spring)",
        flexShrink: 0,
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  )
}

function Card({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={className}
      style={{
        background: "var(--material-regular)",
        border: "1px solid var(--separator)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-5)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {children}
    </div>
  )
}

interface AgentDetailClientProps {
  agent: Agent
  allAgents: Agent[]
  crons: CronJob[]
}

/**
 * Extract role/title from SOUL.md content. Handles multiple heading formats:
 *   "# Name, Title"                        → "Title"
 *   "# Name — Title"                       → "Title"
 *   "# Engineering Manager Agent Personality" → "Engineering Manager"
 * Falls back to "You are a **Title**" in body text.
 */
function parseSoulTitle(content: string): string | null {
  const match = content.match(/^#\s+(.+)/m)
  if (!match) return null
  let heading = match[1].trim().replace(/^SOUL\.md\s*[—–\-:]\s*/i, '')
  if (/^who\s+you\s+are/i.test(heading)) return null

  // "Name — Title" or "Name, Title"
  const dashParts = heading.split(/\s*[—–]\s*/)
  if (dashParts.length > 1) return dashParts.slice(1).join(' — ').trim()
  const commaParts = dashParts[0].split(/,\s*/)
  if (commaParts.length > 1) return commaParts.slice(1).join(', ').trim()

  // "Engineering Manager Agent Personality" → "Engineering Manager"
  const stripped = heading.replace(/\s+agent\s+personality$/i, '').trim()
  if (stripped && stripped !== heading) return stripped

  // Body: "You are a **Finance Manager**"
  const bodyMatch = content.match(/you are (?:a |an |the )?\*\*(.+?)\*\*/i)
  if (bodyMatch) return bodyMatch[1].trim()

  return null
}

/** Extract first paragraph description from SOUL.md body (after the heading). */
function parseSoulDescription(content: string): string | null {
  // Find first non-heading, non-empty paragraph
  const lines = content.split('\n')
  let pastHeading = false
  for (const line of lines) {
    const trimmed = line.trim()
    if (!pastHeading) {
      if (trimmed.startsWith('#')) { pastHeading = true; continue }
      continue
    }
    if (!trimmed) continue
    if (trimmed.startsWith('#') || trimmed.startsWith('-') || trimmed.startsWith('*')) break
    // Strip bold markers for cleaner description
    const clean = trimmed.replace(/\*\*(.+?)\*\*/g, '$1')
    if (clean.length > 20 && clean.length < 300) return clean
    break
  }
  return null
}

export function AgentDetailClient({ agent: initialAgent, allAgents, crons }: AgentDetailClientProps) {
  const router = useRouter()
  const { settings, setAgentOverride } = useSettings()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<'profile' | 'config'>('profile')
  const [activeConfigFile, setActiveConfigFile] = useState('SOUL.md')
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [agent, setAgent] = useState(initialAgent)

  // Sync local state when server props change (e.g. after router.refresh()).
  // Key on specific fields to avoid infinite loops from object reference changes.
  useEffect(() => {
    setAgent(initialAgent)
  }, [initialAgent.id, initialAgent.title, initialAgent.name, initialAgent.description, initialAgent.soul])

  async function handleImageUpload(file: File) {
    try {
      const dataUrl = await resizeImage(file, 200)
      setAgentOverride(agent.id, { profileImage: dataUrl })
    } catch {
      // silently fail
    }
  }

  async function patchAgent(updates: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        const updated = await res.json()
        setAgent((prev) => ({ ...prev, ...updated }))
      }
    } catch {
      // silently fail
    }
  }

  // When SOUL.md is saved, extract metadata and update the agent record
  async function handleSoulSave(content: string): Promise<SaveResult> {
    const newTitle = parseSoulTitle(content)
    const newDesc = parseSoulDescription(content)
    const updates: Record<string, unknown> = {}
    if (newTitle && newTitle !== agent.title) updates.title = newTitle
    if (newDesc && newDesc !== agent.description) updates.description = newDesc

    // Immediately update local soul content so Profile tab reflects the change
    setAgent((prev) => ({ ...prev, soul: content }))

    if (Object.keys(updates).length > 0) {
      await patchAgent(updates)
      const fields = Object.keys(updates).join(', ')
      return { ok: true, message: `SOUL.md saved, updated ${fields}` }
    }
    return { ok: true, message: 'SOUL.md saved' }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/agents/${agent.id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/')
      }
    } catch {
      // silently fail
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const parent = agent.reportsTo
    ? allAgents.find((a) => a.id === agent.reportsTo)
    : null
  const children = agent.directReports
    .map((cid) => allAgents.find((a) => a.id === cid))
    .filter(Boolean) as Agent[]

  return (
    <div className="h-full overflow-y-auto" style={{ background: "var(--bg)" }}>
      {/* ── Sticky header ── */}
      <div
        className="sticky top-0 z-10"
        style={{
          background: "var(--material-regular)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderBottom: "1px solid var(--separator)",
        }}
      >
        {/* Color strip */}
        <div style={{ height: 3, background: agent.color }} />

        <div
          className="flex items-center justify-between"
          style={{ padding: "var(--space-3) var(--space-6)" }}
        >
          <Link
            href="/"
            className="focus-ring"
            style={{
              color: "var(--system-blue)",
              fontSize: "var(--text-body)",
              fontWeight: "var(--weight-medium)",
              textDecoration: "none",
            }}
          >
            &larr; Back to Map
          </Link>
          <button
            onClick={() => router.push(`/chat/${agent.id}`)}
            className="focus-ring"
            aria-label={`Open chat with ${agent.name}`}
            style={{
              background: "var(--accent)",
              color: "var(--accent-contrast)",
              border: "none",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-2) var(--space-5)",
              fontSize: "var(--text-body)",
              fontWeight: "var(--weight-semibold)",
              cursor: "pointer",
              transition: "all 150ms var(--ease-spring)",
            }}
          >
            Open Chat &rarr;
          </button>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div
        style={{
          display: "flex",
          gap: "var(--space-1)",
          padding: "0 var(--space-6)",
          borderBottom: "1px solid var(--separator)",
          background: "var(--material-regular)",
        }}
      >
        {(["profile", "config"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "var(--space-2) var(--space-4)",
              fontSize: "var(--text-footnote)",
              fontWeight: activeTab === tab ? 600 : 500,
              color: activeTab === tab ? "var(--accent)" : "var(--text-secondary)",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === tab ? "2px solid var(--accent)" : "2px solid transparent",
              cursor: "pointer",
              marginBottom: "-1px",
            }}
          >
            {tab === "profile" ? "Profile" : "Config Files"}
          </button>
        ))}
      </div>

      {/* ── Config Files Tab ── */}
      {activeTab === "config" && (
        <div
          style={{
            display: "flex",
            maxWidth: 960,
            margin: "0 auto",
            padding: "var(--space-6)",
            width: "100%",
            gap: "var(--space-4)",
          }}
        >
          <div style={{ width: 200, flexShrink: 0 }}>
            <ConfigFileSidebar
              agentId={agent.id}
              activeFile={activeConfigFile}
              onSelect={setActiveConfigFile}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <ConfigFileEditor
              key={activeConfigFile}
              agentId={agent.id}
              filename={activeConfigFile}
              label={activeConfigFile}
              onSaveAsTemplate={() => setShowSaveTemplate(true)}
              onSave={activeConfigFile === 'SOUL.md' ? handleSoulSave : undefined}
            />
          </div>
        </div>
      )}

      {showSaveTemplate && (
        <SaveTemplateModal
          agentName={agent.name}
          content={agent.soul || ""}
          onClose={() => setShowSaveTemplate(false)}
          onSaved={() => setShowSaveTemplate(false)}
        />
      )}

      {/* ── Content (Profile Tab) ── */}
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "var(--space-8) var(--space-6)",
          display: activeTab === "profile" ? "flex" : "none",
          flexDirection: "column",
          gap: "var(--space-5)",
        }}
      >
        {/* ── Hero section ── */}
        <div className="flex items-start gap-4">
          <div style={{ position: "relative", flexShrink: 0 }}>
            <AgentAvatar agent={agent} size={64} borderRadius={16} />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginTop: "var(--space-2)",
                justifyContent: "center",
              }}
            >
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Upload profile image"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 8px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--fill-tertiary)",
                  color: "var(--text-tertiary)",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "var(--text-caption2)",
                  fontWeight: "var(--weight-medium)",
                }}
              >
                <Upload size={10} />
                Photo
              </button>
              {settings.agentOverrides[agent.id]?.profileImage && (
                <button
                  onClick={() => setAgentOverride(agent.id, { profileImage: undefined })}
                  title="Remove photo"
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "var(--fill-tertiary)",
                    color: "var(--text-tertiary)",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <X size={10} />
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImageUpload(file)
                e.target.value = ""
              }}
            />
          </div>
          <div>
            <InlineEditField
              value={agent.name}
              onSave={async (v) => patchAgent({ name: v })}
              fontSize="var(--text-title1)"
              fontWeight={700}
              color="var(--text-primary)"
              placeholder="Agent name"
            />
            <InlineEditField
              value={agent.title}
              onSave={async (v) => patchAgent({ title: v })}
              fontSize="var(--text-subheadline)"
              fontWeight={500}
              color="var(--text-secondary)"
              placeholder="Role / title"
            />
            {/* Color swatch */}
            <div
              style={{
                display: "inline-block",
                marginTop: "var(--space-2)",
                width: 40,
                height: 3,
                borderRadius: 2,
                background: agent.color,
              }}
            />
          </div>
        </div>

        {/* ── About card ── */}
        <Card>
          <div className="section-header" style={{ marginBottom: "var(--space-3)" }}>
            About
          </div>
          <InlineEditField
            value={agent.description}
            onSave={async (v) => patchAgent({ description: v })}
            fontSize="var(--text-body)"
            fontWeight={400}
            color="var(--text-secondary)"
            placeholder="Add a description..."
            multiline
          />
        </Card>

        {/* ── Two-column: Tools + Hierarchy ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Tools card */}
          <Card>
            <div className="section-header" style={{ marginBottom: "var(--space-3)" }}>
              Tools
            </div>
            <div className="flex flex-wrap gap-2">
              {agent.tools.map((t) => (
                <span
                  key={t}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    background: "var(--fill-secondary)",
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontSize: "var(--text-caption1)",
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {TOOL_ICONS[t] && (
                    <span style={{ fontSize: "var(--text-caption2)" }}>
                      {TOOL_ICONS[t]}
                    </span>
                  )}
                  {t}
                </span>
              ))}
            </div>
          </Card>

          {/* Hierarchy card */}
          <Card>
            <div className="section-header" style={{ marginBottom: "var(--space-3)" }}>
              Hierarchy
            </div>
            {parent && (
              <div style={{ marginBottom: "var(--space-3)" }}>
                <div
                  style={{
                    fontSize: "var(--text-caption2)",
                    color: "var(--text-tertiary)",
                    marginBottom: 2,
                  }}
                >
                  Reports to
                </div>
                <Link
                  href={`/agents/${parent.id}`}
                  className="focus-ring"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    fontSize: "var(--text-body)",
                    fontWeight: "var(--weight-medium)",
                    color: "var(--system-blue)",
                    textDecoration: "none",
                  }}
                >
                  <span>{parent.emoji}</span>
                  <span>{parent.name}</span>
                  <span style={{ color: "var(--text-tertiary)" }}>&rarr;</span>
                </Link>
              </div>
            )}
            {children.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: "var(--text-caption2)",
                    color: "var(--text-tertiary)",
                    marginBottom: 2,
                  }}
                >
                  Direct reports ({children.length})
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  {children.map((c) => (
                    <Link
                      key={c.id}
                      href={`/agents/${c.id}`}
                      className="focus-ring"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "var(--space-2)",
                        fontSize: "var(--text-body)",
                        fontWeight: "var(--weight-medium)",
                        color: "var(--system-blue)",
                        textDecoration: "none",
                        padding: "2px 0",
                      }}
                    >
                      <span>{c.emoji}</span>
                      <span>{c.name}</span>
                      <span style={{ color: "var(--text-tertiary)" }}>&rarr;</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {!parent && children.length === 0 && (
              <div
                style={{
                  fontSize: "var(--text-footnote)",
                  color: "var(--text-tertiary)",
                }}
              >
                No hierarchy connections
              </div>
            )}
          </Card>
        </div>

        {/* ── SOUL.md card ── */}
        {agent.soul && (
          <Card>
            <div className="section-header" style={{ marginBottom: "var(--space-3)" }}>
              SOUL.md
            </div>
            <SoulViewer content={agent.soul} />
          </Card>
        )}

        {/* ── Crons card ── */}
        <Card>
          <div
            className="section-header"
            style={{
              marginBottom: "var(--space-3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>Crons {crons.length > 0 && `(${crons.length})`}</span>
          </div>
          {crons.length === 0 ? (
            <div
              style={{
                fontSize: "var(--text-footnote)",
                color: "var(--text-tertiary)",
              }}
            >
              No crons associated with this agent
            </div>
          ) : (
            <div
              style={{
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
                border: "1px solid var(--separator)",
              }}
            >
              {crons.map((c, idx) => (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    minHeight: 44,
                    padding: "0 var(--space-3)",
                    borderTop: idx > 0 ? "1px solid var(--separator)" : undefined,
                    background:
                      c.status === "error" ? "rgba(255,69,58,0.06)" : undefined,
                  }}
                >
                  <StatusDot status={c.status} />
                  <span
                    style={{
                      fontSize: "var(--text-body)",
                      fontFamily: "var(--font-mono)",
                      fontWeight: "var(--weight-medium)",
                      color: "var(--text-primary)",
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.name}
                  </span>
                  <span
                    style={{
                      fontSize: "var(--text-caption1)",
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-tertiary)",
                      flexShrink: 0,
                    }}
                  >
                    {c.schedule}
                  </span>
                  <span
                    style={{
                      fontSize: "var(--text-caption2)",
                      fontWeight: "var(--weight-medium)",
                      padding: "2px 8px",
                      borderRadius: 20,
                      flexShrink: 0,
                      background:
                        c.status === "ok"
                          ? "rgba(48,209,88,0.1)"
                          : c.status === "error"
                            ? "rgba(255,69,58,0.1)"
                            : "rgba(120,120,128,0.1)",
                      color:
                        c.status === "ok"
                          ? "var(--system-green)"
                          : c.status === "error"
                            ? "var(--system-red)"
                            : "var(--text-secondary)",
                    }}
                  >
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
          {crons.length > 0 && (
            <div style={{ textAlign: "right", marginTop: "var(--space-3)" }}>
              <Link
                href="/crons"
                className="focus-ring"
                style={{
                  fontSize: "var(--text-footnote)",
                  color: "var(--system-blue)",
                  textDecoration: "none",
                  fontWeight: "var(--weight-medium)",
                }}
              >
                View all crons &rarr;
              </Link>
            </div>
          )}
        </Card>

        {/* ── Danger zone ── */}
        <Card>
          <div className="section-header" style={{ marginBottom: "var(--space-3)", color: "var(--system-red)" }}>
            Danger Zone
          </div>
          {showDeleteConfirm ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <p style={{ fontSize: "var(--text-footnote)", color: "var(--text-secondary)", margin: 0 }}>
                Delete <strong>{agent.name}</strong>? This removes the agent directory and cannot be undone.
                Direct reports will be orphaned to this agent&apos;s parent.
              </p>
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="focus-ring"
                  style={{
                    background: "var(--system-red)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    padding: "var(--space-2) var(--space-4)",
                    fontSize: "var(--text-footnote)",
                    fontWeight: "var(--weight-semibold)",
                    cursor: deleting ? "not-allowed" : "pointer",
                    opacity: deleting ? 0.7 : 1,
                  }}
                >
                  {deleting ? "Deleting…" : "Confirm Delete"}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="focus-ring"
                  style={{
                    background: "var(--fill-secondary)",
                    color: "var(--text-secondary)",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    padding: "var(--space-2) var(--space-4)",
                    fontSize: "var(--text-footnote)",
                    fontWeight: "var(--weight-medium)",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="focus-ring"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--space-2)",
                background: "transparent",
                color: "var(--system-red)",
                border: "1px solid var(--system-red)",
                borderRadius: "var(--radius-sm)",
                padding: "var(--space-2) var(--space-4)",
                fontSize: "var(--text-footnote)",
                fontWeight: "var(--weight-medium)",
                cursor: "pointer",
              }}
            >
              <Trash2 size={13} />
              Delete Agent
            </button>
          )}
        </Card>

        {/* ── Voice card ── */}
        <Card>
          <div className="section-header" style={{ marginBottom: "var(--space-3)" }}>
            Voice
          </div>
          {agent.voiceId ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  padding: "2px 10px",
                  borderRadius: 20,
                  fontSize: "var(--text-caption1)",
                  fontWeight: "var(--weight-medium)",
                  background: "rgba(191,90,242,0.1)",
                  color: "var(--system-purple)",
                  border: "1px solid rgba(191,90,242,0.2)",
                  flexShrink: 0,
                }}
              >
                ElevenLabs
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-caption2)",
                  color: "var(--text-tertiary)",
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {agent.voiceId}
              </span>
              <CopyButton text={agent.voiceId} label="Copy voice ID" />
            </div>
          ) : (
            <div
              style={{
                fontSize: "var(--text-footnote)",
                color: "var(--text-tertiary)",
              }}
            >
              No voice configured
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
