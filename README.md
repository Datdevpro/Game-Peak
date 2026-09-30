# ✳ GAMEPEAK — MẦM XANH

> Deploy Vercel/Render: xem [báo cáo kiểm tra và cấu hình sửa lỗi kết nối](DEPLOYMENT_AUDIT.md). Runtime hiện dùng SQLite + native WebSocket; Supabase chưa được tích hợp vào luồng game.

> **“Nếu bạn được ban cho một số tiền đủ lớn ($100,000.00), bạn sẽ làm gì để tạo ra thêm tiền và trở nên giàu có hơn?”**

**Gamepeak** là một prototype game web multiplayer mô phỏng cuộc sống, kinh doanh và làm giàu theo phong cách 2D cartoon/chibi dễ thương, kết hợp giữa yếu tố Tycoon, mô phỏng xã hội và kinh tế thị trường thực tế.

---

## 🌟 1. Điểm nổi bật & Gameplay Loop

1. **Khởi đầu bình đẳng**: Mọi cư dân bắt đầu với **$100,000.00** tiền mặt trong ví.
2. **Kinh tế thị trường hai chiều**:
   - **Chợ đầu mối (Wholesale Market)**: Mua bán nguyên liệu nông sản (Hạt cà phê, Sữa tươi, Trà lá) với giá biến động sống động theo cung, cầu và sự kiện thời tiết.
   - **Chợ cư dân P2P (Marketplace)**: Đăng tin bán hàng và mua lại từ người chơi khác với cơ chế Escrow (giữ hàng bảo đảm) và khóa giao dịch nguyên tử (Atomic Transactions).
3. **Kinh doanh quán cà phê (Coffee Shop Tycoon)**:
   - Thuê mặt bằng thương mại tại trung tâm (`Mặt Bằng 01` hoặc `02`).
   - Đặt tên quán, mua sắm máy pha cà phê chuyên dụng.
   - Chuyển nguyên liệu hạt từ túi vào kho (1 gói hạt = 4 tách cà phê).
   - Tự do định giá bán mỗi tách cà phê ($1.00 – $50.00).
   - Mở cửa đón khách: **NPC cư dân sẽ thực sự đi bộ đến quán**, đứng tại quầy và chỉ khi khách tới mua thì doanh thu mới phát sinh kèm hiệu ứng `♥ +$5.00` và âm thanh leng keng!
   - Bảng báo cáo tài chính trực quan: **Doanh thu (Revenue) ≠ Lợi nhuận (Profit)**. Hệ thống tự động hạch toán Giá vốn hàng bán (COGS), tiền thuê mặt bằng (Rent), lương nhân viên (Salary), điện nước (Utility).
4. **Mô phỏng thế giới sống động**:
   - Chu kỳ thời gian mượt mà (Sáng, Trưa, Hoàng hôn, Đêm) với ánh sáng chuyển màu dần.
   - Hệ thống thời tiết (Nắng đẹp, Nhiều mây, Mưa rơi kèm che ô).
   - Hệ thống NPC có lịch trình (đi làm, đi dạo, uống cà phê, về nhà) dựa trên các Archetype (Nhân viên văn phòng, Học sinh, Du khách, Cư dân).
5. **Đa nền tảng (Desktop & Mobile)**:
   - Desktop: Phím WASD, phím mũi tên, chuột click tìm đường A*.
   - Mobile: Cần điều khiển ảo (Virtual Joystick) góc trái và phím tương tác [E] góc phải, layout thích ứng màn hình cảm ứng.

---

## 🏗️ 2. Kiến trúc & Công nghệ (Tech Stack)

