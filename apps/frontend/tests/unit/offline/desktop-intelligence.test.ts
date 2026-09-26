/**
 * @jest-environment jsdom
 *
 * Desktop media intelligence (P2), post-export QA (P3), job states (P5) and director locks/critique UI data:
 * pure parsers on real FFmpeg report text, the job registry, lock enforcement, and the real editor bridge with only
 * the desktop IPC layer and fetch mocked.
 */
jest.mock('@redux/store', () => ({ store: { getState: () => ({}) } }), { virtual: true });
jest.mock('../../../lib/native/desktop-media', () => {
  const actual = jest.requireActual('../../../lib/native/desktop-media');
  return {
    ...actual,
    hasNativeMedia: jest.fn(() => true),
    runNativeRender: jest.fn(),
    runMediaAnalysis: jest.fn(),
    fetchRemoteMediaWithProgress: jest.fn(),
    desktopMedia: {
      pickMediaFiles: jest.fn(), probeMedia: jest.fn(), pickExportPath: jest.fn(), startRender: jest.fn(), renderStatus: jest.fn(), cancelRender: jest.fn(),
      writeCaptionOverlays: jest.fn(), clearCaptionOverlays: jest.fn(async () => undefined),
      detectSilences: jest.fn(async () => [{ startMs: 1000, endMs: 2000 }]),
      extractAudioForTranscription: jest.fn(async () => new ArrayBuffer(8)),
    },
  };
});

import {
  analysisArgs, keepAnalysisLine, parseSceneCutsMs, parseLoudness, parseBlackRangesMs, parseFrozenRangesMs, parseFrozenFromDecimate,
  exportQaFromReports, qaIssues, qaExpectationsFor, clampSceneThreshold, missingFilter,
} from '../../../app/(platform)/(media-editor-app)/media-editor/services/media-analysis';
import { StudioJobRegistry, canTransition, runJob } from '../../../app/(platform)/(media-editor-app)/media-editor/services/studio-jobs';
import { buildDirectorConstraints, enforceLocksOnResult, lockedRangeProblems, normalizeRanges } from '../../../app/(platform)/(media-editor-app)/media-editor/services/director-locks';
import { engineBridge, parseDirectorCritique, parseDirectorViolations } from '../../../app/(platform)/(media-editor-app)/media-editor/services/tauri-bridge';
import { desktopMedia, runMediaAnalysis, runNativeRender, toAssetUrl, AnalysisCancelledError, RenderCancelledError } from '../../../lib/native/desktop-media';

// Report lines as analysis.rs keeps them (captured from the bundled FFmpeg 4.1 build).
const SCENES = [
  '  Duration: 00:00:05.02, start: 0.000000, bitrate: 87 kb/s',
  '[Parsed_showinfo_2 @ 0000015b519fecc0] n:   0 pts:  25600 pts_time:2       pos:    19558 fmt:rgb24 sar:1/1 s:160x120',
  '[Parsed_showinfo_2 @ 0000015b519fecc0] n:   1 pts:  25700 pts_time:2.1     pos:    19558 fmt:rgb24 sar:1/1 s:160x120',
  '[Parsed_showinfo_2 @ 0000015b519fecc0] n:   2 pts:  51200 pts_time:4       pos:    39002 fmt:rgb24 sar:1/1 s:160x120',
].join('\n');
const LOUD = [
  '[Parsed_ebur128_0 @ 1] Summary:', '  Integrated loudness:', '    I:         -21.8 LUFS', '    Threshold: -31.8 LUFS',
  '  True peak:', '    Peak:      -17.9 dBFS',
  '[Parsed_astats_1 @ 2] Channel: 1', '[Parsed_astats_1 @ 2] Peak level dB: -17.933015', '[Parsed_astats_1 @ 2] Peak count: 2',
  '[Parsed_astats_1 @ 2] Channel: 2', '[Parsed_astats_1 @ 2] Peak level dB: 0.000000', '[Parsed_astats_1 @ 2] Peak count: 480',
  '[Parsed_astats_1 @ 2] Overall', '[Parsed_astats_1 @ 2] Peak count: 482.000000', '[Parsed_astats_1 @ 2] Number of samples: 240000',
].join('\n');
const QA = [
  '  Duration: 00:00:05.02, start: 0.000000, bitrate: 87 kb/s',
  '[freezedetect @ 1] lavfi.freezedetect.freeze_start: 0', '[freezedetect @ 1] lavfi.freezedetect.freeze_end: 2',
  '[freezedetect @ 1] lavfi.freezedetect.freeze_start: 4',
  '[blackdetect @ 2] black_start:4 black_end:4.96 black_duration:0.96',
  LOUD,
].join('\n');

