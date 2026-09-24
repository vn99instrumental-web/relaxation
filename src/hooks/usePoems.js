import { useEffect, useRef, useState, useCallback } from 'react'
import { makeClient } from '../lib/supabase'
import { load, save } from '../lib/storage'

const LOCAL_KEY = 'vibe.poems'
const PAGE_SIZE = 20
const rid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
const cleanImageUrl = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  try { const url = new URL(raw); return ['http:', 'https:'].includes(url.protocol) ? url.href : '' } catch { return '' }
}
const mapPoem = (row) => ({ id: row.id, author: row.author, title: row.title || '', body: row.body, imageUrl: cleanImageUrl(row.image_url), comments: [], ts: new Date(row.created_at).getTime() })
const mapInteraction = (row) => row.reaction
  ? { id: row.id, type: 'reaction', emoji: row.reaction, author: row.author, ts: new Date(row.created_at).getTime() }
  : { id: row.id, author: row.author, text: row.body || '', ts: new Date(row.created_at).getTime() }

export function usePoems(config, username) {
  const { url, key, room } = config || {}
  const enabled = Boolean(url && key && room)
  const clientRef = useRef(null)
  const [poems, setPoems] = useState(() => (enabled ? [] : load(LOCAL_KEY, [])))
  const [error, setError] = useState('')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const poemsRef = useRef(poems)
  const limitRef = useRef(limit)
  poemsRef.current = poems
  limitRef.current = limit

  const persistLocal = useCallback((list) => { if (!enabled) save(LOCAL_KEY, list) }, [enabled])
  const reload = useCallback(async (requestedLimit = limitRef.current) => {
    const client = clientRef.current
    if (!client || !enabled) return
    try {
      const { data, error: poemsError } = await client.from('poems').select('*').eq('room_id', room).order('created_at', { ascending: false }).range(0, requestedLimit)
      if (poemsError) throw poemsError
      const rows = data || []
      const visible = rows.slice(0, requestedLimit).map(mapPoem)
      const ids = visible.map((poem) => poem.id)
      let interactions = []
      if (ids.length) {
        const result = await client.from('poem_interactions').select('*').in('poem_id', ids).order('created_at')
        if (result.error) throw result.error
        interactions = result.data || []
      }
      const byPoem = new Map()
      for (const row of interactions) { const list = byPoem.get(row.poem_id) || []; list.push(mapInteraction(row)); byPoem.set(row.poem_id, list) }
      setPoems(visible.map((poem) => ({ ...poem, comments: byPoem.get(poem.id) || [] })))
      setHasMore(rows.length > requestedLimit); setError('')
    } catch (loadError) { setError(loadError.message || 'Tải Hoài niệm lỗi') }
  }, [enabled, room])

  useEffect(() => {
    if (!enabled) { clientRef.current = null; setPoems(load(LOCAL_KEY, [])); setHasMore(false); return undefined }
    let client
    try { client = makeClient(url, key) } catch { return undefined }
    clientRef.current = client; setLimit(PAGE_SIZE); limitRef.current = PAGE_SIZE; reload(PAGE_SIZE)
    const channel = client.channel(`poems:${room}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poems', filter: `room_id=eq.${room}` }, () => reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poem_interactions', filter: `room_id=eq.${room}` }, () => reload())
      .subscribe()
    return () => { try { client.removeChannel(channel) } catch { /* ignore */ } }
  }, [enabled, url, key, room, reload])

  const loadMore = useCallback(async () => {
    if (!enabled || loadingMore || !hasMore) return
    const next = limitRef.current + PAGE_SIZE
    setLoadingMore(true); setLimit(next); limitRef.current = next; await reload(next); setLoadingMore(false)
  }, [enabled, loadingMore, hasMore, reload])

  const addPoem = useCallback((title, body, imageUrl = '') => {
    const cleanBody = String(body || '').trim(); if (!cleanBody) return
    const cleanTitle = String(title || '').trim(); const image = cleanImageUrl(imageUrl)
    if (enabled && clientRef.current) clientRef.current.from('poems').insert({ room_id: room, author: username || 'Ẩn danh', title: cleanTitle || null, body: cleanBody, image_url: image || null, comments: [] }).then(({ error: e }) => setError(e?.message || ''), (e) => setError(e.message || 'Đăng bài lỗi'))
    else { const next = [{ id: rid(), author: username || 'Ẩn danh', title: cleanTitle, body: cleanBody, imageUrl: image, comments: [], ts: Date.now() }, ...poemsRef.current]; setPoems(next); persistLocal(next) }
  }, [enabled, room, username, persistLocal])

  const editPoem = useCallback((id, title, body, imageUrl = '') => {
    const cleanBody = String(body || '').trim(); if (!cleanBody) return
    const cleanTitle = String(title || '').trim(); const image = cleanImageUrl(imageUrl)
    const next = poemsRef.current.map((poem) => (poem.id === id ? { ...poem, title: cleanTitle, body: cleanBody, imageUrl: image } : poem)); setPoems(next)
    if (enabled && clientRef.current) clientRef.current.from('poems').update({ title: cleanTitle || null, body: cleanBody, image_url: image || null }).eq('id', id).then(({ error: e }) => setError(e?.message || ''), (e) => setError(e.message || 'Sửa bài lỗi'))
    else persistLocal(next)
  }, [enabled, persistLocal])

  const deletePoem = useCallback((id) => {
    if (enabled && clientRef.current) clientRef.current.from('poems').delete().eq('id', id).then(({ error: e }) => setError(e?.message || ''), (e) => setError(e.message || 'Xóa bài lỗi'))
    else { const next = poemsRef.current.filter((poem) => poem.id !== id); setPoems(next); persistLocal(next) }
  }, [enabled, persistLocal])

  const writeLocalComments = useCallback((poemId, comments) => {
    const next = poemsRef.current.map((poem) => (poem.id === poemId ? { ...poem, comments } : poem)); setPoems(next); persistLocal(next)
  }, [persistLocal])

  const addComment = useCallback((poemId, text) => {
    const body = String(text || '').trim(); if (!body) return
    if (enabled && clientRef.current) clientRef.current.from('poem_interactions').insert({ poem_id: poemId, room_id: room, author: username || 'Ẩn danh', body }).then(({ error: e }) => setError(e?.message || ''), (e) => setError(e.message || 'Thêm bình luận lỗi'))
    else { const poem = poemsRef.current.find((item) => item.id === poemId); if (!poem) return; writeLocalComments(poemId, [...(poem.comments || []), { id: rid(), author: username || 'Ẩn danh', text: body, ts: Date.now() }]) }
  }, [enabled, room, username, writeLocalComments])

  const deleteComment = useCallback((poemId, commentId) => {
    if (enabled && clientRef.current) clientRef.current.from('poem_interactions').delete().eq('id', commentId).eq('poem_id', poemId).then(({ error: e }) => setError(e?.message || ''), (e) => setError(e.message || 'Xóa bình luận lỗi'))
    else { const poem = poemsRef.current.find((item) => item.id === poemId); if (!poem) return; writeLocalComments(poemId, (poem.comments || []).filter((item) => item.id !== commentId)) }
  }, [enabled, writeLocalComments])

  const toggleReaction = useCallback((poemId, emoji) => {
    if (emoji !== '❤️') return
    const author = username || 'Ẩn danh'
    if (enabled && clientRef.current) clientRef.current.rpc('toggle_poem_reaction', { p_poem_id: poemId, p_room_id: room, p_reaction: emoji, p_author: author }).then(({ error: e }) => { if (e) setError(e.message) }, (e) => setError(e.message || 'Thả cảm xúc lỗi'))
    else { const poem = poemsRef.current.find((item) => item.id === poemId); if (!poem) return; const items = poem.comments || []; const existing = items.find((item) => item.type === 'reaction' && item.emoji === emoji && item.author === author); writeLocalComments(poemId, existing ? items.filter((item) => item.id !== existing.id) : [...items, { id: rid(), type: 'reaction', emoji, author, ts: Date.now() }]) }
  }, [enabled, room, username, writeLocalComments])

  return { poems, error, addPoem, editPoem, deletePoem, addComment, deleteComment, toggleReaction, enabled, hasMore, loadingMore, loadMore }
}
