import {
  EFFECT_CATALOG,
  TEXT_TEMPLATES,
  TRANSITION_OPTIONS,
  addEffect,
  addTitleFromTemplate,
  effectVisualsAt,
  newTimelineItemIds,
  removeOverlayItem,
  retimeOverlayItem,
  setEffectIntensity,
} from '../../../app/(platform)/(media-editor-app)/media-editor/services/editor-library';
import { buildEffectChains, buildNativeRenderPlan, planTransitions } from '../../../app/(platform)/(media-editor-app)/media-editor/services/native-render-plan';
import { validateFilterGraph, validateRenderSpec } from '../../../app/(platform)/(media-editor-app)/media-editor/services/native-render-validate';
import { TRANSITION_TYPES, VIDEO_EFFECT_TYPES } from '@workspace/video-contracts';

const T = (s: number) => ({ value: Math.round(s * 48000), timescale: 48000 });
const sec = (t: { value: number; timescale: number }) => t.value / t.timescale;
const range = (a: number, d: number) => ({ start: T(a), duration: T(d) });
const clip = (id: string, path: string, tl: [number, number], over: any = {}) => ({
  id, assetId: id, sourcePath: path, sourceRange: range(0, tl[1]), timelineRange: range(...tl),
  transform: { scale: { start: 1, end: 1 }, position: { x: 0, y: 0 }, rotationDeg: 0, opacity: 1 },
  speedMultiplier: 1, volumeDb: 0, effects: [], ...over,
});
const ir = (extra: any = {}, clips: any[] = [clip('c', '/m/a.mp4', [0, 4])]): any => ({
  version: '1.0.0',
  meta: { projectId: 'p', title: 't', targetAspect: '16:9', totalDuration: T(4) },
  directorStyle: {},
  tracks: { videoTracks: [{ id: 'm', type: 'MAIN_VIDEO', zIndex: 0, clips }], cameraTrack: [], captionTrack: [], audioTracks: [], ...extra },
});
const opts = { resolveNativePath: (p: string) => p, sourceHasAudio: () => false, settings: { resolution: '1080p', fps: 30 } };

describe('text templates', () => {
  it('share the 8 mobile ids and preset labels', () => {
    expect(TEXT_TEMPLATES.map((t) => t.id)).toEqual(['bold_title', 'lower_third', 'subscribe_cta', 'quote', 'big_number', 'minimal', 'boxed_label', 'highlight']);
    expect(TEXT_TEMPLATES.map((t) => t.build({}).presetLabel)).toEqual(['TPL_BOLD_TITLE', 'TPL_LOWER_THIRD', 'TPL_CTA', 'TPL_QUOTE', 'TPL_BIG_NUMBER', 'TPL_MINIMAL', 'TPL_BOXED', 'TPL_HIGHLIGHT']);
  });
  it('carry the mobile style values and apply only the brand values given', () => {
    const lower = TEXT_TEMPLATES[1].build({});
    expect(lower).toMatchObject({ fontSize: 44, fontWeight: 700, strokeWidth: 0, shadow: false, pillBackground: '#111111E6', pillPadding: 18, pillRadius: 10, position: { x: 0.5, y: 0.8 } });
    const cta = TEXT_TEMPLATES[2].build({ font: 'Poppins', accentColor: '#FF0055' });
    expect(cta).toMatchObject({ fontFamily: 'Poppins', pillBackground: '#FF0055', textColor: '#111111' });
    expect(TEXT_TEMPLATES[7].build({}).textColor).toBe('#FFFFFF');
    expect(TEXT_TEMPLATES[0].build({}).fontFamily).toBe('Inter');
  });
  it('add a title segment at the playhead and extend the timeline', () => {
    const { editIR, segment } = addTitleFromTemplate(ir(), 'big_number', '', 3.5);
    expect(segment.role).toBe('title');
    expect(segment.text).toBe('3X');
    expect(segment.words).toEqual([]);
    expect(sec(segment.timeRange.start)).toBeCloseTo(3.5);
    expect(sec(editIR.meta.totalDuration)).toBeCloseTo(5.5);
    expect(() => addTitleFromTemplate(ir(), 'nope', 'x', 0)).toThrow();
  });
});

