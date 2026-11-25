"""router-demo renderer (dựa trên skill motion-design: seek(t) + Playwright + ffmpeg).

python render.py probe 1 5 6.5 12.6 17 23   -> probe/sheet.png (ảnh tĩnh để duyệt)
python render.py draft                       -> out/draft.mp4 (540 px, 1 ảnh/khung, xem nhịp)
python render.py full                        -> out/router-demo.mp4 (1080x1920, 30 fps, motion blur)
python render.py pops                        -> dò khung nhảy bất thường trong out/router-demo.mp4

Tự mở server HTTP cho thư mục này. Biến môi trường:
  SUB=4        số ảnh con mỗi khung (motion blur), 1 = không blur, nhanh nhất
  CHROMIUM=... đường dẫn Chromium nếu Playwright không tìm thấy trình duyệt của nó
"""
import asyncio, contextlib, functools, http.server, os, shutil, socketserver, subprocess, sys, threading
from pathlib import Path
import numpy as np
from playwright.async_api import async_playwright

HERE = Path(__file__).resolve().parent
try:
    import imageio_ffmpeg
    FF = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FF = shutil.which("ffmpeg") or "ffmpeg"

W, H, FPS, T = 1080, 1920, 30, 24.0
SUB = int(os.environ.get("SUB", "4"))
SHUTTER = 0.5          # 180 độ: ảnh con trải trên nửa khoảng thời gian một khung
CUTS = []              # thời điểm cắt cứng (không có: mọi chuyển cảnh đều liên tục)
OUT = HERE / "out" / "router-demo.mp4"
ARGS = ["--force-color-profile=srgb", "--font-render-hinting=none", "--disable-threaded-animation"]


@contextlib.contextmanager
def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    handler = functools.partial(Quiet, directory=str(HERE))
    httpd = socketserver.TCPServer(("127.0.0.1", 0), handler)
    th = threading.Thread(target=httpd.serve_forever, daemon=True); th.start()
    try:
        yield f"http://127.0.0.1:{httpd.server_address[1]}/film.html"
    finally:
        httpd.shutdown(); httpd.server_close()


async def launch(p):
    exe = os.environ.get("CHROMIUM")
    if exe:
        return await p.chromium.launch(args=ARGS, executable_path=exe)
    try:
        return await p.chromium.launch(args=ARGS)
    except Exception:
        for cand in ("/opt/pw-browsers/chromium", shutil.which("chromium") or "", shutil.which("google-chrome") or ""):
            if cand and os.path.exists(cand):
                return await p.chromium.launch(args=ARGS, executable_path=cand)
        raise


async def open_page(p, url):
    b = await launch(p)
    pg = await b.new_page(viewport={"width": W, "height": H}, device_scale_factor=1)
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append("console: " + m.text) if m.type in ("error", "warning") else None)
    await pg.goto(url)
    await pg.wait_for_function("window.ready === true", timeout=120000)
    await pg.evaluate("document.fonts.ready")
    await pg.add_style_tag(content="*,*::before,*::after{transition:none!important;caret-color:transparent!important}")
    await pg.evaluate("document.getAnimations().forEach(a => a.pause())")
    return b, pg, errs


async def shot(pg, t, path, fmt="png"):
    await pg.evaluate(f"window.seek({t})")
    await pg.evaluate("new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))")
    el = await pg.query_selector("#stage")
    await el.screenshot(path=str(path), type=fmt, **({"quality": 95} if fmt == "jpeg" else {}))


