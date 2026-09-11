// Câu tagline dưới tên "Hiên Mưa" — đổi ngẫu nhiên, chọn theo giờ trong ngày
// và theo "thời tiết" (lấy theme đang chọn làm gợi ý). "Hiên Mưa" giữ cố định.

const GENERAL = [
  'nghe mưa, viết cho nhau',
  'một hiên, hai đứa',
  'chậm lại một chút',
  'gói ghém chút dịu dàng',
  'cho những ngày bình yên',
  'ngồi yên nghe phố thở',
  'giữ lại một khoảng lặng',
  'nơi mình trốn khỏi vội vàng',
  'thương nhau qua từng con chữ',
  'một tách trà, một bản nhạc',
  'để lòng mình dịu lại',
  'hiên nhỏ, mình cùng nhau',
  'nghe lá rơi rất khẽ',
  'thở đều, và mỉm cười',
  'ở đây, thời gian đi chậm',
  'chút bình yên gửi người thương',
  'mưa ngoài hiên, ấm trong lòng',
  'cứ để nỗi buồn trôi đi',
  'nắm tay nhau qua ngày mưa',
  'sương giăng, mình kể chuyện cũ',
  'yêu thương những điều nhỏ bé',
  'một góc nhỏ của riêng mình',
  'nghe tim mình bớt vội',
  'thương thành phố mù sương',
  'ngồi đây nghe gió kể',
  'giữ ấm cho nhau nhé',
  'chậm mà thương, lâu mà nhớ',
  'để hôm nay nhẹ tênh',
  'một khoảng trời riêng hai đứa',
  'bình yên là ở bên nhau',
]

const BY_TIME = {
  sang: [ // 5–10h
    'sương sớm, pha vội ly nâu',
    'chào ngày mới ở phố sương',
    'cà phê sáng và một bản nhẹ',
    'nắng non trên đồi thông',
  ],
  trua: [ // 11–13h
    'trưa vắng, nghe một bản chậm',
    'nghỉ trưa cùng tiếng nhạc',
    'giữa trưa, một khoảng lặng',
  ],
  chieu: [ // 14–17h
    'chiều buông trên đồi thông',
    'nắng tắt sau rặng thông xa',
    'chiều nghiêng, pha thêm ly trà',
  ],
  toi: [ // 18–22h
    'đêm phố sương, mình nghe nhạc',
    'tối nay trời trở lạnh rồi',
    'thắp một ngọn đèn vàng',
  ],
  khuya: [ // 23–4h
    'khuya rồi, nghe khẽ thôi',
    'đêm sâu, thức cùng một bản buồn',
    'khuya nghe mưa rơi ngoài hiên',
    'để đêm trôi thật chậm',
    'ngủ ngon nhé, người thương',
    'khuya khoắt, lòng vẫn ấm',
  ],
}

const BY_THEME = {
  rain: [
    'mưa phùn gõ nhẹ mái hiên',
    'ngồi nghe mưa ở Cà phê Tùng',
    'mưa Đà Lạt, buồn mà thương',
  ],
  morning: [
    'sương sớm còn vương trên đồi thông',
    'bình minh mờ sau màn sương',
  ],
  dusk: [
    'hoàng hôn nhuộm vàng mặt hồ',
    'chiều tà bên khung cửa cũ',
  ],
  film: [
    'một thước phim cũ, hai đứa mình',
    'ký ức ngả màu thời gian',
    'tua chậm những ngày xưa cũ',
    'Đà Lạt trong khung hình cũ',
  ],
}

function bucket(h) {
  if (h >= 5 && h < 11) return 'sang'
  if (h >= 11 && h < 14) return 'trua'
  if (h >= 14 && h < 18) return 'chieu'
  if (h >= 18 && h < 23) return 'toi'
  return 'khuya'
}

export function pickTagline(theme) {
  const pool = [
    ...GENERAL,
    ...(BY_TIME[bucket(new Date().getHours())] || []),
    ...(BY_THEME[theme] || []),
  ]
  return pool[Math.floor(Math.random() * pool.length)] || 'nghe mưa, viết cho nhau'
}
