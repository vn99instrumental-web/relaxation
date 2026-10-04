export function pageCount(totalItems, pageSize) {
  const size = Math.max(1, Number(pageSize) || 1)
  return Math.max(1, Math.ceil(Math.max(0, Number(totalItems) || 0) / size))
}

export function clampPage(page, totalPages) {
  return Math.max(1, Math.min(Math.max(1, Number(totalPages) || 1), Number(page) || 1))
}

export function pageRange(page, pageSize) {
  const size = Math.max(1, Number(pageSize) || 1)
  const safePage = Math.max(1, Number(page) || 1)
  const from = (safePage - 1) * size
  return { from, to: from + size - 1 }
}
