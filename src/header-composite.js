const COMPOSITE_SRC = '/brand-header-pine-title.webp'

function syncCompositeHeader() {
  const wordmark = document.querySelector('.brand__wordmark')
  if (!wordmark) return false

  const current = wordmark.getAttribute('src') || ''
  if (current !== COMPOSITE_SRC) wordmark.setAttribute('src', COMPOSITE_SRC)
  if (wordmark.getAttribute('width') !== '1368') wordmark.setAttribute('width', '1368')
  if (wordmark.getAttribute('height') !== '525') wordmark.setAttribute('height', '525')
  wordmark.dataset.compositeHeader = '1'
  return true
}

syncCompositeHeader()

// React still owns the element and may re-apply the JSX src on a later render.
// Keep the real <img> pointed at the composite without creating a second visual layer.
const observer = new MutationObserver(() => syncCompositeHeader())
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['src'],
})
