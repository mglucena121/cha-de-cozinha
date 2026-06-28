function FilterTabs({ options, value, onChange, variant = 'pills' }) {
  if (variant === 'segment') {
    return (
      <div
        className="flex w-full rounded-xl border border-[rgba(176,137,104,0.22)] bg-[rgba(228,214,198,0.45)] p-1 sm:w-auto"
        role="tablist"
        aria-label="Filtros"
      >
        {options.map(({ id, label }) => {
          const isActive = value === id

          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(id)}
              className={`flex-1 font-sans rounded-lg px-3 py-2 text-xs font-semibold transition sm:flex-none sm:px-4 sm:text-sm ${
                isActive
                  ? 'bg-[var(--ink)] text-white shadow-sm'
                  : 'text-[var(--earth)] hover:bg-[rgba(120,53,34,0.08)]'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filtros">
      {options.map(({ id, label, count }) => {
        const isActive = value === id
        const displayLabel = count != null ? `${label} (${count})` : label

        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(id)}
            className={`font-sans rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              isActive
                ? 'border border-[rgba(214,176,106,0.55)] bg-[rgba(161,38,38,0.1)] text-wine'
                : 'border border-transparent text-[var(--earth)] hover:bg-[rgba(120,53,34,0.08)]'
            }`}
          >
            {displayLabel}
          </button>
        )
      })}
    </div>
  )
}

export default FilterTabs
