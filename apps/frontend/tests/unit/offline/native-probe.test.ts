import { baseName, descriptorFromFfprobe, mimeFor, parseRate } from '../../../app/(platform)/(media-editor-app)/media-editor/services/native-probe';

const url = 'http://asset.localhost/x';

describe('parseRate', () => {
  it('parses fractions and rejects nonsense', () => {
    expect(parseRate('30/1')).toBe(30);
    expect(parseRate('30000/1001')).toBeCloseTo(29.97, 2);
    expect(parseRate('0/0')).toBeUndefined();
    expect(parseRate('25/0')).toBeUndefined();
    expect(parseRate(undefined)).toBeUndefined();
    expect(parseRate('abc')).toBeUndefined();
  });
});

describe('descriptorFromFfprobe', () => {
  it('maps a normal video with audio', () => {
    const d = descriptorFromFfprobe(
      {
        format: { duration: '12.480000', size: '15482910' },
        streams: [
          { codec_type: 'video', codec_name: 'h264', width: 1920, height: 1080, r_frame_rate: '30000/1001', avg_frame_rate: '30000/1001' },
          { codec_type: 'audio', codec_name: 'aac', channels: 2, sample_rate: '48000' },
        ],
      },
      'C:\\media\\clip one.MOV', url, 'a1',
    );
    expect(d).toMatchObject({ id: 'a1', name: 'clip one.MOV', filePath: url, fileSizeBytes: 15482910, mimeType: 'video/quicktime', width: 1920, height: 1080, hasAudio: true, codecVideo: 'h264', codecAudio: 'aac', audioChannels: 2, audioSampleRate: 48000 });
    expect(d.durationSeconds).toBeCloseTo(12.48, 2);
    expect(d.fps).toBeCloseTo(29.97, 2);
    expect(d.isVfr).toBeUndefined();
    expect(d.sha256Hash.startsWith('probe:')).toBe(true);
  });

  it('swaps width/height for rotated phone footage (tag and side data)', () => {
    const tagged = descriptorFromFfprobe({ format: { duration: '3' }, streams: [{ codec_type: 'video', width: 1920, height: 1080, tags: { rotate: '90' } }] }, '/v/p.mp4', url, 'a');
    expect([tagged.width, tagged.height]).toEqual([1080, 1920]);
    const side = descriptorFromFfprobe({ format: { duration: '3' }, streams: [{ codec_type: 'video', width: 1920, height: 1080, side_data_list: [{ rotation: -90 }] }] }, '/v/p.mp4', url, 'a');
    expect([side.width, side.height]).toEqual([1080, 1920]);
    const upright = descriptorFromFfprobe({ format: { duration: '3' }, streams: [{ codec_type: 'video', width: 1920, height: 1080, side_data_list: [{ rotation: 180 }] }] }, '/v/p.mp4', url, 'a');
    expect([upright.width, upright.height]).toEqual([1920, 1080]);
  });

  it('flags variable frame rate', () => {
    const d = descriptorFromFfprobe({ format: { duration: '3' }, streams: [{ codec_type: 'video', width: 1280, height: 720, r_frame_rate: '60/1', avg_frame_rate: '2400/100' }] }, '/v/a.mp4', url, 'a');
    expect(d.isVfr).toBe(true);
  });

  it('gives images a default 5 s duration and no audio', () => {
    const d = descriptorFromFfprobe({ format: { size: '1000' }, streams: [{ codec_type: 'video', codec_name: 'png', width: 400, height: 300 }] }, '/v/logo.PNG', url, 'a');
    expect(d).toMatchObject({ durationSeconds: 5, hasAudio: false, mimeType: 'image/png', width: 400, height: 300 });
  });

  it('treats an audio file as audio-only and ignores embedded cover art', () => {
    const d = descriptorFromFfprobe(
      { format: { duration: '181.2', size: '4000000' }, streams: [{ codec_type: 'audio', codec_name: 'mp3', channels: 2, sample_rate: '44100' }, { codec_type: 'video', codec_name: 'mjpeg', width: 500, height: 500, disposition: { attached_pic: 1 } }] },
      '/m/song.mp3', url, 'a',
    );
    expect(d).toMatchObject({ isAudioOnly: true, hasAudio: true, width: 0, height: 0, mimeType: 'audio/mpeg' });
    expect(d.durationSeconds).toBeCloseTo(181.2, 1);
  });

  it('reports a silent video honestly', () => {
    const d = descriptorFromFfprobe({ format: { duration: '3' }, streams: [{ codec_type: 'video', width: 640, height: 360 }] }, '/v/s.mp4', url, 'a');
    expect(d.hasAudio).toBe(false);
  });

  it('survives an empty probe result without throwing', () => {
    const d = descriptorFromFfprobe({}, '/v/weird.bin', url, 'a');
    expect(d).toMatchObject({ width: 0, height: 0, durationSeconds: 0, hasAudio: false, mimeType: 'video/mp4' });
  });
});

describe('path helpers', () => {
  it('handles Windows and POSIX separators', () => {
    expect(baseName('C:\\a\\b\\c.mp4')).toBe('c.mp4');
    expect(baseName('/a/b/c.mp4')).toBe('c.mp4');
    expect(mimeFor('x.WEBM')).toBe('video/webm');
    expect(mimeFor('x.unknown')).toBe('application/octet-stream');
  });
});
