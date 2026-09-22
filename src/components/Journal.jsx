import { useState, useRef, useEffect, useMemo } from 'react'
import { IconCameraVintage, IconClose, IconEdit, IconLock, IconPlay, IconRefresh, IconReply, IconSmile, IconTrash, IconUserSwitch } from './icons'
import { parseYouTube } from '../lib/youtube'

// Bắt các đường link trong tin nhắn (kể cả youtu.be / youtube.com chưa có http)
const LINK_RE = /((?:https?:\/\/|www\.)[^\s]+|(?:youtu\.be|(?:music\.|m\.)?youtube\.com)\/[^\s]+)/gi
const withProtocol = (url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`)

// Một đường link trong chat: link thường -> hyperlink; link YouTube -> bấm để
// NGHE NGAY trong khung chat (mở trình phát nhúng), bấm lần nữa thì đóng lại.
function ChatLink({ url }) {
  const [open, setOpen] = useState(false)
  const playerRef = useRef(null)
  // Khi mở trình phát (nằm dưới link), cuộn khung chat để lộ nó ra -> tránh cảm
  // giác "bấm mà không chạy" vì video mở ngoài tầm nhìn.
  useEffect(() => {
    if (!open) return undefined
    const id = setTimeout(() => {
      playerRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }, 70)
    return () => clearTimeout(id)
  }, [open])
  const yt = parseYouTube(url)
  const href = withProtocol(url)
  if (!yt) {
    return <a className="chat-link" href={href} target="_blank" rel="noopener noreferrer">{url}</a>
  }
  const embed = yt.type === 'playlist'
    ? `https://www.youtube-nocookie.com/embed/videoseries?list=${yt.playlistId}&autoplay=1`
    : `https://www.youtube-nocookie.com/embed/${yt.videoId}?autoplay=1${yt.playlistId ? `&list=${yt.playlistId}` : ''}`
  return (
    <span className="chat-yt">
      <a className={`chat-link chat-link--yt ${open ? 'is-open' : ''}`} href={href}
        target="_blank" rel="noopener noreferrer"
        title={open ? 'Đóng trình phát' : 'Nghe ngay trong khung chat'}
        onClick={(e) => { e.preventDefault(); setOpen((o) => !o) }}>
        <span className="chat-yt__ico">{open ? <IconClose /> : <IconPlay />}</span>{url}
      </a>
      {open && (
        <span className="chat-yt__player" ref={playerRef}>
          <iframe src={embed} title="Trình phát YouTube" loading="lazy"
            allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
        </span>
      )}
    </span>
  )
}

