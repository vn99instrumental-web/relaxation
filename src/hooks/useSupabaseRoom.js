import { useEffect, useRef, useState, useCallback } from 'react'
import { makeClient } from '../lib/supabase'
import { decodeChatBody, encodeChatBody, normalizeOutgoingChat } from '../lib/chatMessage'

// Đồng bộ chat + playlist qua Supabase, có REALTIME (tin nhắn hiện ngay).
// config: { url, key, room }. Khi thiếu -> enabled=false (app dùng cách khác).
const CHAT_IMAGE_BUCKET = 'backgrounds'
const MESSAGE_PAGE_SIZE = 50
const mapMsg = (r) => ({ id: r.id, user: r.author, ...decodeChatBody(r.body), ts: new Date(r.created_at).getTime(), edited: !!r.edited_at, editedTs: r.edited_at ? new Date(r.edited_at).getTime() : null, reactions: r.reactions && typeof r.reactions === 'object' ? r.reactions : {} })
const mapPl = (r) => ({ id: r.id, name: r.name, tracks: Array.isArray(r.tracks) ? r.tracks : [], ts: new Date(r.updated_at || r.created_at).getTime() })

export function useSupabaseRoom(config, username) {
  const { url, key, room } = config || {}
  const enabled = Boolean(url && key && room)
  const chatImageFolder = `journal/${String(room || 'room').replace(/[^a-z0-9_-]/gi, '_').slice(0, 80)}`

  const clientRef = useRef(null)
  const [messages, setMessages] = useState([])
  const [playlists, setPlaylists] = useState([])
  const [status, setStatus] = useState(enabled ? 'connecting' : 'offline')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [accessAllowed, setAccessAllowed] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [accessStatus, setAccessStatus] = useState(username ? 'checking' : 'locked')
  const [messageLimit, setMessageLimit] = useState(MESSAGE_PAGE_SIZE)
  const [hasMoreMessages, setHasMoreMessages] = useState(false)
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false)
  const messagesRef = useRef(messages)
  const messageLimitRef = useRef(messageLimit)
  messagesRef.current = messages
  messageLimitRef.current = messageLimit

  const hydrateReactions = useCallback(async (client, rows) => {
    if (!rows.length) return []
    const { data, error: reactionError } = await client.from('message_reactions').select('*').in('message_id', rows.map((row) => row.id))
    if (reactionError) throw reactionError
    const grouped = new Map()
    for (const reaction of data || []) {
      const reactions = grouped.get(reaction.message_id) || {}
      reactions[reaction.emoji] = [...(reactions[reaction.emoji] || []), reaction.author]
      grouped.set(reaction.message_id, reactions)
    }
    return rows.map((row) => ({ ...mapMsg(row), reactions: grouped.get(row.id) || {} }))
  }, [])

  const verifyAccess = useCallback(async (name) => {
    const clean = String(name || '').trim()
    if (!enabled || !clean) {
      setAccessAllowed(false)
      setIsAdmin(false)
      setAccessStatus('locked')
      return { allowed: false, displayName: null }
    }
    setAccessStatus('checking')
    try {
      const c = clientRef.current || makeClient(url, key)
      const { data, error: e } = await c.rpc('check_journal_user', { p_username: clean })
      if (e) throw e
      const row = Array.isArray(data) ? data[0] : data
      const allowed = Boolean(row?.allowed)
      const nextAdmin = allowed && Boolean(row?.is_admin)
      setAccessAllowed(allowed)
      setIsAdmin(nextAdmin)
      setAccessStatus(allowed ? 'allowed' : 'locked')
      if (!allowed) setMessages([])
      return { allowed, displayName: row?.display_name || clean, isAdmin: nextAdmin }
    } catch (e) {
      setAccessAllowed(false)
      setIsAdmin(false)
      setAccessStatus('error')
      setMessages([])
      return { allowed: false, displayName: null, error: e }
    }
  }, [enabled, url, key])

  const lockJournal = useCallback(() => {
    setAccessAllowed(false)
    setIsAdmin(false)
    setAccessStatus('locked')
    setMessages([])
  }, [])

  const reloadPlaylists = useCallback(async () => {
    const c = clientRef.current
    if (!c) return
    const { data, error: e } = await c.from('playlists').select('*').eq('room_id', room)
      .order('updated_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })
    if (e) { setError(e.message || 'Tải playlist lỗi'); return }
    setPlaylists((data || []).map(mapPl))
  }, [room])

  const refresh = useCallback(async (requestedLimit = messageLimitRef.current) => {
    const c = clientRef.current
    if (!c || !accessAllowed) return
    try {
      const { data, error: e } = await c.from('messages').select('*').eq('room_id', room)
        .order('created_at', { ascending: false }).range(0, requestedLimit)
      if (e) throw e
      const rows = data || []
      const visible = rows.slice(0, requestedLimit).reverse()
      setMessages(await hydrateReactions(c, visible))
      setHasMoreMessages(rows.length > requestedLimit)
      setStatus('online'); setError('')
    } catch (e) {
      setStatus('error'); setError(e.message || 'Lỗi Supabase')
    }
  }, [room, accessAllowed, hydrateReactions])

  const loadMoreMessages = useCallback(async () => {
    if (!accessAllowed || loadingMoreMessages || !hasMoreMessages) return
    const next = messageLimitRef.current + MESSAGE_PAGE_SIZE
    setLoadingMoreMessages(true); setMessageLimit(next); messageLimitRef.current = next
    await refresh(next)
    setLoadingMoreMessages(false)
  }, [accessAllowed, loadingMoreMessages, hasMoreMessages, refresh])

  useEffect(() => {
    if (!enabled) {
      clientRef.current = null
      setStatus('offline')
      setMessages([])
      setPlaylists([])
      setAccessAllowed(false)
      setIsAdmin(false)
      setAccessStatus('locked')
      return
    }
    let cancelled = false
    let client
    try { client = makeClient(url, key) } catch (e) { setStatus('error'); setError(String(e.message)); return }
    clientRef.current = client
    setStatus('connecting'); setError('')

    client.from('rooms').upsert({ id: room }).then(({ error: e }) => { if (e && !cancelled) setError(e.message) })

    const loadBase = async () => {
      try {
        const { data, error: e } = await client.from('playlists').select('*').eq('room_id', room)
          .order('updated_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })
        if (cancelled) return
        if (e) throw e
        setPlaylists((data || []).map(mapPl))
        setStatus('online'); setError('')
      } catch (e) {
        if (!cancelled) { setStatus('error'); setError(e.message || 'Không kết nối được Supabase') }
      }
    }
    loadBase()

    let ch = client
      .channel(`room:${room}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'playlists', filter: `room_id=eq.${room}` },
        () => reloadPlaylists())

    if (accessAllowed) {
      ch = ch
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${room}` }, () => refresh())
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `room_id=eq.${room}` }, () => refresh())
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `room_id=eq.${room}` },
          (payload) => setMessages((prev) => prev.filter((m) => m.id !== payload.old.id)))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions', filter: `room_id=eq.${room}` }, () => refresh())
    }

    ch.subscribe((s) => { if (s === 'SUBSCRIBED' && !cancelled) setStatus('online') })

    return () => { cancelled = true; try { client.removeChannel(ch) } catch { /* ignore */ } }
  }, [enabled, url, key, room, reloadPlaylists, accessAllowed, refresh])

  useEffect(() => {
    if (!enabled) return
    verifyAccess(username)
  }, [enabled, username, verifyAccess])

  useEffect(() => {
    if (accessAllowed) refresh()
    else setMessages([])
  }, [accessAllowed, refresh])

  const send = useCallback(async (value) => {
    const outgoing = normalizeOutgoingChat(value)
    const c = clientRef.current
    if ((!outgoing.text && !outgoing.imageFile && !outgoing.imageUrl) || !c || !accessAllowed) return { ok: false }
    setSending(true)
    let uploadedPath = ''
    try {
      let imageUrl = outgoing.imageUrl
      if (outgoing.imageFile) {
        const file = outgoing.imageFile
        if (!String(file.type || '').startsWith('image/')) throw new Error('Tệp đã chọn không phải ảnh.')
        const extFromName = String(file.name || '').split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '')
        const extFromType = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[file.type]
        const ext = extFromType || extFromName || 'jpg'
        const fileId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
        uploadedPath = `${chatImageFolder}/${fileId}.${ext}`
        const upload = await c.storage.from(CHAT_IMAGE_BUCKET).upload(uploadedPath, file, {
          cacheControl: '86400', contentType: file.type || 'image/jpeg', upsert: false,
        })
        if (upload.error) throw upload.error
        imageUrl = c.storage.from(CHAT_IMAGE_BUCKET).getPublicUrl(uploadedPath).data.publicUrl
      }
      const body = encodeChatBody({ ...outgoing, imageUrl, imagePath: uploadedPath || outgoing.imagePath })
      const { error: e } = await c.from('messages').insert({ room_id: room, author: username || 'Ẩn danh', body })
      if (e) throw e
      setError('')
      return { ok: true }
    } catch (e) {
      if (uploadedPath) {
        try { await c.storage.from(CHAT_IMAGE_BUCKET).remove([uploadedPath]) } catch { /* ignore cleanup */ }
      }
      setError(e.message || 'Gửi thất bại')
      return { ok: false, error: e.message || 'Gửi thất bại' }
    } finally { setSending(false) }
  }, [room, username, accessAllowed, chatImageFolder])

  const deleteMessage = useCallback(async (id) => {
    const c = clientRef.current
    if (!c || !accessAllowed) return
    const removed = messagesRef.current.find((m) => m.id === id)
    setMessages((prev) => prev.filter((m) => m.id !== id))
    try {
      const { error: e } = await c.from('messages').delete().eq('id', id)
      if (e) throw e
      if (removed?.imagePath?.startsWith(`${chatImageFolder}/`)) {
        const { error: storageError } = await c.storage.from(CHAT_IMAGE_BUCKET).remove([removed.imagePath])
        if (storageError) throw storageError
      }
    } catch (e) { setError(e.message || 'Xóa lỗi'); refresh() }
  }, [accessAllowed, refresh, chatImageFolder])

  const clearMessages = useCallback(async () => {
    const c = clientRef.current
    if (!c || !accessAllowed) return
    const imagePaths = messagesRef.current.map((m) => m.imagePath).filter((path) => path?.startsWith(`${chatImageFolder}/`))
    setMessages([])
    try {
      const { error: e } = await c.from('messages').delete().eq('room_id', room)
      if (e) throw e
      if (imagePaths.length) await c.storage.from(CHAT_IMAGE_BUCKET).remove(imagePaths)
    } catch (e) { setError(e.message || 'Xóa lỗi'); refresh() }
  }, [room, accessAllowed, refresh, chatImageFolder])

  const editMessage = useCallback(async (id, text) => {
    const clean = String(text || '').trim()
    const c = clientRef.current
    if (!clean || !c || !accessAllowed) return
    const nowIso = new Date().toISOString()
    const current = messagesRef.current.find((m) => m.id === id)
    const body = encodeChatBody({ ...current, text: clean })
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text: clean, edited: true, editedTs: Date.now() } : m)))
    try {
      const { error: e } = await c.from('messages').update({ body, edited_at: nowIso }).eq('id', id)
      if (e) throw e
    } catch (e) { setError(e.message || 'Sửa lỗi') }
  }, [accessAllowed])

  const reactMessage = useCallback(async (id, reactions) => {
    const c = clientRef.current
    if (!c || !accessAllowed) return
    const current = messagesRef.current.find((message) => message.id === id)
    const emojis = new Set([...Object.keys(current?.reactions || {}), ...Object.keys(reactions || {})])
    const changedEmoji = [...emojis].find((emoji) => {
      const before = (current?.reactions?.[emoji] || []).includes(username || 'Ẩn danh')
      const after = (reactions?.[emoji] || []).includes(username || 'Ẩn danh')
      return before !== after
    })
    if (!changedEmoji) return
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, reactions } : m)))
    try {
      const { error: e } = await c.rpc('toggle_message_reaction', { p_message_id: id, p_room_id: room, p_emoji: changedEmoji, p_author: username || 'Ẩn danh' })
      if (e) throw e
    } catch (e) { setError(e.message || 'Thả cảm xúc lỗi'); refresh() }
  }, [accessAllowed, room, username, refresh])

  const savePlaylistRow = useCallback(async (name, tracks) => {
    const c = clientRef.current
    if (!c) return
    try { const { error: e } = await c.from('playlists').insert({ room_id: room, name, tracks }); if (e) throw e; setError('') } catch (e) { setError(e.message || 'Lưu playlist lỗi') }
    reloadPlaylists()
  }, [room, reloadPlaylists])

  const deletePlaylistRow = useCallback(async (id) => {
    const c = clientRef.current
    if (!c) return
    try { const { error: e } = await c.from('playlists').delete().eq('id', id); if (e) throw e; setError('') } catch (e) { setError(e.message || 'Xóa playlist lỗi') }
    reloadPlaylists()
  }, [reloadPlaylists])

  const updatePlaylistRow = useCallback(async (id, tracks) => {
    const c = clientRef.current
    if (!c) return
    setPlaylists((prev) => prev.map((p) => (p.id === id ? { ...p, tracks } : p)))
    try { const { error: e } = await c.from('playlists').update({ tracks, updated_at: new Date().toISOString() }).eq('id', id); if (e) throw e; setError('') } catch (e) { setError(e.message || 'Cập nhật playlist lỗi') }
    reloadPlaylists()
  }, [reloadPlaylists])

  const renamePlaylistRow = useCallback(async (id, name) => {
    const c = clientRef.current
    if (!c) return
    setPlaylists((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)))
    try { const { error: e } = await c.from('playlists').update({ name, updated_at: new Date().toISOString() }).eq('id', id); if (e) throw e; setError('') } catch (e) { setError(e.message || 'Đổi tên playlist lỗi') }
    reloadPlaylists()
  }, [reloadPlaylists])

  const importPlaylistRows = useCallback(async (incoming, { replace = false } = {}) => {
    const c = clientRef.current
    const source = Array.isArray(incoming) ? incoming : []
    if (!c) return { ok: false, error: 'Chưa kết nối được phòng dùng chung.' }
    try {
      const { data: count, error: importError } = await c.rpc('import_room_playlists', { p_room_id: room, p_playlists: source, p_replace: replace })
      if (importError) throw importError
      await reloadPlaylists()
      setError('')
      return { ok: true, count: Number(count) || 0 }
    } catch (e) {
      const message = e.message || 'Khôi phục playlist lỗi'
      setError(message)
      await reloadPlaylists()
      return { ok: false, error: message }
    }
  }, [room, reloadPlaylists])

  const movePlaylistTrack = useCallback(async (sourceId, sourceIndex, targetId) => {
    const c = clientRef.current
    if (!c) return { ok: false }
    try {
      const { error: moveError } = await c.rpc('move_playlist_track', { p_room_id: room, p_source_id: sourceId, p_source_index: sourceIndex, p_target_id: targetId })
      if (moveError) throw moveError
      await reloadPlaylists(); setError(''); return { ok: true }
    } catch (moveError) { setError(moveError.message || 'Chuyển bài hát lỗi'); await reloadPlaylists(); return { ok: false } }
  }, [room, reloadPlaylists])

  const journal = {
    messages, status, error, sending, online: enabled && status === 'online',
    send, refresh, deleteMessage, editMessage, reactMessage, clearMessages,
    hasMore: hasMoreMessages, loadingMore: loadingMoreMessages, loadMore: loadMoreMessages,
    accessAllowed, accessStatus, isAdmin, unlock: verifyAccess, lock: lockJournal,
  }

  return { enabled, status, error, journal, playlists, savePlaylistRow, deletePlaylistRow, updatePlaylistRow, renamePlaylistRow, importPlaylistRows, movePlaylistTrack, deleteMessage, editMessage, reactMessage, clearMessages }
}
