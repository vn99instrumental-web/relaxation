// Cấu hình Supabase mặc định (bật realtime ngay khi mở app).
// anon key là khóa CÔNG KHAI — an toàn để nằm trong web tĩnh; RLS bảo vệ dữ liệu.
// Người dùng vẫn có thể đổi (nhất là "room" để có phòng riêng) trong Cài đặt.
export const SUPABASE_DEFAULTS = {
  url: 'https://mcaqnaomzoqgxccdgvls.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jYXFuYW9tem9xZ3hjY2RndmxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1ODk5ODEsImV4cCI6MjA5MjE2NTk4MX0.D0YNdQwOZfr6c4CYbvA-DDat43kt_AFC5vR2d-Si48M',
  room: 'vibe-dalat-r7k2qx',
}
