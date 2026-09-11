import { useState } from 'react'

// Góc Thơ: đăng thơ và bình luận/trao đổi trên từng bài.
export default function Poems({ poems, username, admin, onAddPoem, onDeletePoem, onAddComment, onDeleteComment, onClose }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [openId, setOpenId] = useState(null)
  const [comment, setComment] = useState('')

  const post = (e) => {
    e.preventDefault()
    if (!body.trim()) return
    onAddPoem(title, body)
    setTitle(''); setBody('')
  }
  const send = (id) => { if (!comment.trim()) return; onAddComment(id, comment); setComment('') }
  const canEdit = (author) => admin || author === username

  return (
    <section className="pane poems">
      <header className="pane__head">
        <h2>Góc Thơ</h2>
        {onClose && <button className="link-btn" onClick={onClose} title="Đóng">✕</button>}
      </header>

      <form className="poem-compose" onSubmit={post}>
        <input className="poem-title" placeholder="Tựa đề (tuỳ chọn)…" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="poem-body" rows={3} placeholder="Viết vài dòng thơ…" value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="poem-compose__bar">
          <button type="submit" disabled={!body.trim()}>Đăng thơ</button>
        </div>
      </form>

      <div className="poem-list">
        {poems.length === 0 && <div className="journal__empty">Chưa có bài thơ nào. Viết bài đầu tiên… 🌸</div>}
        {poems.map((p) => {
          const open = openId === p.id
          return (
            <article className="poem" key={p.id}>
              <div className="poem__head">
                <span className="poem__author">{p.author}</span>
                <span className="poem__time">{fmt(p.ts)}</span>
                {canEdit(p.author) && <button className="poem__del" onClick={() => { if (window.confirm('Xoá bài thơ này? Không thể hoàn tác.')) onDeletePoem(p.id) }} title="Xoá bài thơ">✕</button>}
              </div>
              {p.title && <h3 className="poem__title">{p.title}</h3>}
              <div className="poem__body">{p.body}</div>
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

function fmt(ts) {
  try { return new Date(ts).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}