- **Frontend HUD & Giao diện**: React 19 + TypeScript + Vite + Vanilla CSS (Glassmorphism, mượt mà, không phụ thuộc Tailwind).
- **Game Engine & Thế giới**: Phaser 4 (Top-down world, camera follow, A* pathfinding, va chạm vật lý, ánh sáng động, Web Audio synthesizer).
- **Backend**: Node.js 24 + Express + WebSocket (`ws`) + SQLite (`node:sqlite` DatabaseSync native).
- **Quản lý trạng thái**: Zustand (Client cache) + Server Authoritative (Tiền, kho hàng, quyền sở hữu do server quản lý 100%, chống cheat).
- **Bảo mật giao dịch**:
  - Giao dịch tài chính đóng gói trong `BEGIN IMMEDIATE` transaction.
  - Idempotency qua `requestId` (UUIDv4) chống lặp thao tác khi mạng lag.
  - Mã hóa mật khẩu bằng `scrypt` có salt ngẫu nhiên, token phiên kiểm tra qua DB.

---

## 📁 3. Cấu trúc thư mục

```
Gamepeak/
├── shared/                  # Chia sẻ giữa Client & Server
│   ├── config.ts            # Hằng số kinh tế, giá cả, thời tiết, mặt hàng
│   ├── types.ts             # Định nghĩa kiểu dữ liệu TypeScript
│   └── world.ts             # Tọa độ tòa nhà, va chạm, thuật toán A* pathfinding
├── server/                  # Backend Node.js
│   ├── app.ts               # Express API & WebSocket Server
│   ├── index.ts             # Entrypoint khởi chạy server
│   ├── database/            # SQLite connection, migration, schema
│   ├── services/            # AuthService, GameService, BusinessManager, MarketplaceManager...
│   └── systems/             # TimeManager, WeatherManager, EventManager, NPCManager, TownRoom
├── src/                     # Frontend Client
│   ├── game/                # Phaser scenes, canvas, lighting, audio, procedural art
│   ├── services/            # API client & WebSocket listener
│   ├── stores/              # Zustand game store
│   └── ui/                  # React HUD, Dock, Smartphone & Modal components
├── tests/                   # Kiểm thử tự động (Vitest)
│   ├── world.test.ts        # Kiểm thử va chạm, pathfinding, chu kỳ ngày/đêm
│   ├── economy.test.ts      # Kiểm thử ví, mua/bán, P2P race condition, NPC tới quán
│   ├── demo_flow.test.ts    # Kiểm thử toàn bộ chuỗi gameplay Section 35
│   └── multiplayer.test.ts  # Kiểm thử đồng bộ 2 người chơi qua WebSocket
└── package.json
```

---

## 🚀 4. Hướng dẫn cài đặt & Khởi chạy Local

### Yêu cầu môi trường
- **Node.js**: Phiên bản `>= 24.0.0`
- **NPM**: Đi kèm Node.js

### Các bước khởi chạy

1. **Cài đặt thư viện**:
   ```bash
   npm install
   ```

2. **Cấu hình môi trường**:
   File `.env` đã được cấu hình sẵn:
   ```env
   PORT=3001
   HOST=127.0.0.1
   DATABASE_PATH=./data/gamepeak.sqlite
   NODE_ENV=development
   ENABLE_DEBUG=true
   ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:3001
   ```

3. **Chạy ứng dụng (Đồng thời cả Server & Frontend)**:
   ```bash
   npm run dev
   ```
   - Giao diện game: **http://localhost:5173**
   - API & WebSocket backend: **http://127.0.0.1:3001**

---

## 👥 5. Hướng dẫn kiểm thử 2 người chơi (Multiplayer)

1. Mở trình duyệt thứ nhất tại `http://localhost:5173`.
2. Đăng ký tài khoản: ví dụ `PlayerOne`, chọn Avatar Chibi, bấm **Bắt đầu cuộc sống mới**.
3. Mở tab trình duyệt thứ hai (hoặc cửa sổ ẩn danh / trình duyệt khác) tại `http://localhost:5173`.
4. Đăng ký tài khoản thứ hai: ví dụ `PlayerTwo`.
5. Di chuyển cả hai nhân vật bằng phím **W-A-S-D** hoặc click chuột trên đường phố:
   - Bạn sẽ nhìn thấy nhân vật của nhau di chuyển mượt mà trên cùng một bản đồ thị trấn.
   - Thử nghiệm giao dịch P2P: `PlayerOne` đăng bán 5 gói hạt cà phê trên Chợ cư dân, `PlayerTwo` mở chợ và mua -> Tiền và hàng hóa được chuyển ngay lập tức!

