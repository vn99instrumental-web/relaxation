import { useState, useRef, useEffect, useMemo } from 'react'

// Bộ emoji gợi cảm giác ấm áp/thư giãn cho nhật ký đôi
const EMOJIS = [
  '😊', '🙂', '😌', '🥰', '😍', '😘', '🤗', '😴', '😆', '😂',
  '🥹', '🥲', '😅', '🤭', '😋', '😎', '🤔', '😇', '🫶', '🙌',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🤍', '💕', '💖', '✨',
  '🌟', '🌙', '☁️', '🌧️', '☔', '🌈', '🍂', '🍁', '🌿', '🌸',
  '🌼', '☕', '🍵', '🫖', '🎵', '🎶', '🎧', '📷', '🕯️', '🏔️',
]

// Cảm xúc nhanh để "thả" lên từng tin
const REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥']

// Cuốn nhật ký chung 2 người. Hiển thị tin nhắn nhóm theo ngày,
// ô nhập tên + ô soạn tin. Trạng thái kết nối Gist ở góc.
// props: journal (hook useGistSync), username, setUsername, onOpenSettings
export default function Journal({ journal, username, setUsername, onOpenSettings, onClose, admin }) {
  const { messages, status, error, sending, online, send, refresh, deleteMessage, editMessage, reactMessage, clearMessages } = journal

  const removeOne = (id) => { if (deleteMessage) deleteMessage(id) }
  const clearAll = () => {
    if (!clearMessages) return
    if (window.confirm('Xóa toàn bộ nhật ký? Không thể hoàn tác.')) clearMessages()
  }
  const [draft, setDraft] = useState('')
  const [editingName, setEditingName] = useState(!username)
  const [nameInput, setNameInput] = useState(username || '')
  const [editingId, setEditingId] = useState(null)   // id tin đang sửa
  const [editText, setEditText] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [reactId, setReactId] = useState(null)       // id tin đang mở bảng thả cảm xúc
  const listRef = useRef(null)
  const inputRef = useRef(null)

  const addEmoji = (e) => { setDraft((d) => d + e); inputRef.current?.focus() }

  // Thả cảm xúc: bật/tắt cảm xúc của mình trên 1 tin
  const toggleReaction = (m, emoji) => {
    if (!reactMessage) return
    const u = username || 'Ẩn danh'
    const cur = (m.reactions && m.reactions[emoji]) || []
    const nextList = cur.includes(u) ? cur.filter((x) => x !== u) : [...cur, u]
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

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length])

  const grouped = useMemo(() => groupByDay(messages), [messages])

  const submit = (e) => {
    e.preventDefault()
    if (!draft.trim()) return
    if (!username) { setEditingName(true); return }
    send(draft)
    setDraft('')
    setEmojiOpen(false)
  }

  const saveName = (e) => {
    e.preventDefault()
    const n = nameInput.trim()
    if (!n) return
    setUsername(n)
    setEditingName(false)
  }

  const statusText = {
    offline: 'Riêng tư',
    connecting: 'Đang kết nối…',
    online: 'Đồng bộ',
    error: 'Lỗi',
  }[status]

  return (
    <section className="pane journal">
      <header className="pane__head">
        <h2>Nhật ký chung</h2>
        <div className="journal__status">
          <span className={`dot dot--${status}`} />
          <span className="muted">{statusText}</span>
          {online && (
            <button className="link-btn" onClick={refresh} title="Làm mới">↻</button>
          )}
          {admin && messages.length > 0 && (
            <button className="link-btn" onClick={clearAll} title="Xóa toàn bộ nhật ký">🗑</button>
          )}
          <button className="link-btn" onClick={onOpenSettings} title="Cài đặt đồng bộ">⚙</button>
          {onClose && <button className="link-btn" onClick={onClose} title="Đóng">✕</button>}
        </div>
      </header>

      {error && <div className="journal__error">{error}</div>}

      <div className="journal__list" ref={listRef}>
        {messages.length === 0 && (
          <div className="journal__empty">
            Chưa có dòng nào. Viết điều gì đó cho hôm nay… ☁️
          </div>
        )}
        {grouped.map((group) => (
          <div className="journal__day" key={group.day}>
            <div className="journal__daysep"><span>{group.day}</span></div>
            {group.items.map((m) => {
              const mine = m.user === username
              const canEdit = (mine || admin) && editMessage
              const editing = editingId === m.id
              return (
                <div className={`bubble ${mine ? 'bubble--mine' : ''}`} key={m.id}>
                  <div className="bubble__meta">
                    {!mine && <span className="bubble__user">{m.user}</span>}
                    <span className="bubble__time">
                      {formatTime(m.ts)}{m.edited ? ' · đã sửa' : ''}
                    </span>
                    {!editing && reactMessage && (
                      <button className="bubble__edit" onClick={() => setReactId(reactId === m.id ? null : m.id)} title="Thả cảm xúc">☺</button>
                    )}
                    {!editing && canEdit && (
                      <button className="bubble__edit" onClick={() => startEdit(m)} title="Sửa tin này">✎</button>
                    )}
                    {!editing && admin && (
                      <button className="bubble__del" onClick={() => removeOne(m.id)} title="Xóa tin này">✕</button>
                    )}
                  </div>
                  {editing ? (
                    <div className="bubble__edit-box">
                      <textarea
                        autoFocus rows={2} value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit() }
                          if (e.key === 'Escape') cancelEdit()
                        }}
                      />
                      <div className="bubble__edit-actions">
                        <button type="button" className="link-btn" onClick={cancelEdit}>Hủy</button>
                        <button type="button" className="bubble__save" onClick={saveEdit} disabled={!editText.trim()}>Lưu</button>
                      </div>
                    </div>
                  ) : (
                    <div className="bubble__text">{m.text}</div>
                  )}
                  {reactId === m.id && (
                    <div className="react-picker">
                      {REACTIONS.map((e) => (
                        <button key={e} type="button" className="react-pick" onClick={() => toggleReaction(m, e)}>{e}</button>
                      ))}
                    </div>
                  )}
                  {m.reactions && Object.keys(m.reactions).length > 0 && (
                    <div className="bubble__reacts">
                      {Object.entries(m.reactions).map(([e, users]) => (Array.isArray(users) && users.length > 0) && (
                        <button key={e} type="button" title={users.join(', ')}
                          className={`react-chip ${users.includes(username) ? 'is-mine' : ''}`}
                          onClick={() => toggleReaction(m, e)}>
                          {e}<span>{users.length}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {editingName ? (
        <form className="journal__name" onSubmit={saveName}>
          <input
            autoFocus
            type="text"
            placeholder="Nhập tên của bạn cho buổi này…"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
          />
          <button type="submit">Lưu tên</button>
        </form>
      ) : (
        <>
          {emojiOpen && (
            <div className="emoji-panel">
              {EMOJIS.map((e) => (
                <button type="button" key={e} className="emoji-item" onClick={() => addEmoji(e)}>{e}</button>
              ))}
            </div>
          )}
          <form className="journal__compose" onSubmit={submit}>
            <button
              type="button"
              className="journal__whoami"
              onClick={() => { setNameInput(username); setEditingName(true) }}
              title="Đổi tên"
            >
              {username} ▾
            </button>
            <input
              ref={inputRef}
              type="text"
              placeholder="Viết cho người ấy hoặc cho chính mình…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button
              type="button"
              className={`emoji-toggle ${emojiOpen ? 'is-on' : ''}`}
              onClick={() => setEmojiOpen((v) => !v)}
              title="Chèn emoji"
            >
              😊
            </button>
            <button type="submit" disabled={sending || !draft.trim()}>
              {sending ? '…' : 'Gửi'}
            </button>
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
  try {
    return new Date(ts).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return ''
  }
}
function formatTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}
