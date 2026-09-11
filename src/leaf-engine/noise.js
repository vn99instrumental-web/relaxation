// Perlin noise 3D gọn nhẹ (cải tiến của Ken Perlin) để tạo turbulence & drift gió.
// Sinh bảng hoán vị ngẫu nhiên có seed cố định (không cần dán 256 số).
const perm = new Uint8Array(512)
;(function build() {
  const p = Array.from({ length: 256 }, (_, i) => i)
  let seed = 1337
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[p[i], p[j]] = [p[j], p[i]]
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]
})()

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10)
const lerp = (t, a, b) => a + t * (b - a)
function grad(hash, x, y, z) {
  const h = hash & 15
  const u = h < 8 ? x : y
  const v = h < 4 ? y : (h === 12 || h === 14 ? x : z)
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
}

// -> khoảng [-1, 1]
export function perlin3(x, y, z) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255
  x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z)
  const u = fade(x), v = fade(y), w = fade(z)
  const A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z
  const B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z
  return lerp(w,
    lerp(v,
      lerp(u, grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z)),
      lerp(u, grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z))),
    lerp(v,
      lerp(u, grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1)),
      lerp(u, grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1))))
}
