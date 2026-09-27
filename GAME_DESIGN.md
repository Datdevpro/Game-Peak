# Gamepeak — thiết kế V1

Bạn nhận $100.000 để bắt đầu cuộc sống tại thị trấn Mầm Xanh. Không có nút nhận tiền vô hạn: mỗi nguồn thu gắn với hàng hóa, khách hàng hoặc người mua thật.

## Vòng chơi
Khám phá → mua nguyên liệu tại chợ → thuê mặt bằng → mua máy pha → chuyển nguyên liệu vào quán → đặt giá → mở cửa → NPC tới quầy, mua, rời đi → xem lợi nhuận → tái đầu tư. Có thể giữ tiền trong ngân hàng hoặc mua/bán hàng hóa và niêm yết cho người chơi khác.

## Cân bằng
- Vốn $100.000; toàn bộ phép tính tiền dùng số nguyên cent.
- Một ngày dài 24 phút thực. Khởi đầu 08:00; đồng hồ thế giới được lưu trên server.
- Hạt cà phê là một gói pha được 4 cốc. Chi phí nguyên liệu được phân bổ theo giá vốn thực tế, không theo giá thị trường mới.
- Thuê mặt bằng trả trước ngày đầu; tiền thuê, điện và lương tính theo ngày. Mua máy là tài sản vốn, không được ghi đè thành chi phí nguyên liệu.
- Giá cao giảm xác suất mua. Danh tiếng, thời tiết, sự kiện và khoảng cách tác động nhu cầu. Hết hàng thì không có doanh thu.
- Hàng niêm yết được giữ trong escrow; hủy trả hàng, mua chuyển tiền và hàng trong một transaction.
- Giá sỉ phản ánh cung/cầu có giới hạn, hồi quy về mức cơ sở và chịu tác động sự kiện. Giá thu mua thấp hơn giá bán để tránh arbitrage tức thì.

## Thế giới và điều khiển
Một bản đồ top-down pastel tự vẽ, công viên, hồ, ngân hàng, chợ, quán cà phê, văn phòng, căn hộ và các mặt bằng thuê độc quyền. 24 NPC với ngoại hình khác nhau, lịch làm việc, mua sắm và về nhà. WASD/phím mũi tên; E tương tác; chạm/click địa điểm để đi tới; joystick và nút tương tác trên điện thoại.

## Phạm vi
V1 có tài khoản local, lưu SQLite, multiplayer cùng một server. V2: PostgreSQL/Supabase, nhiều thị trấn, jobs, sản xuất, tín dụng, nhân viên thực, hợp đồng và đầu tư. Không dùng tài sản đồ họa của game khác.
