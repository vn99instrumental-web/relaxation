// Header dưới "Dưới Tán Thông": đổi khi bước sang khung giờ khác hoặc đổi
// hiệu ứng mưa/lá. Không phụ thuộc theme và không tự xoay theo giây.

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
  // Các câu cũ từ theme ảnh/màu được giữ lại trong nhóm dùng chung.
  'một thước phim cũ, hai đứa mình',
  'ký ức ngả màu thời gian',
  'tua chậm những ngày xưa cũ',
  'Đà Lạt trong khung hình cũ',
  'gam màu bảy mươi, ấm một thời',
  'cam cháy và mù tạt, xưa mà thương',
  'hồng phai như trang thư cũ',
  'chút phấn hồng của ngày xưa',
  'tím phai màu hoài niệm',
  'sắc tím cũ, ru ngày chậm lại',
]

const BY_TIME = {
  sang: [ // 5–10h
    'sương sớm, pha vội ly nâu',
    'chào ngày mới ở phố sương',
    'cà phê sáng và một bản nhẹ',
    'nắng non trên đồi thông',
    'phố còn ngái ngủ dưới màn sương',
    'giọt sương đậu im trên nhánh thông',
    'mây thấp ngang mái nhà thức muộn',
    'con dốc vắng đón bước chân đầu ngày',
    'cửa sổ mở, gió đưa hương cỏ',
    'mặt hồ phẳng như một lời chưa nói',
    'thức dậy cùng khoảng trời dịu êm',
    'đồi xa lặng lẽ trong màu sữa sớm',
    'một tiếng chim khẽ mở ngày mới',
    'thong thả nhìn nắng qua rèm mỏng',
    'buổi sớm cho lòng thêm chỗ thở',
    'cà phê nguội một chút, lòng yên hơn',
  ],
  trua: [ // 11–13h
    'trưa vắng, nghe một bản chậm',
    'nghỉ trưa cùng tiếng nhạc',
    'giữa trưa, một khoảng lặng',
    'nắng đứng yên trên bậc thềm cũ',
    'trưa lặng, một vệt mây ngang dốc',
    'quán nhỏ khép hờ cánh cửa gỗ',
    'con phố im như đang mơ',
    'tán thông giữ lại chút gió trưa',
    'chậm tay lật một trang sách cũ',
    'tiếng đồng hồ cũng nhẹ giữa trưa',
    'ánh sáng nằm yên trên mặt bàn',
    'mặt hồ trưa không gợn một điều gì',
    'giữa nắng, lòng tìm một bóng râm',
    'một khoảng lặng đủ dịu cho hôm nay',
    'tiếng lá khẽ chạm hiên nhà vắng',
  ],
  chieu: [ // 14–17h
    'chiều buông trên đồi thông',
    'nắng tắt sau rặng thông xa',
    'chiều nghiêng, pha thêm ly trà',
    // Hai câu hoàng hôn trước đây thuộc theme dusk.
    'hoàng hôn nhuộm vàng mặt hồ',
    'chiều tà bên khung cửa cũ',
    'chiều đổ nghiêng qua ô cửa nhỏ',
    'mây tím lững lờ sau đồi xa',
    'bóng thông kéo dài qua lối cũ',
    'cơn gió mang theo điều chưa kịp nói',
    'cuối dốc, nắng vừa thôi vội',
    'mặt hồ giữ hộ một chiều buồn',
    'quán quen lên đèn khi nắng nhạt',
    'chiều chậm như trang thư viết dở',
    'có chút bâng khuâng ở cuối trời',
    'để hoàng hôn khép lại những lo toan',
    'nhặt một khoảng yên trong nắng muộn',
    'con đường về vương màu sương tím',
  ],
  toi: [ // 18–22h
    'đêm phố sương, mình nghe nhạc',
    'tối nay trời trở lạnh rồi',
    'thắp một ngọn đèn vàng',
    'phố lên đèn, lòng xuống nhịp',
    'ánh vàng nép dưới mái hiên xưa',
    'một ngọn đèn hong khô nỗi nhớ',
    'đêm vừa chạm vào rặng thông xa',
    'cửa kính mờ hơi thở phố núi',
    'ngồi yên nghe tối ghé qua thềm',
    'bên kia dốc, vài ô cửa còn sáng',
    'một bản nhạc nằm trong ánh đèn',
    'trời lạnh nhẹ, lòng chợt hiền hơn',
    'những điều chưa nói ngủ cùng thành phố',
    'ngõ nhỏ thơm mùi đêm mới xuống',
    'khẽ khàng để ngày lùi phía sau',
  ],
  khuya: [ // 23–4h
    'khuya rồi, nghe khẽ thôi',
    'đêm sâu, thức cùng một bản buồn',
    'khuya nghe mưa rơi ngoài hiên',
    'để đêm trôi thật chậm',
    'ngủ ngon nhé, người thương',
    'khuya khoắt, lòng vẫn ấm',
    'sương khuya phủ kín bậc thềm',
    'đêm dài, phố nhỏ vẫn bình yên',
    'tiếng gió đi qua miền ký ức',
    'trăng lặng trên mái nhà còn thức',
    'đồng hồ khuya bước thật khẽ',
    'để một nỗi niềm trôi theo mây',
    'có tiếng lá chạm vào giấc ngủ',
    'phố ngủ rồi, lòng thôi xao động',
    'đèn khuya soi một trang thư cũ',
    'một mình nghe đêm thở rất chậm',
    'tựa cửa nhìn sương phủ con dốc',
    'đêm sâu cũng có khoảng trời dịu dàng',
  ],
}

