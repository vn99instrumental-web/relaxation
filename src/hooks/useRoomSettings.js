import { useEffect, useRef, useState, useCallback } from 'react'
import { makeClient } from '../lib/supabase'

// Cài đặt chung của phòng: admin ghi (scene, ảnh nền, hàng chờ nhạc),
// mọi người đọc + realtime. Người không phải admin chỉ nhận, không ghi.
export function useRoomSettings(config, isAdmin) {
  const { url, key, room } = config || {}
  const enabled = Boolean(url && key && room)
  const clientRef = useRef(null)
  const clientId = useRef(`c${Math.random().toString(36).slice(2, 10)}`)
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    if (!enabled) { clientRef.current = null; setSettings(null); return }
    let cancelled = false
    let client
    try { client = makeClient(url, key) } catch { return undefined }
    clientRef.current = client
    client.from('room_settings').select('*').eq('id', room).maybeSingle()
      .then(({ data }) => { if (!cancelled && data) setSettings(data) }, () => {})
    const ch = client
      .channel(`rs:${room}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_settings', filter: `id=eq.${room}` },
        (payload) => { if (!cancelled && payload.new) setSettings(payload.new) })
      .subscribe()
    return () => { cancelled = true; try { client.removeChannel(ch) } catch { /* ignore */ } }
  }, [enabled, url, key, room])

  const save = useCallback((patch) => {
    const c = clientRef.current
    if (!c || !isAdmin) return
    c.from('room_settings')
      .upsert({ id: room, ...patch, updated_by: clientId.current, updated_at: new Date().toISOString() })
      .then(() => {}, () => {})
  }, [room, isAdmin])

  return { enabled, settings, save, clientId: clientId.current }
}
