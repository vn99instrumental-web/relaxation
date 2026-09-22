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
  <svg {...base} {...p}><path d="M4 7h2.5c5 0 5 10 10 10H21" /><path d="m18 14 3 3-3 3" /><path d="M4 17h2.5c5 0 5-10 10-10H21" /><path d="m18 4 3 3-3 3" /></svg>
)
export const IconSettings = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 00-1.88-.34 1.7 1.7 0 00-1.04 1.55V20h-3v-.09a1.7 1.7 0 00-1.04-1.55 1.7 1.7 0 00-1.88.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 007 14.7a1.7 1.7 0 00-1.55-1.04H5.3v-3h.09A1.7 1.7 0 006.94 9.6a1.7 1.7 0 00-.34-1.88l-.06-.06 2.12-2.12.06.06a1.7 1.7 0 001.88.34A1.7 1.7 0 0011.64 4.4V4.3h3v.09a1.7 1.7 0 001.04 1.55 1.7 1.7 0 001.88-.34l.06-.06 2.12 2.12-.06.06a1.7 1.7 0 00-.34 1.88 1.7 1.7 0 001.55 1.04H21v3h-.09A1.7 1.7 0 0019.4 15z" /></svg>
)
export const IconPalette = (p) => (
  <svg {...base} {...p}><path d="M12 3a9 9 0 100 18h1.5a1.7 1.7 0 001.2-2.9 1.7 1.7 0 011.2-2.9H18A3 3 0 0021 12a9 9 0 00-9-9z" /><circle cx="7.5" cy="11" r=".8" fill="currentColor" /><circle cx="10" cy="7" r=".8" fill="currentColor" /><circle cx="15" cy="7.5" r=".8" fill="currentColor" /></svg>
)
export const IconImage = (p) => (
  <svg {...base} {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m4 17 5-5 3.5 3 2.5-2 5 4" /></svg>
)
export const IconCameraVintage = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="6" width="18" height="14" rx="2" />
    <path d="M3 10h18M6 6l1-2h5l1 2" />
    <rect x="5.5" y="7.5" width="3.5" height="2.5" rx=".5" />
    <circle cx="14" cy="14.5" r="3.5" />
    <circle cx="14" cy="14.5" r="1.5" />
    <path d="M17.5 8h1" />
  </svg>
)
export const IconShield = (p) => (
  <svg {...base} {...p}><path d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6l-7-3z" /><path d="m9 12 2 2 4-4" /></svg>
)
export const IconLock = (p) => (
  <svg {...base} {...p}><rect x="5" y="10" width="14" height="11" rx="2.5" /><path d="M8 10V7a4 4 0 018 0v3" /><path d="M12 14v3" /></svg>
)
export const IconUserSwitch = (p) => (
  <svg {...base} {...p}><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.7-3.3 2.6-5 5.5-5 1.5 0 2.7.4 3.6 1.1" /><path d="M15 9h5m0 0-2-2m2 2-2 2" /><path d="M20 15h-5m0 0 2-2m-2 2 2 2" /></svg>
)
export const IconClose = (p) => (
  <svg {...base} {...p}><path d="m6 6 12 12M18 6 6 18" /></svg>
)
export const IconRefresh = (p) => (
  <svg {...base} {...p}><path d="M20 7v5h-5" /><path d="M18.5 16a8 8 0 10-1-9L20 12" /></svg>
)
export const IconTrash = (p) => (
  <svg {...base} {...p}><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" /></svg>
)
export const IconReply = (p) => (
  <svg {...base} {...p}><path d="m9 8-5 4 5 4" /><path d="M5 12h7c4.5 0 7 2 7 6" /></svg>
)
export const IconSmile = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M8.5 10h.01M15.5 10h.01M8.5 14.5c1 1.2 2.1 1.8 3.5 1.8s2.5-.6 3.5-1.8" /></svg>
)
export const IconEdit = (p) => (
  <svg {...base} {...p}><path d="m4 20 4.2-1 10.5-10.5a2.1 2.1 0 00-3-3L5.2 16 4 20zM14.5 7l3 3" /></svg>
)
export const IconCheck = (p) => (
  <svg {...base} {...p}><path d="m5 12 4.5 4.5L19 7" /></svg>
)
export const IconVideo = (p) => (
  <svg {...base} {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m10 9 5 3-5 3V9z" /></svg>
)
