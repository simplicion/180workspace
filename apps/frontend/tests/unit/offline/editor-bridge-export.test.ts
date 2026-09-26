/**
 * @jest-environment jsdom
 *
 * Drives the REAL editor bridge (services/tauri-bridge.ts) with only the desktop IPC layer mocked, to prove the export
 * orchestration: native first, an honest fallback (with the reason shown to the user), real failures propagate, and
 * cancellation is a cancellation.
 */
jest.mock('@redux/store', () => ({ store: { getState: () => ({}) } }), { virtual: true });
jest.mock('../../../lib/native/desktop-media', () => {
  const actual = jest.requireActual('../../../lib/native/desktop-media');
  return {
    ...actual,
    hasNativeMedia: jest.fn(() => true),
    runNativeRender: jest.fn(),
    fetchRemoteMediaWithProgress: jest.fn(async () => 'C:\cache\remote-media\stock.mp4'),
    desktopMedia: {
      pickMediaFiles: jest.fn(), probeMedia: jest.fn(), pickExportPath: jest.fn(), startRender: jest.fn(), renderStatus: jest.fn(), cancelRender: jest.fn(),
      writeCaptionOverlays: jest.fn(async () => 'C:\cache\render-overlays\o1\list.ffconcat'), clearCaptionOverlays: jest.fn(async () => undefined),
    },
  };
});
// jsdom has no 2D canvas: the PNG rasteriser is replaced, the state timeline and plan are real.
jest.mock('../../../app/(platform)/(media-editor-app)/media-editor/services/caption-raster', () => {
  const actual = jest.requireActual('../../../app/(platform)/(media-editor-app)/media-editor/services/caption-raster');
  return { ...actual, rasterizeCaptionStates: jest.fn(async () => ({ images: ['iVBORw0KGgo='], sequence: [{ image: 0, durationSec: 4 }], missingFonts: [] })) };
});

import { engineBridge, ExportBlockedError } from '../../../app/(platform)/(media-editor-app)/media-editor/services/tauri-bridge';
import { desktopMedia, fetchRemoteMediaWithProgress, runNativeRender, RenderCancelledError, toAssetUrl } from '../../../lib/native/desktop-media';
import { rasterizeCaptionStates } from '../../../app/(platform)/(media-editor-app)/media-editor/services/caption-raster';

const T = (s: number) => ({ value: Math.round(s * 48000), timescale: 48000 });
const range = (a: number, d: number) => ({ start: T(a), duration: T(d) });
const P = 'C:\\media\\a.mp4';
const URL_A = toAssetUrl(P, 'Windows NT');
const clip = (over: any = {}) => ({
  id: 'c1', assetId: 'a', sourcePath: URL_A, sourceRange: range(0, 4), timelineRange: range(0, 4),
  transform: { scale: { start: 1, end: 1 }, position: { x: 0, y: 0 }, rotationDeg: 0, opacity: 1 },
  speedMultiplier: 1, volumeDb: 0, effects: [], ...over,
});
const ir = (extra: any = {}): any => ({
  version: '1.0.0',
  meta: { projectId: 'p', title: 'My Reel: final?', targetAspect: '16:9', resolution: { width: 1920, height: 1080 }, fps: { numerator: 30, denominator: 1 }, totalDuration: T(4) },
  directorStyle: {},
  tracks: { videoTracks: [{ id: 'm', type: 'MAIN_VIDEO', zIndex: 0, clips: [clip()] }], cameraTrack: [], captionTrack: [], audioTracks: [], ...extra },
});
const settings = { format: 'mp4', resolution: '1080p', fps: 30 };
const probeWithAudio = { format: { duration: '4', size: '1000' }, streams: [{ codec_type: 'video', width: 1280, height: 720, r_frame_rate: '25/1' }, { codec_type: 'audio', codec_name: 'aac' }] };

const canvasSpy = () => jest.spyOn(engineBridge as any, 'renderExportCanvas').mockResolvedValue({ blobUrl: 'blob:x', downloadName: 'x.webm', sizeBytes: 1 });

beforeEach(() => {
  jest.clearAllMocks();
  (engineBridge as any).nativeHasAudio.clear(); // the bridge is a singleton: start every test with no cached probe results
  (desktopMedia.probeMedia as jest.Mock).mockResolvedValue(probeWithAudio);
  (desktopMedia.pickExportPath as jest.Mock).mockResolvedValue('C:\\out\\My_Reel_final.mp4');
  (runNativeRender as jest.Mock).mockResolvedValue('C:\\out\\My_Reel_final.mp4');
  (window as any).__180_NATIVE__ = {};
});

