# router-demo

Video dọc 1080 × 1920, 24 giây, 30 fps, minh họa một router phân việc cho bốn bot.
Video được dựng bằng code theo cách của skill [claude-motion-design](https://github.com/howseen-ai/claude-motion-design):
mỗi khung hình là kết quả của một hàm `seek(t)` trong HTML, Playwright chụp từng khung, ffmpeg ghép thành MP4.

Kết quả: `out/router-demo.mp4`

## Cấu trúc

| File | Vai trò |
|---|---|
| `data.js` | **Chỗ duy nhất cần sửa.** Tên và màu của nguồn và bot, nhãn sự kiện, số lượng theo loại (`mix`), hai ví dụ nổi bật, chú thích, chi phí ở cảnh tổng kết. Cuối file sinh ra `window.EVENTS`, danh sách sự kiện dùng chung. |
| `film.html` | Phần dựng hình. Chấm, ô bot sáng lên, bộ đếm, nhật ký và bảng tổng kết đều đọc từ `EVENTS`, nên luôn khớp nhau. |
| `render.py` | Chụp từng khung và xuất video (tự mở server HTTP). |
| `assets/fonts/` | Font Inter (giấy phép OFL), hiển thị đủ dấu tiếng Việt. |

## Cài đặt (một lần)

```bash
pip install playwright imageio-ffmpeg numpy pillow
```

```bash
python -m playwright install chromium
```

## Xuất lại video

```bash
python render.py probe 1 6.5 12.6 23   # ảnh tĩnh để duyệt nhanh -> probe/sheet.png
```

```bash
python render.py full                  # video hoàn chỉnh -> out/router-demo.mp4 (khoảng 5-10 phút)
```

Các lệnh khác: `python render.py draft` (bản nháp 540 px, nhanh) và `python render.py pops` (dò khung nhảy bất thường).
Đặt `SUB=1` để bỏ motion blur, render nhanh gấp khoảng 4 lần.

## Xem thử trong trình duyệt

```bash
python -m http.server 8000
```

Mở `http://localhost:8000/film.html`. Phím Space để phát/dừng, ←/→ để lùi/tiến một khung, R để phát lại, `?t=12.4` để nhảy tới giây 12,4.

## Sửa thường gặp (trong `data.js`)

- **Đổi tên hoặc màu bot:** sửa `bots[].name`, `bots[].color`, `bots[].log` (dòng nhật ký khi bot làm xong). Giữ nguyên `id`, hoặc đổi luôn các chỗ dùng `id` đó (`mix`, `routeSources`, `labels`, `draftBot`, `examples[].route`).
- **Đổi số liệu:** sửa `mix`. Ví dụ `{ skip: 49, draft: 9, triage: 2, fix: 2, review: 2 }` cho ra 64 sự kiện, 49 bỏ qua, 15 đã xử lý, 9 bản nháp. Bảng tổng kết tự đếm lại từ danh sách sự kiện. Nếu đổi tổng số chấm nền (= tổng `mix` trừ 2 ví dụ), sửa luôn các `n` trong `timing.segments` cho khớp. Nếu không khớp, `render.py` sẽ in lỗi `EVENT ERRORS`.
- **Đổi chi phí:** sửa `summary.costs` (`value` quyết định độ dài thanh, `text` là chữ hiển thị).
- **Đổi thứ tự chấm:** đổi `seed`. Cùng seed thì luôn ra đúng một video.

Mọi số liệu trong video là dữ liệu mô phỏng, và video có ghi rõ "Dữ liệu mô phỏng".