const BY_EFFECT = {
  rain: [
    // Giữ nguyên ba câu mưa cũ.
    'mưa phùn gõ nhẹ mái hiên',
    'ngồi nghe mưa ở Cà phê Tùng',
    'mưa Đà Lạt, buồn mà thương',
    'mưa gõ nhịp lên ô cửa cũ',
    'giọt mưa níu lại một chiều xa',
    'mưa xuống, phố như mềm hơn',
    'mái hiên giữ hộ tiếng mưa rơi',
    'đường ướt phản chiếu ánh đèn vàng',
    'nghe hạt mưa kể chuyện không lời',
    'mưa qua rặng thông, lòng nhẹ lại',
    'cơn mưa chậm rãi ru đồi vắng',
    'một vệt nước trôi theo nỗi nhớ',
    'khói sương hòa trong những hạt mưa',
    'ngoài kia mưa, trong này bình yên',
    'để mưa rửa trôi điều nặng lòng',
  ],
  leaves: [
    'lá thông rơi khẽ trên con dốc',
    'chiếc lá nghiêng ngang một miền nhớ',
    'gió qua tán lá, lòng thôi vội',
    'nghe lá chạm hiên, ngày lặng xuống',
    'một chiếc lá giữ màu nắng cũ',
    'lá rơi không vội, người cũng vậy',
    'thông reo bên thềm ký ức',
    'gió đưa chiếc lá về phía bình yên',
    'mùa chậm lại trong tiếng lá rơi',
    'lá xoay một vòng qua ô cửa',
    'giữa rừng thông, nghe lòng sáng hơn',
    'để gió đưa đi điều chưa nói',
  ],
}
// Giữ đúng các mốc giờ của phiên bản cũ; sử dụng giờ tại thiết bị người xem.
export function getTimeBucket(now = new Date()) {
  const h = now.getHours()
  if (h >= 5 && h < 11) return 'sang'
  if (h >= 11 && h < 14) return 'trua'
  if (h >= 14 && h < 18) return 'chieu'
  if (h >= 18 && h < 23) return 'toi'
  return 'khuya'
}

const SUPPORTED_EFFECTS = ['rain', 'leaves']

function activeEffects(fx) {
  const selected = Array.isArray(fx) ? fx : []
  return SUPPORTED_EFFECTS.filter((effect) => selected.includes(effect))
}

// Khung giờ và hiệu ứng (không tính theme) là hai điều kiện duy nhất làm đổi header.
export function getTaglineContext(fx = [], now = new Date()) {
  return `${getTimeBucket(now)}|${activeEffects(fx).join(',')}`
}

export function getTaglinePools(fx = [], now = new Date()) {
  return {
    general: GENERAL,
    time: BY_TIME[getTimeBucket(now)] || [],
    effects: activeEffects(fx).flatMap((effect) => BY_EFFECT[effect]),
  }
}

// Ưu tiên nội dung đúng thời điểm; khi bật mưa/lá, dành ~40% lượt
// cho câu theo hiệu ứng. 5% còn lại dành cho các câu hoài niệm dùng chung.
// Mỗi lần gọi chỉ chọn một câu; việc khi nào gọi do App quyết định.
export function pickTagline(fx = [], { now = new Date(), previous = '', random = Math.random } = {}) {
  const pools = getTaglinePools(fx, now)
  const draw = Math.min(0.999999, Math.max(0, Number(random()) || 0))
  let lines = pools.time
  if (pools.effects.length && draw < 0.4) {
    lines = pools.effects
  } else if (draw >= 0.95) {
    lines = pools.general
  }
  const prior = String(previous).toLocaleLowerCase('vi-VN')
  let eligible = lines.filter((line) => line.toLocaleLowerCase('vi-VN') !== prior)
  if (!eligible.length) eligible = lines.length ? lines : pools.general
  const index = Math.floor(Math.min(0.999999, Math.max(0, Number(random()) || 0)) * eligible.length)
  const sentence = eligible[index] || 'nghe mưa, viết cho nhau'
  return sentence.charAt(0).toLocaleUpperCase('vi-VN') + sentence.slice(1)
}