it('renders natively when the timeline is supported: validated spec, native save dialog, no canvas, saved path returned', async () => {
  const canvas = canvasSpy();
  const notices: string[] = [];
  const progress = jest.fn();
  const result = await engineBridge.renderExport(ir(), settings, progress, { onNotice: (m) => notices.push(m) });

  expect(canvas).not.toHaveBeenCalled();
  expect(desktopMedia.pickExportPath).toHaveBeenCalledWith('My_Reel_final.mp4'); // title sanitised into a bare file name
  const [spec, out] = (runNativeRender as jest.Mock).mock.calls[0];
  expect(out).toBe('C:\\out\\My_Reel_final.mp4');
  expect(spec.inputs).toEqual([P]); // the asset URL was resolved back to the real path
  expect(spec.hasAudio).toBe(true); // from the real probe, not assumed
  expect(spec.maps).toEqual(['[vout]', '[aout]']);
  expect(result).toMatchObject({ savedPath: 'C:\\out\\My_Reel_final.mp4', downloadName: 'My_Reel_final.mp4' });
  expect(notices).toEqual([]);
});

it('a silent source produces a video-only render (never references a missing audio stream)', async () => {
  (desktopMedia.probeMedia as jest.Mock).mockResolvedValue({ format: { duration: '4' }, streams: [{ codec_type: 'video', width: 640, height: 360 }] });
  await engineBridge.renderExport(ir(), settings, jest.fn());
  const [spec] = (runNativeRender as jest.Mock).mock.calls[0];
  expect(spec.hasAudio).toBe(false);
  expect(spec.maps).toEqual(['[vout]']);
});

it('captions and titles render natively: rasterised states become the overlay input, cleaned up afterwards', async () => {
  const canvas = canvasSpy();
  const captions = [{ id: 'cap', timeRange: range(0, 1), text: 'hi', words: [], style: {} }];
  await engineBridge.renderExport(ir({ captionTrack: captions }), settings, jest.fn());
  expect(canvas).not.toHaveBeenCalled();
  expect(rasterizeCaptionStates).toHaveBeenCalledWith(expect.anything(), 1920, 1080, 4);
  expect(desktopMedia.writeCaptionOverlays).toHaveBeenCalledWith(['iVBORw0KGgo='], [{ image: 0, durationSec: 4 }]);
  const spec = (runNativeRender as jest.Mock).mock.calls[0][0];
  expect(spec.overlaySequence).toBe('C:\cache\render-overlays\o1\list.ffconcat');
  expect(spec.filterComplex).toContain('[1:v]overlay=x=0:y=0:eof_action=repeat');
  expect(spec.hasAudio).toBe(true);
  expect(desktopMedia.clearCaptionOverlays).toHaveBeenCalledWith('C:\cache\render-overlays\o1\list.ffconcat');
});

it('remote stock media is downloaded into the cache and rendered from the local copy', async () => {
  const stockIr = ir();
  stockIr.tracks.videoTracks[0].clips[0].sourcePath = 'https://videos.pexels.com/video-files/1/clip.mp4';
  await engineBridge.renderExport(stockIr, settings, jest.fn());
  expect(fetchRemoteMediaWithProgress).toHaveBeenCalledWith('https://videos.pexels.com/video-files/1/clip.mp4');
  expect((runNativeRender as jest.Mock).mock.calls[0][0].inputs).toEqual(['C:\cache\remote-media\stock.mp4']);
});

it('a failed download is an error with a way forward, not a silent downgrade', async () => {
  const canvas = canvasSpy();
  (fetchRemoteMediaWithProgress as jest.Mock).mockRejectedValueOnce(new Error('evil.example is not an allowed media source.'));
  const stockIr = ir();
  stockIr.tracks.videoTracks[0].clips[0].sourcePath = 'https://evil.example/clip.mp4';
  await expect(engineBridge.renderExport(stockIr, settings, jest.fn())).rejects.toThrow(/Could not download clip\.mp4.*export again/);
  expect(canvas).not.toHaveBeenCalled();
});

it('an unsupported timeline WITH audio is blocked with the reason (the fallback would drop the sound)', async () => {
  const canvas = canvasSpy();
  const kf = ir();
  kf.tracks.videoTracks[0].clips[0].transform.keyframes = [{ id: 'k', timeOffsetSec: 1, property: 'posX', value: 40 }];
  const err = await engineBridge.renderExport(kf, settings, jest.fn()).catch((e) => e);
  expect(err).toBeInstanceOf(ExportBlockedError);
  expect(err.message).toMatch(/keyframe/);
  expect(err.message).toMatch(/drop the audio/);
  expect(canvas).not.toHaveBeenCalled();
});

