'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Map,
  MessageSquare,
  Clock,
  Brain,
  Bot,
  Timer,
  Settings,
  CircleDot,
  Target,
  FolderKanban,
  Shield,
  Plus,
  DollarSign,
  Zap,
} from 'lucide-react';
import type { Agent, CronJob, Task, Goal, Project } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SearchCategory = 'Actions' | 'Issues' | 'Goals' | 'Projects' | 'Agents' | 'Pages' | 'Scheduling';

interface SearchResult {
  id: string;
  label: string;
  subtitle?: string;
  icon: React.ReactNode;
  href?: string;
  action?: () => void;
  category: SearchCategory;
}

// ---------------------------------------------------------------------------
// Static pages
// ---------------------------------------------------------------------------

const STATIC_PAGES: SearchResult[] = [
  { id: 'page-map', label: 'Map', icon: <Map size={16} />, href: '/', category: 'Pages' },
  { id: 'page-issues', label: 'Issues', icon: <CircleDot size={16} />, href: '/issues', category: 'Pages' },
  { id: 'page-goals', label: 'Goals', icon: <Target size={16} />, href: '/goals', category: 'Pages' },
  { id: 'page-projects', label: 'Projects', icon: <FolderKanban size={16} />, href: '/projects', category: 'Pages' },
  { id: 'page-messages', label: 'Messages', icon: <MessageSquare size={16} />, href: '/chat', category: 'Pages' },
  { id: 'page-crons', label: 'Scheduling', icon: <Clock size={16} />, href: '/crons', category: 'Pages' },
  { id: 'page-memory', label: 'Memory', icon: <Brain size={16} />, href: '/memory', category: 'Pages' },
  { id: 'page-costs', label: 'Costs', icon: <DollarSign size={16} />, href: '/costs', category: 'Pages' },
  { id: 'page-audit', label: 'Audit Trail', icon: <Shield size={16} />, href: '/audit', category: 'Pages' },
  { id: 'page-settings', label: 'Settings', icon: <Settings size={16} />, href: '/settings', category: 'Pages' },
];

// ---------------------------------------------------------------------------
// Simple fuzzy match — case-insensitive substring
// ---------------------------------------------------------------------------

function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  // Substring match
  if (t.includes(q)) return true;
  // Check if all characters appear in order (fuzzy)
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

// ---------------------------------------------------------------------------
// Status label helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'Todo',
  'in-progress': 'In Progress',
  review: 'Review',
  done: 'Done',
  cancelled: 'Cancelled',
};

// ---------------------------------------------------------------------------
// Search trigger button (used in sidebar)
// ---------------------------------------------------------------------------

export function SearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="nav-item focus-ring"
      aria-label="Open search (Cmd+K)"
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        height: '30px',
        padding: '0 10px',
        borderRadius: '4px',
        border: '1px solid var(--separator)',
        background: 'var(--fill-quaternary)',
        color: 'var(--text-tertiary)',
        fontSize: '13px',
        cursor: 'pointer',
        transition: 'all 100ms var(--ease-smooth)',
      }}
    >
      <Search size={14} style={{ flexShrink: 0, opacity: 0.7 }} />
      <span style={{ flex: 1, textAlign: 'left' }}>Search...</span>
      <kbd
        style={{
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          padding: '1px 5px',
          borderRadius: '4px',
          background: 'var(--fill-tertiary)',
          color: 'var(--text-quaternary)',
          border: '1px solid var(--separator)',
          lineHeight: '16px',
        }}
      >
        {'\u2318'}K
      </kbd>
    </button>
  );
}

