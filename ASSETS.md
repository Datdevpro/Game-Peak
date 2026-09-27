# Tài liệu Assets & Bản quyền (ASSETS.md)

Thị trấn Mầm Xanh (Gamepeak) trong phiên bản V1 Prototype sử dụng đồ họa thủ tục (Procedural Vector & Graphics) do chính engine vẽ bằng code, kết hợp SVG và Web Audio API tổng hợp âm thanh, cam kết 100% không sử dụng bất kỳ asset có bản quyền nào của bên thứ ba.

| Thành phần | Nguồn gốc / Tạo bởi | Bản quyền / License | Tác giả | Mục đích sử dụng |
|:---|:---|:---|:---|:---|
| **Bản đồ thị trấn & Tòa nhà** | Vẽ tự động qua `src/game/art/town.ts` (Phaser Graphics API) | MIT (Dự án Gamepeak) | Gamepeak Team | Mặt đường, vỉa hè, hồ nước, công viên, nhà cửa, bóng đổ |
| **Nhân vật Chibi (24 mẫu)** | Vẽ thủ tục qua `makeAvatar()` và component `ChibiAvatar.tsx` (SVG) | MIT (Dự án Gamepeak) | Gamepeak Team | Player và 24 NPC cư dân (mắt, mũi, trang phục, mũ, tóc) |
| **Phông chữ hiển thị** | Google Fonts (`Be Vietnam Pro`, `Outfit`) | SIL Open Font License (OFL) | Fábio Duarte Martins, Nam Nguyễn (Be Vietnam Pro); Rodrigo Fuenzalida (Outfit) | Hiển thị giao diện HUD, biển hiệu, đối thoại và bảng số liệu |
| **Hiệu ứng âm thanh (SFX)** | Web Audio API Oscillator tổng hợp (`AudioManager.ts`) | MIT (Dự án Gamepeak) | Gamepeak Team | Tiếng leng keng nhận tiền (`coin`), tiếng chuông quán (`bell`), tiếng bấm phím (`click`) |
| **Hiệu ứng ánh sáng & thời tiết** | Phaser Graphics & Lighting Manager (`LightingManager.ts`) | MIT (Dự án Gamepeak) | Gamepeak Team | Chuyển đổi mượt mà chu kỳ bình minh, ban ngày, hoàng hôn, ban đêm và hạt mưa rơi |

---
*Ghi chú: Toàn bộ đồ họa và âm thanh là self-contained, không phụ thuộc vào CDN bên ngoài hay file asset nhị phân tải chậm, giúp game khởi động tức thì trên cả Desktop lẫn Mobile.*
