'use client'

const COLOR_PRESETS = [
  { label: 'Gold', value: '#F5C518' },
  { label: 'Red', value: '#EF4444' },
  { label: 'Orange', value: '#F97316' },
  { label: 'Green', value: '#22C55E' },
  { label: 'Blue', value: '#3B82F6' },
  { label: 'Purple', value: '#A855F7' },
  { label: 'Pink', value: '#EC4899' },
  { label: 'Teal', value: '#14B8A6' },
  { label: 'Cyan', value: '#06B6D4' },
  { label: 'Indigo', value: '#6366F1' },
  { label: 'Rose', value: '#F43F5E' },
  { label: 'Lime', value: '#84CC16' },
  { label: 'Amber', value: '#F59E0B' },
  { label: 'Slate', value: '#94A3B8' },
  { label: 'Sky', value: '#0EA5E9' },
]

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {COLOR_PRESETS.map((preset) => (
        <button
          key={preset.value}
          type="button"
          title={preset.label}
          onClick={() => onChange(preset.value)}
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: preset.value,
            border: value === preset.value ? '2px solid var(--text-primary)' : '2px solid transparent',
            cursor: 'pointer',
            outline: 'none',
            transition: 'transform 100ms',
            transform: value === preset.value ? 'scale(1.15)' : 'scale(1)',
          }}
        />
      ))}
      <label
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          overflow: 'hidden',
          cursor: 'pointer',
          border: '2px dashed var(--text-quaternary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="Custom color"
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ opacity: 0, position: 'absolute', width: 0, height: 0 }}
        />
        <span style={{ fontSize: 12, color: 'var(--text-quaternary)' }}>+</span>
      </label>
    </div>
  )
}
