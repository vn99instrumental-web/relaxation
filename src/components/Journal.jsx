import { useState, useRef, useEffect, useMemo } from 'react'

// Cuốn nhật ký chung 2 người. Hiển thị tin nhắn nhóm theo ngày,
// ô nhập tên + ô soạn tin. Trạng thái kết nối Gist ở góc.
// props: journal (hook useGistSync), username, setUsername, onOpenSettings
export default function Journal({ journal, username, setUsername, onOpenSettings }) {
  const { messages, status, error, sending, online, send, refresh } = journal
  const [draft, setDraft] = useState('')
  const [editingName, setEditingName] = useState(!username)
  const [nameInput, setNameInput] = useState(username || '')
  const listRef = useRef(null)

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
  }

  const saveName = (e) => {
    e.preventDefault()
    const n = nameInput.trim()
    if (!n) return
    setUsername(n)
    setEditingName(false)
  }

  const statusText = {
    offline: 'Offline (lưu trên máy)',
    connecting: 'Đang kết nối…',
    online: 'Đã đồng bộ 2 người',
    error: 'Lỗi kết nối',
  }[status]

  return (
    <section className="panel journal">
      <header className="panel__head">
        <h2>📓 Nhật ký chung</h2>
        <div className="journal__status">
          <span className={`dot dot--${status}`} />
          <span className="muted">{statusText}</span>
          {online && (
            <button className="link-btn" onClick={refresh} title="Làm mới">↻</button>
          )}
          <button className="link-btn" onClick={onOpenSettings} title="Cài đặt đồng bộ">⚙</button>
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
              return (
                <div className={`bubble ${mine ? 'bubble--mine' : ''}`} key={m.id}>
                  <div className="bubble__meta">
                    <span className="bubble__user">{m.user}</span>
                    <span className="bubble__time">{formatTime(m.ts)}</span>
                  </div>
                  <div className="bubble__text">{m.text}</div>
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
            type="text"
            placeholder="Viết cho người ấy hoặc cho chính mình…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" disabled={sending || !draft.trim()}>
            {sending ? '…' : 'Gửi'}
          </button>
        </form>
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
