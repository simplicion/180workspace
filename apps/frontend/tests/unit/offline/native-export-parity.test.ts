import { spring } from 'remotion';
import { captionStateAt, captionStateTimeline } from '../../../app/(platform)/(media-editor-app)/media-editor/services/caption-raster';
import {
  buildCameraChains,
  buildNativeRenderPlan,
  cropFractions,
  springValue,
} from '../../../app/(platform)/(media-editor-app)/media-editor/services/native-render-plan';
import { validateRenderSpec } from '../../../app/(platform)/(media-editor-app)/media-editor/services/native-render-validate';

const T = (s: number) => ({ value: Math.round(s * 48000), timescale: 48000 });
const range = (a: number, d: number) => ({ start: T(a), duration: T(d) });
const clip = (id: string, path: string, tl: [number, number], over: any = {}) => ({
  id, assetId: id, sourcePath: path, sourceRange: range(0, tl[1]), timelineRange: range(...tl),
  transform: { scale: { start: 1, end: 1 }, position: { x: 0, y: 0 }, rotationDeg: 0, opacity: 1 },
  speedMultiplier: 1, volumeDb: 0, effects: [], ...over,
});
const ir = (extra: any = {}, clips: any[] = [clip('c', '/m/a.mp4', [0, 6])]): any => ({
  version: '1.0.0',
  meta: { projectId: 'p', title: 't', targetAspect: '9:16', totalDuration: T(6) },
  directorStyle: {},
  tracks: { videoTracks: [{ id: 'm', type: 'MAIN_VIDEO', zIndex: 0, clips }], cameraTrack: [], captionTrack: [], audioTracks: [], ...extra },
});
const opts = { resolveNativePath: (p: string) => p, sourceHasAudio: () => true, settings: { resolution: '1080p', fps: 30 } };
const word = (w: string, a: number, b: number) => ({ word: w, start: T(a), end: T(b), highlight: false, scaleMultiplier: 1 });
const caption = (id: string, a: number, d: number, words: any[] = [], role?: 'title') =>
  ({ id, role, timeRange: range(a, d), text: words.map((w) => w.word).join(' ') || id, words, style: { preset: 'HORMOZI_BOUNCE', fontFamily: 'Inter', fontSize: 48, textColor: '#fff', highlightColor: '#0f8', position: { x: 0.5, y: 0.8 }, shadow: true } }) as any;

describe('caption state timeline (what gets rasterised for the native export)', () => {
  const captions = [
    caption('c1', 1, 2, [word('one', 1, 1.5), word('two', 1.5, 3)]),
    caption('t1', 2, 3, [], 'title'),
  ];
  const { states, sequence } = captionStateTimeline(captions, 6);

  it('covers the whole timeline exactly', () => {
    expect(sequence.reduce((s, x) => s + x.durationSec, 0)).toBeCloseTo(6, 6);
  });
  it('has one state per distinct picture: blank, each highlighted word, word+title, title alone', () => {
    const shown = sequence.map((s) => states[s.state]);
    expect(shown.map((s) => [s.caption?.activeWord ?? null, s.titles.join()])).toEqual([
      [null, ''],
      [0, ''],
      [1, ''],
      [1, 't1'],
      [null, 't1'],
      [null, ''],
    ]);
    expect(sequence.map((s) => +s.durationSec.toFixed(3))).toEqual([1, 0.5, 0.5, 1, 2, 1]);
    expect(states).toHaveLength(5); // the blank state is reused
  });
  it('uses the preview rule: first active caption wins, every active title is drawn', () => {
    const st = captionStateAt([caption('a', 0, 2), caption('b', 0, 2), caption('x', 0, 2, [], 'title'), caption('y', 1, 2, [], 'title')], 1.5);
    expect(st.caption?.id).toBe('a');
    expect(st.titles).toEqual(['x', 'y']);
  });
});

