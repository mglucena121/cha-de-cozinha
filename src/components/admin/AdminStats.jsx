function AdminStats({ items, variant = 'compact', className = '' }) {
  if (variant === 'wide') {
    return (
      <div className={`grid grid-cols-3 gap-3 ${className}`}>
        {items.map(({ value, label }) => (
          <article
            key={label}
            className="rounded-xl border border-[rgba(176,137,104,0.24)] bg-[rgba(228,214,198,0.55)] px-3 py-4 text-center sm:px-4 sm:py-5"
          >
            <p className="font-sans text-[1.75rem] leading-none font-semibold text-[var(--ink)] sm:text-[2rem]">
              {value}
            </p>
            <p className="mt-2 font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--earth)] sm:text-xs">
              {label}
            </p>
          </article>
        ))}
      </div>
    )
  }

  return (
    <div className={`mt-3 grid grid-cols-3 gap-1.5 sm:max-w-sm sm:gap-2 ${className}`}>
      {items.map(({ value, label }) => (
        <article
          key={label}
          className="rounded-xl border border-[rgba(176,137,104,0.24)] bg-[rgba(228,214,198,0.72)] px-1.5 py-2 text-center sm:px-2"
        >
          <p className="font-sans text-[1.45rem] leading-none text-[var(--wine)] sm:text-[1.6rem]">{value}</p>
          <p className="mt-0.5 font-sans text-[9px] lowercase tracking-[0.02em] text-[var(--earth)] sm:text-[11px]">
            {label}
          </p>
        </article>
      ))}
    </div>
  )
}

export default AdminStats