---

## 🧪 6. Chạy bộ kiểm thử tự động (Unit & Integration Tests)

Dự án sở hữu bộ test toàn diện 13/13 tests vượt qua:

```bash
npm test
```

Kết quả:
- `tests/world.test.ts`: Tìm đường A* tới mọi cửa, tránh vật cản, không đi xuyên tường, chu kỳ ngày/nhiệt độ.
- `tests/economy.test.ts`: Vốn ban đầu, nạp/rút ngân hàng, giá vốn hàng bán (COGS), giữ hàng ký gửi marketplace, khóa race condition 2 người cùng mua món cuối, quy trình vận hành quán cà phê, và **doanh thu chỉ phát sinh khi NPC thực sự tới quán**.
- `tests/demo_flow.test.ts`: Toàn bộ kịch bản demo end-to-end theo đúng yêu cầu `prompt.md`.
- `tests/multiplayer.test.ts`: Đồng bộ thời gian thực 2 client qua WebSocket.

Kiểm tra định kiểu TypeScript:
```bash
npm run typecheck
```

---

## 📋 7. Danh sách tính năng đã hoàn thành (Milestone 1–8)

- [x] **Milestone 1**: Canvas Phaser, bản đồ thị trấn Mầm Xanh, di chuyển 8 hướng, camera follow, responsive Desktop & Mobile, Virtual Joystick.
- [x] **Milestone 2**: 24 NPC chibi di chuyển có lịch trình, chu kỳ ngày/đêm (Sáng, Trưa, Chiều, Tối), hệ thống thời tiết động (Nắng, Mây, Mưa) và nhiệt độ.
- [x] **Milestone 3**: Hệ thống túi đồ cá nhân, 3 mặt hàng nguyên liệu/tiêu dùng (Hạt cà phê, Sữa tươi, Trà lá), Chợ đầu mối với giá động theo cung cầu.
- [x] **Milestone 4**: Cho thuê mặt bằng, mở quán cà phê, mua sắm thiết bị, chuyển nguyên liệu thành tách cà phê, định giá bán, NPC ghé quán mua hàng, bảng báo cáo tài chính Doanh thu - Chi phí - Lợi nhuận ròng.
- [x] **Milestone 5**: Đăng ký, đăng nhập, bảo mật mật khẩu scrypt, lưu trữ phiên, checkpoint vị trí và thế giới vào database SQLite WAL.
- [x] **Milestone 6**: Chợ cư dân P2P (Marketplace), cơ chế ký gửi Escrow giữ hàng, bảo vệ chống race condition nguyên tử.
- [x] **Milestone 7**: Đồng bộ vị trí người chơi thời gian thực qua WebSocket, xử lý disconnect/reconnect sạch sẽ.
- [x] **Milestone 8**: Hiệu ứng nổi tiền `+$5.00`, hiệu ứng trái tim, âm thanh tổng hợp Web Audio, Developer Debug Console, tài liệu bản quyền (`ASSETS.md`), bộ test tự động đầy đủ.

---

## 🔮 8. Kế hoạch phát triển V2 (Future Roadmap)

- [ ] Hỗ trợ adapter PostgreSQL và Supabase Auth / Realtime cho môi trường cloud phân tán.
- [ ] Mở rộng nhiều loại hình kinh doanh: Nhà hàng, Nông trại (trồng trọt), Cửa hàng điện máy, Khách sạn.
- [ ] Hệ thống tuyển dụng nhân viên (NPC Barista, Thu ngân, Shipper) và chi trả lương tự động.
- [ ] Bất động sản mua đứt và thị trường cho thuê nhà ở cao cấp.
- [ ] Sản phẩm tài chính ngân hàng: Vay vốn kinh doanh (Business Loan), thẻ tín dụng, lãi suất tiết kiệm theo thời gian.
- [ ] Mở rộng nhiều khu vực thị trấn (Downtown, Bãi biển, Khu công nghiệp, Vùng nông thôn ngoại ô).
