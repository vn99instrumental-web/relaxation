// Thanh điều khiển mỏng ở đáy màn hình: thông tin bài đang phát + nút phát,
// âm lượng, và các nút mở/đóng panel (Nhạc / Không gian / Nhật ký).
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
        <button className={`dock__btn ${leftTab === 'music' ? 'is-active' : ''}`} onClick={() => onToggleLeft('music')}>♫ <span>Nhạc</span></button>
        <button className={`dock__btn ${leftTab === 'ambient' ? 'is-active' : ''}`} onClick={() => onToggleLeft('ambient')}>☔ <span>Không gian</span></button>
        <button className={`dock__btn dock__btn--journal ${journalOpen ? 'is-active' : ''}`} onClick={onToggleJournal}>
          📓 <span>Nhật ký</span>
          {unread > 0 && <span className="dock__badge">{unread > 9 ? '9+' : unread}</span>}
        </button>
        <button className="dock__btn dock__btn--icon" onClick={onHideUI} title="Ẩn giao diện — chỉ ngắm cảnh">⤢</button>
      </div>
    </div>
  )
}