describe('media-analysis parsers', () => {
  it('builds the same fixed command lines as analysis.rs', () => {
    const a = analysisArgs('scenes', '/m/a.mp4', 0.456);
    expect(a.slice(0, 8)).toEqual(['-hide_banner', '-nostats', '-loglevel', 'info', '-progress', 'pipe:1', '-i', '/m/a.mp4']);
    expect(a).toContain("scale=160:-2,select='gt(scene,0.46)',showinfo");
    expect(a.slice(-3)).toEqual(['-f', 'null', '-']);
    expect(analysisArgs('qa', 'x').join(' ')).toMatch(/freezedetect/);
    expect(analysisArgs('qa_nofreeze', 'x').join(' ')).toMatch(/blackdetect=d=0.1:pix_th=0.10,mpdecimate,showinfo/);
    expect(clampSceneThreshold(5)).toBe(0.9);
    expect(clampSceneThreshold(NaN)).toBe(0.3);
    expect(keepAnalysisLine('[Parsed_ebur128_0 @ 0x1] t: 0.1  TARGET:-23 LUFS    M: -120.7')).toBe(false);
  });

  it('scene cuts merge near-duplicates', () => {
    expect(parseSceneCutsMs(SCENES)).toEqual([2000, 4000]);
  });

  it('loudness: integrated, true peak, per-channel clipping share, channel count; null without a summary', () => {
    expect(parseLoudness(LOUD)).toEqual({ integratedLufs: -21.8, truePeakDb: -17.9, clippingPct: 0.1, audioChannels: 2 });
    expect(parseLoudness('Stream #0:0: Video: h264')).toBeNull();
  });

  it('black and frozen ranges (open freeze closes at the duration; decimate gaps)', () => {
    expect(parseBlackRangesMs(QA)).toEqual([[4000, 4960]]);
    expect(parseFrozenRangesMs(QA, 5020)).toEqual([[0, 2000], [4000, 5020]]);
    expect(parseFrozenFromDecimate(SCENES.replace(/pts_time:2.1/, 'pts_time:2.2'), 5000)).toEqual([[2200, 4000], [4000, 5000]]);
    expect(missingFilter("No such filter: 'freezedetect'", 'freezedetect')).toBe(true);
  });

  it('lastExportQa from ffprobe + report, and issues only for what was measured and not intended', () => {
    const probe = { format: { duration: '5.02' }, streams: [{ codec_type: 'video', width: 720, height: 1280, avg_frame_rate: '30/1' }, { codec_type: 'audio', channels: 2 }] };
    const qa = exportQaFromReports(probe, QA);
    expect(qa).toEqual({ durationMs: 5020, width: 720, height: 1280, fps: 30, hasAudio: true, audioChannels: 2, blackRangesMs: [[4000, 4960]], frozenRangesMs: [[0, 2000], [4000, 5020]], integratedLufs: -21.8, clippingPct: 0.1 });
    const ids = qaIssues(qa, { durationMs: 5000, width: 720, height: 1280, hasAudio: true }).map((i) => i.id);
    expect(ids).toEqual(['black-0', 'frozen-0', 'clipping']); // frozen tail = the black range, not reported twice
    expect(qaIssues(qa, { intendedBlackRangesMs: [[3900, 5100]], intendedStillRangesMs: [[0, 2000]] }).map((i) => i.id)).toEqual(['clipping']);
    const silent = exportQaFromReports({ format: { duration: '4' }, streams: [{ codec_type: 'video', width: 10, height: 10 }] }, '');
    expect(silent.hasAudio).toBe(false);
    expect(silent.integratedLufs).toBeUndefined();
    expect(qaIssues(silent, { hasAudio: true }).map((i) => i.id)).toEqual(['no-audio']);
  });

  it('expectations: gaps render black, photos are stills, dip/fade_black are intended', () => {
    const T = (s: number) => ({ value: s * 1000, timescale: 1000 });
    const ir: any = {
      meta: { totalDuration: T(10) },
      tracks: {
        videoTracks: [
          { id: 'm', type: 'MAIN_VIDEO', clips: [{ timelineRange: { start: T(0), duration: T(4) }, transitionOut: { type: 'DIP_BLACK', duration: T(0.5) } }, { timelineRange: { start: T(5), duration: T(4) } }] },
          { id: 'b', type: 'B_ROLL_OVERLAY', clips: [{ mediaType: 'image', timelineRange: { start: T(6), duration: T(2) } }] },
        ],
        effectTrack: [{ type: 'fade_black', timeRange: { start: T(8), duration: T(1) } }],
        captionTrack: [], audioTracks: [], cameraTrack: [],
      },
    };
    const e = qaExpectationsFor(ir, { width: 1, height: 1, durationSec: 10, hasAudio: false });
    expect(e.intendedBlackRangesMs).toEqual(expect.arrayContaining([[4000, 5000], [9000, 10000], [3500, 4500], [8000, 9000]]));
    expect(e.intendedStillRangesMs).toEqual([[6000, 8000]]);
  });
});

