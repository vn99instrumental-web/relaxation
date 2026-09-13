import { useEffect, useRef, useState, useCallback } from 'react'
import { makeClient } from '../lib/supabase'

// Cài đặt chung của phòng: admin ghi (scene, ảnh nền, hàng chờ nhạc),
// mọi người đọc + realtime. Người không phải admin chỉ nhận, không ghi.
export function useRoomSettings(config, isAdmin) {
  const { url, key, room } = config || {}
  const enabled = Boolean(url && key && room)
  const connectionKey = enabled ? `${url}|${room}` : ''
  const clientRef = useRef(null)
  const clientId = useRef(`c${Math.random().toString(36).slice(2, 10)}`)
  const [settings, setSettings] = useState(null)
  const [loadedKey, setLoadedKey] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    clientRef.current = null
    setSettings(null)
    setLoadedKey('')
    setError('')
    if (!enabled) return undefined
    let cancelled = false
    let client
    try { client = makeClient(url, key) } catch (e) {
      setError(e.message || 'Không kết nối được cài đặt phòng')
      setLoadedKey(connectionKey)
      return undefined
    }
    clientRef.current = client
    client.from('room_settings').select('*').eq('id', room).maybeSingle()
      .then(({ data, error: queryError }) => {
        if (cancelled) return
        if (queryError) setError(queryError.message || 'Không tải được cài đặt phòng')
        else setSettings(data || null)
        setLoadedKey(connectionKey)
      }, (e) => {
        if (cancelled) return
        setError(e.message || 'Không tải được cài đặt phòng')
        setLoadedKey(connectionKey)
      })
    const ch = client
      .channel(`rs:${room}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_settings', filter: `id=eq.${room}` },
        (payload) => {
          if (cancelled) return
          setSettings(payload.new && Object.keys(payload.new).length ? payload.new : null)
          setLoadedKey(connectionKey)
          setError('')
        })
      .subscribe()
    return () => { cancelled = true; try { client.removeChannel(ch) } catch { /* ignore */ } }
  }, [enabled, url, key, room, connectionKey])

  const save = useCallback(async (patch) => {
    const c = clientRef.current
    if (!c || !isAdmin) return { data: null, error: null }
    try {
      const result = await c.from('room_settings')
        .upsert({ id: room, ...patch, updated_by: clientId.current, updated_at: new Date().toISOString() })
        .select('*')
        .single()
      if (result.error) throw result.error
      setSettings(result.data)
      setLoadedKey(connectionKey)
      setError('')
      return result
    } catch (e) {
      setError(e.message || 'Không lưu được cài đặt phòng')
      return { data: null, error: e }
    }
  }, [room, isAdmin, connectionKey])

  return {
    enabled,
    ready: !enabled || loadedKey === connectionKey,
    settings,
    save,
    error,
    clientId: clientId.current,
  }
}
