import { useEffect, useRef, useState, useCallback } from 'react'
import { makeClient } from '../lib/supabase'
import { load, save } from '../lib/storage'
import { clampPage, pageCount, pageRange } from '../lib/pagination'

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
  const localPoemsRef = useRef(null)
  if (localPoemsRef.current === null) localPoemsRef.current = enabled ? [] : load(LOCAL_KEY, [])
  const [poems, setPoems] = useState(() => localPoemsRef.current.slice(0, PAGE_SIZE))
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loadingPage, setLoadingPage] = useState(false)
  const pageRef = useRef(page)
  const pageCountRef = useRef(totalPages)
  pageRef.current = page
  pageCountRef.current = totalPages

  const persistLocal = useCallback((list) => {
    if (enabled) return
    localPoemsRef.current = list
    save(LOCAL_KEY, list)
  }, [enabled])

  const showLocalPage = useCallback((requestedPage, list = localPoemsRef.current) => {
    const nextPageCount = pageCount(list.length, PAGE_SIZE)
    const nextPage = clampPage(requestedPage, nextPageCount)
    const { from, to } = pageRange(nextPage, PAGE_SIZE)
    setPoems(list.slice(from, to + 1))
    setPage(nextPage)
    setTotalPages(nextPageCount)
    pageRef.current = nextPage
    pageCountRef.current = nextPageCount
  }, [])
  const reload = useCallback(async (requestedPage = pageRef.current) => {
    const client = clientRef.current
    if (!enabled) { showLocalPage(requestedPage); return }
    if (!client) return
    setLoadingPage(true)
    try {
      const fetchPage = (nextPage) => {
        const { from, to } = pageRange(nextPage, PAGE_SIZE)
        return client.from('poems').select('*', { count: 'exact' }).eq('room_id', room)
          .order('created_at', { ascending: false }).range(from, to)
      }
      let nextPage = Math.max(1, Number(requestedPage) || 1)
      let result = await fetchPage(nextPage)
      if (result.error) throw result.error
      const nextPageCount = pageCount(result.count, PAGE_SIZE)
      if (nextPage > nextPageCount) {
        nextPage = nextPageCount
        result = await fetchPage(nextPage)
        if (result.error) throw result.error
      }
      const visible = (result.data || []).map(mapPoem)
      const ids = visible.map((poem) => poem.id)
      let interactions = []
      if (ids.length) {
        const interactionResult = await client.from('poem_interactions').select('*').in('poem_id', ids).order('created_at')
        if (interactionResult.error) throw interactionResult.error
        interactions = interactionResult.data || []
      }
      const byPoem = new Map()
      for (const row of interactions) { const list = byPoem.get(row.poem_id) || []; list.push(mapInteraction(row)); byPoem.set(row.poem_id, list) }
      setPoems(visible.map((poem) => ({ ...poem, comments: byPoem.get(poem.id) || [] })))
      setPage(nextPage)
      setTotalPages(nextPageCount)
      pageRef.current = nextPage
      pageCountRef.current = nextPageCount
      setError('')
    } catch (loadError) {
      setError(loadError.message || 'Tải Hoài niệm lỗi')
    } finally {
      setLoadingPage(false)
    }
  }, [enabled, room, showLocalPage])

  useEffect(() => {
    if (!enabled) {
      clientRef.current = null
      const localPoems = load(LOCAL_KEY, [])
      localPoemsRef.current = localPoems
      showLocalPage(1, localPoems)
      return undefined
    }
    let client
    try { client = makeClient(url, key) } catch { return undefined }
    clientRef.current = client
    pageRef.current = 1
    reload(1)
    const channel = client.channel(`poems:${room}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poems', filter: `room_id=eq.${room}` }, () => reload(pageRef.current))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poem_interactions', filter: `room_id=eq.${room}` }, () => reload(pageRef.current))
      .subscribe()
    return () => { try { client.removeChannel(channel) } catch { /* ignore */ } }
  }, [enabled, url, key, room, reload, showLocalPage])

  const goToPage = useCallback(async (requestedPage) => {
    const nextPage = clampPage(requestedPage, pageCountRef.current)
    if (nextPage === pageRef.current) return
    await reload(nextPage)
  }, [reload])

  const addPoem = useCallback((title, body, imageUrl = '') => {
    const cleanBody = String(body || '').trim(); if (!cleanBody) return
    const cleanTitle = String(title || '').trim(); const image = cleanImageUrl(imageUrl)
    if (enabled && clientRef.current) {
      clientRef.current.from('poems').insert({ room_id: room, author: username || 'Ẩn danh', title: cleanTitle || null, body: cleanBody, image_url: image || null, comments: [] })
        .then(({ error: insertError }) => { setError(insertError?.message || ''); if (!insertError) reload(1) }, (requestError) => setError(requestError.message || 'Đăng bài lỗi'))
    } else {
      const next = [{ id: rid(), author: username || 'Ẩn danh', title: cleanTitle, body: cleanBody, imageUrl: image, comments: [], ts: Date.now() }, ...localPoemsRef.current]
      persistLocal(next)
      showLocalPage(1, next)
    }
  }, [enabled, room, username, persistLocal, reload, showLocalPage])

  const editPoem = useCallback((id, title, body, imageUrl = '') => {
    const cleanBody = String(body || '').trim(); if (!cleanBody) return
    const cleanTitle = String(title || '').trim(); const image = cleanImageUrl(imageUrl)
    const next = localPoemsRef.current.map((poem) => (poem.id === id ? { ...poem, title: cleanTitle, body: cleanBody, imageUrl: image } : poem))
    if (enabled && clientRef.current) clientRef.current.from('poems').update({ title: cleanTitle || null, body: cleanBody, image_url: image || null }).eq('id', id).then(({ error: e }) => setError(e?.message || ''), (e) => setError(e.message || 'Sửa bài lỗi'))
    else {
      persistLocal(next)
      showLocalPage(pageRef.current, next)
    }
  }, [enabled, persistLocal, showLocalPage])

  const deletePoem = useCallback((id) => {
    if (enabled && clientRef.current) clientRef.current.from('poems').delete().eq('id', id).then(({ error: e }) => setError(e?.message || ''), (e) => setError(e.message || 'Xóa bài lỗi'))
    else {
      const next = localPoemsRef.current.filter((poem) => poem.id !== id)
      persistLocal(next)
      showLocalPage(pageRef.current, next)
    }
  }, [enabled, persistLocal, showLocalPage])

  const writeLocalComments = useCallback((poemId, comments) => {
    const next = localPoemsRef.current.map((poem) => (poem.id === poemId ? { ...poem, comments } : poem))
    persistLocal(next)
    showLocalPage(pageRef.current, next)
  }, [persistLocal, showLocalPage])

  const addComment = useCallback((poemId, text) => {
    const body = String(text || '').trim(); if (!body) return
    if (enabled && clientRef.current) clientRef.current.from('poem_interactions').insert({ poem_id: poemId, room_id: room, author: username || 'Ẩn danh', body }).then(({ error: e }) => setError(e?.message || ''), (e) => setError(e.message || 'Thêm bình luận lỗi'))
    else { const poem = localPoemsRef.current.find((item) => item.id === poemId); if (!poem) return; writeLocalComments(poemId, [...(poem.comments || []), { id: rid(), author: username || 'Ẩn danh', text: body, ts: Date.now() }]) }
  }, [enabled, room, username, writeLocalComments])

  const deleteComment = useCallback((poemId, commentId) => {
    if (enabled && clientRef.current) clientRef.current.from('poem_interactions').delete().eq('id', commentId).eq('poem_id', poemId).then(({ error: e }) => setError(e?.message || ''), (e) => setError(e.message || 'Xóa bình luận lỗi'))
    else { const poem = localPoemsRef.current.find((item) => item.id === poemId); if (!poem) return; writeLocalComments(poemId, (poem.comments || []).filter((item) => item.id !== commentId)) }
  }, [enabled, writeLocalComments])

  const toggleReaction = useCallback((poemId, emoji) => {
    if (emoji !== '❤️') return
    const author = username || 'Ẩn danh'
    if (enabled && clientRef.current) clientRef.current.rpc('toggle_poem_reaction', { p_poem_id: poemId, p_room_id: room, p_reaction: emoji, p_author: author }).then(({ error: e }) => { if (e) setError(e.message) }, (e) => setError(e.message || 'Thả cảm xúc lỗi'))
    else { const poem = localPoemsRef.current.find((item) => item.id === poemId); if (!poem) return; const items = poem.comments || []; const existing = items.find((item) => item.type === 'reaction' && item.emoji === emoji && item.author === author); writeLocalComments(poemId, existing ? items.filter((item) => item.id !== existing.id) : [...items, { id: rid(), type: 'reaction', emoji, author, ts: Date.now() }]) }
  }, [enabled, room, username, writeLocalComments])

  return { poems, error, addPoem, editPoem, deletePoem, addComment, deleteComment, toggleReaction, enabled, page, pageCount: totalPages, loadingPage, goToPage }
}
