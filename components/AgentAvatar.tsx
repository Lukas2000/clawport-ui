'use client'

import type { CSSProperties } from 'react'
import type { Agent } from '@/lib/types'
import { useSettings } from '@/app/settings-provider'
import { AgentRoleIcon } from '@/components/AgentRoleIcon'

interface AgentAvatarProps {
  agent: Agent
  size: number
  borderRadius?: number
  style?: CSSProperties
}

export function AgentAvatar({ agent, size, borderRadius, style }: AgentAvatarProps) {
  const { getAgentDisplay } = useSettings()
  const display = getAgentDisplay(agent)
  const radius = borderRadius ?? Math.round(size * 0.22)

  if (display.profileImage) {
    return (
      <img
        src={display.profileImage}
        alt={agent.name}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          objectFit: 'cover',
          flexShrink: 0,
          ...style,
        }}
      />
    )
  }

  // Use role-based SVG icon instead of emoji
  const iconSize = Math.round(size * 0.55)

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `${agent.color}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...style,
      }}
    >
      <AgentRoleIcon
        title={agent.title ?? ''}
        size={iconSize}
        color={agent.color}
      />
    </div>
  )
}