describe('studio jobs', () => {
  const mem = () => {
    const store: Record<string, string> = {};
    return { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => void (store[k] = v), store };
  };

  it('allows forward/back moves between work states, never out of a terminal state', () => {
    expect(canTransition('QUEUED', 'ANALYZING')).toBe(true);
    expect(canTransition('REPAIRING', 'PLANNING')).toBe(true);
    expect(canTransition('COMPLETED', 'RENDERING')).toBe(false);
    expect(canTransition('RENDERING', 'QUEUED')).toBe(false);
  });

  it('cancel aborts the work and marks the job CANCELLED; later moves are ignored', () => {
    const r = new StudioJobRegistry(null);
    const { job, signal } = r.create('export', 'Export');
    r.transition(job.id, 'RENDERING');
    expect(r.cancel(job.id)).toBe(true);
    expect(signal.aborted).toBe(true);
    expect(r.get(job.id)!.state).toBe('CANCELLED');
    expect(r.transition(job.id, 'COMPLETED')).toBe(false);
  });

  it('runJob: COMPLETED on success, FAILED with the error, CANCELLED on abort', async () => {
    const r = new StudioJobRegistry(null);
    await runJob(r, 'analysis', 'ok', async ({ to }) => to('ANALYZING'));
    await expect(runJob(r, 'analysis', 'bad', async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    const p = runJob(r, 'director', 'slow', ({ signal }) => new Promise((_, rej) => signal.addEventListener('abort', () => rej(new AnalysisCancelledError()))));
    r.cancel(r.list().find((j) => j.label === 'slow')!.id);
    await expect(p).rejects.toBeInstanceOf(AnalysisCancelledError);
    expect(Object.fromEntries(r.list().map((j) => [j.label, j.state]))).toEqual({ ok: 'COMPLETED', bad: 'FAILED', slow: 'CANCELLED' });
  });

  it('restores an interrupted export once, as FAILED with its resume input', () => {
    const storage = mem();
    const a = new StudioJobRegistry(storage);
    const { job } = a.create('export', 'Export 1080p', { settings: { resolution: '1080p' } });
    a.transition(job.id, 'RENDERING');
    const b = new StudioJobRegistry(storage); // "app restart"
    const interrupted = b.restore();
    expect(interrupted).toHaveLength(1);
    expect(interrupted[0]).toMatchObject({ state: 'FAILED', interrupted: true, resume: { settings: { resolution: '1080p' } } });
    expect(b.restore()).toEqual([]); // a Studio remount in the same session does not re-restore
  });
});

describe('director locks', () => {
  const T = (s: number) => ({ value: Math.round(s * 1000), timescale: 1000 });
  const c = (id: string, src: number, tl: number, dur: number, speed = 1) => ({ id, assetId: 'a', sourcePath: 'a', sourceRange: { start: T(src), duration: T(dur * speed) }, timelineRange: { start: T(tl), duration: T(dur) }, speedMultiplier: speed });
  const ir = (clips: any[], extra: any = {}): any => ({
    meta: { totalDuration: T(10) },
    tracks: { videoTracks: [{ id: 'm', type: 'MAIN_VIDEO', clips }, { id: 'b', type: 'B_ROLL_OVERLAY', clips: [] }], captionTrack: [], effectTrack: [], cameraTrack: [], audioTracks: [{ id: 'bgm', type: 'BGM', clips: [] }], ...extra },
  });

  it('timeline lock keys → server constraints (main-track lock = whole duration; camera stays client-side)', () => {
    const base = ir([c('c1', 0, 0, 10)]);
    expect(buildDirectorConstraints(base, {}, [])).toBeUndefined();
    expect(buildDirectorConstraints(base, { t1: true, fx: true, a_bgm: true, v_b: true, c1: true }, [[5000, 6000], [5500, 7000]])).toEqual({
      lockedRanges: [[5000, 7000]], lockedTracks: expect.arrayContaining(['captions', 'text', 'effects', 'music', 'broll']),
    });
    expect(buildDirectorConstraints(base, { v_m: true }, [])).toEqual({ lockedRanges: [[0, 10000]] });
    expect(normalizeRanges([[3, 1], [0, 0], [9000, 20000]], 10000)).toEqual([[1, 3], [9000, 10000]]);
  });

  it('a locked range survives cuts elsewhere, but not a cut or speed change inside it', () => {
    const before = ir([c('c1', 0, 0, 10)]);
    const cutAfter = ir([c('c1', 0, 0, 4), c('c2', 6, 4, 4)]);
    expect(lockedRangeProblems(before, cutAfter, [[1000, 3000]])).toEqual([]);
    const cutBefore = ir([c('c2', 1, 0, 9)]); // moved earlier: still preserved
    expect(lockedRangeProblems(before, cutBefore, [[1000, 3000]])).toEqual([]);
    expect(lockedRangeProblems(before, ir([c('c1', 0, 0, 2), c('c2', 2.5, 2, 7.5)]), [[1000, 3000]])[0]).toMatch(/0.50 s of the locked range 1.0–3.0 s was cut/);
    expect(lockedRangeProblems(before, ir([c('c1', 0, 0, 5, 2)]), [[1000, 3000]])[0]).toMatch(/speed/);
  });

  it('restores locked tracks the AI changed and blocks results that break a locked range', () => {
    const before = ir([c('c1', 0, 0, 10)], { captionTrack: [{ id: 'k', text: 'hi', timeRange: { start: T(0), duration: T(1) } }] });
    const after = ir([c('c1', 0, 0, 10)], { captionTrack: [], effectTrack: [{ id: 'fx' }] });
    const r = enforceLocksOnResult(before, after, { tracks: ['captions', 'camera'], rangesMs: [] });
    expect(r.blocked).toBe(false);
    expect(r.restoredTracks).toEqual(['captions']);
    expect(r.editIR.tracks.captionTrack).toEqual(before.tracks.captionTrack);
    expect(r.editIR.tracks.effectTrack).toEqual([{ id: 'fx' }]); // not locked: kept
    const cut = enforceLocksOnResult(before, ir([c('c1', 2, 0, 8)]), { tracks: [], rangesMs: [[0, 3000]] });
    expect(cut.blocked).toBe(true);
    expect(cut.rangeProblems).toHaveLength(1);
  });
});

describe('editor bridge: director request/response and export QA', () => {
  const T = (s: number) => ({ value: Math.round(s * 48000), timescale: 48000 });
  const P = 'C:\\media\\a.mp4';
  const URL_A = toAssetUrl(P, 'Windows NT');
  const clip = { id: 'c1', assetId: 'a', sourcePath: URL_A, sourceRange: { start: T(0), duration: T(4) }, timelineRange: { start: T(0), duration: T(4) }, transform: { scale: { start: 1, end: 1 }, position: { x: 0, y: 0 }, rotationDeg: 0, opacity: 1 }, speedMultiplier: 1, volumeDb: 0, effects: [] };
  const ir: any = {
    version: '1.0.0',
    meta: { projectId: 'p', title: 'Reel', targetAspect: '16:9', resolution: { width: 1920, height: 1080 }, fps: { numerator: 30, denominator: 1 }, totalDuration: T(4) },
    directorStyle: {},
    tracks: { videoTracks: [{ id: 'm', type: 'MAIN_VIDEO', zIndex: 0, clips: [clip] }], cameraTrack: [], captionTrack: [], audioTracks: [] },
  };
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).__180_NATIVE__ = {};
    (engineBridge as any).nativeHasAudio.clear();
    (engineBridge as any).speechCache.clear();
    (engineBridge as any).mediaCache.clear();
    (runMediaAnalysis as jest.Mock).mockImplementation(async (_p: string, kind: string) => (kind === 'scenes' ? SCENES : kind === 'loudness' ? LOUD : QA));
    fetchMock = jest.fn(async (url: string) => {
      if (String(url).includes('/transcribe')) return { ok: true, json: async () => ({ success: true, data: { words: [{ text: 'hi', startMs: 0, endMs: 300 }] } }) };
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: {
            ast: ir, reply: 'Done', plannerSource: 'llm', autoApplied: true, runId: 'run_1',
            critique: { score: 82, repairRounds: 1, issues: [{ id: 'dead-air', severity: 'WARNING', title: 'Dead air left at 2.0s', timeRangeMs: [2000, 2600] }, { bogus: true }] },
            violations: ['removeRange would cut the locked range 0.0–1.0s', { message: 'addBackgroundMusic would change the locked music' }],
          },
        }),
      };
    });
    (global as any).fetch = fetchMock;
  });

  it('sends scenes/loudness inside telemetry, constraints and lastExportQa at the top level; parses critique/violations/autoApplied', async () => {
    const stages: string[] = [];
    const lastExportQa = { durationMs: 4000, width: 1920, height: 1080, hasAudio: true, blackRangesMs: [], frozenRangesMs: [] };
    const res = await engineBridge.executeAutonomousPipeline('in.mp4', 'CUSTOM', 'tighten it', undefined, ir, {
      constraints: { lockedRanges: [[0, 1000]], lockedTracks: ['music'] },
      lastExportQa,
      onStage: (s) => stages.push(s),
    });
    const body = JSON.parse(fetchMock.mock.calls.find((c) => String(c[0]).includes('/ai-direct'))[1].body);
    expect(body.media).toBeUndefined(); // a top-level `media` would switch the server to the mobile director
    expect(body.telemetry.scenesMs).toEqual([2000, 4000]);
    expect(body.telemetry.loudness).toEqual({ integratedLufs: -21.8, truePeakDb: -17.9, clippingPct: 0.1 });
    expect(body.telemetry.transcript[0].word).toBe('hi');
    expect(body.constraints).toEqual({ lockedRanges: [[0, 1000]], lockedTracks: ['music'] });
    expect(body.lastExportQa).toEqual(lastExportQa);
    expect(stages).toEqual(['ANALYZING', 'PLANNING']);
    expect(res.autoApplied).toBe(true);
    expect(res.runId).toBe('run_1');
    expect(res.critique).toEqual({ score: 82, repairRounds: 1, issues: [{ id: 'dead-air', severity: 'WARNING', title: 'Dead air left at 2.0s', timeRangeMs: [2000, 2600] }] });
    expect(res.violations).toEqual(['removeRange would cut the locked range 0.0–1.0s', 'addBackgroundMusic would change the locked music']);
    // analysed once per source per session
    await engineBridge.executeAutonomousPipeline('in.mp4', 'CUSTOM', 'again', undefined, ir, {});
    expect((runMediaAnalysis as jest.Mock).mock.calls.filter((c) => c[1] === 'scenes')).toHaveLength(1);
  });

  it('a failed measurement is a warning and is left out (never filled in)', async () => {
    (runMediaAnalysis as jest.Mock).mockImplementation(async (_p: string, kind: string) => {
      if (kind === 'loudness') throw new Error('ffmpeg exited with code 1');
      return SCENES;
    });
    const res = await engineBridge.executeAutonomousPipeline('in.mp4', 'CUSTOM', 'x', undefined, ir, {});
    const body = JSON.parse(fetchMock.mock.calls.find((c) => String(c[0]).includes('/ai-direct'))[1].body);
    expect(body.telemetry.loudness).toBeUndefined();
    expect(res.warnings.join(' ')).toMatch(/Loudness measurement failed/);
  });

  it('cancelling during analysis stops before the request is sent', async () => {
    const ctrl = new AbortController();
    (runMediaAnalysis as jest.Mock).mockImplementation(async () => {
      ctrl.abort();
      throw new AnalysisCancelledError();
    });
    await expect(engineBridge.executeAutonomousPipeline('in.mp4', 'CUSTOM', 'x', undefined, ir, { signal: ctrl.signal })).rejects.toBeInstanceOf(AnalysisCancelledError);
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/ai-direct'))).toBe(false);
  });

  it('parsers drop malformed critique and violations', () => {
    expect(parseDirectorCritique({ score: 'high' })).toBeUndefined();
    expect(parseDirectorCritique({ score: 50, issues: [{ title: 't', timeRangeMs: [3, 1] }] })).toEqual({ score: 50, repairRounds: 0, issues: [{ id: 'issue-0', severity: 'info', title: 't' }] });
    expect(parseDirectorViolations([])).toBeUndefined();
    expect(parseDirectorViolations([1, null])).toBeUndefined();
  });

  it('native export runs post-export QA on the written file and returns the issues', async () => {
    (desktopMedia.probeMedia as jest.Mock).mockResolvedValue({ format: { duration: '4', size: '1000' }, streams: [{ codec_type: 'video', width: 1920, height: 1080, avg_frame_rate: '30/1' }, { codec_type: 'audio', channels: 2 }] });
    (desktopMedia.pickExportPath as jest.Mock).mockResolvedValue('C:\\out\\Reel.mp4');
    (runNativeRender as jest.Mock).mockResolvedValue('C:\\out\\Reel.mp4');
    const stages: string[] = [];
    const res = await engineBridge.renderExport(ir, { format: 'mp4', resolution: '1080p', fps: 30 }, () => {}, { onStage: (s) => stages.push(s) });
    expect(stages).toEqual(['RENDERING', 'CRITIQUING']);
    expect((runMediaAnalysis as jest.Mock).mock.calls[0].slice(0, 2)).toEqual(['C:\\out\\Reel.mp4', 'qa']);
    expect(res.qa!.report.blackRangesMs).toEqual([[4000, 4960]]);
    expect(res.qa!.issues.map((i) => i.id)).toEqual(expect.arrayContaining(['black-0', 'clipping']));
  });

  it('falls back to the mpdecimate QA pass when this FFmpeg has no freezedetect', async () => {
    (desktopMedia.probeMedia as jest.Mock).mockResolvedValue({ format: { duration: '4' }, streams: [{ codec_type: 'video', width: 1920, height: 1080 }, { codec_type: 'audio', channels: 2 }] });
    (desktopMedia.pickExportPath as jest.Mock).mockResolvedValue('C:\\out\\Reel.mp4');
    (runNativeRender as jest.Mock).mockResolvedValue('C:\\out\\Reel.mp4');
    (runMediaAnalysis as jest.Mock).mockImplementation(async (_p: string, kind: string) => {
      if (kind === 'qa') throw new Error("[AVFilterGraph @ 1] No such filter: 'freezedetect'");
      return SCENES; // mpdecimate + showinfo report
    });
    const res = await engineBridge.renderExport(ir, { format: 'mp4', resolution: '1080p', fps: 30 }, () => {}, {});
    expect((runMediaAnalysis as jest.Mock).mock.calls.map((c) => c[1])).toEqual(['qa', 'qa_nofreeze']);
    expect(res.qa!.report.frozenRangesMs).toEqual([[2100, 4000]]); // measured from the frames mpdecimate kept
  });

  it('a cancelled QA cancels the export; a failed QA only warns', async () => {
    (desktopMedia.probeMedia as jest.Mock).mockResolvedValue({ format: { duration: '4' }, streams: [{ codec_type: 'video', width: 1920, height: 1080 }] });
    (desktopMedia.pickExportPath as jest.Mock).mockResolvedValue('C:\\out\\Reel.mp4');
    (runNativeRender as jest.Mock).mockResolvedValue('C:\\out\\Reel.mp4');
    (runMediaAnalysis as jest.Mock).mockRejectedValue(new AnalysisCancelledError());
    await expect(engineBridge.renderExport(ir, { format: 'mp4', resolution: '1080p', fps: 30 }, () => {}, {})).rejects.toBeInstanceOf(RenderCancelledError);
    (runMediaAnalysis as jest.Mock).mockRejectedValue(new Error('disk full'));
    const notices: string[] = [];
    const res = await engineBridge.renderExport(ir, { format: 'mp4', resolution: '1080p', fps: 30 }, () => {}, { onNotice: (m) => notices.push(m) });
    expect(res.qa).toBeUndefined();
    expect(notices.join(' ')).toMatch(/quality check could not run: disk full/);
  });
});
