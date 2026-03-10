'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Map, MessageSquare, Clock, Activity, Brain, CircleDot, BookOpen, Settings, DollarSign, Users, Target, FolderKanban, Calendar, CheckCircle, Compass } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useSettings } from '@/app/settings-provider';
import { useAgents } from '@/lib/hooks/use-agents';
import { useCrons } from '@/lib/hooks/use-crons';
import { useApprovals } from '@/lib/hooks/use-approvals';

function getInitials(name: string | null): string {
  if (!name) return '??'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ---------------------------------------------------------------------------
// Nav item definition
// ---------------------------------------------------------------------------

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: 'agents' | 'unread' | 'errors' | 'pending';
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Workspace',
    items: [
      { href: '/', label: 'Map', icon: Map, badge: 'agents' },
      { href: '/team', label: 'Team', icon: Users },
      { href: '/mission', label: 'Mission', icon: Compass },
      { href: '/goals', label: 'Goals', icon: Target },
    ],
  },
  {
    label: 'Work',
    items: [
      { href: '/projects', label: 'Projects', icon: FolderKanban },
      { href: '/issues', label: 'Issues', icon: CircleDot },
      { href: '/calendar', label: 'Calendar', icon: Calendar },
    ],
  },
  {
    label: 'Comms',
    items: [
      { href: '/chat', label: 'Messages', icon: MessageSquare, badge: 'unread' },
      { href: '/approvals', label: 'Approvals', icon: CheckCircle, badge: 'pending' },
    ],
  },
  {
    label: 'Monitor',
    items: [
      { href: '/crons', label: 'Crons', icon: Clock, badge: 'errors' },
      { href: '/activity', label: 'Activity', icon: Activity },
      { href: '/costs', label: 'Costs', icon: DollarSign },
    ],
  },
  {
    label: 'Knowledge',
    items: [
      { href: '/memory', label: 'Memory', icon: Brain },
      { href: '/docs', label: 'Docs', icon: BookOpen },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

// ---------------------------------------------------------------------------
// NavLinks component
// ---------------------------------------------------------------------------

export function NavLinks() {
  const pathname = usePathname();
  const { settings } = useSettings();
  const { data: agents } = useAgents();
  const { data: crons } = useCrons();
  const { data: approvals } = useApprovals();

  const agentCount = agents?.length ?? null;
  const cronCount = crons?.length ?? null;
  const cronErrorCount = crons?.filter((c) => c.status === 'error').length ?? null;
  const pendingApprovals = approvals?.filter((a) => a.status === 'pending').length ?? null;

  // Resolve badge content per nav item
  function getBadge(item: NavItem): React.ReactNode {
    if (item.badge === 'agents' && agentCount !== null) {
      return (
        <span
          className="nav-badge"
          style={{
            marginLeft: 'auto',
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            padding: '1px 6px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--fill-quaternary)',
            color: 'var(--text-tertiary)',
            lineHeight: '16px',
          }}
        >
          {agentCount}
        </span>
      );
    }
    if (item.badge === 'errors' && cronCount !== null) {
      const hasErrors = cronErrorCount !== null && cronErrorCount > 0;
      return (
        <span
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span
            className="nav-badge"
            style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              padding: '1px 6px',
              borderRadius: 'var(--radius-sm)',
              background: hasErrors ? 'rgba(255,69,58,0.1)' : 'var(--fill-quaternary)',
              color: hasErrors ? 'var(--system-red)' : 'var(--text-tertiary)',
              lineHeight: '16px',
              fontWeight: hasErrors ? 600 : undefined,
            }}
          >
            {hasErrors ? `${cronErrorCount} err` : cronCount}
          </span>
          {hasErrors && (
            <span
              aria-label={`${cronErrorCount} cron error${cronErrorCount > 1 ? 's' : ''}`}
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--system-red)',
                flexShrink: 0,
                animation: 'pulse-red 1.5s ease-in-out infinite',
              }}
            />
          )}
        </span>
      );
    }
    if (item.badge === 'pending' && pendingApprovals !== null && pendingApprovals > 0) {
      return (
        <span
          className="nav-badge"
          style={{
            marginLeft: 'auto',
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            padding: '1px 6px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255,159,10,0.1)',
            color: 'var(--system-orange)',
            lineHeight: '16px',
            fontWeight: 600,
          }}
        >
          {pendingApprovals}
        </span>
      );
    }
    return null;
  }

  return (
    <nav className="flex-1 flex flex-col min-h-0" aria-label="Main navigation">
      <div className="px-3 pt-2 pb-3 flex flex-col gap-3" style={{ overflowY: 'auto', flex: 1 }}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                padding: '0 8px',
                marginBottom: '4px',
              }}
            >
              {section.label}
            </div>

            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href);

                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item focus-ring ${isActive ? 'nav-item-active' : ''}`}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      minHeight: '36px',
                      padding: '0 10px 0 12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                      background: isActive ? 'var(--accent-fill)' : 'transparent',
                      textDecoration: 'none',
                      transition: 'all 100ms var(--ease-smooth)',
                    }}
                  >
                    <Icon
                      size={16}
                      style={{
                        flexShrink: 0,
                        color: isActive ? 'var(--accent)' : 'var(--text-tertiary)',
                        transition: 'color 100ms var(--ease-smooth)',
                      }}
                    />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {getBadge(item)}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User footer */}
      <div
        style={{
          borderTop: '1px solid var(--separator)',
          padding: '10px 16px',
          flexShrink: 0,
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              background: 'var(--accent-fill)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--accent)',
              flexShrink: 0,
              letterSpacing: '-0.02em',
            }}
          >
            {getInitials(settings.operatorName)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {settings.operatorName ?? 'Operator'}
            </div>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-tertiary)',
              }}
            >
              Owner
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
