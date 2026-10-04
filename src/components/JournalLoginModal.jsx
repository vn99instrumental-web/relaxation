import { useEffect, useRef, useState } from 'react'
import { IconClose, IconLock } from './icons'

export default function JournalLoginModal({ open, unlock, accessStatus, onSuccess, onClose }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    setName('')
    setError('')
    requestAnimationFrame(() => inputRef.current?.focus())
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const submit = async (event) => {
    event.preventDefault()
    const candidate = name.trim()
    if (!candidate || !unlock || busy) return
    setBusy(true)
    setError('')
    const result = await unlock(candidate)
    setBusy(false)
    if (result?.allowed && result?.isAdmin) {
      onSuccess?.(result.displayName || candidate)
      return
    }
    setError('Tên này không có quyền mở Nhật ký.')
  }

  return <div className="journal-login__backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.() }}>
    <form className="journal-login" role="dialog" aria-modal="true" aria-labelledby="journal-login-title" onSubmit={submit}>
      <button type="button" className="journal-login__close" onClick={onClose} title="Đóng" aria-label="Đóng đăng nhập"><IconClose /></button>
      <div className="journal-login__icon"><IconLock /></div>
      <h2 id="journal-login-title">Mở Nhật ký</h2>
      <p>Chỉ hai người quản trị được bước vào những dòng dưới tán thông.</p>
      <input ref={inputRef} type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="Tên của bạn" autoComplete="off" autoCapitalize="words" />
      <button type="submit" disabled={busy || accessStatus === 'checking' || !name.trim()}>
        {busy || accessStatus === 'checking' ? 'Đang nhận ra…' : 'Đăng nhập'}
      </button>
      {error && <div className="journal-login__error" role="alert">{error}</div>}
    </form>
  </div>
}
