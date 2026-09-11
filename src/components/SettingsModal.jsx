import { useRef, useState } from 'react'
import { createGist } from '../lib/gist'

const isVector = (id) => id === 'vector' || id.endsWith('__vector')
const isUserImg = (id) => id.startsWith('u') || id.includes('__u')

// Cửa sổ cài đặt: thời tiết cảnh, THƯ VIỆN ẢNH NỀN (chọn/thêm/xóa),
// và đồng bộ nhật ký qua GitHub Gist.
export default function SettingsModal({
  open, onClose, config, setConfig,
  backgrounds, bgId, setBgId, onAddImage, onRemoveImage, hiddenCount, onRestoreBg,
  shared, galleryError,
  supaConfig, setSupaConfig, supaStatus, supaError,
  admin, setAdmin, keepAwake, setKeepAwake, autoplay, setAutoplay,
  fx, setFx, fxSpeed, setFxSpeed, fxDensity, setFxDensity,
}) {
  const [token, setToken] = useState(config.token || '')
  const [gistId, setGistId] = useState(config.gistId || '')
  const [roomName, setRoomName] = useState(config.roomName || 'Vibe Space Journal')
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const fileRef = useRef(null)
  const [sbUrl, setSbUrl] = useState(supaConfig?.url || '')
  const [sbKey, setSbKey] = useState(supaConfig?.key || '')
  const [sbRoom, setSbRoom] = useState(supaConfig?.room || '')
  const saveSupa = () => setSupaConfig({ url: sbUrl.trim(), key: sbKey.trim(), room: sbRoom.trim() })
  const supaStatusText = { online: 'Đã kết nối (realtime)', connecting: 'Đang kết nối…', error: 'Lỗi', offline: 'Chưa bật' }[supaStatus] || ''

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
    onAddImage({ label: 'Ảnh của tôi', url: u })
    setUrlInput('')
  }
  const addByFiles = (fileList) => {
    Array.from(fileList || []).forEach((f) => {
      if (!f.type.startsWith('image')) return
      onAddImage({ label: f.name.replace(/\.[^.]+$/, ''), file: f })
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
            <h3>🍂 Hiệu ứng rơi</h3>
            <div className="scene-picker">
              {[
                { id: 'none', label: 'Không' },
                { id: 'leaves', label: 'Lá rơi' },
                { id: 'petals', label: 'Cánh hoa' },
                { id: 'both', label: 'Cả hai' },
                { id: 'rain', label: 'Mưa' },
              ].map((o) => (
                <button key={o.id} className={`scene-opt ${fx === o.id ? 'is-active' : ''}`}
                  onClick={() => setFx(o.id)}>{o.label}</button>
              ))}
            </div>
            {fx !== 'none' && (
              <>
                <div className="fx-speed">
                  <span className="muted">{fx === 'rain' ? 'Cường độ mưa' : 'Tốc độ rơi'}</span>
                  <div className="fx-speed__row">
                    <span className="fx-speed__end">Chậm</span>
                    <input type="range" min="0" max="100" value={fxSpeed}
                      onChange={(e) => setFxSpeed(Number(e.target.value))} />
                    <span className="fx-speed__end">Nhanh</span>
                  </div>
                </div>
                <div className="fx-speed">
                  <span className="muted">{fx === 'rain' ? 'Lượng hạt mưa' : 'Số lượng lá'}</span>
                  <div className="fx-speed__row">
                    <span className="fx-speed__end">Thưa</span>
                    <input type="range" min="0" max="100" value={fxDensity}
                      onChange={(e) => setFxDensity(Number(e.target.value))} />
                    <span className="fx-speed__end">Dày</span>
                  </div>
                </div>
              </>
            )}
          </section>

          <section className="settings-block">
            <h3>🖼️ Ảnh nền ({backgrounds.length}){shared ? ' · chung 2 người' : ''}</h3>
            {galleryError && <p className="form-note">{galleryError}</p>}
            <div className="bg-grid">
              {backgrounds.map((b) => (
                <button key={b.id} className={`bg-tile ${bgId === b.id ? 'is-active' : ''}`}
                  onClick={() => setBgId(b.id)} title={b.label}>
                  {isVector(b.id) || !b.url
                    ? <span className="bg-tile__vector">✎ {b.label}</span>
                    : <img src={b.thumb || b.url} alt="" loading="lazy" />}
                  <span className="bg-tile__label">{b.label}</span>
                  {(admin || isUserImg(b.id)) && !b.builtin && (
                    <span className="bg-tile__del" onClick={(e) => { e.stopPropagation(); onRemoveImage(b.id) }} title="Xóa ảnh này">✕</span>
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
            {admin && hiddenCount > 0 && (
              <div className="settings-actions">
                <button className="btn btn--ghost" onClick={onRestoreBg}>Khôi phục {hiddenCount} ảnh đã ẩn</button>
              </div>
            )}
          </section>

          <section className="settings-block">
            <h3>🎵 Nghe nhạc</h3>
            <label className="admin-row">
              <input type="checkbox" checked={!!autoplay} onChange={(e) => setAutoplay(e.target.checked)} />
              <span>Mở trang là tự phát một bài ngẫu nhiên trong hàng chờ.</span>
            </label>
            <label className="admin-row">
              <input type="checkbox" checked={!!keepAwake} onChange={(e) => setKeepAwake(e.target.checked)} />
              <span>Giữ màn hình sáng khi đang phát để nhạc không bị ngắt (điện thoại).</span>
            </label>
          </section>

          <section className="settings-block">
            <h3>🔑 Quyền admin</h3>
            <label className="admin-row">
              <input type="checkbox" checked={!!admin} onChange={(e) => setAdmin(e.target.checked)} />
              <span>Hiện nút xóa tin & xóa toàn bộ nhật ký (chỉ trên máy bạn).</span>
            </label>
          </section>

          <section className="settings-block">
            <h3>⚡ Supabase — chat & playlist realtime</h3>
            <p className="settings-note">Trạng thái: <b>{supaStatusText}</b>{supaError ? ` — ${supaError}` : ''}</p>
            <label className="field">
              <span>Project URL</span>
              <input type="text" placeholder="https://xxxx.supabase.co" value={sbUrl} onChange={(e) => setSbUrl(e.target.value)} />
            </label>
            <label className="field">
              <span>anon public key</span>
              <input type="password" placeholder="eyJhbGci…" value={sbKey} onChange={(e) => setSbKey(e.target.value)} />
            </label>
            <label className="field">
              <span>Mã phòng chung</span>
              <input type="text" placeholder="vd: mai-nam-2026-x7q" value={sbRoom} onChange={(e) => setSbRoom(e.target.value)} />
            </label>
            <div className="settings-actions">
              <button className="btn btn--primary" onClick={saveSupa}>Lưu & kết nối</button>
            </div>
          </section>

          <section className="settings-block">
            <h3>👥 Nhật ký qua GitHub Gist (thay thế)</h3>
            <p className="settings-note">Bỏ trống = chạy offline (chỉ lưu trên máy này).</p>
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
