// Bọc localStorage an toàn (không vỡ app khi trình duyệt chặn storage).

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* bỏ qua nếu bị chặn */
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* bỏ qua */
  }
}
