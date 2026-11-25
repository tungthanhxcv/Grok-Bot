# router-demo v2

Video dọc 1080 × 1920, 24 giây, **60 fps**, có nhạc. Nhịp theo kiểu "một ngày nén lại":
đồng hồ mô phỏng chạy từ 09:12 đến 17:53 trong khoảng 15,6 giây, khoảng 4 sự kiện mỗi giây,
sau đó chuyển sang cảnh tổng kết, rồi tua ngược về đầu để video lặp liền.

Kết quả: `out/router-demo-v2.mp4`. File `out/video.mp4` chỉ có hình, `out/audio.wav` chỉ có tiếng.

## Dòng thời gian

| Giây | Nội dung |
|---|---|
| 0–1 | Trạng thái đầu 09:12, mọi số bằng 0 (trùng khung cuối để lặp vòng) |
| 1–16,6 | Một ngày chạy nhanh. Chấm chạy theo dây; bộ đếm, chi phí, lưới "bỏ qua", ô "bạn duyệt", vạch cron và nhật ký cập nhật liên tục |
| 4,2–6,1 | Ví dụ 1: "Deploy thành công" đến router, router báo không cần việc, bộ đếm Bỏ qua +1 |
| 10,3–12,5 | Ví dụ 2: "Email khách cần trả lời" đến bot Soạn thảo, ô bot sáng, Bản nháp +1, nhật ký "Đã soạn trả lời" |
| 16,6–20 | Cảnh tổng kết ("Dữ liệu mô phỏng"), ba thanh chi phí, 12×, 0 lần chạy rỗng, gõ lời nhắc cài đặt |
| 20–22 | Giữ yên để đọc |
| 22–22,65 | Tua ngược về 09:12 |
| 22,65–24 | Giữ trạng thái đầu |

## File

| File | Vai trò |
|---|---|
| `data.js` | **Chỗ cần sửa.** Tên bot, màu, nhãn, số lượng (`mix`), hai ví dụ, mốc thời gian, chi phí, lời nhắc. Sinh `window.EVENTS`: danh sách sự kiện dùng chung cho hình, số, nhật ký và tiếng. |
| `film.html` | Dựng hình, mọi thứ tính từ `seek(t)`. |
| `render.py` | Chụp từng khung → `out/video.mp4`, xuất `out/events.json`, ghép tiếng. |
| `audio.py` | Nhạc 120 BPM và tiếng hiệu ứng, tổng hợp bằng code (không cần tải file), chuẩn hóa −14 LUFS. |
| `assets/fonts/` | Inter và JetBrains Mono (giấy phép OFL), có đủ dấu tiếng Việt. |

## Cài đặt (một lần)

```bash
pip install playwright imageio-ffmpeg numpy pillow
```

```bash
python -m playwright install chromium
```

## Xuất lại

```bash
python render.py full
```

```bash
python audio.py
```

```bash
python render.py mux
```

Lệnh thứ nhất mất khoảng 6–8 phút. Nếu chỉ sửa nhạc thì chạy `python render.py events`, rồi `audio.py`, rồi `mux`.
Muốn duyệt nhanh, chạy `python render.py probe 3 5.2 11.6 18 21` để có ảnh tĩnh ở `probe/sheet.png`.
Đặt `SUB=1` để bỏ motion blur (nhanh gấp đôi).

Xem thử trong trình duyệt: chạy `python -m http.server 8000`, mở `http://localhost:8000/film.html`
(Space phát/dừng, ←/→ một khung, R phát lại, `?t=11.5` nhảy tới giây 11,5). Phần xem thử không có tiếng.

## Sửa thường gặp (trong `data.js`)

- **Tên bot, màu, việc, giới hạn:** `bots[]` (`name`, `color`, `duty`, `never`, `done`).
- **Tên thương hiệu ở đầu video:** `brand`.
- **Số liệu:** `mix`. Tổng kết, bộ đếm, chi phí trong ngày và tiếng tick tự đi theo.
- **Chi phí cảnh tổng kết:** `summary.rows` (`value` = độ dài thanh, `text` = chữ hiển thị). Chi phí chạy trong ngày tính từ `cost`.
- **Nhịp:** `time.runFrom` / `time.runTo` (độ dài một ngày trên màn hình), `dots.toRouter` / `dots.toBot` (tốc độ chấm).

Mọi số liệu là dữ liệu mô phỏng, và video có ghi rõ "Dữ liệu mô phỏng".
