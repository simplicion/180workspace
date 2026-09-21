import { atempoChain, buildNativeRenderPlan, num, resolveCanvasSize } from '../../../app/(platform)/(media-editor-app)/media-editor/services/native-render-plan';
import { validateFilterGraph, validateRenderSpec } from '../../../app/(platform)/(media-editor-app)/media-editor/services/native-render-validate';

const T = (s: number) => ({ value: Math.round(s * 48000), timescale: 48000 });
const range = (a: number, d: number) => ({ start: T(a), duration: T(d) });
const clip = (id: string, path: string, over: any = {}) => ({
  id, assetId: id, sourcePath: path, sourceRange: range(0, 4), timelineRange: range(0, 4),
  transform: { scale: { start: 1, end: 1 }, position: { x: 0, y: 0 }, rotationDeg: 0, opacity: 1 },
  speedMultiplier: 1, volumeDb: 0, effects: [], ...over,
});
const ir = (clips: any[], extra: any = {}): any => ({
  version: '1.0.0',
  meta: { projectId: 'p', title: 't', targetAspect: '16:9', resolution: { width: 1920, height: 1080 }, fps: { numerator: 30, denominator: 1 }, totalDuration: T(4) },
  directorStyle: {},
  tracks: { videoTracks: [{ id: 'm', type: 'MAIN_VIDEO', zIndex: 0, clips }], cameraTrack: [], captionTrack: [], audioTracks: [], ...extra },
});
const opts = { resolveNativePath: (p: string) => p, sourceHasAudio: () => true, settings: { resolution: '1080p', fps: 30 } };

describe('helpers', () => {
  it('formats numbers without exponents and rejects non-finite values', () => {
    expect(num(1e-7)).toBe('0');
    expect(num(2.5)).toBe('2.5');
    expect(num(10)).toBe('10');
    expect(() => num(NaN)).toThrow();
    expect(() => num(Infinity)).toThrow();
  });
  it('sizes canvases like the canvas exporter', () => {
    expect(resolveCanvasSize('16:9', '1080p')).toEqual({ width: 1920, height: 1080 });
    expect(resolveCanvasSize('9:16', '1080p')).toEqual({ width: 1080, height: 1920 });
    expect(resolveCanvasSize('1:1', '720p')).toEqual({ width: 720, height: 720 });
    expect(resolveCanvasSize('16:9', '4K')).toEqual({ width: 3840, height: 2160 });
  });
  it('chains atempo within its 0.5-2 per-instance limit', () => {
    expect(atempoChain(1)).toBe('');
    expect(atempoChain(1.5)).toBe('atempo=1.5');
    expect(atempoChain(4)).toBe('atempo=2,atempo=2');
    expect(atempoChain(0.25)).toBe('atempo=0.5,atempo=0.5');
  });
});

describe('the plan builder always emits graphs that pass the native validator', () => {
  it('for a realistic multi-track project with audio', () => {
    const plan = buildNativeRenderPlan(
      ir([clip('a', '/v/a.mp4'), clip('b', '/v/b.mp4', { timelineRange: range(4, 2), speedMultiplier: 2 })], {
        audioTracks: [{ id: 'bgm', type: 'BGM', volumeDb: -6, duckWithSpeech: false, clips: [{ id: 'x', sourcePath: '/v/bgm.wav', sourceRange: range(0, 6), timelineRange: range(0, 6), volumeDb: 0, fadeInDuration: T(1), fadeOutDuration: T(1) }] }],
      }),
      opts,
    );
    expect(plan.supported).toBe(true);
    if (plan.supported) {
      expect(() => validateRenderSpec(plan.spec)).not.toThrow();
      expect(plan.spec.inputs).toEqual(['/v/a.mp4', '/v/b.mp4', '/v/bgm.wav']);
    }
  });

  it('for a project with an overlay image and no audio', () => {
    const plan = buildNativeRenderPlan(
      { ...ir([clip('a', '/v/a.mp4')]), tracks: { ...ir([]).tracks, videoTracks: [
        { id: 'm', type: 'MAIN_VIDEO', zIndex: 0, clips: [clip('a', '/v/a.mp4')] },
        { id: 'o', type: 'B_ROLL_OVERLAY', zIndex: 1, clips: [clip('l', '/v/logo.png', { transform: { scale: { start: 0.5, end: 0.5 }, position: { x: 100, y: -50 }, rotationDeg: 0, opacity: 0.5 } })] },
      ] } },
      { ...opts, sourceHasAudio: () => false },
    );
    expect(plan.supported).toBe(true);
    if (plan.supported) {
      expect(plan.spec.hasAudio).toBe(false);
      expect(() => validateRenderSpec(plan.spec)).not.toThrow();
    }
  });
});

