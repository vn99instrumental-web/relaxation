import { useState } from 'react'

// Góc Hoài Niệm: thơ, tản văn, câu chữ và hình ảnh/video gợi suy tư.
export default function Poems({ poems, username, admin, onAddPoem, onEditPoem, onDeletePoem, onAddComment, onDeleteComment, onToggleReaction, onClose }) {
  const [tab, setTab] = useState('feed')
  const [editingId, setEditingId] = useState(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [imageUrl, setImageUrl] = useState('')

  const resetForm = () => { setEditingId(null); setTitle(''); setBody(''); setImageUrl('') }
  const openComposer = () => { resetForm(); setTab('compose') }
  const startEdit = (poem) => {
    setEditingId(poem.id)
    setTitle(poem.title || '')
    setBody(poem.body || '')
    setImageUrl(poem.imageUrl || '')
    setTab('compose')
  }
  const submit = (event) => {
    event.preventDefault()
    if (!body.trim()) return
    if (editingId && onEditPoem) onEditPoem(editingId, title, body, imageUrl)
    else onAddPoem(title, body, imageUrl)
    resetForm()
    setTab('feed')
  }
  const canEdit = (author) => admin || author === username
  const invalidImage = imageUrl.trim() && !isImageUrl(imageUrl)

  return (
    <section className="pane poems">
      <header className="pane__head poem-pane-head">
        <h2>Góc Hoài Niệm</h2>
        {onClose && <button className="link-btn" onClick={onClose} title="Đóng">✕</button>}
      </header>

      <div className="poem-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'feed'} className={tab === 'feed' ? 'is-active' : ''}
          onClick={() => { resetForm(); setTab('feed') }}>Hoài niệm</button>
        <button role="tab" aria-selected={tab === 'compose'} className={tab === 'compose' ? 'is-active' : ''}
          onClick={openComposer}>{editingId ? 'Sửa bài' : 'Đăng bài'}</button>
      </div>

      {tab === 'compose' ? (
        <form className="poem-compose poem-compose--page" onSubmit={submit}>
          <div className="poem-compose__hint">{editingId ? 'Sửa bài viết' : 'Lưu một điều khiến mình nhớ'}</div>
          <input className="poem-title" placeholder="Tựa đề (tuỳ chọn)…" value={title} onChange={(event) => setTitle(event.target.value)} />
          <textarea className="poem-body" rows={8} placeholder="Viết thơ, câu văn hoặc một đoạn khiến mình suy tư…" value={body} onChange={(event) => setBody(event.target.value)} />
          <input className="poem-image-url" type="url" inputMode="url" placeholder="Link ảnh hoặc video ngắn (tuỳ chọn) — https://…" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} />
          {invalidImage && <span className="poem-url-error">Link media phải bắt đầu bằng http:// hoặc https://</span>}
          {isImageUrl(imageUrl) && <MemoryMedia src={imageUrl} preview />}
          <div className="poem-compose__bar">
            <span>Ảnh/video chỉ xuất hiện trong Góc Hoài Niệm, không hiện dưới tagline.</span>
            <div className="poem-compose__actions">
              <button type="button" className="link-btn" onClick={() => { resetForm(); setTab('feed') }}>Hủy</button>
              <button type="submit" disabled={!body.trim() || invalidImage}>{editingId ? 'Lưu' : 'Đăng'}</button>
            </div>
          </div>
        </form>
      ) : (
        <div className="poem-list poem-list--gallery">
          {poems.length === 0 && <div className="journal__empty">Chưa có hoài niệm nào. Hãy mở tab “Đăng bài”…</div>}
          {poems.map((poem) => (
            <article className="poem poem--reading" key={poem.id}>
              {canEdit(poem.author) && <div className="poem__actions">
                <button className="poem__edit" onClick={() => startEdit(poem)} title="Sửa bài viết và media">✎</button>
                <button className="poem__del" onClick={() => { if (window.confirm('Xoá bài viết này? Không thể hoàn tác.')) onDeletePoem(poem.id) }} title="Xoá bài viết">✕</button>
              </div>}
              {poem.title && <h3 className="poem__title">{poem.title}</h3>}
              {poem.imageUrl && <MemoryMedia src={poem.imageUrl} />}
              <div className="poem__body">{poem.body}</div>
              <MemoryInteractions poem={poem} username={username} admin={admin}
                onAddComment={onAddComment} onDeleteComment={onDeleteComment} onToggleReaction={onToggleReaction} />
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function MemoryInteractions({ poem, username, admin, onAddComment, onDeleteComment, onToggleReaction }) {
  const [text, setText] = useState('')
  const items = Array.isArray(poem.comments) ? poem.comments : []
  const comments = items.filter((item) => item.type !== 'reaction')
  const reactions = items.filter((item) => item.type === 'reaction')
  const submit = (event) => {
    event.preventDefault()
    if (!text.trim()) return
    onAddComment?.(poem.id, text)
    setText('')
  }
  return <div className="memory-social">
    <div className="memory-reactions" aria-label="Tương tác bài viết">
      {['👍', '❤️', '🕯️'].map((emoji) => {
        const matches = reactions.filter((item) => item.emoji === emoji)
        const active = matches.some((item) => item.author === (username || 'Ẩn danh'))
        return <button key={emoji} type="button" className={active ? 'is-active' : ''}
          onClick={() => onToggleReaction?.(poem.id, emoji)} aria-pressed={active}>
          <span>{emoji}</span>{matches.length > 0 && <b>{matches.length}</b>}
        </button>
      })}
      <span className="memory-comment-count">💬 {comments.length}</span>
    </div>
    {comments.length > 0 && <div className="poem__comments">
      {comments.map((comment) => <div className="pcm" key={comment.id}>
        <div className="pcm__body">
          <span className="pcm__meta"><b>{comment.author || 'Ẩn danh'}</b></span>
          <span className="pcm__text">{comment.text}</span>
        </div>
        {(admin || comment.author === username) && <button type="button" className="pcm__del"
          onClick={() => onDeleteComment?.(poem.id, comment.id)} title="Xoá bình luận">✕</button>}
      </div>)}
    </div>}
    <form className="pcm-add" onSubmit={submit}>
      <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Viết bình luận…" />
      <button type="submit" disabled={!text.trim()}>Gửi</button>
    </form>
  </div>
}

function isImageUrl(value) {
  try { return ['http:', 'https:'].includes(new URL(String(value || '').trim()).protocol) } catch { return false }
}

function youtubeEmbedUrl(src) {
  try {
    const url = new URL(src)
    const id = url.hostname.includes('youtu.be') ? url.pathname.slice(1) : url.searchParams.get('v') || url.pathname.match(/\/(?:shorts|embed)\/([^/?]+)/)?.[1]
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : ''
  } catch { return '' }
}

function MemoryMedia({ src, preview = false }) {
  const youtube = youtubeEmbedUrl(src)
  const video = /\.(?:mp4|webm|ogg|mov|m4v)(?:[?#].*)?$/i.test(src)
  return <div className={`poem__image-wrap ${preview ? 'is-preview' : ''}`}>
    {youtube
      ? <iframe className="poem__video" src={youtube} title="Video hoài niệm" loading="lazy" allow="encrypted-media; picture-in-picture" allowFullScreen />
      : video
        ? <video className="poem__video" src={src} controls playsInline preload="metadata" />
        : <img key={src} className="poem__image" src={src} alt="Ảnh đính kèm bài viết" loading="lazy" referrerPolicy="no-referrer"
          onError={(event) => event.currentTarget.closest('.poem__image-wrap')?.classList.add('is-error')} />}
    <span className="poem__image-error">Không tải được ảnh hoặc video từ link này.</span>
  </div>
}
