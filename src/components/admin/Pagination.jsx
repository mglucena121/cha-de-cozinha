import { ChevronLeft, ChevronRight } from 'lucide-react'

function buildPageRange(currentPage, totalPages, siblingCount) {
  const pages = new Set([1, totalPages])

  for (let page = currentPage - siblingCount; page <= currentPage + siblingCount; page += 1) {
    if (page >= 1 && page <= totalPages) {
      pages.add(page)
    }
  }

  const sorted = [...pages].sort((a, b) => a - b)
  const range = []

  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) {
      range.push('ellipsis')
    }
    range.push(page)
  })

  return range
}

const navButtonClass =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white'

const pageButtonClass =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white font-sans text-sm font-medium text-[#4A4A4A] transition-colors hover:bg-gray-50'

const activePageButtonClass =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--ink)] font-sans text-sm font-semibold text-white transition-colors'

function Pagination({ currentPage, totalPages, onPageChange, siblingCount = 1 }) {
  if (totalPages <= 1) {
    return null
  }

  const pages = buildPageRange(currentPage, totalPages, siblingCount)
  const isFirstPage = currentPage <= 1
  const isLastPage = currentPage >= totalPages

  return (
    <nav className="mt-4 flex shrink-0 justify-center border-t border-border pt-4" aria-label="Paginação">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={isFirstPage}
          aria-label="Página anterior"
          className={navButtonClass}
        >
          <ChevronLeft size={18} className="text-gray-700" />
        </button>

        {pages.map((item, index) =>
          item === 'ellipsis' ? (
            <span
              key={`ellipsis-${index}`}
              className="inline-flex h-9 w-9 items-center justify-center font-sans text-sm text-gray-400"
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              aria-label={`Página ${item}`}
              aria-current={item === currentPage ? 'page' : undefined}
              className={item === currentPage ? activePageButtonClass : pageButtonClass}
            >
              {item}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={isLastPage}
          aria-label="Próxima página"
          className={navButtonClass}
        >
          <ChevronRight size={18} className="text-gray-700" />
        </button>
      </div>
    </nav>
  )
}

export default Pagination