describe('validateFilterGraph rejects anything that could read files or escape the graph', () => {
  const good = "color=c=black:s=1920x1080:r=30:d=4[base0];[0:v]trim=start=0:duration=4,setpts=(PTS-STARTPTS)/1+0/TB[v0];[base0][v0]overlay=x='(main_w-overlay_w)/2':y='0':enable='between(t,0,4)'[o]";
  it('accepts a legitimate graph', () => expect(() => validateFilterGraph(good, 1)).not.toThrow());

  it.each([
    ['movie (reads any file)', 'movie=/etc/passwd[x]'],
    ['amovie', 'amovie=C:/secret.wav[x]'],
    ['subtitles', '[0:v]subtitles=/etc/passwd[o]'],
    ['drawtext textfile', '[0:v]drawtext=textfile=/etc/passwd[o]'],
    ['sendcmd', '[0:v]sendcmd=f=/x[o]'],
    ['lut3d', '[0:v]lut3d=/x[o]'],
    ['unknown filter', '[0:v]hackfilter=1[o]'],
    ['movie hidden after a comma', '[0:v]scale=w=2:h=2,movie=/x[o]'],
    ['movie hidden after a semicolon', '[0:v]scale=w=2:h=2[a];movie=/x[o]'],
    ['label out of range', '[5:v]scale=w=2:h=2[o]'],
    ['bad label chars', '[0:v]scale=w=2:h=2[o;x]'],
    ['label smuggled into arguments', '[0:v]scale=[x]=2[o]'],
    ['backslash', '[0:v]scale=w=2\\:h=2[o]'],
    ['double quote', '[0:v]scale=w="2":h=2[o]'],
    ['backtick', '[0:v]scale=w=`id`:h=2[o]'],
    ['dollar', '[0:v]scale=w=$HOME:h=2[o]'],
    ['newline', '[0:v]scale=w=2:h=2[o]\nmovie=/x[y]'],
    ['unbalanced quote', "[0:v]overlay=enable='between(t,0,4)[o]"],
    ['unbalanced bracket', '[0:v]scale=w=2:h=2[o'],
    ['empty', ''],
  ])('%s', (_name, graph) => {
    expect(() => validateFilterGraph(graph as string, 1)).toThrow();
  });

  it('rejects an oversized graph', () => {
    expect(() => validateFilterGraph('null,'.repeat(30_000), 1)).toThrow();
  });
});

describe('validateRenderSpec', () => {
  const spec = () => ({
    version: 1 as const, inputs: ['/v/a.mp4'], filterComplex: 'color=c=black:s=1920x1080:r=30:d=4[b];[b]format=yuv420p,fps=30[vout]',
    maps: ['[vout]'], width: 1920, height: 1080, fps: 30, durationSec: 4, quality: 'balanced' as const, hasAudio: false,
  });
  it('accepts a minimal spec', () => expect(() => validateRenderSpec(spec())).not.toThrow());
  it.each([
    ['bad version', { version: 2 }],
    ['no inputs', { inputs: [] }],
    ['huge size', { width: 100000 }],
    ['fps 0', { fps: 0 }],
    ['negative duration', { durationSec: -1 }],
    ['unknown quality', { quality: 'ultra' }],
    ['maps do not match hasAudio', { hasAudio: true }],
    ['extra map', { maps: ['[vout]', '[evil]'] }],
  ])('%s', (_n, over) => {
    expect(() => validateRenderSpec({ ...spec(), ...(over as any) })).toThrow();
  });
});
