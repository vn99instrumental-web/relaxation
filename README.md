# 🌧️ Hiên Mưa — Đà Lạt sương mù những năm 90

Một góc nhỏ để thư giãn: nghe nhạc lofi/piano buồn từ YouTube, pha trộn tiếng
mưa – gió – chim tự tổng hợp, và cùng viết một cuốn nhật ký chung cho hai người —
tất cả trong khung cảnh Đà Lạt sương mù, mưa phùn và những tia nắng xuyên sương.

## Tính năng

- **🎧 Nhạc từ YouTube (không cần API key):**
  - Dán link **video** để thêm vào hàng chờ.
  - Dán link **playlist** để phát cả playlist tuần tự.
  - Tự chuyển bài khi hết, hiện tên bài đang phát, chỉnh âm lượng riêng.
  - Vài gợi ý lofi/piano buồn có sẵn.
- **🌧️ Âm thanh nền tổng hợp bằng Web Audio** (không cần file):
  mưa phùn, gió/sương, chim hót, giọt nước — chỉnh to/nhỏ từng loại.
- **📓 Nhật ký chung cho 2 người:**
  - Lưu chung qua **GitHub Gist** để hai máy thấy nhật ký của nhau (poll ~6s).
  - Tự nhập tên mỗi buổi, tin nhắn nhóm theo ngày.
  - Không cấu hình gì thì chạy **offline**, lưu trên máy (localStorage).
- **🌄 Khung cảnh Đà Lạt 90s:** sương trôi, mưa phùn (canvas), tia nắng (ray),
  hạt phim + vignette hoài niệm. Đổi cảnh Sương / Mưa / Nắng, hoặc dán ảnh nền riêng.

## Chạy thử

```bash
npm install
npm run dev        # mở http://localhost:5173
npm run build      # đóng gói ra thư mục dist/
npm run preview    # xem thử bản build
```

## Bật nhật ký chung 2 người (tùy chọn)

Vào **⚙ Cài đặt → Đồng bộ nhật ký 2 người**:

1. Tạo **GitHub token** có quyền `gist` (GitHub → Settings → Developer settings → Tokens).
2. Dán token, đặt tên phòng, bấm **Tạo Gist mới**.
3. Gửi **Gist ID** + token cho người kia để họ điền y hệt → hai người dùng chung một cuốn nhật ký.

> Token chỉ lưu trong trình duyệt của bạn và chỉ gửi tới `api.github.com`.
> Nên dùng token phạm vi hẹp (chỉ `gist`). Bỏ trống thì app chạy offline.

## Công nghệ

React + Vite. Không phụ thuộc backend riêng: nhạc dùng YouTube IFrame API,
âm thanh nền dùng Web Audio, đồng bộ nhật ký dùng GitHub Gist.

## Triển khai

Deploy tĩnh lên Vercel/Netlify/GitHub Pages: build ra `dist/` rồi trỏ tới đó
(Vercel tự nhận Vite — chỉ cần `npm run build`, output `dist`).
