# Dragon Adventure - Thám hiểm Bách khoa Rồng

Game web deploy được trên Render: realtime bằng Socket.io, database JSON file, hơn 1000 loài rồng tạo theo cấp, spin wheel, ấp trứng, nâng cấp rồng, tạo/phòng solo theo cấp độ.

## Chạy local

```bash
npm install
npm run seed
npm start
```

Mở: http://localhost:3000

## Deploy lên Render bằng GitHub

1. Giải nén file ZIP này.
2. Tạo repository GitHub mới, upload toàn bộ thư mục project.
3. Vào Render → New → Web Service → chọn repo GitHub.
4. Render tự đọc `render.yaml` hoặc bạn nhập thủ công:
   - Build Command: `npm install && npm run seed`
   - Start Command: `npm start`
5. Deploy xong mở URL Render để chơi.

## Database realtime

Bản này dùng database JSON file để dễ chạy trên Render Free, không cần cài thư viện native. Socket.io dùng để cập nhật phòng, trạng thái người chơi và hoạt động thế giới realtime.

Nếu cần lưu lâu dài trên Render, hãy dùng Persistent Disk và đặt biến môi trường `DATABASE_PATH=/var/data/dragon_adventure.json`, hoặc nâng cấp thành PostgreSQL ở bản sau.

## Tính năng

- Bách khoa 1200 loại rồng, chia cấp Common → Cosmic.
- Dragon art tạo bằng CSS động, mỗi loài có màu, nguyên tố, hình dáng, cánh, sừng, aura khác nhau.
- Spin wheel nhận coin, gem, trứng, EXP, rồng hiếm.
- Ấp trứng realtime.
- Nâng cấp rồng bằng coin + shard.
- Tạo phòng solo theo cấp độ, người chơi khác có thể tham gia bằng mã phòng.
- Socket.io cập nhật realtime trạng thái phòng, hoạt động và bảng xếp hạng.
