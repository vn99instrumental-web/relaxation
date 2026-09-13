import { useState } from 'react'

// Góc Thơ: bài đăng kiểu nhật ký, có ảnh qua URL và bình luận/trao đổi.
export default function Poems({ poems, username, admin, onAddPoem, onEditPoem, onDeletePoem, onAddComment, onDeleteComment, onClose }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [openId, setOpenId] = useState(null)
  const [comment, setComment] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editImageUrl, setEditImageUrl] = useState('')

  const post = (e) => {
    e.preventDefault()
    if (!body.trim()) return
    onAddPoem(title, body, imageUrl)
    setTitle(''); setBody(''); setImageUrl('')
  }
  const send = (id) => { if (!comment.trim()) return; onAddComment(id, comment); setComment('') }
  const canEdit = (author) => admin || author === username
  const startEdit = (poem) => {
    setEditingId(poem.id)
    setEditTitle(poem.title || '')
    setEditBody(poem.body || '')
    setEditImageUrl(poem.imageUrl || '')
  }
  const cancelEdit = () => {
    setEditingId(null); setEditTitle(''); setEditBody(''); setEditImageUrl('')
  }
  const saveEdit = () => {
    if (!editBody.trim() || !onEditPoem) return
    onEditPoem(editingId, editTitle, editBody, editImageUrl)
    cancelEdit()
  }

  return (
    <section className="pane poems">
      <header className="pane__head">
        <h2>Góc Thơ</h2>
        {onClose && <button className="link-btn" onClick={onClose} title="Đóng">✕</button>}
      </header>

      <form className="poem-compose" onSubmit={post}>
        <div className="poem-compose__hint">Đăng một trang thơ như Nhật ký</div>
        <input className="poem-title" placeholder="Tựa đề (tuỳ chọn)…" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="poem-body" rows={3} placeholder="Viết vài dòng thơ…" value={body} onChange={(e) => setBody(e.target.value)} />
        <input className="poem-image-url" type="url" inputMode="url" placeholder="Link ảnh (tuỳ chọn) — https://…" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
        {isImageUrl(imageUrl) && <PoemImage src={imageUrl} preview />}
        <div className="poem-compose__bar">
          <span>Chỉ cần dán link ảnh, không cần tải file.</span>
          <button type="submit" disabled={!body.trim()}>Đăng</button>
        </div>
      </form>

      <div className="poem-list">
        {poems.length === 0 && <div className="journal__empty">Chưa có bài thơ nào. Viết bài đầu tiên… 🌸</div>}
        {poems.map((p) => {
          const open = openId === p.id
          const editing = editingId === p.id
          return (
            <article className="poem" key={p.id}>
              <div className="poem__head">
                <span className="poem__author">{p.author}</span>
                <span className="poem__time">{fmt(p.ts)}</span>
                {canEdit(p.author) && !editing && <button className="poem__edit" onClick={() => startEdit(p)} title="Sửa bài thơ và hình ảnh">✎</button>}
                {canEdit(p.author) && !editing && <button className="poem__del" onClick={() => { if (window.confirm('Xoá bài thơ này? Không thể hoàn tác.')) onDeletePoem(p.id) }} title="Xoá bài thơ">✕</button>}
              </div>
              {editing ? (
                <div className="poem-edit-box">
                  <input className="poem-title" placeholder="Tựa đề (tuỳ chọn)…" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  <textarea className="poem-body" rows={4} value={editBody} onChange={(e) => setEditBody(e.target.value)} />
                  <input className="poem-image-url" type="url" inputMode="url" placeholder="Link ảnh (để trống nếu muốn xoá ảnh)" value={editImageUrl} onChange={(e) => setEditImageUrl(e.target.value)} />
                  {isImageUrl(editImageUrl) && <PoemImage src={editImageUrl} preview />}
                  <div className="poem-edit-actions">
                    <button type="button" className="link-btn" onClick={cancelEdit}>Hủy</button>
                    <button type="button" className="poem-edit-save" onClick={saveEdit} disabled={!editBody.trim()}>Lưu thay đổi</button>
                  </div>
                </div>
              ) : (
                <>
                  {p.title && <h3 className="poem__title">{p.title}</h3>}
                  {p.imageUrl && <PoemImage src={p.imageUrl} />}
                  <div className="poem__body">{p.body}</div>
                </>
              )}
              <button className="poem__toggle" onClick={() => { setOpenId(open ? null : p.id); setComment('') }}>
                {p.comments.length ? `Bình luận · ${p.comments.length}` : 'Bình luận'} {open ? '▾' : '▸'}
              </button>
              {open && (
                <div className="poem__comments">
                  {p.comments.map((c) => (
                    <div className="pcm" key={c.id}>
                      <div className="pcm__body">
                        <span className="pcm__meta"><b>{c.author}</b> · {fmt(c.ts)}</span>
                        <span className="pcm__text">{c.text}</span>
                      </div>
                      {canEdit(c.author) && <button className="pcm__del" onClick={() => { if (window.confirm('Xoá bình luận này?')) onDeleteComment(p.id, c.id) }} title="Xoá">✕</button>}
                    </div>
                  ))}
                  <div className="pcm-add">
                    <input placeholder="Trao đổi về bài thơ…" value={comment} onChange={(e) => setComment(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(p.id) } }} />
                    <button onClick={() => send(p.id)} disabled={!comment.trim()}>Gửi</button>
                  </div>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

function isImageUrl(value) {
  try { return ['http:', 'https:'].includes(new URL(String(value || '').trim()).protocol) } catch { return false }
}

function PoemImage({ src, preview = false }) {
  return (
    <div className={`poem__image-wrap ${preview ? 'is-preview' : ''}`}>
      <img key={src} className="poem__image" src={src} alt="Ảnh đính kèm bài thơ" loading="lazy" referrerPolicy="no-referrer"
        onError={(e) => { e.currentTarget.closest('.poem__image-wrap')?.classList.add('is-error') }} />
      <span className="poem__image-error">Không tải được ảnh từ link này.</span>
    </div>
  )
}

function fmt(ts) {
  try { return new Date(ts).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}
