import { useRef, useState } from 'react'
import { WIND_PRESETS, PRESET_ORDER } from '../leaf-engine/config'
import { IconCheck, IconClose, IconEdit, IconImage, IconMusic, IconPalette, IconSettings, IconShield, IconTrash } from './icons'
import { createPlaylistBackup, parsePlaylistBackup } from '../lib/playlistBackup'

const isVector = (id) => id === 'vector' || id.endsWith('__vector')
const isUserImg = (id) => id.startsWith('u') || id.includes('__u')

export default function SettingsModal({
  open, onClose,
  backgrounds, bgId, setBgId, onAddImage, onRemoveImage, onRenameImage, hiddenCount, onRestoreBg,
  shared, galleryError,
  admin, setAdmin, keepAwake, setKeepAwake, autoplay, setAutoplay,
  theme, setTheme, themes,
  fx, setFx, fxSpeed, setFxSpeed, fxDensity, setFxDensity, fxSize, setFxSize, fxPreset, setFxPreset,
  fxWindDir, setFxWindDir, fxSwirl, setFxSwirl,
  playlists = [], onImportPlaylists,
}) {
  const [tab, setTab] = useState('appearance')
  const [msg, setMsg] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const fileRef = useRef(null)
  const backupFileRef = useRef(null)
  const lastFxRef = useRef(fx.length ? fx : ['leaves'])
  if (fx.length) lastFxRef.current = fx
  const [selectMode, setSelectMode] = useState(false)
  const [selectedBg, setSelectedBg] = useState([])
  const [importMode, setImportMode] = useState('merge')
  const [backupBusy, setBackupBusy] = useState(false)

  if (!open) return null

  const addByUrl = () => {
    const url = urlInput.trim()
    if (!url) return
    onAddImage({ label: 'Ảnh của tôi', url })
    setUrlInput('')
  }
  const addByFiles = (fileList) => {
    Array.from(fileList || []).forEach((file) => {
      if (file.type.startsWith('image')) onAddImage({ label: file.name.replace(/\.[^.]+$/, ''), file })
    })
  }
  const canDelete = (background) => admin || isUserImg(background.id) || background.builtin
  const deletable = backgrounds.filter(canDelete)
  const exitSelect = () => { setSelectMode(false); setSelectedBg([]) }
  const toggleSelect = (id) => setSelectedBg((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  const deleteSelected = () => {
    if (!selectedBg.length || !window.confirm(`Xoá ${selectedBg.length} ảnh nền đã chọn?`)) return
    selectedBg.forEach((id) => onRemoveImage(id))
    exitSelect()
  }
  const renameBackground = async (background) => {
    const nextLabel = window.prompt('Tên ảnh mới', background.label)
    if (nextLabel === null || nextLabel.trim() === background.label) return
    if (!nextLabel.trim()) { setMsg('Tên ảnh không được để trống.'); return }
    const ok = await onRenameImage(background.id, nextLabel)
    setMsg(ok === false ? 'Không thể đổi tên ảnh.' : 'Đã đổi tên ảnh.')
  }
  const toggleEffects = (enabled) => setFx(enabled ? (lastFxRef.current.length ? lastFxRef.current : ['leaves']) : [])

  const exportPlaylists = () => {
    const payload = createPlaylistBackup(playlists)
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `duoi-tan-thong-playlists-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 0)
    setMsg(`Đã xuất ${payload.playlists.length} playlist.`)
  }

  const importPlaylistFile = async (file) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setMsg('Tệp backup vượt quá 5 MB.'); return }
    setBackupBusy(true)
    try {
      const incoming = parsePlaylistBackup(await file.text())
      if (importMode === 'replace' && !window.confirm(`Thay toàn bộ playlist hiện tại bằng ${incoming.length} playlist trong backup?`)) return
      const count = await onImportPlaylists(incoming, importMode)
      setMsg(`Đã khôi phục ${count} playlist${importMode === 'replace' ? ' và thay thư viện cũ' : ''}.`)
    } catch (error) {
      setMsg(error.message || 'Không thể đọc tệp backup.')
    } finally {
      setBackupBusy(false)
      if (backupFileRef.current) backupFileRef.current.value = ''
    }
  }

  const tabs = [
    { id: 'appearance', label: 'Giao diện', Icon: IconPalette },
    { id: 'backgrounds', label: 'Ảnh nền', Icon: IconImage },
    { id: 'music', label: 'Nhạc', Icon: IconMusic },
    { id: 'admin', label: 'Quyền admin', Icon: IconShield },
  ]

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" onClick={(event) => event.stopPropagation()}>
        <header className="modal__head">
          <h2><IconSettings /> Cài đặt</h2>
          <button className="modal__close" onClick={onClose} aria-label="Đóng cài đặt"><IconClose /></button>
        </header>

        <nav className="settings-tabs" role="tablist">
          {tabs.map(({ id, label, Icon }) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id}
              className={`settings-tab ${tab === id ? 'is-active' : ''}`} onClick={() => setTab(id)}>
              <Icon /><span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="modal__body settings-tabbody">
          {tab === 'appearance' && (
            <section className="settings-block">
              <h3><IconPalette /> Tông màu</h3>
              <div className="theme-grid">
                {themes.map((item) => (
                  <button key={item.id} type="button" className={`theme-card ${theme === item.id ? 'is-active' : ''}`}
                    onClick={() => setTheme(item.id)} aria-pressed={theme === item.id}>
                    <span className={`theme-dot theme-dot--${item.id}`} /><span>{item.label}</span>
                  </button>
                ))}
              </div>

              <div className="settings-subhead">
                <h3>Hiệu ứng thời tiết</h3>
                <label className="settings-switch">
                  <input type="checkbox" checked={fx.length > 0} onChange={(event) => toggleEffects(event.target.checked)} />
                  <span>{fx.length ? 'Đang bật' : 'Đã tắt'}</span>
                </label>
              </div>
              {fx.length > 0 && (
                <>
                  <div className="scene-picker">
                    {[
                      { id: 'leaves', label: 'Lá rơi' }, { id: 'petals', label: 'Cánh hoa' },
                      { id: 'rain', label: 'Mưa' }, { id: 'drizzle', label: 'Mưa phùn' },
                    ].map((item) => {
                      const enabled = fx.includes(item.id)
                      return <button key={item.id} type="button" className={`scene-opt ${enabled ? 'is-active' : ''}`}
                        aria-pressed={enabled} onClick={() => setFx(enabled ? fx.filter((value) => value !== item.id) : [...fx, item.id])}>{item.label}</button>
                    })}
                  </div>
                  <div className="fx-preset"><span className="muted">Kiểu gió</span><div className="fx-preset__row">
                    {PRESET_ORDER.map((id) => <button key={id} type="button" className={`preset-opt ${fxPreset === id ? 'is-active' : ''}`}
                      onClick={() => setFxPreset(id)}>{WIND_PRESETS[id].label}</button>)}
                  </div></div>
                  <div className="fx-preset"><span className="muted">Hướng gió</span><div className="fx-preset__row">
                    {[{ id: 'auto', label: 'Tự đổi' }, { id: 'right', label: '→ Phải' }, { id: 'left', label: '← Trái' }].map((item) =>
                      <button key={item.id} type="button" className={`preset-opt ${fxWindDir === item.id ? 'is-active' : ''}`}
                        onClick={() => setFxWindDir(item.id)}>{item.label}</button>)}
                  </div></div>
                  <RangeSetting label="Tốc độ rơi" left="Chậm" right="Nhanh" value={fxSpeed} onChange={setFxSpeed} />
                  <RangeSetting label="Độ chao lượn" left="Rơi thẳng" right="Chao lượn" value={fxSwirl} onChange={setFxSwirl} />
                  <RangeSetting label="Số lượng" left="Thưa" right="Dày" value={fxDensity} onChange={setFxDensity} />
                  <RangeSetting label="Kích thước" left="Nhỏ" right="To" value={fxSize} onChange={setFxSize} />
                </>
              )}
            </section>
          )}

          {tab === 'backgrounds' && (
            <section className="settings-block">
              <div className="bg-head"><h3><IconImage /> Ảnh nền ({backgrounds.length}){shared ? ' · dùng chung' : ''}</h3>
                {deletable.length > 0 && (selectMode
                  ? <button className="bg-selbtn" onClick={exitSelect}>Xong</button>
                  : <button className="bg-selbtn" onClick={() => setSelectMode(true)}>Chọn để xóa</button>)}</div>
              {galleryError && <p className="form-note">{galleryError}</p>}
              {selectMode && <div className="bg-selbar"><span className="muted">Đã chọn {selectedBg.length}</span>
                <button className="btn btn--sm" onClick={() => setSelectedBg(deletable.map((item) => item.id))}>Chọn tất cả</button>
                <button className="btn btn--sm" onClick={() => setSelectedBg([])}>Bỏ chọn</button>
                <button className="btn btn--sm btn--danger" onClick={deleteSelected} disabled={!selectedBg.length}>Xóa {selectedBg.length || ''}</button>
              </div>}
              <div className="bg-grid">{backgrounds.map((background) => {
                const checked = selectedBg.includes(background.id)
                return <button key={background.id} className={`bg-tile ${!selectMode && bgId === background.id ? 'is-active' : ''} ${checked ? 'is-selected' : ''}`}
                  onClick={() => selectMode ? (canDelete(background) && toggleSelect(background.id)) : setBgId(background.id)}>
                  {isVector(background.id) || !background.url ? <span className="bg-tile__vector"><IconEdit /> {background.label}</span> : <img src={background.thumb || background.url} alt="" loading="lazy" />}
                  <span className="bg-tile__label">{background.label}</span>
                  {selectMode ? (canDelete(background) && <span className={`bg-tile__check ${checked ? 'is-on' : ''}`}>{checked && <IconCheck />}</span>) : <>
                    <span className="bg-tile__edit" onClick={(event) => { event.stopPropagation(); renameBackground(background) }} title="Đổi tên ảnh"><IconEdit /></span>
                    {canDelete(background) && <span className="bg-tile__del" onClick={(event) => { event.stopPropagation(); if (window.confirm(`Xoá ảnh nền “${background.label}”?`)) onRemoveImage(background.id) }} title="Xóa ảnh"><IconTrash /></span>}
                  </>}
                </button>
              })}</div>
              <div className="bg-add"><button className="btn" onClick={() => fileRef.current?.click()}>Tải ảnh</button>
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(event) => { addByFiles(event.target.files); event.target.value = '' }} />
                <input type="text" placeholder="hoặc dán URL ảnh…" value={urlInput} onChange={(event) => setUrlInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addByUrl() }} />
                <button className="btn" onClick={addByUrl}>Thêm</button></div>
              {hiddenCount > 0 && <div className="settings-actions"><button className="btn btn--ghost" onClick={onRestoreBg}>Khôi phục {hiddenCount} ảnh đã ẩn</button></div>}
              {msg && <span className="settings-msg">{msg}</span>}
            </section>
          )}

          {tab === 'music' && <section className="settings-block">
            <h3><IconMusic /> Phát nhạc</h3>
            <label className="admin-row"><input type="checkbox" checked={!!autoplay} onChange={(event) => setAutoplay(event.target.checked)} /><span>Tự phát bài mặc định hoặc hàng chờ khi mở trang.</span></label>
            <label className="admin-row"><input type="checkbox" checked={!!keepAwake} onChange={(event) => setKeepAwake(event.target.checked)} /><span>Giữ màn hình sáng khi đang phát trên điện thoại.</span></label>
            <p className="settings-note">Đặt hoặc bỏ bài mặc định bằng biểu tượng ☆ trên bài đang phát trong tab Nhạc.</p>
          </section>}

          {tab === 'admin' && <section className="settings-block">
            <h3><IconShield /> Quyền admin</h3>
            <label className="admin-row"><input type="checkbox" checked={!!admin} onChange={(event) => setAdmin(event.target.checked)} /><span>Cho phép quản lý nội dung chung và đặt cấu hình mặc định cho phòng.</span></label>
            <div className="settings-backup">
              <h3><IconMusic /> Backup playlist</h3>
              <p className="settings-note">Xuất toàn bộ {playlists.length} playlist thành một tệp JSON, hoặc khôi phục lại vào thư viện hiện tại.</p>
              <div className="settings-backup__actions">
                <button type="button" className="btn btn--ghost" onClick={exportPlaylists} disabled={!playlists.length || backupBusy}>Xuất backup</button>
                <select value={importMode} onChange={(event) => setImportMode(event.target.value)} aria-label="Cách nhập playlist" disabled={!admin || backupBusy}>
                  <option value="merge">Gộp với thư viện</option>
                  <option value="replace">Thay thế thư viện</option>
                </select>
                <button type="button" className="btn btn--primary" onClick={() => backupFileRef.current?.click()} disabled={!admin || backupBusy}>{backupBusy ? 'Đang nhập…' : 'Nhập backup'}</button>
                <input ref={backupFileRef} type="file" accept="application/json,.json" hidden onChange={(event) => importPlaylistFile(event.target.files?.[0])} />
              </div>
              {!admin && <p className="settings-note">Bật quyền admin để nhập và thay đổi thư viện playlist.</p>}
              {msg && <p className="settings-msg" role="status">{msg}</p>}
            </div>
          </section>}
        </div>
      </div>
    </div>
  )
}

function RangeSetting({ label, left, right, value, onChange }) {
  return <div className="fx-speed"><span className="muted">{label}</span><div className="fx-speed__row">
    <span className="fx-speed__end">{left}</span><input type="range" min="0" max="100" value={value} onChange={(event) => onChange(Number(event.target.value))} /><span className="fx-speed__end">{right}</span>
  </div></div>
}
