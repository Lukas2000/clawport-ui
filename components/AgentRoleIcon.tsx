'use client'

import type { CSSProperties } from 'react'

interface AgentRoleIconProps {
  title: string
  size?: number
  color?: string
  style?: CSSProperties
}

/**
 * Maps agent role/title keywords to a minimal SVG icon.
 * Icons use 1.5px stroke, no fill, rounded linecaps -- matching lucide-react.
 */
export function AgentRoleIcon({ title, size = 16, color, style }: AgentRoleIconProps) {
  const role = classifyRole(title)
  const svgProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color ?? 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style: { flexShrink: 0, ...style },
  }

  switch (role) {
    case 'orchestrator':
      // Hub/network node: center dot with radiating lines
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="3" />
          <line x1="12" y1="3" x2="12" y2="7" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <line x1="3" y1="12" x2="7" y2="12" />
          <line x1="17" y1="12" x2="21" y2="12" />
          <line x1="5.6" y1="5.6" x2="8.5" y2="8.5" />
          <line x1="15.5" y1="15.5" x2="18.4" y2="18.4" />
        </svg>
      )

    case 'strategist':
      // Crosshair/scope
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
          <line x1="12" y1="2" x2="12" y2="4" />
          <line x1="12" y1="20" x2="12" y2="22" />
          <line x1="2" y1="12" x2="4" y2="12" />
          <line x1="20" y1="12" x2="22" y2="12" />
        </svg>
      )

    case 'scout':
      // Radar sweep
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" />
          <line x1="12" y1="12" x2="12" y2="3" />
          <path d="M12 12l5.5-5.5" />
        </svg>
      )

    case 'researcher':
      // Magnifying glass (clean geometric)
      return (
        <svg {...svgProps}>
          <circle cx="11" cy="11" r="7" />
          <line x1="16" y1="16" x2="21" y2="21" />
        </svg>
      )

    case 'analyst':
      // Mini bar chart
      return (
        <svg {...svgProps}>
          <rect x="3" y="12" width="4" height="9" rx="1" />
          <rect x="10" y="7" width="4" height="14" rx="1" />
          <rect x="17" y="3" width="4" height="18" rx="1" />
        </svg>
      )

    case 'writer':
      // Pen nib
      return (
        <svg {...svgProps}>
          <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          <line x1="15" y1="5" x2="19" y2="9" />
        </svg>
      )

    case 'auditor':
      // Shield with check
      return (
        <svg {...svgProps}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
      )

    case 'director':
      // Broadcast/megaphone
      return (
        <svg {...svgProps}>
          <path d="M19.5 7.5L8 12l11.5 4.5V7.5z" />
          <rect x="3" y="10" width="5" height="4" rx="1" />
          <path d="M8 16v3a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-2" />
        </svg>
      )

    case 'monitor':
      // Signal waves
      return (
        <svg {...svgProps}>
          <path d="M5 12.55a11 11 0 0 1 14.08 0" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <circle cx="12" cy="20" r="1" fill={color ?? 'currentColor'} />
        </svg>
      )

    case 'specialist':
      // Plane (for specialized agents like flight monitor)
      return (
        <svg {...svgProps}>
          <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1L11 12l-2 3H6l-1 1 3 2 2 3 1-1v-3l3-2 3.5 7.3c.3.4.7.5 1.1.3l.5-.3c.4-.2.6-.7.5-1.1z" />
        </svg>
      )

    case 'expert':
      // Open book
      return (
        <svg {...svgProps}>
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      )

    default:
      // Default: simple circle with dot
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="2" fill={color ?? 'currentColor'} stroke="none" />
        </svg>
      )
  }
}

type RoleType =
  | 'orchestrator'
  | 'strategist'
  | 'scout'
  | 'researcher'
  | 'analyst'
  | 'writer'
  | 'auditor'
  | 'director'
  | 'monitor'
  | 'specialist'
  | 'expert'
  | 'default'

/**
 * Classify an agent title/role string into a role category for icon selection.
 */
function classifyRole(title: string): RoleType {
  const t = title.toLowerCase()

  if (t.includes('orchestrator') || t.includes('coordinator') || t.includes('manager')) return 'orchestrator'
  if (t.includes('strateg') || t.includes('cso') || t.includes('chief strategy')) return 'strategist'
  if (t.includes('scout') || t.includes('intel') || t.includes('radar') || t.includes('trend') || t.includes('field')) return 'scout'
  if (t.includes('research') || t.includes('market')) return 'researcher'
  if (t.includes('analyst') || t.includes('analysis') || t.includes('seo analyst')) return 'analyst'
  if (t.includes('writer') || t.includes('content writer') || t.includes('architect') || t.includes('scribe') || t.includes('memory')) return 'writer'
  if (t.includes('audit') || t.includes('quality') || t.includes('validation') || t.includes('gate') || t.includes('proof')) return 'auditor'
  if (t.includes('director') || t.includes('herald') || t.includes('broadcast') || t.includes('linkedin') || t.includes('seo team')) return 'director'
  if (t.includes('monitor') || t.includes('community') || t.includes('voice') || t.includes('discovery') || t.includes('signal') || t.includes('tech')) return 'monitor'
  if (t.includes('flight') || t.includes('travel') || t.includes('plane')) return 'specialist'
  if (t.includes('expert') || t.includes('icp') || t.includes('sage') || t.includes('knowledge')) return 'expert'

  return 'default'
}

export { classifyRole }
