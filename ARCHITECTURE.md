# Kiến trúc Gamepeak

## Quyết định công nghệ
React + TypeScript strict + Vite quản lý HUD; Phaser quản lý thế giới. Zustand chỉ giữ bản sao trạng thái server và trạng thái UI. CSS thuần để quản lý thiết kế nhỏ, không cần Tailwind.

Node 24 + Express + ws + SQLite là backend V1. Thay Colyseus/Supabase bằng adapter local để toàn bộ demo có thể chạy không cần credentials. SQLite dùng foreign keys, WAL, constraints, migration và BEGIN IMMEDIATE. Một tiến trình duy nhất sở hữu simulation; không có await trong transaction. ws gửi input 10 Hz, snapshot 10 Hz, nội suy phía client. Đây là lựa chọn giới hạn cho prototype một town, không phải thiết kế MMO phân tán.

## Ranh giới tin cậy
Client gửi ý định, không gửi số dư hoặc doanh thu. Server kiểm tra schema, quyền sở hữu, số lượng, vị trí và tiền. Giao dịch marketplace khóa write transaction, lấy lại stock trong transaction, chuyển hàng escrow và tiền một lần. Request id chống lặp thao tác. Tiền số nguyên cent. Mật khẩu scrypt với salt riêng; token phiên ngẫu nhiên chỉ lưu hash trong DB, hết hạn, logout thu hồi. Token phía trình duyệt lưu sessionStorage để mỗi tab có thể đăng nhập tài khoản riêng; không lưu economy ở trình duyệt.

## Các lớp
- `shared/`: kiểu dữ liệu, cấu hình kinh tế, bản đồ, collision và pathfinding.
- `src/game/`: scene, procedural art, nội suy, lighting, âm thanh.
- `src/ui/`: HUD, điện thoại, tài khoản và bảng tương tác.
- `src/services/`, `src/stores/`: HTTP/WebSocket và bản sao trạng thái.
- `server/database/`: kết nối, migration, transaction.
- `server/services/`: auth, economy, business, marketplace.
- `server/systems/`: time, weather, events, NPC, room/presence.
- `tests/`: invariant kinh tế, API, cạnh tranh mua stock và browser end-to-end.

Simulation phát sự kiện `sale`, `world`, `state`; NPC giao dịch tại quầy rồi phát feedback ra client. Time/Weather/EventManager tách riêng, business nhận snapshot môi trường thay vì gọi WeatherManager.

## Lưu và khôi phục
Các thao tác tài chính commit ngay. Vị trí và đồng hồ checkpoint định kỳ, thêm checkpoint khi server tắt bình thường. Offline không sinh lợi nhuận và không truy thu thuê: đồng hồ tạm dừng khi server tắt. Snapshot công khai không chứa wallet/inventory của người khác.

## PostgreSQL/Supabase V2
Migration tham chiếu nằm trong `database/postgres/`; chưa kết nối runtime V1. Chuyển repository sang async PostgreSQL với SELECT FOR UPDATE theo thứ tự lock cố định; giữ nguyên DTO/action và integer cents. Supabase Auth xác minh JWT ở backend; RLS SELECT theo auth.uid(), cấm client ghi wallet/inventory/listings; mọi write thông qua transaction server. Supabase Realtime dùng cho sự kiện dữ liệu bền vững; Colyseus có thể thay room transport khi mở rộng nhiều town. Không đưa service role key vào Vite.

## Nghiên cứu tài liệu chính thức
Đã đối chiếu trước khi code ngày 27/09/2026; version cài thực tế được khóa trong package-lock.json.
- https://docs.phaser.io/phaser/getting-started/what-is-phaser
- https://docs.phaser.io/api-documentation/class/scene
- https://react.dev/learn
- https://vite.dev/guide/
- https://docs.colyseus.io/
- https://supabase.com/docs/guides/auth
- https://supabase.com/docs/guides/realtime
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://nodejs.org/docs/latest-v24.x/api/sqlite.html
- https://github.com/websockets/ws
