import part0 from '../assets/brand-header/part-00.b64?raw'
import part1 from '../assets/brand-header/part-01.b64?raw'
import part2 from '../assets/brand-header/part-02.b64?raw'

// Render the approved header as one immutable image. The artwork is not rebuilt
// from separate CSS layers, so branch/title/tagline/poem keep their exact layout.
const encoded = `${part0.trim()}${part1.trim()}${part2.trim()}`
const binary = atob(encoded)
const bytes = new Uint8Array(binary.length)
for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
const headerUrl = URL.createObjectURL(new Blob([bytes], { type: 'image/webp' }))

function applyExactHeader() {
  const brand = document.querySelector('.brand')
  if (!brand || brand.classList.contains('brand--exact-static')) return Boolean(brand)
  brand.classList.add('brand--exact-static')
  brand.style.setProperty('--brand-exact-image', `url("${headerUrl}")`)
  brand.setAttribute('aria-label', 'Dưới Tán Thông — thương thành phố mù sương')
  return true
}

if (!applyExactHeader()) {
  const observer = new MutationObserver(() => {
    if (applyExactHeader()) observer.disconnect()
  })
  observer.observe(document.documentElement, { childList: true, subtree: true })
}
