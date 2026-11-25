"""Nhạc nền + tiếng hiệu ứng cho router-demo v2, tổng hợp 100 % bằng code (không cần tải gì).

python render.py events   # (hoặc render.py full) -> out/events.json
python audio.py           # -> out/audio.wav, chuẩn hóa -14 LUFS

- 120 BPM, 12 ô nhịp = đúng 24 s; đuôi vang cuối bài được cộng vòng về đầu nên video lặp liền.
- Cấu trúc theo cảnh: 0-2 s nhạc nền nhẹ, 2-16.6 s đầy đủ (kick, clap, hi-hat, bass, arpeggio),
  cảnh tổng kết bớt trống, 22-22.65 s tiếng tua ngược, 22.65-24 s nhẹ như đoạn mở đầu.
- Mỗi sự kiện đến router: một tiếng tick nhỏ; bot nhận việc: tiếng "pop"; hai ví dụ: tiếng chuông rõ hơn.
"""
import json, subprocess, shutil, re
from pathlib import Path
import numpy as np

HERE = Path(__file__).resolve().parent
try:
    import imageio_ffmpeg
    FF = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FF = shutil.which("ffmpeg") or "ffmpeg"

SR, T, BPM = 48000, 24.0, 120
BEAT = 60 / BPM
N = int(SR * T)
rng = np.random.default_rng(7)
ev = json.loads((HERE / "out/events.json").read_text())
TM = ev["time"]

L = np.zeros(N + SR * 3); R = np.zeros_like(L)   # có phần dư để quấn đuôi về đầu


def add(sig, t, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if i < 0: sig, i = sig[-i:], 0
    n = min(len(sig), len(L) - i)
    if n <= 0: return
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    L[i:i + n] += sig[:n] * gain * l * 1.414
    R[i:i + n] += sig[:n] * gain * r * 1.414


def env(n, a=0.002, d=0.2):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)


def lp_fast(x, fc):  # lọc thông thấp bậc 2 trong miền tần số
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X / np.sqrt(1 + (f / fc) ** 4), len(x))


def hp_fast(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X * (f / fc) ** 2 / np.sqrt(1 + (f / fc) ** 4), len(x))


hz = lambda m: 440 * 2 ** ((m - 69) / 12)

# ---------- nhạc cụ ----------
def kick():
    n = int(0.45 * SR); t = np.arange(n) / SR
    f = 45 + 95 * np.exp(-t / 0.035); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t / 0.16) + 0.15 * np.sin(ph * 2) * np.exp(-t / 0.03)


def hat(open_=False):
    n = int((0.18 if open_ else 0.06) * SR)
    return hp_fast(rng.standard_normal(n), 7000) * env(n, 0.001, 0.06 if open_ else 0.018)


def clap():
    n = int(0.25 * SR); x = rng.standard_normal(n)
    x = hp_fast(lp_fast(x, 2500), 900)
    e = env(n, 0.001, 0.08)
    for k in (0.010, 0.020): e += 0.6 * np.roll(env(n, 0.001, 0.008), int(k * SR))
    return x * e * 0.6


def pluck(m, d=0.22):
    n = int(0.5 * SR); t = np.arange(n) / SR; f = hz(m)
    x = sum(np.sin(2 * np.pi * f * k * t) / k ** 1.6 for k in range(1, 7))
    return lp_fast(x * env(n, 0.002, d), 3200)


def bass(m, dur):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(m)
    x = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)
    return np.tanh(1.6 * x) * np.minimum(1, t / 0.005) * np.minimum(1, (dur - t) / 0.03)


def pad(notes, dur):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes:
        for det in (-0.08, 0.0, 0.08):
            f = hz(m + det)
            x += 2 * ((f * t) % 1) - 1
    x = lp_fast(x, 1300) / (len(notes) * 3)
    a = np.minimum(1, t / 0.25) * np.minimum(1, (dur - t) / 0.35)
    return x * a


def tick(m, g=1.0):
    n = int(0.08 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * hz(m) * t) * env(n, 0.0008, 0.018) * g


def pop(m):
    n = int(0.2 * SR); t = np.arange(n) / SR
    f = hz(m) * (1 + 0.5 * np.exp(-t / 0.02))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.06)


def chime(ms):
    n = int(1.2 * SR); t = np.arange(n) / SR
    return sum(np.sin(2 * np.pi * hz(m) * t) * np.exp(-t / 0.5) * (0.7 ** i) for i, m in enumerate(ms))


