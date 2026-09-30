# Kiểm tra deployment Game-Peak — 2026-09-29

## Kết luận từ deployment thật

Đã đọc HTML và bundle công khai `/assets/index-CP3zkVSD.js` từ `https://game-peak.vercel.app`:

| Chức năng | URL được nhúng trong bundle |
| --- | --- |
| REST / đăng nhập | `https://game-peak.onrender.com/api` |
| WebSocket / thế giới / di chuyển | `wss://game-peak-server.onrender.com/ws` |

Địa chỉ WebSocket không trùng backend người triển khai xác nhận. Đây là lỗi cấu hình đã xác minh trực tiếp, không chỉ suy đoán từ `.env` local. Code frontend chỉ bật `connected` khi nhận thông điệp `world`; `TownScene` khóa di chuyển khi `connected=false`. Đăng nhập HTTP thành công không có nghĩa kết nối game đã thành công.

Backend `https://game-peak.onrender.com/api/health` trả 200 và CORS cho phép `https://game-peak.vercel.app`. Probe WebSocket đến backend này nhận handshake thành công, nhưng sau khi gửi token thử không hợp lệ, kết nối đóng với 1006 thay vì 4001 mà source local dự kiến. Vì thế **chưa thể khẳng định đổi URL là đủ để production hết mọi lỗi**. Cần đối chiếu Render logs và commit đang deploy. Không tạo tài khoản hay thực hiện giao dịch trên production.

## Lỗi tái hiện từ source

1. `start:colyseus` trước sửa gắn hai handler upgrade lên một HTTP server. Test entrypoint thật tái hiện `server.handleUpgrade() was called more than once with the same socket` và close 1006. Đây là lỗi riêng; người triển khai cho biết production dùng `npm start`, nên chưa quy lỗi này cho process production.
2. Khi không đặt `VITE_COLYSEUS_URL`, frontend cũ fallback `/ws` trên domain Vercel, dù `VITE_API_URL` trỏ Render. Đây là hai hệ thống khác nhau.
3. `.env.example` cũ trỏ WS đến localhost:2567 trong khi `npm run dev` chỉ chạy backend 3001. Copy nguyên file có thể gây lỗi cả local.
4. Colyseus cũ mở cổng qua `server.listen`, bỏ qua `gameServer.listen`; chưa khởi tạo đầy đủ routes matchmaking. Thứ tự cổng cũng ưu tiên `COLYSEUS_PORT` thay vì `PORT` của Render.
5. Colyseus adapter cũ tạo thêm simulation cùng database: thế giới native và Colyseus có thời gian/vị trí khác nhau, checkpoint và kinh tế có thể xung đột.
6. Shutdown cũ gọi `gracefullyShutdown()` với mặc định thoát process, nên cleanup/checkpoint kế tiếp có thể không chạy.

## Kiến trúc thực sự và phần còn thiếu

