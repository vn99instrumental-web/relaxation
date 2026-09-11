import { useEffect, useRef, useState, useCallback } from 'react'
import { makeClient } from '../lib/supabase'
import { load, save } from '../lib/storage'

// Góc Thơ: đăng thơ + bình luận trên từng bài. Dùng Supabase (realtime) khi bật,
// không thì lưu localStorage. Bình luận lưu trong cột jsonb của mỗi bài.
const LOCAL_KEY = 'vibe.poems'
const rid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
const mapPoem = (r) => ({
  id: r.id, author: r.author, title: r.title || '', body: r.body,
  comments: Array.isArray(r.comments) ? r.comments : [], ts: new Date(r.created_at).getTime(),
})

export function usePoems(config, username) {
  const { url, key, room } = config || {}
  const enabled = Boolean(url && key && room)
  const clientRef = useRef(null)
  const [poems, setPoems] = useState(() => (enabled ? [] : load(LOCAL_KEY, [])))
  const poemsRef = useRef(poems)
  poemsRef.current = poems

  const persistLocal = useCallback((list) => { if (!enabled) save(LOCAL_KEY, list) }, [enabled])

  useEffect(() => {
    if (!enabled) { clientRef.current = null; setPoems(load(LOCAL_KEY, [])); return undefined }
    let cancelled = false
    let client
    try { client = makeClient(url, key) } catch { return undefined }
    clientRef.current = client
    const reload = () => client.from('poems').select('*').eq('room_id', room).order('created_at', { ascending: false })
      .then(({ data }) => { if (!cancelled && data) setPoems(data.map(mapPoem)) }, () => {})
    reload()
    const ch = client
      .channel(`poems:${room}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poems', filter: `room_id=eq.${room}` }, reload)
      .subscribe()
    return () => { cancelled = true; try { client.removeChannel(ch) } catch { /* ignore */ } }
  }, [enabled, url, key, room])

  const addPoem = useCallback((title, body) => {
    const b = String(body || '').trim()
    if (!b) return
    const t = String(title || '').trim()
    if (enabled && clientRef.current) {
      clientRef.current.from('poems').insert({ room_id: room, author: username || 'Ẩn danh', title: t || null, body: b, comments: [] }).then(() => {}, () => {})
    } else {
      const next = [{ id: rid(), author: username || 'Ẩn danh', title: t, body: b, comments: [], ts: Date.now() }, ...poemsRef.current]
      setPoems(next); persistLocal(next)
    }
  }, [enabled, room, username, persistLocal])

  const deletePoem = useCallback((id) => {
    if (enabled && clientRef.current) clientRef.current.from('poems').delete().eq('id', id).then(() => {}, () => {})
    else { const next = poemsRef.current.filter((p) => p.id !== id); setPoems(next); persistLocal(next) }
  }, [enabled, persistLocal])

  const writeComments = useCallback((poemId, comments) => {
    if (enabled && clientRef.current) {
      setPoems((list) => list.map((p) => (p.id === poemId ? { ...p, comments } : p)))
      clientRef.current.from('poems').update({ comments }).eq('id', poemId).then(() => {}, () => {})
    } else {
      const next = poemsRef.current.map((p) => (p.id === poemId ? { ...p, comments } : p))
      setPoems(next); persistLocal(next)
    }
  }, [enabled, persistLocal])

  const addComment = useCallback((poemId, text) => {
    const t = String(text || '').trim()
    if (!t) return
    const poem = poemsRef.current.find((p) => p.id === poemId)
    if (!poem) return
    writeComments(poemId, [...poem.comments, { id: rid(), author: username || 'Ẩn danh', text: t, ts: Date.now() }])
  }, [username, writeComments])

  const deleteComment = useCallback((poemId, commentId) => {
    const poem = poemsRef.current.find((p) => p.id === poemId)
    if (!poem) return
    writeComments(poemId, poem.comments.filter((c) => c.id !== commentId))
  }, [writeComments])

  return { poems, addPoem, deletePoem, addComment, deleteComment, enabled }
}
