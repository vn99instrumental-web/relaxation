// Bộ ảnh nền. Ảnh thật lấy từ Pexels (miễn phí, cho hotlink).
// 3 ảnh ĐÚNG thành phố Đà Lạt đứng đầu; phần sau là cảnh cao nguyên/thông sương
// gần với Đà Lạt. Muốn đúng 100% thì tự tải ảnh của bạn trong Cài đặt.
// Ảnh nào lỗi tải sẽ tự quay về tranh vẽ (xử lý ở Scene).

const px = (id) => ({
  url: `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1920`,
  thumb: `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=400`,
})

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

export const DEFAULT_BG_ID = 'dl1'
