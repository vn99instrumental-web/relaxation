// Thanh điều khiển mỏng ở đáy màn hình: thông tin bài đang phát + nút phát,
// âm lượng, và các nút mở/đóng panel (Nhạc / Không gian / Nhật ký).

// Bộ icon vẽ tay, dùng currentColor nên tự đổi màu theo theme (không dùng emoji).
const ico = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }
const IconMusic = () => (<svg {...ico}><path d="M9 17V4l10-2v13" /><circle cx="6" cy="17" r="3" /><circle cx="16" cy="15" r="3" /></svg>)
const IconAmbient = () => (<svg {...ico}><path d="M7 16a3.5 3.5 0 010-7 4.5 4.5 0 018.7-1.5A3.2 3.2 0 0116.5 16z" /><path d="M9 20l-.6 1.2M13 20l-.6 1.2M17 20l-.6 1.2" /></svg>)
const IconJournal = () => (<svg {...ico}><path d="M6 3h13a1 1 0 011 1v16a1 1 0 01-1 1H6a2 2 0 01-2-2V5a2 2 0 012-2z" /><path d="M9 3v18" /><path d="M13 8h3M13 12h3" /></svg>)
const IconImmersive = () => (<svg {...ico}><path d="M8 3H5a2 2 0 00-2 2v3" /><path d="M16 3h3a2 2 0 012 2v3" /><path d="M21 16v3a2 2 0 01-2 2h-3" /><path d="M3 16v3a2 2 0 002 2h3" /></svg>)

export default function Dock({
  yt, queue, index, onNext, onPrev, ytVolume, setYtVolume,
  shuffle, onToggleShuffle, unread = 0,
  leftTab, onToggleLeft, journalOpen, onToggleJournal, onHideUI,
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
          aria-pressed={shuffle} disabled={queue.length < 2}>🔀</button>
        <button className="ctrl" onClick={onPrev} title="Bài trước" disabled={!queue.length}>⏮</button>
        <button className="ctrl ctrl--main" onClick={yt.toggle} title="Phát/Dừng" disabled={!yt.current}>
          {yt.playing ? '❚❚' : '►'}
        </button>
        <button className="ctrl" onClick={onNext} title="Bài sau" disabled={!queue.length}>⏭</button>
        <label className="dock__vol" title="Âm lượng nhạc">
          <span className="player__volicon">♪</span>
          <input type="range" min="0" max="100" value={ytVolume} onChange={(e) => setYtVolume(Number(e.target.value))} />
        </label>
      </div>

      <div className="dock__tabs">
        <button className={`dock__btn ${leftTab === 'music' ? 'is-active' : ''}`} onClick={() => onToggleLeft('music')}>
          <IconMusic /><span>Nhạc</span>
        </button>
        <button className={`dock__btn ${leftTab === 'ambient' ? 'is-active' : ''}`} onClick={() => onToggleLeft('ambient')}>
          <IconAmbient /><span>Không gian</span>
        </button>
        <button className={`dock__btn dock__btn--journal ${journalOpen ? 'is-active' : ''}`} onClick={onToggleJournal}>
          <IconJournal /><span>Nhật ký</span>
          {unread > 0 && <span className="dock__badge">{unread > 9 ? '9+' : unread}</span>}
        </button>
        <button className="dock__btn dock__btn--icon" onClick={onHideUI} title="Ẩn giao diện — chỉ ngắm cảnh">
          <IconImmersive />
        </button>
      </div>
    </div>
  )
}
