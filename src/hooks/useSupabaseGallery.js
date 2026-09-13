import { useEffect, useRef, useState, useCallback } from 'react'
import { makeClient } from '../lib/supabase'

// Thư viện ảnh nền dùng chung qua Supabase (bảng public.backgrounds + Storage 'backgrounds').
// Ai thêm/xóa/đổi tên ảnh thì cả 2 người thấy (realtime). File upload nằm trên Supabase Storage.
const BUCKET = 'backgrounds'

function thumbFor(url) {
  if (!url) return ''
  if (url.includes('images.pexels.com') && url.includes('w=1920')) return url.replace('w=1920', 'w=400')
  return url
}
const mapRow = (r) => ({ id: r.id, label: r.label, url: r.url, path: r.path, sort: r.sort, thumb: thumbFor(r.url) })

export function useSupabaseGallery(config) {
  const { url, key, room } = config || {}
  const enabled = Boolean(url && key && room)

  const clientRef = useRef(null)
  const [items, setItems] = useState([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const rowsRef = useRef([])
  rowsRef.current = items

  const reload = useCallback(async () => {
    const c = clientRef.current
    if (!c) return
    const { data, error: e } = await c.from('backgrounds').select('*').eq('room_id', room).order('sort').order('created_at')
    if (e) { setError(e.message); return }
    setItems((data || []).map(mapRow)); setReady(true); setError('')
  }, [room])

  useEffect(() => {
    if (!enabled) { clientRef.current = null; setItems([]); setReady(false); return }
    let cancelled = false
    let client
    try { client = makeClient(url, key) } catch (e) { setError(String(e.message)); return }
    clientRef.current = client
    reload()
    const ch = client
      .channel(`bg:${room}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'backgrounds', filter: `room_id=eq.${room}` },
        () => { if (!cancelled) reload() })
      .subscribe()
    return () => { cancelled = true; try { client.removeChannel(ch) } catch { /* ignore */ } }
  }, [enabled, url, key, room, reload])

  const addImage = useCallback(async ({ label, file, url: extUrl }) => {
    const c = clientRef.current
    if (!c) return
    let finalUrl = extUrl || ''
    let path = null
    try {
      if (file) {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
        path = `${room}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`
        const up = await c.storage.from(BUCKET).upload(path, file, { contentType: file.type || 'image/jpeg' })
        if (up.error) throw up.error
        finalUrl = c.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
      }
      const id = `${room}__u${Date.now()}${Math.random().toString(36).slice(2, 5)}`
      const sort = rowsRef.current.reduce((m, x) => Math.max(m, x.sort || 0), 0) + 1
      const { error: e } = await c.from('backgrounds').insert({ id, room_id: room, label: label || 'Ảnh của tôi', url: finalUrl, path, sort })
      if (e) throw e
      reload()
      return id
    } catch (e) {
      setError(e.message || 'Thêm ảnh lỗi')
    }
  }, [room, reload])

  const removeImage = useCallback(async (id) => {
    const c = clientRef.current
    if (!c) return
    const row = rowsRef.current.find((r) => r.id === id)
    setItems((list) => list.filter((r) => r.id !== id)) // xóa ngay trên máy mình
    try {
      if (row?.path) { try { await c.storage.from(BUCKET).remove([row.path]) } catch { /* ignore */ } }
      await c.from('backgrounds').delete().eq('id', id)
    } catch (e) { setError(e.message || 'Xóa ảnh lỗi') }
  }, [])

  const renameImage = useCallback(async (id, label) => {
    const c = clientRef.current
    const nextLabel = label?.trim()
    if (!c || !nextLabel) return false
    const previous = rowsRef.current.find((r) => r.id === id)?.label
    setItems((list) => list.map((r) => (r.id === id ? { ...r, label: nextLabel } : r)))
    try {
      const { error: e } = await c.from('backgrounds').update({ label: nextLabel }).eq('id', id)
      if (e) throw e
      setError('')
      return true
    } catch (e) {
      setItems((list) => list.map((r) => (r.id === id ? { ...r, label: previous || r.label } : r)))
      setError(e.message || 'Đổi tên ảnh lỗi')
      return false
    }
  }, [])

  return { enabled, ready, items, error, addImage, removeImage, renameImage }
}
