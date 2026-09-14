function applyCompositeHeader() {
  const brand = document.querySelector('.brand')
  const wordmark = brand?.querySelector('.brand__wordmark')
  if (!brand || !wordmark) return false
  if (wordmark.dataset.compositeHeader === '1') return true

  const oldPine = brand.querySelector('.brand__pine')
  if (oldPine) oldPine.remove()

  wordmark.src = '/brand-header-pine-title.webp'
  wordmark.width = 1368
  wordmark.height = 525
  wordmark.dataset.compositeHeader = '1'
  wordmark.classList.add('brand__wordmark--composite')
  brand.classList.add('brand--composite')
  return true
}

if (!applyCompositeHeader()) {
  const observer = new MutationObserver(() => {
    if (applyCompositeHeader()) observer.disconnect()
  })
  observer.observe(document.documentElement, { childList: true, subtree: true })
}
