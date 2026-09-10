import { useRef, useState } from 'react'
import { createGist } from '../lib/gist'

// Cửa sổ cài đặt: thời tiết cảnh, THƯ VIỆN ẢNH NỀN (chọn/thêm/xóa),
// và đồng bộ nhật ký qua GitHub Gist.
export default function SettingsModal({
  open, onClose, config, setConfig, scene, setScene,
  backgrounds, bgId, setBgId, onAddBg, onRemoveBg,
}) {
  const [token, setToken] = useState(config.token || '')
  const [gistId, setGistId] = useState(config.gistId || '')
  const [roomName, setRoomName] = useState(config.roomName || 'Vibe Space Journal')
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const fileRef = useRef(null)

  if (!open) return null

  const saveSync = () => {
    setConfig({ ...config, token: token.trim(), gistId: gistId.trim(), roomName: roomName.trim() })
    setMsg('Đã lưu cấu hình đồng bộ.')
  }
  const handleCreate = async () => {
    if (!token.trim()) { setMsg('Cần dán GitHub token trước đã.'); return }
    setCreating(true); setMsg('')
    try {
      const id = await createGist(token.trim(), roomName.trim())
      setGistId(id)
      setConfig({ ...config, token: token.trim(), gistId: id, roomName: roomName.trim() })
      setMsg('Đã tạo Gist mới! Gửi mã Gist ID này cho người kia để cùng dùng.')
    } catch (e) {
      setMsg('Tạo Gist lỗi: ' + (e.message || 'không rõ'))
    } finally { setCreating(false) }
  }

  const addByUrl = () => {
    const u = urlInput.trim()
    if (!u) return
    onAddBg('Ảnh của tôi', u)
    setUrlInput('')
  }
  const addByFiles = (fileList) => {
    const files = Array.from(fileList || [])
    files.forEach((f) => {
      if (!f.type.startsWith('image')) return
      const reader = new FileReader()
      reader.onload = () => onAddBg(f.name.replace(/\.[^.]+$/, ''), reader.result)
      reader.readAsDataURL(f)
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal__head">
          <h2>Cài đặt</h2>
          <button className="modal__close" onClick={onClose}>✕</button>
        </header>

        <div className="modal__body">
          <section className="settings-block">
            <h3>🌦️ Thời tiết</h3>
            <div className="scene-picker">
              {[
                { id: 'fog', label: 'Sương mù' },
                { id: 'rain', label: 'Mưa phùn' },
                { id: 'ray', label: 'Tia nắng (ray)' },
              ].map((s) => (
                <button key={s.id} className={`scene-opt ${scene === s.id ? 'is-active' : ''}`}
                  onClick={() => setScene(s.id)}>{s.label}</button>
              ))}
            </div>
          </section>

          <section className="settings-block">
            <h3>🖼️ Ảnh nền ({backgrounds.length})</h3>
            <p className="settings-note">
              Bấm để chọn. Cũng có thể bấm nút <b>🖼</b> trên thanh trên cùng để đổi nhanh.
              Ảnh nào không tải được sẽ tự quay về tranh vẽ.
            </p>
            <div className="bg-grid">
              {backgrounds.map((b) => (
                <button key={b.id} className={`bg-tile ${bgId === b.id ? 'is-active' : ''}`}
                  onClick={() => setBgId(b.id)} title={b.label}>
                  {b.id === 'vector'
                    ? <span className="bg-tile__vector">✎ Tranh vẽ</span>
                    : <img src={b.thumb || b.url} alt="" loading="lazy" />}
                  <span className="bg-tile__label">{b.label}</span>
                  {b.id.startsWith('u') && (
                    <span className="bg-tile__del" onClick={(e) => { e.stopPropagation(); onRemoveBg(b.id) }} title="Xóa">✕</span>
                  )}
                </button>
              ))}
            </div>
            <div className="bg-add">
              <button className="btn" onClick={() => fileRef.current?.click()}>Tải ảnh lên</button>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden
                onChange={(e) => { addByFiles(e.target.files); e.target.value = '' }} />
              <input type="text" placeholder="hoặc dán URL ảnh…" value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addByUrl() }} />
              <button className="btn" onClick={addByUrl}>Thêm</button>
            </div>
          </section>

          <section className="settings-block">
            <h3>👥 Đồng bộ nhật ký 2 người (GitHub Gist)</h3>
            <p className="settings-note">
              Để 2 người ở 2 máy thấy nhật ký của nhau, cả hai dùng chung <b>1 Gist</b> và <b>1 token</b> có
              quyền <code>gist</code>. Token chỉ lưu trong trình duyệt của bạn và chỉ gửi tới GitHub.
              Bỏ trống hai ô này thì app chạy <b>offline</b> (chỉ lưu trên máy).
            </p>
            <ol className="settings-steps">
              <li>Vào GitHub → Settings → Developer settings → <b>Tokens</b>. Tạo token có quyền <code>gist</code>.</li>
              <li>Dán token vào ô dưới, đặt tên phòng, bấm <b>Tạo Gist mới</b>.</li>
              <li>Gửi <b>Gist ID</b> vừa tạo + token cho người kia để họ điền y hệt.</li>
            </ol>
            <label className="field">
              <span>GitHub Token (quyền gist)</span>
              <input type="password" placeholder="ghp_… hoặc github_pat_…" value={token} onChange={(e) => setToken(e.target.value)} />
            </label>
            <label className="field">
              <span>Tên phòng / cuốn nhật ký</span>
              <input type="text" value={roomName} onChange={(e) => setRoomName(e.target.value)} />
            </label>
            <label className="field">
              <span>Gist ID</span>
              <div className="field__row">
                <input type="text" placeholder="dán Gist ID hoặc bấm Tạo mới" value={gistId} onChange={(e) => setGistId(e.target.value)} />
                <button className="btn" onClick={handleCreate} disabled={creating}>{creating ? 'Đang tạo…' : 'Tạo Gist mới'}</button>
              </div>
            </label>
            <div className="settings-actions">
              <button className="btn btn--primary" onClick={saveSync}>Lưu & kết nối</button>
              {msg && <span className="settings-msg">{msg}</span>}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