describe('camera zoom matches the preview spring', () => {
  it('closed-form spring equals Remotion spring() frame by frame', () => {
    for (const config of [{ stiffness: 180, damping: 18, mass: 1 }, { stiffness: 100, damping: 30, mass: 1 }, { stiffness: 200, damping: 10, mass: 2 }]) {
      for (let frame = 0; frame <= 45; frame += 3) {
        const r = spring({ frame, fps: 30, config: { ...config, overshootClamping: false } });
        expect(springValue(config, frame / 30)).toBeCloseTo(r, 2);
      }
    }
  });
  it('first event wins where events overlap; scale 1 events are skipped', () => {
    const ev = (a: number, d: number, scale: number, x = 0.5) => ({ timeRange: range(a, d), scale, targetCoords: { x, y: 0.5 } });
    const r = buildCameraChains([ev(1, 2, 1.4, 0.2), ev(2, 2, 1.8), ev(5, 1, 1)], 'b', { width: 1080, height: 1920, fps: 30, durationSec: 6 });
    expect(r.out).toBe('cam3');
    const graph = r.chains.join(';');
    expect(graph).toContain("enable='between(t,1,3)+between(t,3,4)'");
    expect(graph).toContain('*0.4*min(1,');
    expect(graph).toContain('*-0.3'); // origin x 0.2 → offset -0.3
    expect(graph).not.toContain('between(t,5,6)');
    expect(buildCameraChains([], 'b', { width: 1, height: 1, fps: 30, durationSec: 1 })).toEqual({ chains: [], out: 'b' });
  });
});

describe('native plan parity features', () => {
  it('captions need the rasterised overlay list; with it the list is the last input', () => {
    const withCaptions = ir({ captionTrack: [caption('c1', 0, 1)] });
    const without: any = buildNativeRenderPlan(withCaptions, opts);
    expect(without.supported).toBe(false);
    expect(without.reasons).toContain('captions');
    const plan: any = buildNativeRenderPlan(withCaptions, { ...opts, captionOverlay: '/cache/render-overlays/o1/list.ffconcat' });
    expect(plan.supported).toBe(true);
    expect(plan.spec.overlaySequence).toBe('/cache/render-overlays/o1/list.ffconcat');
    expect(plan.spec.filterComplex).toContain(`[${plan.spec.inputs.length}:v]overlay=x=0:y=0:eof_action=repeat[capov]`);
    expect(() => validateRenderSpec(plan.spec)).not.toThrow();
    expect(() => validateRenderSpec({ ...plan.spec, overlaySequence: null })).toThrow();
    expect(() => validateRenderSpec({ ...plan.spec, overlaySequence: '/etc/passwd' })).toThrow();
  });
  it('camera zoom, rotation and crop render natively (graph passes the allowlist)', () => {
    const plan: any = buildNativeRenderPlan(
      ir(
        { cameraTrack: [{ id: 'z', timeRange: range(1, 1), targetType: 'FACE', targetCoords: { x: 0.5, y: 0.4 }, scale: 1.3 }] },
        [clip('c', '/m/a.mp4', [0, 6], { transform: { scale: { start: 1, end: 1.2 }, position: { x: 0, y: 0 }, rotationDeg: 15, opacity: 1, crop: { top: 10, bottom: 0, left: 5, right: 5 } } })]
      ),
      opts
    );
    expect(plan.supported).toBe(true);
    expect(() => validateRenderSpec(plan.spec)).not.toThrow();
    expect(plan.spec.filterComplex).toContain("crop=w='iw*0.9':h='ih*0.9':x='iw*0.05':y='ih*0.1'");
    expect(plan.spec.filterComplex).toContain("rotate=a=0.261799:c=none:ow='rotw(0.261799)'");
    expect(plan.spec.filterComplex).toContain('+overlay_h*0.055556');
    expect(plan.spec.filterComplex).toContain('[cam1]zoompan=');
  });
  it('keyframed motion is still reported (compatibility renderer / blocked export)', () => {
    const plan: any = buildNativeRenderPlan(
      ir({}, [clip('c', '/m/a.mp4', [0, 6], { transform: { scale: { start: 1, end: 1 }, position: { x: 0, y: 0 }, rotationDeg: 0, opacity: 1, keyframes: [{ id: 'k', timeOffsetSec: 1, property: 'posX', value: 50 }] } })]),
      opts
    );
    expect(plan.supported).toBe(false);
    expect(plan.reasons.join()).toMatch(/keyframe/);
  });
  it('crop percentages are clamped and a crop that removes everything is rejected', () => {
    expect(cropFractions({ top: 150, left: -3 })).toBeNull();
    expect(cropFractions({ top: 20, bottom: 30 })).toEqual({ top: 0.2, bottom: 0.3, left: 0, right: 0 });
    expect(cropFractions(undefined)).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
  });
});
