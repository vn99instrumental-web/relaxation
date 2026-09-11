import { useEffect, useRef, useState, useCallback } from 'react'
import { makeClient } from '../lib/supabase'

// Đồng bộ chat + playlist qua Supabase, có REALTIME (tin nhắn hiện ngay).
// config: { url, key, room }. Khi thiếu -> enabled=false (app dùng cách khác).
const mapMsg = (r) => ({ id: r.id, user: r.author, text: r.body, ts: new Date(r.created_at).getTime(), edited: !!r.edited_at, editedTs: r.edited_at ? new Date(r.edited_at).getTime() : null, reactions: r.reactions && typeof r.reactions === 'object' ? r.reactions : {} })
const mapPl = (r) => ({ id: r.id, name: r.name, tracks: Array.isArray(r.tracks) ? r.tracks : [], ts: new Date(r.created_at).getTime() })

function mergeById(list, incoming) {
  const map = new Map(list.map((m) => [m.id, m]))
  for (const m of incoming) map.set(m.id, m)
  return [...map.values()].sort((a, b) => (a.ts || 0) - (b.ts || 0))
}

export function useSupabaseRoom(config, username) {
  const { url, key, room } = config || {}
  const enabled = Boolean(url && key && room)

  const clientRef = useRef(null)
  const [messages, setMessages] = useState([])
  const [playlists, setPlaylists] = useState([])
  const [status, setStatus] = useState(enabled ? 'connecting' : 'offline') // offline|connecting|online|error
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const reloadPlaylists = useCallback(async () => {
    const c = clientRef.current
    if (!c) return
    const { data } = await c.from('playlists').select('*').eq('room_id', room).order('created_at', { ascending: false })
    setPlaylists((data || []).map(mapPl))
  }, [room])

  const refresh = useCallback(async () => {
    const c = clientRef.current
    if (!c) return
    try {
      const { data, error: e } = await c.from('messages').select('*').eq('room_id', room).order('created_at')
      if (e) throw e
      setMessages((data || []).map(mapMsg))
      setStatus('online'); setError('')
    } catch (e) {
      setStatus('error'); setError(e.message || 'Lỗi Supabase')
    }
  }, [room])

  useEffect(() => {
    if (!enabled) { clientRef.current = null; setStatus('offline'); setMessages([]); setPlaylists([]); return }
    let cancelled = false
    let client
    try { client = makeClient(url, key) } catch (e) { setStatus('error'); setError(String(e.message)); return }
    clientRef.current = client
    setStatus('connecting'); setError('')

    // đảm bảo phòng tồn tại (không lỗi nếu đã có)
    client.from('rooms').upsert({ id: room }).then(() => {}, () => {})

    const loadAll = async () => {
      try {
        const [m, p] = await Promise.all([
          client.from('messages').select('*').eq('room_id', room).order('created_at'),
          client.from('playlists').select('*').eq('room_id', room).order('created_at', { ascending: false }),
        ])
        if (cancelled) return
        if (m.error) throw m.error
        setMessages((m.data || []).map(mapMsg))
        setPlaylists((p.data || []).map(mapPl))
        setStatus('online'); setError('')
      } catch (e) {
        if (!cancelled) { setStatus('error'); setError(e.message || 'Không kết nối được Supabase') }
      }
    }
    loadAll()

    const ch = client
      .channel(`room:${room}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${room}` },
        (payload) => setMessages((prev) => mergeById(prev, [mapMsg(payload.new)])))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `room_id=eq.${room}` },
        (payload) => setMessages((prev) => mergeById(prev, [mapMsg(payload.new)])))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `room_id=eq.${room}` },
        (payload) => setMessages((prev) => prev.filter((m) => m.id !== payload.old.id)))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'playlists', filter: `room_id=eq.${room}` },
        () => reloadPlaylists())
      .subscribe((s) => { if (s === 'SUBSCRIBED' && !cancelled) setStatus('online') })

    return () => { cancelled = true; try { client.removeChannel(ch) } catch { /* ignore */ } }
  }, [enabled, url, key, room, reloadPlaylists])

  const send = useCallback(async (text) => {
    const clean = String(text || '').trim()
    const c = clientRef.current
    if (!clean || !c) return
    setSending(true)
    try {
      const { error: e } = await c.from('messages').insert({ room_id: room, author: username || 'Ẩn danh', body: clean })
      if (e) throw e
      setError('')
    } catch (e) {
      setError(e.message || 'Gửi thất bại')
    } finally { setSending(false) }
    // realtime sẽ tự thêm tin vào danh sách
  }, [room, username])

  const deleteMessage = useCallback(async (id) => {
    const c = clientRef.current
    if (!c) return
    setMessages((prev) => prev.filter((m) => m.id !== id)) // xóa ngay trên máy mình
    try { await c.from('messages').delete().eq('id', id) } catch (e) { setError(e.message || 'Xóa lỗi') }
  }, [])

  const clearMessages = useCallback(async () => {
    const c = clientRef.current
    if (!c) return
    setMessages([])
    try { await c.from('messages').delete().eq('room_id', room) } catch (e) { setError(e.message || 'Xóa lỗi') }
  }, [room])

  const editMessage = useCallback(async (id, text) => {
    const clean = String(text || '').trim()
    const c = clientRef.current
    if (!clean || !c) return
    const nowIso = new Date().toISOString()
    // sửa ngay trên máy mình (lạc quan)
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text: clean, edited: true, editedTs: Date.now() } : m)))
    try { await c.from('messages').update({ body: clean, edited_at: nowIso }).eq('id', id) } catch (e) { setError(e.message || 'Sửa lỗi') }
    // realtime sẽ đồng bộ cho người kia
  }, [])

  // Thả cảm xúc (like/tim…) — lưu vào cột jsonb reactions: { '❤️': ['Mai'], … }
  const reactMessage = useCallback(async (id, reactions) => {
    const c = clientRef.current
    if (!c) return
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, reactions } : m))) // lạc quan
    try { await c.from('messages').update({ reactions }).eq('id', id) } catch (e) { setError(e.message || 'Thả cảm xúc lỗi') }
    // realtime UPDATE sẽ đồng bộ cho người kia
  }, [])

  const savePlaylistRow = useCallback(async (name, tracks) => {
    const c = clientRef.current
    if (!c) return
    try { await c.from('playlists').insert({ room_id: room, name, tracks }) } catch (e) { setError(e.message || 'Lưu playlist lỗi') }
    reloadPlaylists()
  }, [room, reloadPlaylists])

  const deletePlaylistRow = useCallback(async (id) => {
    const c = clientRef.current
    if (!c) return
    try { await c.from('playlists').delete().eq('id', id) } catch (e) { setError(e.message || 'Xóa playlist lỗi') }
    reloadPlaylists()
  }, [reloadPlaylists])

  const updatePlaylistRow = useCallback(async (id, tracks) => {
    const c = clientRef.current
    if (!c) return
    try { await c.from('playlists').update({ tracks, updated_at: new Date().toISOString() }).eq('id', id) } catch (e) { setError(e.message || 'Cập nhật playlist lỗi') }
    reloadPlaylists()
  }, [reloadPlaylists])

  const renamePlaylistRow = useCallback(async (id, name) => {
    const c = clientRef.current
    if (!c) return
    setPlaylists((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p))) // đổi ngay trên máy mình
    try { await c.from('playlists').update({ name, updated_at: new Date().toISOString() }).eq('id', id) } catch (e) { setError(e.message || 'Đổi tên playlist lỗi') }
    reloadPlaylists()
  }, [reloadPlaylists])

  const journal = { messages, status, error, sending, online: enabled && status === 'online', send, refresh, deleteMessage, editMessage, reactMessage, clearMessages }

  return { enabled, status, error, journal, playlists, savePlaylistRow, deletePlaylistRow, updatePlaylistRow, renamePlaylistRow, deleteMessage, editMessage, reactMessage, clearMessages }
}
