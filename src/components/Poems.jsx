import { useState } from 'react'

// Góc Thơ tách riêng không gian đọc và đăng bài để phần thơ luôn thoáng.
export default function Poems({ poems, username, admin, onAddPoem, onEditPoem, onDeletePoem, onClose }) {
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
        <h2>Góc Thơ</h2>
        {onClose && <button className="link-btn" onClick={onClose} title="Đóng">✕</button>}
      </header>

      <div className="poem-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'feed'} className={tab === 'feed' ? 'is-active' : ''}
          onClick={() => { resetForm(); setTab('feed') }}>Thơ & ảnh</button>
        <button role="tab" aria-selected={tab === 'compose'} className={tab === 'compose' ? 'is-active' : ''}
          onClick={openComposer}>{editingId ? 'Sửa bài' : 'Đăng bài'}</button>
      </div>

      {tab === 'compose' ? (
        <form className="poem-compose poem-compose--page" onSubmit={submit}>
          <div className="poem-compose__hint">{editingId ? 'Sửa trang thơ' : 'Đăng một trang thơ mới'}</div>
          <input className="poem-title" placeholder="Tựa đề (tuỳ chọn)…" value={title} onChange={(event) => setTitle(event.target.value)} />
          <textarea className="poem-body" rows={8} placeholder="Viết bài thơ…" value={body} onChange={(event) => setBody(event.target.value)} />
          <input className="poem-image-url" type="url" inputMode="url" placeholder="Link ảnh (tuỳ chọn) — https://…" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} />
          {invalidImage && <span className="poem-url-error">Link ảnh phải bắt đầu bằng http:// hoặc https://</span>}
          {isImageUrl(imageUrl) && <PoemImage src={imageUrl} preview />}
          <div className="poem-compose__bar">
            <span>Ảnh chỉ xuất hiện trong Góc Thơ, không hiện dưới tagline.</span>
            <div className="poem-compose__actions">
              <button type="button" className="link-btn" onClick={() => { resetForm(); setTab('feed') }}>Hủy</button>
              <button type="submit" disabled={!body.trim() || invalidImage}>{editingId ? 'Lưu' : 'Đăng'}</button>
            </div>
          </div>
        </form>
      ) : (
        <div className="poem-list poem-list--gallery">
          {poems.length === 0 && <div className="journal__empty">Chưa có bài thơ nào. Hãy mở tab “Đăng bài”… 🌸</div>}
          {poems.map((poem) => (
            <article className="poem poem--reading" key={poem.id}>
              {canEdit(poem.author) && <div className="poem__actions">
                <button className="poem__edit" onClick={() => startEdit(poem)} title="Sửa bài thơ và hình ảnh">✎</button>
                <button className="poem__del" onClick={() => { if (window.confirm('Xoá bài thơ này? Không thể hoàn tác.')) onDeletePoem(poem.id) }} title="Xoá bài thơ">✕</button>
              </div>}
              {poem.title && <h3 className="poem__title">{poem.title}</h3>}
              {poem.imageUrl && <PoemImage src={poem.imageUrl} />}
              <div className="poem__body">{poem.body}</div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function isImageUrl(value) {
  try { return ['http:', 'https:'].includes(new URL(String(value || '').trim()).protocol) } catch { return false }
}

function PoemImage({ src, preview = false }) {
  return <div className={`poem__image-wrap ${preview ? 'is-preview' : ''}`}>
    <img key={src} className="poem__image" src={src} alt="Ảnh đính kèm bài thơ" loading="lazy" referrerPolicy="no-referrer"
      onError={(event) => event.currentTarget.closest('.poem__image-wrap')?.classList.add('is-error')} />
    <span className="poem__image-error">Không tải được ảnh từ link này.</span>
  </div>
}
