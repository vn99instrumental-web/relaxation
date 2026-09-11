// Bộ icon vẽ tay dùng chung (dock + tab ngăn kéo). Dùng currentColor nên tự
// đổi màu theo theme. Giữ nét mảnh, phong cách đồng nhất.
const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }

export const IconMusic = (p) => (
  <svg {...base} {...p}><path d="M9 17V4l10-2v13" /><circle cx="6" cy="17" r="3" /><circle cx="16" cy="15" r="3" /></svg>
)
export const IconAmbient = (p) => (
  <svg {...base} {...p}><path d="M7 16a3.5 3.5 0 010-7 4.5 4.5 0 018.7-1.5A3.2 3.2 0 0116.5 16z" /><path d="M9 20l-.6 1.2M13 20l-.6 1.2M17 20l-.6 1.2" /></svg>
)
export const IconJournal = (p) => (
  <svg {...base} {...p}><path d="M6 3h13a1 1 0 011 1v16a1 1 0 01-1 1H6a2 2 0 01-2-2V5a2 2 0 012-2z" /><path d="M9 3v18" /><path d="M13 8h3M13 12h3" /></svg>
)
export const IconImmersive = (p) => (
  <svg {...base} {...p}><path d="M8 3H5a2 2 0 00-2 2v3" /><path d="M16 3h3a2 2 0 012 2v3" /><path d="M21 16v3a2 2 0 01-2 2h-3" /><path d="M3 16v3a2 2 0 002 2h3" /></svg>
)
export const IconPoem = (p) => (
  <svg {...base} {...p}><path d="M12 21s-7-4.35-7-10a4 4 0 017-2.65A4 4 0 0119 11c0 5.65-7 10-7 10z" /><path d="M9 10h4M9 13h6" /></svg>
)
// Điều khiển phát nhạc (dạng đặc, currentColor -> theo theme)
export const IconPlay = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M8 5.5v13a1 1 0 001.52.85l10.5-6.5a1 1 0 000-1.7L9.52 4.65A1 1 0 008 5.5z" /></svg>
)
export const IconPause = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><rect x="6.5" y="5" width="4" height="14" rx="1.3" /><rect x="13.5" y="5" width="4" height="14" rx="1.3" /></svg>
)
export const IconPrev = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><rect x="6" y="5.5" width="2.4" height="13" rx="1.2" /><path d="M18 6.2v11.6a1 1 0 01-1.53.85l-8.8-5.8a1 1 0 010-1.7l8.8-5.8A1 1 0 0118 6.2z" /></svg>
)
export const IconNext = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M6 6.2v11.6a1 1 0 001.53.85l8.8-5.8a1 1 0 000-1.7L7.53 5.35A1 1 0 006 6.2z" /><rect x="15.6" y="5.5" width="2.4" height="13" rx="1.2" /></svg>
)

export const IconShuffle = (p) => (
  <svg {...base} {...p}>
    <path d="M4 7h2.5c5 0 5 10 10 10H21" />
    <path d="m18 14 3 3-3 3" />
    <path d="M4 17h2.5c5 0 5-10 10-10H21" />
    <path d="m18 4 3 3-3 3" />
  </svg>
)