// Render nội dung tin: chèn link thành hyperlink/trình phát, giữ nguyên chữ.
function MessageText({ text }) {
  const nodes = []
  const s = String(text || '')
  let last = 0
  s.replace(LINK_RE, (match, _g, offset) => {
    if (offset > last) nodes.push(s.slice(last, offset))
    nodes.push(<ChatLink key={offset} url={match} />)
    last = offset + match.length
    return match
  })
  if (last < s.length) nodes.push(s.slice(last))
  return <div className="bubble__text">{nodes}</div>
}

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
  const [replyingTo, setReplyingTo] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [composeError, setComposeError] = useState('')
  const listRef = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)

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
  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview) }, [imagePreview])

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

  const startReply = (m) => {
    setReplyingTo({ id: m.id, user: canonicalJournalUser(m.user), text: m.text || '', hasImage: Boolean(m.imageUrl) })
    setComposeError('')
    inputRef.current?.focus()
  }

  const selectImage = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { setComposeError('Chỉ có thể đăng tệp ảnh.'); return }
    if (file.size > 5 * 1024 * 1024) { setComposeError('Ảnh tối đa 5 MB.'); return }
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setComposeError('')
  }

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(null)
    setImagePreview('')
  }

  const jumpToQuoted = (id) => {
    if (!id) return
    const target = document.getElementById(`journal-message-${id}`)
    if (!target) return
    target.scrollIntoView({ block: 'center', behavior: 'smooth' })
    target.classList.remove('is-quote-target')
    requestAnimationFrame(() => target.classList.add('is-quote-target'))
    setTimeout(() => target.classList.remove('is-quote-target'), 1300)
  }

  const submit = async (e) => {
    e.preventDefault()
    if ((!draft.trim() && !imageFile) || !username || sending) return
    setComposeError('')
    const result = await send({ text: draft, imageFile, replyTo: replyingTo })
    if (result?.ok === false) { setComposeError(result.error || 'Không gửi được tin nhắn.'); return }
    setDraft('')
    setReplyingTo(null)
    clearImage()
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
          {onClose && <button className="link-btn" onClick={onClose} title="Đóng" aria-label="Đóng Nhật ký"><IconClose /></button>}
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
          {online && <button className="link-btn" onClick={refresh} title="Làm mới" aria-label="Làm mới Nhật ký"><IconRefresh /></button>}
          {messages.length > 0 && <button className="link-btn" onClick={clearAll} title="Xóa toàn bộ nhật ký" aria-label="Xóa toàn bộ nhật ký"><IconTrash /></button>}
          <button className="link-btn journal__lock-btn" onClick={handleLock} title="Khóa Nhật ký / đổi người dùng" aria-label="Khóa Nhật ký / đổi người dùng"><IconLock /></button>
          {onClose && <button className="link-btn" onClick={onClose} title="Đóng" aria-label="Đóng Nhật ký"><IconClose /></button>}
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
              const canEdit = (mine || admin) && editMessage && Boolean(m.text)
              const editing = editingId === m.id
              return (
                <div id={`journal-message-${m.id}`} data-message-id={m.id} className={`bubble ${mine ? 'bubble--mine' : ''}`} key={m.id}>
                  <div className="bubble__meta">
                    {!mine && <span className="bubble__user">{canonicalJournalUser(m.user)}</span>}
                    <span className="bubble__time">{formatTime(m.ts)}{m.edited ? ' · đã sửa' : ''}</span>
                    {!editing && <button className="bubble__edit" onClick={() => startReply(m)} title="Trả lời tin này" aria-label={`Trả lời tin nhắn của ${canonicalJournalUser(m.user) || 'người dùng'}`}><IconReply /></button>}
                    {!editing && reactMessage && <button className="bubble__edit" onClick={() => setReactId(reactId === m.id ? null : m.id)} title="Thả cảm xúc" aria-label="Thả cảm xúc"><IconSmile /></button>}
                    {!editing && canEdit && <button className="bubble__edit" onClick={() => startEdit(m)} title="Sửa tin này" aria-label="Sửa tin nhắn"><IconEdit /></button>}
                    {!editing && admin && <button className="bubble__del" onClick={() => removeOne(m.id)} title="Xóa tin này" aria-label="Xóa tin nhắn"><IconTrash /></button>}
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
                  ) : (
                    <>
                      {m.replyTo && (
                        <button type="button" className="bubble__quote" onClick={() => jumpToQuoted(m.replyTo.id)} title="Đi tới tin được trả lời">
                          <b>↩ {canonicalJournalUser(m.replyTo.user) || 'Tin nhắn'}</b>
                          <span>{m.replyTo.text || (m.replyTo.hasImage ? '📷 Ảnh' : 'Tin nhắn')}</span>
                        </button>
                      )}
                      {m.imageUrl && (
                        <a className="bubble__image-link" href={m.imageUrl} target="_blank" rel="noopener noreferrer" title="Mở ảnh đầy đủ">
                          <img className="bubble__image" src={m.imageUrl} alt={m.text || 'Ảnh trong nhật ký'} loading="lazy" />
                        </a>
                      )}
                      {m.text && <MessageText text={m.text} />}
                    </>
                  )}
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
          <div className="journal__composer">
            {replyingTo && (
              <div className="journal__reply-preview">
                <div><b>↩ {replyingTo.user || 'Tin nhắn'}</b><span>{replyingTo.text || (replyingTo.hasImage ? '📷 Ảnh' : 'Tin nhắn')}</span></div>
                <button type="button" onClick={() => setReplyingTo(null)} title="Bỏ trả lời" aria-label="Bỏ trả lời"><IconClose /></button>
              </div>
            )}
            {imagePreview && (
              <div className="journal__image-preview">
                <img src={imagePreview} alt="Ảnh chuẩn bị đăng" />
                <button type="button" onClick={clearImage} title="Bỏ ảnh" aria-label="Bỏ ảnh"><IconClose /></button>
              </div>
            )}
            <form className="journal__compose" onSubmit={submit}>
              <button type="button" className="journal__whoami"
                onClick={() => { setNameInput(username); setEditingName(true) }} title="Đổi người dùng">
                <IconUserSwitch />
                <span>{canonicalJournalUser(username)}</span>
              </button>
              <input ref={inputRef} type="text" placeholder={imageFile ? 'Thêm lời cho ảnh…' : 'Viết cho người ấy hoặc cho chính mình…'}
                value={draft} onChange={(e) => setDraft(e.target.value)} />
              <input ref={fileInputRef} className="journal__file-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={selectImage} />
              <button type="button" className={`emoji-toggle journal__image-btn ${imageFile ? 'is-on' : ''}`}
                onClick={() => fileInputRef.current?.click()} title="Đăng ảnh" aria-label="Chọn ảnh để đăng">
                <IconCameraVintage aria-hidden="true" />
              </button>
              <button type="button" className={`emoji-toggle ${emojiOpen ? 'is-on' : ''}`}
                onClick={() => setEmojiOpen((v) => !v)} title="Chèn emoji" aria-label="Chèn emoji"><IconSmile /></button>
              <button type="submit" disabled={sending || (!draft.trim() && !imageFile)}>{sending ? '…' : 'Gửi'}</button>
            </form>
            {composeError && <div className="journal__compose-error">{composeError}</div>}
          </div>
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
