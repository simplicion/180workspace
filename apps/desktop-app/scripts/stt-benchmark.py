"""
Local speech-to-text benchmark for the desktop app (faster-whisper, CPU int8).

Usage (any Python 3.9+; nothing here ships with the app):
    python -m venv .venv && .venv/Scripts/python -m pip install faster-whisper psutil
    .venv/Scripts/python apps/desktop-app/scripts/stt-benchmark.py <audio.wav> <reference.txt> [tiny base small ...]

Reports, per model: load time, transcription time, real-time factor, peak RSS, word error rate against the reference
text, and word-timestamp count. Models download once from Hugging Face (Systran/faster-whisper-*, MIT licence) into
the default cache. See docs/social-studio-mobile/SOCIAL_OS_AUDIT.md "Desktop provider evaluation" for the results.
"""
import json
import re
import sys
import threading
import time
import wave

import psutil
from faster_whisper import WhisperModel


def words(text):
    return re.sub(r"[^a-z0-9' ]+", " ", text.lower()).split()


def wer(ref, hyp):
    r, h = words(ref), words(hyp)
    d = [[0] * (len(h) + 1) for _ in range(len(r) + 1)]
    for i in range(len(r) + 1):
        d[i][0] = i
    for j in range(len(h) + 1):
        d[0][j] = j
    for i in range(1, len(r) + 1):
        for j in range(1, len(h) + 1):
            d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (r[i - 1] != h[j - 1]))
    return d[len(r)][len(h)] / max(1, len(r))


def audio_seconds(path):
    with wave.open(path) as w:
        return w.getnframes() / w.getframerate()


def main():
    audio, ref_path, *models = sys.argv[1:]
    models = models or ["base", "small"]
    ref = open(ref_path, encoding="utf-8-sig").read()
    dur = audio_seconds(audio)
    proc = psutil.Process()
    results = []
    for name in models:
        peak = [proc.memory_info().rss]
        stop = [False]

        def sample():
            while not stop[0]:
                peak[0] = max(peak[0], proc.memory_info().rss)
                time.sleep(0.05)

        th = threading.Thread(target=sample, daemon=True)
        th.start()
        t0 = time.perf_counter()
        model = WhisperModel(name, device="cpu", compute_type="int8")
        t1 = time.perf_counter()
        segments, info = model.transcribe(audio, language="en", word_timestamps=True, vad_filter=True)
        segs = list(segments)
        t2 = time.perf_counter()
        stop[0] = True
        th.join()
        text = " ".join(s.text for s in segs)
        n_words = sum(len(s.words or []) for s in segs)
        results.append({
            "model": name,
            "loadSec": round(t1 - t0, 2),
            "transcribeSec": round(t2 - t1, 2),
            "audioSec": round(dur, 2),
            "realTimeFactor": round((t2 - t1) / dur, 3),
            "peakRssMb": round(peak[0] / 1024 / 1024),
            "wer": round(wer(ref, text), 3),
            "wordTimestamps": n_words,
            "text": text.strip(),
        })
        del model
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
