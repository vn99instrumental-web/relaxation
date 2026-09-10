// Bộ ảnh nền. Ảnh thật lấy từ Pexels (miễn phí, cho hotlink).
// 3 ảnh ĐÚNG thành phố Đà Lạt đứng đầu; phần sau là cảnh cao nguyên/thông sương
// gần với Đà Lạt. Muốn đúng 100% thì tự tải ảnh của bạn trong Cài đặt.
// Ảnh nào lỗi tải sẽ tự quay về tranh vẽ (xử lý ở Scene).

const px = (id) => ({
  url: `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1920`,
  thumb: `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=400`,
})

// 3 CHỦ ĐỀ vintage "Đà Lạt 1994" (từ thiết kế Stitch) — asset nội bộ của app,
// luôn có sẵn nên không phụ thuộc Supabase và không bao giờ hỏng ảnh.
// Nút chuyển nhanh trên thanh trên cùng dùng đúng 3 chủ đề này.
export const VINTAGE_SCENES = [
  { id: 'vs_dusk', label: 'Hoàng hôn', full: 'Hoàng hôn 1994', url: '/scenes/dusk.jpg' },
  { id: 'vs_rain', label: 'Đêm mưa', full: 'Đêm mưa Cà phê Tùng', url: '/scenes/rainynight.jpg' },
  { id: 'vs_morning', label: 'Sáng sớm', full: 'Sáng sớm Đồi Thông', url: '/scenes/morning.jpg' },
]

// Dạng "ảnh nền" để ghép sẵn vào đầu danh sách (cả bản local lẫn Supabase đều
// luôn thấy 3 chủ đề này). builtin: true -> không cho xóa.
export const BUILTIN_SCENES = VINTAGE_SCENES.map((s) => ({
  id: s.id, label: s.full, tag: 'vintage', url: s.url, thumb: s.url, builtin: true,
}))

export const DEFAULT_BACKGROUNDS = [
  // Đúng Đà Lạt
  { id: 'dl1', label: 'Hồ Đà Lạt trong sương', tag: 'Đà Lạt', ...px(31017723) },
  { id: 'dl2', label: 'Quảng trường Lâm Viên', tag: 'Đà Lạt', ...px(21250288) },
  { id: 'dl3', label: 'Chợ Đà Lạt', tag: 'Đà Lạt', ...px(25566344) },
  // Tranh vẽ
  { id: 'vector', label: 'Tranh vẽ Đà Lạt', tag: 'vẽ', url: '', thumb: '' },
  // Cao nguyên / thông sương (gần Đà Lạt)
  { id: 'hl1', label: 'Bình minh thung lũng sương', tag: 'cao nguyên', ...px(16837430) },
  { id: 'hl2', label: 'Hồ sương sớm', tag: 'cao nguyên', ...px(244976) },
  { id: 'hl3', label: 'Hồ giữa núi mờ sương', tag: 'cao nguyên', ...px(17965189) },
  { id: 'hl4', label: 'Rừng thông trong sương', tag: 'cao nguyên', ...px(14182931) },
  { id: 'hl5', label: 'Bình minh núi vàng', tag: 'cao nguyên', ...px(30712585) },
  { id: 'hl6', label: 'Áo len giữa rừng thu', tag: 'cao nguyên', ...px(31972444) },
  { id: 'hl7', label: 'Đường núi mờ sương', tag: 'cao nguyên', ...px(15977280) },
]

export const DEFAULT_BG_ID = 'vs_dusk'
