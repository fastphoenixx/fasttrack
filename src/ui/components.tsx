import type { ReactNode } from 'react'

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      {title && (
        <h2 className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-muted)] mb-4">
          {title}
        </h2>
      )}
      {children}
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-[var(--color-muted)]">{label}</span>
      {children}
    </label>
  )
}

const inputCls =
  'rounded-md bg-[var(--color-bg)] border border-[var(--color-border)] px-3 py-2 ' +
  'text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]'

export function NumberInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="number" inputMode="decimal" className={inputCls} {...props} />
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="text" className={inputCls} {...props} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={inputCls} {...props} />
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }) {
  const base = 'rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50'
  const styles =
    variant === 'primary'
      ? 'bg-[var(--color-accent)] text-[var(--color-bg)] hover:opacity-90'
      : 'border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)]'
  return <button className={`${base} ${styles} ${className}`} {...props} />
}

export function Stat({ label, value, unit, tone }: { label: string; value: string; unit?: string; tone?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
        {label}
      </span>
      <span className="font-mono text-2xl font-medium tabular-nums" style={tone ? { color: tone } : undefined}>
        {value}
        {unit && <span className="text-sm font-normal text-[var(--color-muted)] ml-1">{unit}</span>}
      </span>
    </div>
  )
}