describe('effects', () => {
  it('catalog covers every contract effect with the default durations', () => {
    expect(EFFECT_CATALOG.map((e) => e.type)).toEqual([...VIDEO_EFFECT_TYPES]);
    expect(Object.fromEntries(EFFECT_CATALOG.map((e) => [e.type, e.defaultSeconds]))).toEqual({ flash: 0.3, fade_black: 0.6, shake: 0.5, zoom_pulse: 0.5, black_white: 2, vignette: 3 });
  });
  it('add / retime / set intensity / remove on effectTrack', () => {
    const { editIR, effect } = addEffect(ir(), 'vignette', 1, 0.4);
    expect(editIR.tracks.effectTrack).toHaveLength(1);
    expect(sec(effect.timeRange.duration)).toBeCloseTo(3);
    const moved = retimeOverlayItem(editIR, effect.id, 2, 1);
    expect(sec(moved.tracks.effectTrack![0].timeRange.start)).toBeCloseTo(2);
    expect(setEffectIntensity(moved, effect.id, 3).tracks.effectTrack![0].intensity).toBe(1);
    expect(removeOverlayItem(moved, effect.id).tracks.effectTrack).toEqual([]);
    const other = ir();
    expect(removeOverlayItem(other, 'missing')).toBe(other);
  });
  it('per-frame visuals only inside the range', () => {
    const fx = [
      { id: 'a', type: 'flash', timeRange: range(1, 0.4), intensity: 1 },
      { id: 'b', type: 'black_white', timeRange: range(2, 1), intensity: 0.5 },
      { id: 'c', type: 'zoom_pulse', timeRange: range(3, 1), intensity: 1 },
    ] as any;
    expect(effectVisualsAt(fx, 0.5)).toEqual({ zoom: 1, shakeX: 0, shakeY: 0, grayscale: 0, vignette: 0, white: 0, black: 0 });
    expect(effectVisualsAt(fx, 1.1).white).toBeCloseTo(1);
    expect(effectVisualsAt(fx, 2.5).grayscale).toBe(0.5);
    expect(effectVisualsAt(fx, 3.5).zoom).toBeCloseTo(1.25);
  });
  it('lists what the director added', () => {
    const before = ir();
    const after = addEffect(addTitleFromTemplate(before, 'quote', 'hi', 0).editIR, 'shake', 1).editIR;
    expect(newTimelineItemIds(before, after)).toHaveLength(2);
  });
});

describe('native plan: photos, effects, transitions', () => {
  it('every effect type yields a graph the native validator accepts', () => {
    const effectTrack = VIDEO_EFFECT_TYPES.map((type, i) => ({ id: String(i), type, timeRange: range(i * 0.5, 0.5), intensity: 0.7 }));
    const plan: any = buildNativeRenderPlan(ir({ effectTrack }), opts);
    expect(plan.supported).toBe(true);
    expect(() => validateRenderSpec(plan.spec)).not.toThrow();
    for (const f of ['zoompan=', 'crop=', 'hue=s=', 'vignette=angle=', 'fade=t=in', 'split=2']) expect(plan.spec.filterComplex).toContain(f);
  });
  it('effects outside the timeline or with zero intensity are dropped; no effects = no chains', () => {
    const r = buildEffectChains([{ id: 'x', type: 'flash', timeRange: range(10, 1), intensity: 1 }, { id: 'y', type: 'vignette', timeRange: range(0, 1), intensity: 0 }] as any, 'b', { width: 1920, height: 1080, fps: 30, durationSec: 4 });
    expect(r).toEqual({ chains: [], out: 'b' });
  });
  it('a mediaType:image clip is looped and covers the canvas', () => {
    const plan: any = buildNativeRenderPlan(ir({}, [clip('c', '/m/a.mp4', [0, 4]), ]), opts);
    const withPhoto: any = buildNativeRenderPlan(
      { ...ir(), tracks: { ...ir().tracks, videoTracks: [...ir().tracks.videoTracks, { id: 'b', type: 'B_ROLL_OVERLAY', zIndex: 10, clips: [clip('p', '/m/photo-without-extension', [1, 3], { mediaType: 'image' })] }] } },
      opts
    );
    expect(plan.supported && withPhoto.supported).toBe(true);
    expect(withPhoto.spec.filterComplex).toContain('[1:v]loop=loop=-1:size=1:start=0,trim=start=0:duration=3');
    expect(withPhoto.spec.filterComplex).toContain('scale=w=1920:h=1080:force_original_aspect_ratio=increase,crop=w=1920:h=1080');
  });
  it('every transition type renders natively (no longer a fallback reason) and passes the validator', () => {
    for (const type of TRANSITION_TYPES) {
      const clips = [clip('a', '/m/a.mp4', [0, 2]), clip('b', '/m/b.mp4', [2, 2], { transitionIn: { type, duration: T(0.6) } })];
      const plan: any = buildNativeRenderPlan(ir({}, clips), opts);
      expect(plan.supported).toBe(true);
      expect(() => validateFilterGraph(plan.spec.filterComplex, plan.spec.inputs.length)).not.toThrow();
    }
  });
  it('the incoming side draws over a freeze of the outgoing clip; out-only transitions fade at the end', () => {
    const tr = planTransitions(
      [
        { trackIdx: 0, tlStart: 0, tlDur: 2, trIn: null, trOut: { type: 'CROSSFADE', durationSec: 0.5 } },
        { trackIdx: 0, tlStart: 2, tlDur: 2, trIn: null, trOut: { type: 'DIP_WHITE', durationSec: 0.4 } },
      ],
      { width: 1920, height: 1080 }
    );
    expect(tr.perClip[0].freezeSec).toBeCloseTo(0.5);
    expect(tr.perClip[1].filters[0]).toBe('fade=t=in:st=2:d=0.5:alpha=1');
    expect(tr.perClip[1].filters[1]).toBe('fade=t=out:st=3.6:d=0.4:color=white');
  });
  it('pickers offer every contract transition', () => {
    expect(TRANSITION_OPTIONS.map((t) => t.id).sort()).toEqual([...TRANSITION_TYPES].sort());
  });
});