it('an unsupported timeline WITHOUT audio falls back to the compatibility renderer and says so', async () => {
  const canvas = canvasSpy();
  (desktopMedia.probeMedia as jest.Mock).mockResolvedValue({ format: { duration: '4' }, streams: [{ codec_type: 'video', width: 1280, height: 720, r_frame_rate: '25/1' }] });
  const kf = ir();
  kf.tracks.videoTracks[0].clips[0].transform.keyframes = [{ id: 'k', timeOffsetSec: 1, property: 'posX', value: 40 }];
  const notices: string[] = [];
  await engineBridge.renderExport(kf, settings, jest.fn(), { onNotice: (m) => notices.push(m) });
  expect(canvas).toHaveBeenCalledTimes(1);
  expect(notices.some((n) => /no audio/.test(n))).toBe(true);
});

it('a source that is no longer available blocks the export with a relink hint', async () => {
  const canvas = canvasSpy();
  (desktopMedia.probeMedia as jest.Mock).mockRejectedValue(new Error('That file was not selected through the file picker.'));
  await expect(engineBridge.renderExport(ir(), settings, jest.fn())).rejects.toThrow(/re-import it/);
  expect(canvas).not.toHaveBeenCalled();
});

it('media that is not a local file (a dropped browser blob) blocks the export with the reason', async () => {
  const canvas = canvasSpy();
  const blobIr = ir();
  blobIr.tracks.videoTracks[0].clips[0].sourcePath = 'blob:http://localhost/abc';
  await expect(engineBridge.renderExport(blobIr, settings, jest.fn())).rejects.toThrow(/not a file on this computer/);
  expect(canvas).not.toHaveBeenCalled();
});

it('treats a cancelled save dialog as a cancellation and starts nothing', async () => {
  (desktopMedia.pickExportPath as jest.Mock).mockResolvedValue(null);
  await expect(engineBridge.renderExport(ir(), settings, jest.fn())).rejects.toBeInstanceOf(RenderCancelledError);
  expect(runNativeRender).not.toHaveBeenCalled();
});

it('a native render that starts and FAILS is an error; it does not silently downgrade to the silent canvas export', async () => {
  const canvas = canvasSpy();
  (runNativeRender as jest.Mock).mockRejectedValue(new Error('Invalid data found when processing input'));
  await expect(engineBridge.renderExport(ir(), settings, jest.fn())).rejects.toThrow(/Invalid data/);
  expect(canvas).not.toHaveBeenCalled();
});

it('surfaces non-fatal plan warnings (audio ducking is not applied) without blocking the export', async () => {
  const notices: string[] = [];
  const audio = [{ id: 'bgm', type: 'BGM', volumeDb: 0, duckWithSpeech: true, clips: [{ id: 'x', sourcePath: URL_A, sourceRange: range(0, 4), timelineRange: range(0, 4), volumeDb: 0 }] }];
  await engineBridge.renderExport(ir({ audioTracks: audio }), settings, jest.fn(), { onNotice: (m) => notices.push(m) });
  expect(runNativeRender).toHaveBeenCalled();
  expect(notices.some((n) => /ducking/.test(n))).toBe(true);
});

it('passes the abort signal through so the UI can cancel FFmpeg', async () => {
  const controller = new AbortController();
  await engineBridge.renderExport(ir(), settings, jest.fn(), { signal: controller.signal });
  expect((runNativeRender as jest.Mock).mock.calls[0][3]).toBe(controller.signal);
});

it('imports through the native picker with real probe data and reports per-file failures', async () => {
  (desktopMedia.pickMediaFiles as jest.Mock).mockResolvedValue([P, 'C:\\media\\broken.bin']);
  (desktopMedia.probeMedia as jest.Mock).mockImplementation(async (p: string) => {
    if (p.endsWith('broken.bin')) throw new Error('ffprobe could not read this file');
    return probeWithAudio;
  });
  const { assets, failures } = await engineBridge.importNativeAssets();
  expect(assets).toHaveLength(1);
  expect(assets[0]).toMatchObject({ name: 'a.mp4', width: 1280, height: 720, fps: 25, hasAudio: true });
  expect(assets[0].filePath).toBe(URL_A.replace(/^.*$/, toAssetUrl(P))); // playable asset URL, reversible to the real path
  expect(failures).toEqual([{ name: 'broken.bin', error: 'ffprobe could not read this file' }]);
});
