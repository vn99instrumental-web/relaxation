// Thanh điều khiển mỏng ở đáy màn hình: thông tin bài đang phát + nút phát,
// âm lượng, và các nút mở/đóng panel (Nhạc / Không gian / Nhật ký).
import { IconMusic, IconJournal, IconImmersive, IconPoem, IconSettings, IconPrev, IconNext, IconPlay, IconPause } from './icons'
import { trackName } from '../lib/youtube'

export default function Dock({
  yt, queue, index, onNext, onPrev, ytVolume, setYtVolume,
  playlistName = '', titles,
  queuePosition = -1, unread = 0, unreadPoems = 0,
  leftTab, onToggleLeft, journalOpen, onToggleJournal, poemsOpen, onTogglePoems, onOpenSettings, onHideUI,
}) {
  const title = yt.nowTitle || trackName(queue[index], titles) || (queue.length ? 'Sẵn sàng phát…' : 'Chưa có bài — mở ♫ Nhạc để thêm')
  const duration = Number(yt.duration) || 0
  const currentTime = Math.min(Number(yt.currentTime) || 0, duration || Infinity)
  const timeLabel = (seconds) => {
    const safe = Math.max(0, Math.floor(Number(seconds) || 0))
    return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
  }

  return (
    <div className="dock">
      <div className="dock__now">
        <span className={`dock__spin ${yt.playing ? 'is-spinning' : ''}`}>❊</span>
        <div className="dock__track-meta">
          {playlistName && <div className="dock__playlist" title={playlistName}>♫ {playlistName}</div>}
          <div className="dock__title" title={title}>
            {title}
            {queue.length > 0 && <span className="dock__count"> · {(queuePosition >= 0 ? queuePosition : index) + 1}/{queue.length}</span>}
          </div>
          <div className="dock__seek-row">
            <span>{timeLabel(currentTime)}</span>
            <input className="dock__seek" type="range" min="0" max={duration || 0.1} step="0.1"
              value={currentTime} disabled={!duration} onChange={(e) => yt.seekTo(Number(e.target.value))}
              aria-label="Tua bài hát" />
            <span>{timeLabel(duration)}</span>
          </div>
        </div>
      </div>

      <div className="dock__transport">
        <button className="ctrl" onClick={onPrev} title="Bài trước" disabled={!queue.length} aria-label="Bài trước"><IconPrev /></button>
        <button className="ctrl ctrl--main" onClick={yt.toggle} title="Phát / Dừng" disabled={!yt.current}
          aria-label={yt.playing ? 'Dừng' : 'Phát'}>
          {yt.playing ? <IconPause /> : <IconPlay />}
        </button>
        <button className="ctrl" onClick={onNext} title="Bài sau" disabled={!queue.length} aria-label="Bài sau"><IconNext /></button>
        <label className="dock__vol" title="Âm lượng nhạc">
          <span className="player__volicon">♪</span>
          <input type="range" min="0" max="100" value={ytVolume} onChange={(e) => setYtVolume(Number(e.target.value))} />
        </label>
      </div>

      <div className="dock__tabs">
        <button className={`dock__btn ${leftTab === 'music' ? 'is-active' : ''}`} onClick={() => onToggleLeft('music')}
          title="Nhạc — danh sách bài hát & playlist (thêm link YouTube)">
          <IconMusic /><span>Nhạc</span>
        </button>
        <button className={`dock__btn dock__btn--journal ${journalOpen ? 'is-active' : ''}`} onClick={onToggleJournal}
          title="Nhật ký chung — nhắn tin cho nhau">
          <IconJournal /><span>Nhật ký</span>
          {!journalOpen && unread > 0 && <span className="dock__notif"><IconJournal /> {unread > 9 ? '9+' : unread}<span> mới</span></span>}
        </button>
        <button className={`dock__btn dock__btn--journal ${poemsOpen ? 'is-active' : ''}`} onClick={onTogglePoems}
          title="Góc Hoài Niệm — thơ, câu văn và hình ảnh gợi suy tư">
          <IconPoem /><span>Hoài niệm</span>
          {!poemsOpen && unreadPoems > 0 && <span className="dock__notif"><IconPoem /> {unreadPoems > 9 ? '9+' : unreadPoems}<span> mới</span></span>}
        </button>
        <button className="dock__btn dock__btn--icon dock__btn--settings" onClick={onOpenSettings}
          title="Cài đặt giao diện, hiệu ứng và nhạc" aria-label="Mở cài đặt">
          <IconSettings />
        </button>
        <button className="dock__btn dock__btn--icon" onClick={onHideUI} title="Ẩn giao diện — chỉ ngắm cảnh">
          <IconImmersive />
        </button>
      </div>
    </div>
  )
}
