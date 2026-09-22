const RICH_MESSAGE_PREFIX = 'vibe-chat:v1:'

const cleanText = (value, max = 12000) => String(value || '').trim().slice(0, max)

export function safeChatImageUrl(value) {
  const url = String(value || '').trim()
  if (/^https?:\/\//i.test(url) || /^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(url)) return url
  return ''
}

export function normalizeChatReply(value) {
  if (!value || typeof value !== 'object') return null
  const id = cleanText(value.id, 160)
  const user = cleanText(value.user, 80)
  const text = cleanText(value.text, 260)
  const hasImage = Boolean(value.hasImage || value.imageUrl)
  if (!id && !user && !text && !hasImage) return null
  return { id, user, text, hasImage }
}

export function normalizeOutgoingChat(value) {
  if (typeof value === 'string') return { text: cleanText(value), imageFile: null, imageUrl: '', imagePath: '', replyTo: null }
  const source = value && typeof value === 'object' ? value : {}
  return {
    text: cleanText(source.text),
    imageFile: source.imageFile || null,
    imageUrl: safeChatImageUrl(source.imageUrl),
    imagePath: cleanText(source.imagePath, 500),
    replyTo: normalizeChatReply(source.replyTo),
  }
}

export function encodeChatBody(value) {
  const message = normalizeOutgoingChat(value)
  if (!message.imageUrl && !message.imagePath && !message.replyTo) return message.text
  return `${RICH_MESSAGE_PREFIX}${JSON.stringify({
    t: message.text,
    i: message.imageUrl,
    p: message.imagePath,
    q: message.replyTo,
  })}`
}

export function decodeChatBody(value) {
  const raw = String(value || '')
  if (!raw.startsWith(RICH_MESSAGE_PREFIX)) {
    return { text: raw, imageUrl: '', imagePath: '', replyTo: null }
  }
  try {
    const parsed = JSON.parse(raw.slice(RICH_MESSAGE_PREFIX.length))
    return {
      text: cleanText(parsed?.t),
      imageUrl: safeChatImageUrl(parsed?.i),
      imagePath: cleanText(parsed?.p, 500),
      replyTo: normalizeChatReply(parsed?.q),
    }
  } catch {
    return { text: raw, imageUrl: '', imagePath: '', replyTo: null }
  }
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(reader.error || new Error('Không đọc được ảnh.'))
    reader.readAsDataURL(file)
  })
}
