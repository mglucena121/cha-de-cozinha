import { Search } from 'lucide-react'

function AdminSearchInput({ value, onChange, placeholder, className = '', variant = 'default' }) {
  const shellClass =
    variant === 'soft'
      ? 'rounded-xl border border-[rgba(176,137,104,0.22)] bg-[rgba(255,252,247,0.92)] px-4 py-3'
      : 'rounded-2xl border border-border bg-card px-4 py-3 sm:min-w-[240px]'

  return (
    <label className={`flex items-center gap-2 ${shellClass} ${className}`}>
      <Search size={16} className="shrink-0 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-transparent font-sans text-sm text-[var(--ink)] outline-none placeholder:text-muted-foreground"
      />
    </label>
  )
}

export default AdminSearchInput