- `npm start` chạy Express + native JSON WebSocket `/ws`, không chạy Colyseus room server.
- Frontend không dùng `Client.joinOrCreate()` của Colyseus. Tên biến `VITE_COLYSEUS_URL` gây hiểu nhầm: giá trị thực tế là endpoint WebSocket JSON.
- `GameDatabase` dùng `node:sqlite`; `AuthService` dùng scrypt và session local. Không có kết nối runtime tới Supabase, không xác thực Supabase JWT. Các biến `DATABASE_URL`, `SUPABASE_*`, `VITE_SUPABASE_*` chưa được sử dụng. Tạo schema Supabase hoặc đặt env không tự chuyển backend sang PostgreSQL.
- Vì vậy REST và WS cần cùng backend, cùng DB. Hiện nên chạy **một instance**; không tách auth và realtime thành hai service SQLite độc lập.
- SQLite trên Render cần persistent disk để giữ tài khoản/ví/session qua restart/redeploy. Chưa có quyền kiểm tra disk của dịch vụ thật. Trước khi đổi `DATABASE_PATH`, sao lưu và chuyển dữ liệu hiện có, nếu không ứng dụng sẽ mở DB mới rỗng. [Render disks](https://render.com/docs/disks).
- `supabase_schema.sql` chưa khai báo RLS hay thu hồi quyền `anon`/`authenticated`. Nếu đã chạy schema vào schema được Data API expose, phải kiểm tra grants/RLS trên dự án thật, nhất là `profiles.password_hash`, sessions và ví. Chưa kiểm tra được cấu hình Supabase thực tế. [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
- Package `colyseus.js` đang ở 0.16/schema 3, server ở 0.18/schema 5. Client đó hiện chưa được dùng; cần đồng bộ SDK và kiểm thử giao thức trước khi chuyển frontend sang Colyseus thật. Bản sửa này không phải migration hoàn chỉnh sang Supabase + Colyseus.
- Adapter Colyseus vẫn cần hoàn thiện chính sách origin/rate limit và thu hồi session đang kết nối nếu được đưa vào sử dụng trực tiếp. Luồng game hiện tại nên tiếp tục `npm start`.

## Các thay đổi đã thực hiện

- Tách resolver URL: WS mặc định theo API backend; nhận API có/không `/api`; thêm `VITE_WS_URL`, tương thích `VITE_COLYSEUS_URL`; phát hiện mixed content HTTPS/WS.
- Làm rõ lỗi khi API trả HTML, không nhận được world, sai giao thức; bỏ qua callback từ socket cũ khi reconnect.
- Native `/ws` và Colyseus được định tuyến riêng, không upgrade cùng socket hai lần; boot Colyseus đúng lifecycle, ưu tiên `PORT` và cleanup trước khi thoát.
- Dùng chung simulation cho adapter và native server, theo dõi presence của từng transport, tháo listener khi dispose; kiểm tra vector input Colyseus và phát cập nhật giao dịch cho người liên quan.
- Bỏ cho phép mặc định mọi `*.vercel.app`; cần khai báo đúng `ALLOWED_ORIGINS`. Thêm `Vary: Origin` và health metadata để nhận biết protocol/database đang chạy.
- Sửa `.env.example`, thêm test endpoint và test entrypoint production, thêm script probe chỉ đọc.

## Cấu hình cần áp dụng ngay

### Vercel → Settings → Environment Variables → Production

```dotenv
VITE_API_URL=https://game-peak.onrender.com
VITE_COLYSEUS_URL=wss://game-peak.onrender.com/ws
```

Hai biến trên hoạt động với frontend cũ, nên có thể khắc phục URL sai trước khi deploy bản sửa. **Xóa/thay giá trị `game-peak-server.onrender.com`.** Nếu đã có `VITE_WS_URL`, đặt nó về cùng URL `/ws` vì source mới ưu tiên biến này.

Sau khi triển khai source mới, có thể chỉ giữ `VITE_API_URL` và xóa cả hai biến WS để tự suy ra endpoint. Phải **Redeploy Vercel**: biến `VITE_*` được nhúng lúc build, thay setting mà không build lại không đổi bundle đã phát hành. [Vite environment variables](https://vite.dev/guide/env-and-mode).

### Render

```text
Build command: npm ci
Start command: npm start
Health check: /api/health
```

```dotenv
NODE_ENV=production
HOST=0.0.0.0
ENABLE_DEBUG=false
ALLOWED_ORIGINS=https://game-peak.vercel.app
```

Node >=24 theo `package.json`. Dùng `PORT` Render cấp; public URL không thêm `:3001` hoặc `:2567`. Thêm domain preview/custom vào `ALLOWED_ORIGINS` khi thực sự dùng, phân cách bằng dấu phẩy. Chọn `DATABASE_PATH` thuộc persistent disk sau khi chuẩn bị dữ liệu. [Render port binding](https://render.com/docs/web-services#port-binding), [WebSockets](https://render.com/docs/websocket).

### Kiểm tra sau deploy

```bash
npm test
npm run build
node scripts/check-deployment.mjs
```

Sau đó mở game, đăng nhập và kiểm tra DevTools → Network → WS: URL phải là `wss://game-peak.onrender.com/ws`; sau auth có messages `world` và `state`; HUD chuyển Online, WASD cập nhật vị trí. Thử reload khôi phục phiên, mở tab thứ hai, giao dịch, logout. Nếu vẫn 1006, lấy Render logs cùng thời điểm và kiểm tra commit/entrypoint; không coi health 200 là bằng chứng gameplay hoạt động.

## Phạm vi xác minh

Test local bao phủ cả entrypoint thường và Colyseus: HTTP đăng ký/đăng nhập, CORS, WS auth, nhận world, di chuyển được server xác nhận, giao dịch đổi tiền, logout/thu hồi token; thêm kiểm tra matchmaking và simulation dùng chung. Toàn bộ test và production build đã chạy thành công; build có cảnh báo bundle Phaser lớn.

Chưa thay đổi setting hoặc deploy lên tài khoản Vercel/Render, chưa kiểm tra dashboard Supabase, chưa chạy phiên chơi có tài khoản thật hoặc kiểm thử giao diện trình duyệt end-to-end. Script `test:e2e` hiện có nhưng repo chưa có Playwright suite tương ứng.
