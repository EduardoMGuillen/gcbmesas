'use client'

import { useStaffTheme } from '@/lib/staff-theme'

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-staff-fg mb-1">
          {title}
        </h1>
        {description && (
          <p className="text-sm sm:text-base text-staff-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

export function Panel({
  children,
  className = '',
  padding = true,
}: {
  children: React.ReactNode
  className?: string
  padding?: boolean
}) {
  return (
    <div
      className={`bg-staff-surface border border-staff-border rounded-2xl shadow-sm ${
        padding ? 'p-4 sm:p-6' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}

export function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string
  value: React.ReactNode
  accent?: boolean
}) {
  return (
    <Panel>
      <p className="text-xs sm:text-sm font-medium text-staff-muted mb-2">{label}</p>
      <p
        className={`text-2xl sm:text-3xl font-bold tracking-tight ${
          accent ? 'text-primary-500' : 'text-staff-fg'
        }`}
      >
        {value}
      </p>
    </Panel>
  )
}

export function StaffButton({
  children,
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger' | 'secondary'
}) {
  const styles = {
    primary:
      'bg-primary-600 hover:bg-primary-700 text-white shadow-sm shadow-primary-600/20',
    secondary:
      'bg-staff-raised border border-staff-border text-staff-fg hover:bg-staff-hover',
    ghost: 'text-staff-muted hover:text-staff-fg hover:bg-staff-hover',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  }[variant]
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation ${styles} ${className}`}
    >
      {children}
    </button>
  )
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
}) {
  const styles = {
    neutral: 'bg-staff-raised text-staff-muted border-staff-border',
    success: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
    danger: 'bg-red-500/15 text-red-500 border-red-500/30',
    info: 'bg-primary-500/15 text-primary-500 border-primary-500/30',
  }[tone]
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${styles}`}
    >
      {children}
    </span>
  )
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="text-center py-10 px-4">
      <p className="text-staff-fg font-medium">{title}</p>
      {description && <p className="text-sm text-staff-muted mt-1">{description}</p>}
    </div>
  )
}

export function StaffTabs<T extends string>({
  tabs,
  value,
  onChange,
  columns = 4,
}: {
  tabs: { id: T; label: string; icon?: string }[]
  value: T
  onChange: (id: T) => void
  columns?: 4 | 5
}) {
  return (
    <div
      className={`bg-staff-raised border border-staff-border rounded-xl p-1 grid grid-cols-2 gap-1 mb-6 ${
        columns === 5 ? 'sm:grid-cols-5' : 'sm:grid-cols-4'
      }`}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
            value === tab.id
              ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/20'
              : 'text-staff-muted hover:text-staff-fg'
          }`}
        >
          {tab.icon && (
            <svg className="w-4 h-4 hidden sm:block shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
          )}
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function ThemeToggle() {
  const { theme, toggle } = useStaffTheme()
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={toggle}
      className="p-2 rounded-xl text-staff-muted hover:text-staff-fg hover:bg-staff-hover transition-colors touch-manipulation"
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {isDark ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )}
    </button>
  )
}

export function NavIcon({ d, className = 'w-5 h-5' }: { d: string; className?: string }) {
  return (
    <svg className={`${className} shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
    </svg>
  )
}