// ---------------------------------------------------------------------------
// GlobalSearch modal
// ---------------------------------------------------------------------------

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [crons, setCrons] = useState<CronJob[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // -----------------------------------------------------------------------
  // Keyboard shortcut: Cmd+K / Ctrl+K
  // -----------------------------------------------------------------------
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // -----------------------------------------------------------------------
  // Custom event: open search from sidebar trigger buttons
  // -----------------------------------------------------------------------
  useEffect(() => {
    function handleOpenSearch() {
      setOpen(true);
    }
    window.addEventListener('clawport:open-search', handleOpenSearch);
    return () => window.removeEventListener('clawport:open-search', handleOpenSearch);
  }, []);

  // -----------------------------------------------------------------------
  // Fetch data when modal opens
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!open) return;
    // Reset state
    setQuery('');
    setActiveIndex(0);

    const fetches = [
      fetch('/api/agents').then(r => r.ok ? r.json() : []).then((d: unknown) => {
        if (Array.isArray(d)) setAgents(d as Agent[]);
      }),
      fetch('/api/crons').then(r => r.ok ? r.json() : []).then((d: unknown) => {
        setCrons(Array.isArray(d) ? d as CronJob[] : (d as { crons?: CronJob[] })?.crons ?? []);
      }),
      fetch('/api/tasks?exclude_hidden=true').then(r => r.ok ? r.json() : []).then((d: unknown) => {
        if (Array.isArray(d)) setTasks(d as Task[]);
      }),
      fetch('/api/goals').then(r => r.ok ? r.json() : []).then((d: unknown) => {
        if (Array.isArray(d)) setGoals(d as Goal[]);
      }),
      fetch('/api/projects').then(r => r.ok ? r.json() : []).then((d: unknown) => {
        if (Array.isArray(d)) setProjects(d as Project[]);
      }),
    ];
    Promise.all(fetches).catch(() => {});
  }, [open]);

  // -----------------------------------------------------------------------
  // Focus input when opened
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  // -----------------------------------------------------------------------
  // Prevent body scroll
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // -----------------------------------------------------------------------
  // Build filtered results
  // -----------------------------------------------------------------------
  const results = useMemo(() => {
    const all: SearchResult[] = [];

    // Action commands (shown when no query or query starts with relevant text)
    all.push(
      {
        id: 'action-new-issue',
        label: 'Create New Issue',
        icon: <Plus size={16} style={{ color: 'var(--system-blue)' }} />,
        href: '/issues',
        action: () => {
          router.push('/issues?create=1');
        },
        category: 'Actions',
      },
      {
        id: 'action-new-goal',
        label: 'Create New Goal',
        icon: <Plus size={16} style={{ color: 'var(--system-purple)' }} />,
        href: '/goals',
        action: () => {
          router.push('/goals?create=1');
        },
        category: 'Actions',
      },
      {
        id: 'action-new-project',
        label: 'Create New Project',
        icon: <Plus size={16} style={{ color: 'var(--system-green)' }} />,
        href: '/projects',
        action: () => {
          router.push('/projects?create=1');
        },
        category: 'Actions',
      },
    );

    // Issues (limit to 8 in no-query mode)
    const taskList = query.trim()
      ? tasks.filter(t => fuzzyMatch(query, t.title) || (t.identifier && fuzzyMatch(query, t.identifier)))
      : tasks.slice(0, 8);
    taskList.forEach((t) => {
      all.push({
        id: `issue-${t.id}`,
        label: t.identifier ? `${t.identifier} ${t.title}` : t.title,
        subtitle: STATUS_LABELS[t.status] ?? t.status,
        icon: <CircleDot size={16} style={{ color: t.status === 'done' ? '#22C55E' : t.status === 'in-progress' ? '#F59E0B' : 'var(--text-tertiary)' }} />,
        href: `/issues?selected=${t.id}`,
        category: 'Issues',
      });
    });

    // Goals (limit to 5 in no-query mode)
    const goalList = query.trim()
      ? goals.filter(g => fuzzyMatch(query, g.title))
      : goals.slice(0, 5);
    goalList.forEach((g) => {
      all.push({
        id: `goal-${g.id}`,
        label: g.title,
        subtitle: `${g.progress}% ${g.status}`,
        icon: <Target size={16} style={{ color: g.status === 'completed' ? '#22C55E' : '#8B5CF6' }} />,
        href: `/goals?selected=${g.id}`,
        category: 'Goals',
      });
    });

    // Projects (limit to 5 in no-query mode)
    const projectList = query.trim()
      ? projects.filter(p => fuzzyMatch(query, p.name))
      : projects.slice(0, 5);
    projectList.forEach((p) => {
      all.push({
        id: `project-${p.id}`,
        label: p.name,
        subtitle: `${p.progress}% ${p.status}`,
        icon: <FolderKanban size={16} style={{ color: p.status === 'active' ? '#22C55E' : 'var(--text-tertiary)' }} />,
        href: `/projects?selected=${p.id}`,
        category: 'Projects',
      });
    });

    // Agents
    agents.forEach((a) => {
      all.push({
        id: `agent-${a.id}`,
        label: a.name,
        subtitle: a.title,
        icon: <Bot size={16} style={{ color: a.color }} />,
        href: `/chat?agent=${a.id}`,
        category: 'Agents',
      });
    });

    // Static pages
    all.push(...STATIC_PAGES);

    // Crons
    crons.forEach((c) => {
      all.push({
        id: `cron-${c.id}`,
        label: c.name,
        subtitle: c.schedule,
        icon: <Timer size={16} />,
        href: '/crons',
        category: 'Scheduling',
      });
    });

    if (!query.trim()) return all;

    return all.filter(
      (r) =>
        fuzzyMatch(query, r.label) ||
        (r.subtitle && fuzzyMatch(query, r.subtitle))
    );
  }, [query, agents, crons, tasks, goals, projects, router]);

  // -----------------------------------------------------------------------
  // Group results by category
  // -----------------------------------------------------------------------
  const grouped = useMemo(() => {
    const groups: { category: string; items: SearchResult[] }[] = [];
    const categoryOrder: SearchCategory[] = ['Actions', 'Issues', 'Goals', 'Projects', 'Agents', 'Pages', 'Scheduling'];
    for (const cat of categoryOrder) {
      const items = results.filter((r) => r.category === cat);
      if (items.length > 0) {
        groups.push({ category: cat, items });
      }
    }
    return groups;
  }, [results]);

  // Flat list for keyboard nav
  const flatResults = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  // -----------------------------------------------------------------------
  // Navigation
  // -----------------------------------------------------------------------
  const navigate = useCallback(
    (result: SearchResult) => {
      setOpen(false);
      if (result.action) {
        result.action();
      } else if (result.href) {
        router.push(result.href);
      }
    },
    [router]
  );

  // -----------------------------------------------------------------------
  // Keyboard handling inside the modal
  // -----------------------------------------------------------------------
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, flatResults.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (flatResults[activeIndex]) {
          navigate(flatResults[activeIndex]);
        }
        return;
      }
    },
    [activeIndex, flatResults, navigate]
  );

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  if (!open) return null;

  let flatIndex = 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '20vh',
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
        }}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search ClawPort"
        className="animate-scale-in"
        onKeyDown={handleKeyDown}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '520px',
          margin: '0 16px',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--material-regular)',
          border: '1px solid var(--separator)',
          boxShadow: 'var(--shadow-overlay)',
          backdropFilter: 'blur(12px) saturate(120%)',
          WebkitBackdropFilter: 'blur(12px) saturate(120%)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '480px',
        }}
      >
        {/* Search input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            borderBottom: '1px solid var(--separator)',
          }}
        >
          <Search
            size={18}
            style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search issues, goals, agents..."
            aria-label="Search ClawPort"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
            }}
          />
          <kbd
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'var(--fill-quaternary)',
              color: 'var(--text-quaternary)',
              border: '1px solid var(--separator)',
              lineHeight: '16px',
            }}
          >
            esc
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          role="listbox"
          aria-label="Search results"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px',
          }}
        >
          {flatResults.length === 0 && query.trim() && (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                color: 'var(--text-tertiary)',
                fontSize: '13px',
              }}
            >
              No results for &lsquo;{query}&rsquo;
            </div>
          )}

          {grouped.map((group) => (
            <div key={group.category} style={{ marginBottom: '4px' }}>
              {/* Category header */}
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--text-tertiary)',
                  padding: '4px 8px 2px',
                }}
              >
                {group.category}
              </div>

              {/* Items */}
              {group.items.map((item) => {
                const currentIndex = flatIndex++;
                const isActive = currentIndex === activeIndex;

                return (
                  <button
                    key={item.id}
                    role="option"
                    aria-selected={isActive}
                    data-active={isActive}
                    onClick={() => navigate(item)}
                    onMouseEnter={() => setActiveIndex(currentIndex)}
                    className="focus-ring"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      minHeight: '36px',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      border: 'none',
                      background: isActive
                        ? 'rgba(255,255,255,0.06)'
                        : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 80ms var(--ease-smooth)',
                      outline: 'none',
                    }}
                    aria-label={
                      item.subtitle
                        ? `${item.label} - ${item.subtitle}`
                        : item.label
                    }
                  >
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '6px',
                        background: item.category === 'Actions'
                          ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
                          : 'var(--fill-quaternary)',
                        flexShrink: 0,
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {item.icon}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: item.category === 'Actions' ? 600 : 500,
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.label}
                      </div>
                      {item.subtitle && (
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-tertiary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                    {item.category === 'Actions' && (
                      <Zap size={12} style={{ color: 'var(--text-quaternary)', flexShrink: 0 }} />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer with keyboard hints */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            padding: '6px 14px',
            borderTop: '1px solid var(--separator)',
            fontSize: '11px',
            color: 'var(--text-quaternary)',
          }}
        >
          <span>
            <kbd style={{ fontFamily: 'var(--font-mono)' }}>{'\u2191\u2193'}</kbd> Navigate
          </span>
          <span>
            <kbd style={{ fontFamily: 'var(--font-mono)' }}>{'\u21B5'}</kbd> Open
          </span>
          <span>
            <kbd style={{ fontFamily: 'var(--font-mono)' }}>esc</kbd> Close
          </span>
        </div>
      </div>
    </div>
  );
}
