// Bộ ảnh nền: 1 tranh vẽ vector + 10 ảnh thật (Pexels, license miễn phí, cho hotlink).
// Chủ đề: sương sớm Đà Lạt, rừng thông, hồ/thung lũng bình minh, người mặc áo len trong sương.
// Ảnh nào không tải được sẽ tự quay về tranh vẽ (xử lý trong Scene).

const px = (id) => ({
  url: `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1920`,
  thumb: `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=400`,
})

export const DEFAULT_BACKGROUNDS = [
  { id: 'vector', label: 'Tranh vẽ Đà Lạt', url: '', thumb: '' },
  { id: 'ph1', label: 'Rừng thông trong sương', ...px(14182931) },
  { id: 'ph2', label: 'Thông phủ sương', ...px(2529973) },
  { id: 'ph3', label: 'Bình minh thung lũng', ...px(16837430) },
  { id: 'ph4', label: 'Hồ sương sớm', ...px(244976) },
  { id: 'ph5', label: 'Hồ giữa núi mờ sương', ...px(17965189) },
  { id: 'ph6', label: 'Bình minh núi vàng', ...px(30712585) },
  { id: 'ph7', label: 'Đồi thông ban ngày', ...px(160661) },
  { id: 'ph8', label: 'Áo len giữa rừng thu', ...px(31972444) },
  { id: 'ph9', label: 'Đường núi mờ sương', ...px(15977280) },
  { id: 'ph10', label: 'Rừng thu sương mù', ...px(10239298) },
]

export const DEFAULT_BG_ID = 'ph1'