def sheet(folder, pattern, n, out, cols=3, size=360):
    rows = -(-n // cols)
    subprocess.run([FF, "-v", "error", "-y", "-i", str(folder / pattern), "-vf",
                    f"scale={size}:-1,tile={cols}x{rows}:padding=6:color=white", "-frames:v", "1", str(out)], check=True)


async def probe(times):
    out = HERE / "probe"; shutil.rmtree(out, ignore_errors=True); out.mkdir()
    with serve() as url:
        async with async_playwright() as p:
            b, pg, errs = await open_page(p, url)
            for i, t in enumerate(times): await shot(pg, t, out / f"p_{i:02d}.png")
            await b.close()
    if errs: print("PAGE ERRORS:", errs[:8])
    sheet(out, "p_%02d.png", len(times), out / "sheet.png")
    print("probe:", len(times), "->", out / "sheet.png")


def encode(src_pattern, rate, vf, out, crf="16", preset="slow"):
    vf = vf + ("," if vf else "") + "scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p"
    subprocess.run([FF, "-v", "error", "-y", "-framerate", str(rate), "-i", str(src_pattern), "-vf", vf, "-r", str(FPS),
                    "-c:v", "libx264", "-crf", crf, "-preset", preset, "-color_range", "tv", "-colorspace", "bt709",
                    "-color_primaries", "bt709", "-color_trc", "bt709", "-movflags", "+faststart", str(out)], check=True)


async def full():
    sub = HERE / "sub"; shutil.rmtree(sub, ignore_errors=True); sub.mkdir()
    n, k = int(round(T * FPS)), 0
    offs = [(j - (SUB - 1) / 2) * SHUTTER / (FPS * SUB) for j in range(SUB)] if SUB > 1 else [0.0]
    with serve() as url:
        async with async_playwright() as p:
            b, pg, errs = await open_page(p, url)
            for i in range(n):
                for o in offs:
                    t = min(T - 1e-3, max(0.0, i / FPS + o))
                    for c in CUTS:
                        if (t < c) != (i / FPS < c): t = c if i / FPS >= c else c - 1e-4
                    await shot(pg, t, sub / f"s_{k:05d}.jpg", "jpeg"); k += 1
                if i % 30 == 0: print(f"frame {i}/{n}", flush=True)
            await b.close()
    if errs: print("PAGE ERRORS:", errs[:8])
    OUT.parent.mkdir(exist_ok=True)
    S = len(offs)
    vf = f"tmix=frames={S},select='eq(mod(n\\,{S})\\,{S - 1})',setpts=N/{FPS}/TB" if S > 1 else ""
    encode(sub / "s_%05d.jpg", FPS * S, vf, OUT)
    shutil.rmtree(sub, ignore_errors=True)
    print("video ->", OUT)


async def draft():
    sub = HERE / "sub_draft"; shutil.rmtree(sub, ignore_errors=True); sub.mkdir()
    n = int(round(T * FPS))
    with serve() as url:
        async with async_playwright() as p:
            b, pg, errs = await open_page(p, url)
            for i in range(n): await shot(pg, min(T - 1e-3, i / FPS), sub / f"d_{i:05d}.jpg", "jpeg")
            await b.close()
    if errs: print("PAGE ERRORS:", errs[:8])
    OUT.parent.mkdir(exist_ok=True)
    encode(sub / "d_%05d.jpg", FPS, "scale=540:-2", HERE / "out/draft.mp4", crf="23", preset="veryfast")
    shutil.rmtree(sub, ignore_errors=True)
    print("draft ->", HERE / "out/draft.mp4")


def pops(path=None):
    path = path or OUT
    raw = subprocess.run([FF, "-v", "quiet", "-i", str(path), "-vf", "scale=180:320,format=gray", "-f", "rawvideo", "-"],
                         capture_output=True, check=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(-1, 320, 180).astype(np.float32)
    d = np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2))
    hits = [(i + 1, round((i + 1) / FPS, 3), round(float(d[i]), 2)) for i in range(1, len(d) - 1)
            if d[i] > 3 * max(d[i - 1], d[i + 1], 0.3) and d[i] > 2.0]
    print("frames:", len(fr), "| pops:", len(hits))
    for h in hits: print("  frame", h[0], "t", h[1], "diff", h[2])


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "full"
    if cmd == "probe": asyncio.run(probe([float(x) for x in sys.argv[2:]] or [1, 3.5, 6.5, 12.6, 16, 23]))
    elif cmd == "draft": asyncio.run(draft())
    elif cmd == "full": asyncio.run(full())
    elif cmd == "pops": pops(sys.argv[2] if len(sys.argv) > 2 else None)
    else: print(__doc__)
