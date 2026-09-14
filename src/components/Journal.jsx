import { useState, useRef, useEffect, useMemo } from 'react'
import { IconLock, IconUserSwitch } from './icons'

const EMOJIS = [
  '😊', '🙂', '😌', '🥰', '😍', '😘', '🤗', '😴', '😆', '😂',
  '🥹', '🥲', '😅', '🤭', '😋', '😎', '🤔', '😇', '🫶', '🙌',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🤍', '💕', '💖', '✨',
  '🌟', '🌙', '☁️', '🌧️', '☔', '🌈', '🍂', '🍁', '🌿', '🌸',
  '🌼', '☕', '🍵', '🫖', '🎵', '🎶', '🎧', '📷', '🕯️', '🏔️',
]

const REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥']

function journalUserKey(value) {
  return String(value || '').trim().toLocaleLowerCase('vi-VN')
}

function canonicalJournalUser(value) {
  const raw = String(value || '').trim()
  const key = journalUserKey(raw)
  if (key === 'rt') return 'RT'
  if (key === 'rừng thông') return 'Rừng Thông'
  if (key === 'dốc nhà làng') return 'Dốc Nhà Làng'
  return raw
}

function sameJournalUser(a, b) {
  const aKey = journalUserKey(a)
  const bKey = journalUserKey(b)
  return Boolean(aKey && bKey && aKey === bKey)
}

