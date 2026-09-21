/**
 * @jest-environment jsdom
 */
import { RenderCancelledError, fromAssetUrl, hasNativeMedia, runNativeRender, toAssetUrl, DesktopOnlyError, desktopMedia } from '../../../lib/native/desktop-media';

const w = window as any;
const spec = { version: 1 as const, inputs: ['/a.mp4'], filterComplex: 'x', maps: ['[vout]'], width: 1920, height: 1080, fps: 30, durationSec: 4, quality: 'balanced' as const, hasAudio: false };

function installTauri(handler: (cmd: string, args?: any) => any) {
  w.__180_NATIVE__ = { isNative: true };
  w.__TAURI_INTERNALS__ = { invoke: jest.fn(async (cmd: string, args?: any) => handler(cmd, args)) };
  return w.__TAURI_INTERNALS__.invoke as jest.Mock;
}
afterEach(() => {
  delete w.__180_NATIVE__;
  delete w.__TAURI_INTERNALS__;
});

describe('browser (no desktop app)', () => {
  it('is not native and every command throws DesktopOnlyError', async () => {
    expect(hasNativeMedia()).toBe(false);
    expect(() => desktopMedia.pickMediaFiles()).toThrow(DesktopOnlyError);
    expect(() => desktopMedia.startRender(spec, '/o.mp4')).toThrow(DesktopOnlyError);
  });
});

describe('asset URLs', () => {
  it('round-trips Windows and POSIX paths (spaces, unicode, separators)', () => {
    const win = 'C:\\Users\\Priya\\Videos\\क्लिप one.mov';
    const u = toAssetUrl(win, 'Windows NT 10.0');
    expect(u.startsWith('http://asset.localhost/')).toBe(true);
    expect(fromAssetUrl(u)).toBe(win);
    const posix = '/Users/p/My Videos/a b.mp4';
    const m = toAssetUrl(posix, 'Macintosh');
    expect(m.startsWith('asset://localhost/')).toBe(true);
    expect(fromAssetUrl(m)).toBe(posix);
  });
  it('does not treat other URLs as local files', () => {
    expect(fromAssetUrl('blob:http://x/abc')).toBeNull();
    expect(fromAssetUrl('https://evil.example/asset.localhost/x')).toBeNull();
    expect(fromAssetUrl('http://asset.localhost/%E0%A4%A')).toBeNull(); // malformed escape
  });
});

describe('runNativeRender', () => {
  it('polls until done, reports progress, and returns the output path', async () => {
    const states = [
      { state: 'running', progress: 0.1, error: null, output: null },
      { state: 'running', progress: 0.6, error: null, output: null },
      { state: 'done', progress: 1, error: null, output: '/o.mp4' },
    ];
    installTauri((cmd) => (cmd === 'render_timeline' ? 'job1' : cmd === 'render_status' ? states.shift() : undefined));
    const seen: number[] = [];
    await expect(runNativeRender(spec, '/o.mp4', (p) => seen.push(p), undefined, 1)).resolves.toBe('/o.mp4');
    expect(seen).toEqual([10, 60, 100]);
  });

  it('surfaces the FFmpeg error text when the job fails', async () => {
    installTauri((cmd) => (cmd === 'render_timeline' ? 'j' : { state: 'failed', progress: 0.3, error: 'Invalid data found when processing input', output: null }));
    await expect(runNativeRender(spec, '/o.mp4', () => {}, undefined, 1)).rejects.toThrow(/Invalid data/);
  });

  it('rejects when the native validator refuses the spec (nothing starts)', async () => {
    const invoke = installTauri((cmd) => {
      if (cmd === 'render_timeline') throw new Error('Render rejected: filter "movie" is not allowed');
    });
    await expect(runNativeRender(spec, '/o.mp4', () => {}, undefined, 1)).rejects.toThrow(/not allowed/);
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('cancels the FFmpeg job when aborted and reports a cancellation, not a failure', async () => {
    let cancelled = false;
    const invoke = installTauri((cmd) => {
      if (cmd === 'render_timeline') return 'j';
      if (cmd === 'cancel_render') {
        cancelled = true;
        return undefined;
      }
      return { state: cancelled ? 'cancelled' : 'running', progress: 0.2, error: null, output: null };
    });
    const controller = new AbortController();
    const run = runNativeRender(spec, '/o.mp4', () => {}, controller.signal, 5);
    setTimeout(() => controller.abort(), 20);
    await expect(run).rejects.toBeInstanceOf(RenderCancelledError);
    expect(invoke).toHaveBeenCalledWith('cancel_render', { jobId: 'j' });
  });

  it('aborting before the job starts still cancels it', async () => {
    const invoke = installTauri((cmd) => (cmd === 'render_timeline' ? 'j' : cmd === 'render_status' ? { state: 'cancelled', progress: 0, error: null, output: null } : undefined));
    const controller = new AbortController();
    controller.abort();
    await expect(runNativeRender(spec, '/o.mp4', () => {}, controller.signal, 1)).rejects.toBeInstanceOf(RenderCancelledError);
    expect(invoke).toHaveBeenCalledWith('cancel_render', { jobId: 'j' });
  });
});
