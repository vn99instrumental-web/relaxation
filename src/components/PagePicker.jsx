export default function PagePicker({ page = 1, pageCount = 1, loading = false, onSelect, label }) {
  const total = Math.max(1, Number(pageCount) || 1)

  return (
    <nav className="page-picker" aria-label={label}>
      <span className="page-picker__label">Trang</span>
      <div className="page-picker__pages">
        {Array.from({ length: total }, (_, index) => index + 1).map((pageNumber) => (
          <button key={pageNumber} type="button"
            className={`page-picker__button ${pageNumber === page ? 'is-current' : ''}`}
            aria-label={`Đến trang ${pageNumber}`} aria-current={pageNumber === page ? 'page' : undefined}
            disabled={loading || pageNumber === page}
            onClick={() => onSelect?.(pageNumber)}>
            {pageNumber}
          </button>
        ))}
      </div>
    </nav>
  )
}
