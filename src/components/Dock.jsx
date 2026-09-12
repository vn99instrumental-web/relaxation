// Thanh điều khiển mỏng ở đáy màn hình: thông tin bài đang phát + nút phát,
// âm lượng, và các nút mở/đóng panel (Nhạc / Không gian / Nhật ký).
import { IconMusic, IconAmbient, IconJournal, IconImmersive, IconPoem, IconShuffle, IconPrev, IconNext, IconPlay, IconPause } from './icons'

export default function Dock({
  yt, queue, index, onNext, onPrev, ytVolume, setYtVolume,
  shuffle, onToggleShuffle, unread = 0, unreadPoems = 0,
  leftTab, onToggleLeft, journalOpen, onToggleJournal, poemsOpen, onTogglePoems, onHideUI,
}) {
  const title = yt.nowTitle || (queue.length ? 'Sẵn sàng phát…' : 'Chưa có bài — mở ♫ Nhạc để thêm')

  return (
    <div className="dock">
      <div className="dock__now">
        <span className={`dock__spin ${yt.playing ? 'is-spinning' : ''}`}>❊</span>
        <div className="dock__title" title={title}>
          {title}
          {queue.length > 0 && <span className="dock__count"> · {index + 1}/{queue.length}</span>}
        </div>
      </div>

      <div className="dock__transport">
        <button className={`ctrl ctrl--sm shuffle ${shuffle ? 'is-on' : ''}`} onClick={onToggleShuffle}
          title={shuffle ? 'Trộn ngẫu nhiên: BẬT' : 'Trộn ngẫu nhiên: tắt'}
          aria-label={shuffle ? 'Tắt phát ngẫu nhiên' : 'Bật phát ngẫu nhiên'}
          aria-pressed={shuffle} disabled={queue.length < 2}><IconShuffle /></button>
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
        <button className={`dock__btn ${leftTab === 'ambient' ? 'is-active' : ''}`} onClick={() => onToggleLeft('ambient')}
          title="Không gian — âm thanh nền: mưa, gió, suối, chim">
          <IconAmbient /><span>Không gian</span>
        </button>
        <button className={`dock__btn dock__btn--journal ${journalOpen ? 'is-active' : ''}`} onClick={onToggleJournal}
          title="Nhật ký chung — nhắn tin cho nhau">
          <IconJournal /><span>Nhật ký</span>
          {!journalOpen && unread > 0 && <span className="dock__notif">💬 {unread > 9 ? '9+' : unread} mới</span>}
        </button>
        <button className={`dock__btn dock__btn--journal ${poemsOpen ? 'is-active' : ''}`} onClick={onTogglePoems}
          title="Góc Thơ — đăng thơ & bình luận cùng nhau">
          <IconPoem /><span>Thơ</span>
          {!poemsOpen && unreadPoems > 0 && <span className="dock__notif">✍️ {unreadPoems > 9 ? '9+' : unreadPoems} mới</span>}
        </button>
        <button className="dock__btn dock__btn--icon" onClick={onHideUI} title="Ẩn giao diện — chỉ ngắm cảnh">
          <IconImmersive />
        </button>
      </div>
    </div>
  )
}