export default function Journal({ journal, username, setUsername, onClose }) {
  const {
    messages, status, error, sending, online, send, refresh,
    deleteMessage, editMessage, reactMessage, clearMessages,
    accessAllowed, accessStatus, unlock, lock,
  } = journal

  const [unlocking, setUnlocking] = useState(false)
  const [unlockName, setUnlockName] = useState('')
  const [unlockError, setUnlockError] = useState('')
  const [draft, setDraft] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(username || '')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [reactId, setReactId] = useState(null)
  const listRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { setNameInput(username || '') }, [username])
  useEffect(() => {
    if (!accessAllowed || !username) return
    const canonical = canonicalJournalUser(username)
    if (canonical && canonical !== username) setUsername(canonical)
  }, [accessAllowed, username, setUsername])
  useEffect(() => {
    const el = listRef.current
    if (el && accessAllowed) el.scrollTop = el.scrollHeight
  }, [messages.length, accessAllowed])

  const grouped = useMemo(() => groupByDay(messages), [messages])

  const handleUnlock = async (event) => {
    event?.preventDefault?.()
    const candidate = unlockName.trim()
    if (!candidate || !unlock) return
    setUnlocking(true)
    setUnlockError('')
    const result = await unlock(candidate)
    setUnlocking(false)
    if (result?.allowed) {
      setUsername(canonicalJournalUser(result.displayName || candidate))
      setUnlockName('')
      return
    }
    setUnlockError('Tên này không mở được những dòng dưới tán thông.')
  }

  const handleLock = () => {
    if (!window.confirm('Khóa Nhật ký trên thiết bị này và đổi người dùng?')) return
    lock?.()
    setUsername('')
    setUnlockName('')
    setUnlockError('')
  }

  const removeOne = (id) => { if (deleteMessage && window.confirm('Xoá tin nhắn này? Không thể hoàn tác.')) deleteMessage(id) }
  const clearAll = () => {
    if (!clearMessages) return
    if (window.confirm('Xóa toàn bộ nhật ký? Không thể hoàn tác.')) clearMessages()
  }

  const addEmoji = (e) => { setDraft((d) => d + e); inputRef.current?.focus() }

  const toggleReaction = (m, emoji) => {
    if (!reactMessage) return
    const u = canonicalJournalUser(username) || 'Ẩn danh'
    const cur = (m.reactions && m.reactions[emoji]) || []
    const alreadyReacted = cur.some((name) => sameJournalUser(name, u))
    const nextList = alreadyReacted ? cur.filter((name) => !sameJournalUser(name, u)) : [...cur, u]
    const next = { ...(m.reactions || {}) }
    if (nextList.length) next[emoji] = nextList; else delete next[emoji]
    reactMessage(m.id, next)
    setReactId(null)
  }

  const startEdit = (m) => { setEditingId(m.id); setEditText(m.text) }
  const cancelEdit = () => { setEditingId(null); setEditText('') }
  const saveEdit = () => {
    const t = editText.trim()
    if (!t) return
    if (editMessage) editMessage(editingId, t)
    cancelEdit()
  }

  const submit = (e) => {
    e.preventDefault()
    if (!draft.trim() || !username) return
    send(draft)
    setDraft('')
    setEmojiOpen(false)
  }

  const saveName = async (e) => {
    e.preventDefault()
    const n = nameInput.trim()
    if (!n || !unlock) return
    const result = await unlock(n)
    if (!result?.allowed) {
      setNameInput(username || '')
      setEditingName(false)
      return
    }
    setUsername(canonicalJournalUser(result.displayName || n))
    setEditingName(false)
  }

  const statusText = {
    offline: 'Riêng tư',
    connecting: 'Đang kết nối…',
    online: 'Đồng bộ',
    error: 'Lỗi',
  }[status]

  if (!accessAllowed) {
    const checking = accessStatus === 'checking' && Boolean(username)
    return (
      <section className="pane journal journal--locked">
        <header className="pane__head journal-lock__head">
          <h2>Nhật ký chung</h2>
          {onClose && <button className="link-btn" onClick={onClose} title="Đóng">✕</button>}
        </header>
        <div className="journal-lock">
          <div className="journal-lock__icon" aria-hidden="true"><IconLock /></div>
          <h3>Những dòng dưới tán thông</h3>
          <p>Một vài câu chuyện chỉ dành cho<br />những người đã từng ngồi ở đây.</p>
          {checking ? (
            <div className="journal-lock__checking">Đang nhận ra người quen…</div>
          ) : (
            <form className="journal-lock__form" onSubmit={handleUnlock}>
              <input
                type="text"
                value={unlockName}
                onChange={(event) => setUnlockName(event.target.value)}
                placeholder="Tên của bạn"
                autoComplete="off"
                autoCapitalize="words"
              />
              <button type="submit" disabled={unlocking || !unlockName.trim()}>
                {unlocking ? 'Đang mở…' : 'Mở khóa'}
              </button>
              {unlockError && <div className="journal-lock__error">{unlockError}</div>}
            </form>
          )}
        </div>
      </section>
    )
  }

  const admin = true

  return (
    <section className="pane journal">
      <header className="pane__head">
        <h2>Nhật ký chung</h2>
        <div className="journal__status">
          <span className={`dot dot--${status}`} />
          <span className="muted">{statusText}</span>
          {online && <button className="link-btn" onClick={refresh} title="Làm mới">↻</button>}
          {messages.length > 0 && <button className="link-btn" onClick={clearAll} title="Xóa toàn bộ nhật ký">🗑</button>}
          <button className="link-btn journal__lock-btn" onClick={handleLock} title="Khóa Nhật ký / đổi người dùng" aria-label="Khóa Nhật ký / đổi người dùng"><IconLock /></button>
          {onClose && <button className="link-btn" onClick={onClose} title="Đóng">✕</button>}
        </div>
      </header>

      {error && <div className="journal__error">{error}</div>}

      <div className="journal__list" ref={listRef}>
        {messages.length === 0 && <div className="journal__empty">Chưa có dòng nào. Viết điều gì đó cho hôm nay… ☁️</div>}
        {grouped.map((group) => (
          <div className="journal__day" key={group.day}>
            <div className="journal__daysep"><span>{group.day}</span></div>
            {group.items.map((m) => {
              const mine = sameJournalUser(m.user, username)
              const canEdit = (mine || admin) && editMessage
              const editing = editingId === m.id
              return (
                <div className={`bubble ${mine ? 'bubble--mine' : ''}`} key={m.id}>
                  <div className="bubble__meta">
                    {!mine && <span className="bubble__user">{canonicalJournalUser(m.user)}</span>}
                    <span className="bubble__time">{formatTime(m.ts)}{m.edited ? ' · đã sửa' : ''}</span>
                    {!editing && reactMessage && <button className="bubble__edit" onClick={() => setReactId(reactId === m.id ? null : m.id)} title="Thả cảm xúc">☺</button>}
                    {!editing && canEdit && <button className="bubble__edit" onClick={() => startEdit(m)} title="Sửa tin này">✎</button>}
                    {!editing && admin && <button className="bubble__del" onClick={() => removeOne(m.id)} title="Xóa tin này">✕</button>}
                  </div>
                  {editing ? (
                    <div className="bubble__edit-box">
                      <textarea autoFocus rows={2} value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit() }
                          if (e.key === 'Escape') cancelEdit()
                        }} />
                      <div className="bubble__edit-actions">
                        <button type="button" className="link-btn" onClick={cancelEdit}>Hủy</button>
                        <button type="button" className="bubble__save" onClick={saveEdit} disabled={!editText.trim()}>Lưu</button>
                      </div>
                    </div>
                  ) : <div className="bubble__text">{m.text}</div>}
                  {reactId === m.id && (
                    <div className="react-picker">{REACTIONS.map((e) => (
                      <button key={e} type="button" className="react-pick" onClick={() => toggleReaction(m, e)}>{e}</button>
                    ))}</div>
                  )}
                  {m.reactions && Object.keys(m.reactions).length > 0 && (
                    <div className="bubble__reacts">{Object.entries(m.reactions).map(([e, users]) => (Array.isArray(users) && users.length > 0) && (
                      <button key={e} type="button" title={users.map(canonicalJournalUser).join(', ')}
                        className={`react-chip ${users.some((name) => sameJournalUser(name, username)) ? 'is-mine' : ''}`}
                        onClick={() => toggleReaction(m, e)}>{e}<span>{users.length}</span></button>
                    ))}</div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {editingName ? (
        <form className="journal__name" onSubmit={saveName}>
          <input autoFocus type="text" placeholder="Tên của bạn…" value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
          <button type="submit">Lưu tên</button>
        </form>
      ) : (
        <>
          {emojiOpen && <div className="emoji-panel">{EMOJIS.map((e) => (
            <button type="button" key={e} className="emoji-item" onClick={() => addEmoji(e)}>{e}</button>
          ))}</div>}
          <form className="journal__compose" onSubmit={submit}>
            <button type="button" className="journal__whoami"
              onClick={() => { setNameInput(username); setEditingName(true) }} title="Đổi người dùng">
              <IconUserSwitch />
              <span>{canonicalJournalUser(username)}</span>
            </button>
            <input ref={inputRef} type="text" placeholder="Viết cho người ấy hoặc cho chính mình…"
              value={draft} onChange={(e) => setDraft(e.target.value)} />
            <button type="button" className={`emoji-toggle ${emojiOpen ? 'is-on' : ''}`}
              onClick={() => setEmojiOpen((v) => !v)} title="Chèn emoji">😊</button>
            <button type="submit" disabled={sending || !draft.trim()}>{sending ? '…' : 'Gửi'}</button>
          </form>
        </>
      )}
    </section>
  )
}

function groupByDay(messages) {
  const groups = []
  let last = null
  for (const m of messages) {
    const day = formatDay(m.ts)
    if (!last || last.day !== day) {
      last = { day, items: [] }
      groups.push(last)
    }
    last.items.push(m)
  }
  return groups
}

function formatDay(ts) {
  try { return new Date(ts).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return '' }
}
function formatTime(ts) {
  try { return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) }
  catch { return '' }
}
