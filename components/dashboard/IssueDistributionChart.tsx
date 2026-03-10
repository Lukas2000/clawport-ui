'use client'

import { useRef, useEffect } from 'react'

interface StatusCount {
  status: string
  count: number
  color: string
  label: string
}

interface IssueDistributionChartProps {
  data: StatusCount[]
}

export function IssueDistributionChart({ data }: IssueDistributionChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const total = data.reduce((sum, d) => sum + d.count, 0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || total === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const size = 120
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    ctx.scale(dpr, dpr)

    const cx = size / 2
    const cy = size / 2
    const outerRadius = 54
    const innerRadius = 36
    let startAngle = -Math.PI / 2

    for (const item of data) {
      if (item.count === 0) continue
      const sliceAngle = (item.count / total) * Math.PI * 2
      ctx.beginPath()
      ctx.arc(cx, cy, outerRadius, startAngle, startAngle + sliceAngle)
      ctx.arc(cx, cy, innerRadius, startAngle + sliceAngle, startAngle, true)
      ctx.closePath()
      ctx.fillStyle = item.color
      ctx.fill()
      startAngle += sliceAngle
    }

    // Center text
    ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('color') || '#fff'
    ctx.font = 'bold 20px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(total), cx, cy - 4)
    ctx.font = '10px system-ui'
    ctx.globalAlpha = 0.5
    ctx.fillText('issues', cx, cy + 12)
    ctx.globalAlpha = 1
  }, [data, total])

  if (total === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-quaternary)', fontSize: '12px' }}>
        No issues yet
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <canvas
        ref={canvasRef}
        style={{ color: 'var(--text-primary)', flexShrink: 0 }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {data.filter(d => d.count > 0).map(d => (
          <div key={d.status} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '2px',
                background: d.color,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {d.label}
            </span>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-quaternary)', marginLeft: 'auto' }}>
              {d.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
