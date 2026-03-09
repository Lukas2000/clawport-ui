'use client'

import { useEffect, useState } from 'react'
import type { AgentTemplate, TemplateCategory } from '@/lib/types'

interface TemplatePickerProps {
  onSelect: (template: AgentTemplate | null) => void
  selected: AgentTemplate | null
}

export function TemplatePicker({ onSelect, selected }: TemplatePickerProps) {
  const [categories, setCategories] = useState<TemplateCategory[]>([])
  const [templates, setTemplates] = useState<AgentTemplate[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/templates')
      .then((r) => r.json())
      .then((data) => {
        setCategories(data.categories || [])
        setTemplates(data.templates || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = templates.filter((t) => {
    if (activeCategory && t.category !== activeCategory) return false
    if (search) {
      const q = search.toLowerCase()
      return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
    }
    return true
  })

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>
        Loading templates...
      </div>
    )
  }

  return (
    <div>
      {/* Search */}
      <input
        type="text"
        placeholder="Search templates..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: 8,
          border: '1px solid var(--separator)',
          background: 'var(--fill-tertiary)',
          color: 'var(--text-primary)',
          fontSize: 14,
          outline: 'none',
          marginBottom: 12,
          boxSizing: 'border-box',
        }}
      />

      {/* Category tabs */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          marginBottom: 12,
        }}
      >
        <button
          type="button"
          onClick={() => {
            onSelect(null)
            setActiveCategory(null)
          }}
          style={{
            padding: '4px 10px',
            borderRadius: 12,
            border: '1px solid ' + (!selected && !activeCategory ? 'var(--accent)' : 'var(--separator)'),
            background: !selected && !activeCategory ? 'var(--accent)15' : 'transparent',
            color: !selected && !activeCategory ? 'var(--accent)' : 'var(--text-secondary)',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Custom
        </button>
        {categories.map((cat) => (
          <button
            key={cat.slug}
            type="button"
            onClick={() => setActiveCategory(activeCategory === cat.slug ? null : cat.slug)}
            style={{
              padding: '4px 10px',
              borderRadius: 12,
              border: '1px solid ' + (activeCategory === cat.slug ? 'var(--accent)' : 'var(--separator)'),
              background: activeCategory === cat.slug ? 'var(--accent)15' : 'transparent',
              color: activeCategory === cat.slug ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {cat.label} ({cat.count})
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div
        style={{
          maxHeight: 280,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {filtered.length === 0 && (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
            {search ? 'No templates match your search.' : 'No templates in this category.'}
          </div>
        )}
        {filtered.map((t) => {
          const isSelected = selected?.slug === t.slug && selected?.category === t.category
          return (
            <button
              key={`${t.category}/${t.slug}`}
              type="button"
              onClick={() => onSelect(isSelected ? null : t)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid ' + (isSelected ? 'var(--accent)' : 'var(--separator)'),
                background: isSelected ? 'var(--accent)08' : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 100ms',
                color: 'var(--text-primary)',
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: t.color,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t.name}
                </div>
                {t.description && (
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-tertiary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {t.description}
                  </div>
                )}
              </div>
              <span
                style={{
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 8,
                  background: 'var(--fill-quaternary)',
                  color: 'var(--text-quaternary)',
                  flexShrink: 0,
                }}
              >
                {t.category}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
