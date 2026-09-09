import { useEffect, useRef, useState, useCallback } from 'react'
import { readMessages, writeMessages, mergeMessages } from '../lib/gist'
import { load, save } from '../lib/storage'

const LOCAL_KEY = 'vibe.journal.local'
const POLL_MS = 6000

// Hook nhật ký:
//  - Nếu có token + gistId -> đồng bộ 2 người qua GitHub Gist (poll mỗi 6s).
//  - Nếu thiếu -> chạy offline, lưu localStorage trên máy.
export function useGistSync(config) {
  const { token, gistId, username, roomName } = config
  const online = Boolean(token && gistId)

  const [messages, setMessages] = useState(() => load(LOCAL_KEY, []))
  const [status, setStatus] = useState(online ? 'connecting' : 'offline') // offline|connecting|online|error
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const messagesRef = useRef(messages)
  messagesRef.current = messages
  const pollRef = useRef(null)

  const persistLocal = useCallback((list) => save(LOCAL_KEY, list), [])

  const refresh = useCallback(async () => {
    if (!online) return
    try {
      const { messages: remote } = await readMessages(token, gistId)
      const merged = mergeMessages(messagesRef.current, remote)
      setMessages(merged)
      persistLocal(merged)
      setStatus('online')
      setError('')
    } catch (e) {
      setStatus('error')
      setError(e.message || 'Không kết nối được Gist')
    }
  }, [online, token, gistId, persistLocal])

  // Khởi động / dừng poll theo cấu hình
  useEffect(() => {
    clearInterval(pollRef.current)
    if (online) {
      setStatus('connecting')
      refresh()
      pollRef.current = setInterval(refresh, POLL_MS)
    } else {
      setStatus('offline')
    }
    return () => clearInterval(pollRef.current)
  }, [online, refresh])

  const send = useCallback(async (text) => {
    const clean = String(text || '').trim()
    if (!clean) return
    const msg = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      user: username || 'Ẩn danh',
      text: clean,
      ts: Date.now(),
    }
    // cập nhật lạc quan ngay lập tức
    const optimistic = [...messagesRef.current, msg]
    setMessages(optimistic)
    persistLocal(optimistic)

    if (!online) return

    setSending(true)
    try {
      // gộp với bản mới nhất trên server để không đè mất tin của người kia
      const { messages: remote } = await readMessages(token, gistId)
      const merged = mergeMessages(remote, optimistic)
      await writeMessages(token, gistId, merged, roomName)
      setMessages(merged)
      persistLocal(merged)
      setStatus('online')
      setError('')
    } catch (e) {
      setStatus('error')
      setError(e.message || 'Gửi thất bại — sẽ thử lại ở lần đồng bộ sau')
    } finally {
      setSending(false)
    }
  }, [online, token, gistId, username, roomName, persistLocal])

  const clearLocal = useCallback(() => {
    setMessages([])
    persistLocal([])
  }, [persistLocal])

  return { messages, status, error, sending, online, send, refresh, clearLocal }
}
