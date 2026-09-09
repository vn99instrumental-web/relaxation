// Bộ trộn âm thanh nền: mưa, gió/sương, chim, giọt nước.
// props: ambient (hook useAmbient)
const CHANNELS = [
  { key: 'rain', label: 'Mưa phùn', icon: '🌧️' },
  { key: 'wind', label: 'Gió / sương', icon: '🌫️' },
  { key: 'birds', label: 'Chim hót', icon: '🐦' },
  { key: 'drops', label: 'Giọt nước', icon: '💧' },
]

export default function AmbientMixer({ ambient }) {
  const { started, levels, setLevel, start, stop } = ambient

  return (
    <section className="panel mixer">
      <header className="panel__head">
        <h2>🌧️ Âm thanh nền</h2>
        <button className={`toggle ${started ? 'is-on' : ''}`} onClick={started ? stop : start}>
          {started ? 'Đang bật' : 'Bật tiếng'}
        </button>
      </header>

      {!started && (
        <p className="mixer__hint">Nhấn “Bật tiếng” rồi kéo các thanh để pha trộn không gian của riêng bạn.</p>
      )}

      <div className="mixer__rows">
        <div className="mixer__row mixer__row--master">
          <span className="mixer__label">🎚️ Tổng</span>
          <input
            type="range" min="0" max="1" step="0.01" value={levels.master}
            onChange={(e) => setLevel('master', Number(e.target.value))}
          />
        </div>
        {CHANNELS.map((c) => (
          <div className="mixer__row" key={c.key}>
            <span className="mixer__label">{c.icon} {c.label}</span>
            <input
              type="range" min="0" max="1" step="0.01" value={levels[c.key]}
              onChange={(e) => setLevel(c.key, Number(e.target.value))}
              disabled={!started}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
