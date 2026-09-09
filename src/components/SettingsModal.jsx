import { useState } from 'react'
import { createGist } from '../lib/gist'

// Cửa sổ cài đặt: đồng bộ Gist (token, gistId, tên phòng) + cảnh nền + ảnh nền.
// props: open, onClose, config, setConfig, scene, setScene, photo, setPhoto
export default function SettingsModal({ open, onClose, config, setConfig, scene, setScene, photo, setPhoto }) {
  const [token, setToken] = useState(config.token || '')
  const [gistId, setGistId] = useState(config.gistId || '')
  const [roomName, setRoomName] = useState(config.roomName || 'Vibe Space Journal')
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState('')
  const [photoInput, setPhotoInput] = useState(photo || '')

  if (!open) return null

  const saveSync = () => {
    setConfig({ ...config, token: token.trim(), gistId: gistId.trim(), roomName: roomName.trim() })
    setMsg('Đã lưu cấu hình đồng bộ.')
  }

  const handleCreate = async () => {
    if (!token.trim()) { setMsg('Cần dán GitHub token trước đã.'); return }
    setCreating(true)
    setMsg('')
    try {
      const id = await createGist(token.trim(), roomName.trim())
      setGistId(id)
      setConfig({ ...config, token: token.trim(), gistId: id, roomName: roomName.trim() })
      setMsg('Đã tạo Gist mới! Gửi mã Gist ID này cho người kia để cùng dùng.')
    } catch (e) {
      setMsg('Tạo Gist lỗi: ' + (e.message || 'không rõ'))
    } finally {
      setCreating(false)
    }
  }

  const applyPhoto = () => setPhoto(photoInput.trim())
  const clearPhoto = () => { setPhotoInput(''); setPhoto('') }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal__head">
          <h2>Cài đặt</h2>
          <button className="modal__close" onClick={onClose}>✕</button>
        </header>

        <div className="modal__body">
          <section className="settings-block">
            <h3>🌄 Khung cảnh</h3>
            <div className="scene-picker">
              {[
                { id: 'fog', label: 'Sương mù' },
                { id: 'rain', label: 'Mưa phùn' },
                { id: 'ray', label: 'Tia nắng (ray)' },
              ].map((s) => (
                <button
                  key={s.id}
                  className={`scene-opt ${scene === s.id ? 'is-active' : ''}`}
                  onClick={() => setScene(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <label className="field">
              <span>Ảnh nền tùy chọn (URL) — để trống dùng cảnh vẽ sẵn</span>
              <div className="field__row">
                <input
                  type="text"
                  placeholder="https://…/da-lat.jpg"
                  value={photoInput}
                  onChange={(e) => setPhotoInput(e.target.value)}
                />
                <button className="btn" onClick={applyPhoto}>Áp dụng</button>
                {photo && <button className="btn btn--ghost" onClick={clearPhoto}>Bỏ ảnh</button>}
              </div>
            </label>
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
                <button className="btn" onClick={handleCreate} disabled={creating}>
                  {creating ? 'Đang tạo…' : 'Tạo Gist mới'}
                </button>
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