def whoosh(dur, rise=True):
    n = int(dur * SR); t = np.arange(n) / SR; x = rng.standard_normal(n)
    x = hp_fast(lp_fast(x, 5000), 500)
    shape = np.sin(np.pi * t / dur) ** 2
    return x * shape * (np.linspace(0.4, 1, n) if rise else np.linspace(1, 0.4, n))


# ---------- dàn bài: Am - F - C - G, 1 ô nhịp = 2 s ----------
CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]   # Am F C G
ROOTS = [45, 41, 48, 43]
BAR = 4 * BEAT
sum_from, rw0, rw1 = TM["sumFrom"], TM["rewindFrom"], TM["rewindTo"]

for bar in range(12):
    t0 = bar * BAR; ch = CHORDS[bar % 4]; root = ROOTS[bar % 4]
    full = 1 <= bar <= 7                       # 2 s → 16 s: đầy đủ
    light = bar in (0, 11)                     # đầu / cuối: nhẹ (để lặp liền)
    summ = bar in (8, 9, 10)                   # tổng kết
    add(pad([m + 12 for m in ch], BAR + 0.3), t0, 0.22 if not full else 0.16)
    for b in range(4):
        tb = t0 + b * BEAT
        if full or (summ and tb < sum_from):
            add(kick(), tb, 0.85 if b in (0, 2) else 0.55)
            if b in (1, 3): add(clap(), tb, 0.35, 0.1)
        for h in range(2):
            th = tb + h * BEAT / 2
            if rw0 - 0.05 <= th < rw1: continue
            add(hat(open_=(h == 1 and b == 3)), th, (0.16 if h else 0.1) * (0.6 if light else 1.0), -0.3 + 0.6 * h)
    if not light:
        for k in range(8):                     # bass 8 nốt móc đơn
            tb = t0 + k * BEAT / 2
            if rw0 - 0.05 <= tb < rw1: continue
            add(bass(root + (12 if k % 4 == 3 else 0), BEAT / 2 * 0.85), tb, 0.22 if full else 0.14)
    arp = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[0] + 24, ch[2] + 12, ch[1] + 12, ch[0] + 24, ch[2] + 24]
    for k in range(16):                        # arpeggio móc kép
        tk = t0 + k * BEAT / 4
        if rw0 - 0.05 <= tk < rw1: continue
        g = 0.10 if full else (0.07 if summ else 0.04)
        add(pluck(arp[k % 8]), tk, g, 0.35 if k % 2 else -0.35)

# ---------- hiệu ứng theo sự kiện ----------
for e in ev["events"]:
    if e["key"]:
        continue
    add(tick(93), e["tRouter"], 0.07, rng.uniform(-0.4, 0.4))
    if e["tBot"] is not None:
        add(pop(84), e["tBot"], 0.09, 0.3)
for e in ev["events"]:
    if e["key"] == "ex1":
        add(tick(88), e["tRouter"], 0.25); add(chime([76, 83]), e["tRouter"] + 0.02, 0.07, -0.1)
    if e["key"] == "ex2":
        add(tick(93), e["tRouter"], 0.2); add(chime([81, 88, 93]), e["tBot"], 0.08, 0.15)

add(whoosh(0.7, True), sum_from - 0.35, 0.12)            # sang cảnh tổng kết
add(chime([69, 76, 81]), sum_from + 0.35, 0.06)
add(whoosh(rw1 - rw0 + 0.25, False), rw0 - 0.05, 0.16)   # tua ngược

# ---------- quấn đuôi về đầu, xuất, chuẩn hóa ----------
L[:len(L) - N] += L[N:]; R[:len(R) - N] += R[N:]
mix = np.stack([L[:N], R[:N]], 1)
mix = np.tanh(mix * 1.2) / 1.2
mix /= np.max(np.abs(mix)) * 1.12
(HERE / "out").mkdir(exist_ok=True)
raw = HERE / "out/audio_raw.wav"
import wave
with wave.open(str(raw), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())

# loudnorm 2 lượt -> -14 LUFS, true peak -1.5
p1 = subprocess.run([FF, "-hide_banner", "-i", str(raw), "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                    capture_output=True, text=True).stderr
m = json.loads(re.findall(r"\{[^{}]*\}", p1)[-1])
af = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
      f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,aresample={SR}")
subprocess.run([FF, "-v", "error", "-y", "-i", str(raw), "-af", af, "-t", str(T), str(HERE / "out/audio.wav")], check=True)
raw.unlink()
print("audio ->", HERE / "out/audio.wav", "| đo trước chuẩn hóa:", m["input_i"], "LUFS")
