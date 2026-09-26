import 'package:flutter_test/flutter_test.dart';
import 'package:social_studio_mobile/core/native_engine/edit_ir.dart';
import 'package:social_studio_mobile/core/native_engine/media_engine_exception.dart';
import 'package:social_studio_mobile/core/network/audio_transcription_service.dart';
import 'package:social_studio_mobile/features/studio/timeline_ops.dart';

/// 10 s landscape source with speech in [1s, 4s) and [6s, 9s).
final words = [
  for (var i = 0; i < 6; i++) TranscriptWord(text: 'w$i', startMs: 1000 + i * 500, endMs: 1400 + i * 500),
  for (var i = 0; i < 6; i++) TranscriptWord(text: 'v$i${i == 5 ? '.' : ''}', startMs: 6000 + i * 500, endMs: 6400 + i * 500),
];

MobileEditIr base() => TimelineOps.initial(projectId: 'p1', durationMs: 10000, width: 1920, height: 1080, words: words);

void main() {
  group('initial timeline', () {
    test('one clip over the whole source, centre-cropped to 9:16, with speech ranges', () {
      final ir = base();
      expect(ir.clips, hasLength(1));
      expect(ir.durationMs, 10000);
      expect(ir.canvas.width, 1080);
      expect(ir.canvas.height, 1920);
      final crop = ir.clips.single.crop!;
      expect(crop.height, 1);
      expect(crop.width, closeTo((9 / 16) / (16 / 9), 0.001));
      expect(crop.x, closeTo((1 - crop.width) / 2, 0.001));
      expect(ir.sources.single.durationMs, 10000);
      expect(ir.audio.speechRangesMs, [
        [1000, 3900],
        [6000, 8900],
      ]);
    });

    test('same-aspect source needs no crop; too-short source is rejected', () {
      final ir = TimelineOps.initial(projectId: 'p', durationMs: 5000, width: 1080, height: 1920);
      expect(ir.clips.single.crop, isNull);
      expect(() => TimelineOps.initial(projectId: 'p', durationMs: 50, width: 1080, height: 1920), throwsA(isA<MediaEngineException>()));
    });

    test('serialises sources and a non-null duck (server schema requirements)', () {
      final ir = TimelineOps.setMusic(base(), url: 'https://cdn.example.com/a.mp3', duckUnderSpeech: false);
      final j = ir.toJson();
      expect(j['sources'], [
        {'assetId': 'primary', 'durationMs': 10000, 'width': 1920, 'height': 1080}
      ]);
      expect(((j['audio'] as Map)['music'] as List).single['duck'], isA<Map>());
      final back = MobileEditIr.fromJson(j);
      expect(back.sources, hasLength(1));
      back.validate();
    });
  });

  group('main track edits keep every invariant', () {
    test('split creates two contiguous clips and keeps total duration', () {
      final ir = TimelineOps.split(base(), 5000);
      expect(ir.clips, hasLength(2));
      expect(ir.clips[0].sourceEndMs, 5000);
      expect(ir.clips[1].sourceStartMs, 5000);
      expect(ir.clips[1].timelineStartMs, 5000);
      expect(ir.durationMs, 10000);
      expect(ir.clips[0].id, isNot(ir.clips[1].id));
    });

    test('split at a clip edge is refused', () {
      expect(() => TimelineOps.split(base(), 50), throwsA(isA<MediaEngineException>()));
    });

    test('ripple delete shifts captions, zooms, b-roll, speech and music together', () {
      var ir = TimelineOps.autoCaptions(base(), words, wordsPerCaption: 3);
      ir = TimelineOps.addZoom(ir, startMs: 7000, durationMs: 1000);
      ir = TimelineOps.addBroll(ir, {'kind': 'url', 'url': 'https://x.test/b.mp4'}, startMs: 6500, durationMs: 1000);
      ir = TimelineOps.setMusic(ir, url: 'https://x.test/m.mp3');
      ir = TimelineOps.split(ir, 4500);
      ir = TimelineOps.split(ir, 5500);
      // Delete the middle second [4500, 5500): everything later moves 1 s earlier.
      final cut = TimelineOps.deleteClip(ir, 1);
      expect(cut.durationMs, 9000);
      expect(cut.zooms.single.startMs, 6000);
      expect(cut.overlays.single.timelineStartMs, 5500);
      expect(cut.audio.music.single.timelineEndMs, 9000, reason: 'full-length music keeps covering the video');
      expect(cut.audio.speechRangesMs.last, [5000, 7900]);
      final lateCaption = cut.captions.lastWhere((c) => c.kind == 'caption');
      expect(lateCaption.words.first.startMs, greaterThanOrEqualTo(lateCaption.startMs));
      expect(lateCaption.endMs, lessThanOrEqualTo(9000));
      // Word timings shifted by exactly the removed second.
      final v0 = cut.captions.expand((c) => c.words).firstWhere((w) => w.text == 'v0');
      expect(v0.startMs, 5000);
      cut.validate();
    });

    test('removeRange drops content inside the range and trims straddling items', () {
      var ir = TimelineOps.autoCaptions(base(), words, wordsPerCaption: 6);
      ir = TimelineOps.removeRange(ir, 0, 1000);
      expect(ir.durationMs, 9000);
      expect(ir.captions.first.startMs, 0);
      expect(ir.audio.speechRangesMs.first[0], 0);
      ir.validate();
    });

    test('removing the whole video is refused', () {
      expect(() => TimelineOps.removeRange(base(), 0, 10000), throwsA(isA<MediaEngineException>()));
    });

    test('speed change rescales duration and the items on that clip', () {
      var ir = TimelineOps.addZoom(base(), startMs: 8000, durationMs: 1000);
      ir = TimelineOps.setSpeed(ir, 2);
      expect(ir.durationMs, 5000);
      expect(ir.clips.single.timelineEndMs, 5000);
      expect(ir.zooms.single.startMs, 4000);
      expect(ir.zooms.single.endMs, 4500);
      expect(() => TimelineOps.setSpeed(ir, 10).clips.single.speed, returnsNormally);
      expect(TimelineOps.setSpeed(ir, 10).clips.single.speed, 4);
    });

    test('trim and reorder', () {
      var ir = TimelineOps.split(base(), 5000);
      ir = TimelineOps.trim(ir, 0, sourceStartMs: 1000, sourceEndMs: 4000);
      expect(ir.clips[0].timelineEndMs, 3000);
      expect(ir.clips[1].timelineStartMs, 3000);
      final moved = TimelineOps.moveClip(ir, 1, 0);
      expect(moved.clips[0].sourceStartMs, 5000);
      expect(moved.clips[0].timelineStartMs, 0);
      expect(moved.durationMs, ir.durationMs);
      expect(() => TimelineOps.trim(ir, 0, sourceStartMs: 1000, sourceEndMs: 1050), throwsA(isA<MediaEngineException>()));
    });

    test('the last clip cannot be deleted', () {
      expect(() => TimelineOps.deleteClip(base(), 0), throwsA(isA<MediaEngineException>()));
    });
  });

  group('look, canvas and audio', () {
    test('aspect change recomputes crops; fit mode clears them', () {
      final square = TimelineOps.setAspect(base(), '1:1');
      expect(square.canvas.width, square.canvas.height);
      expect(square.clips.single.crop!.width, closeTo(1080 / 1920, 0.001));
      final fit = TimelineOps.setAspect(base(), '9:16', fill: false);
      expect(fit.clips.single.crop, isNull);
      final wide = TimelineOps.setAspect(base(), '16:9');
      expect(wide.clips.single.crop, isNull, reason: '16:9 source on a 16:9 canvas');
    });

    test('rotate 90 re-centres the crop for the rotated frame and round-trips', () {
      final r = TimelineOps.rotate(base());
      expect(r.clips.single.rotationDeg, 90);
      expect(r.clips.single.crop, isNull, reason: 'a rotated 16:9 source is 9:16 already');
      final j = r.toJson();
      expect((j['clips'] as List).single['rotationDeg'], 90);
      expect((base().toJson()['clips'] as List).single.containsKey('rotationDeg'), isFalse);
      final flipped = TimelineOps.rotate(base(), rotate90: false, toggleFlip: true);
      expect(flipped.clips.single.flipH, isTrue);
    });

    test('filter, volume, transition only at cuts', () {
      var ir = TimelineOps.split(base(), 5000);
      ir = TimelineOps.setFilter(ir, const EditIrFilter(preset: 'VIVID', saturation: 1.3), index: 1);
      expect(ir.clips[0].filter, isNull);
      expect(ir.clips[1].filter!.preset, 'VIVID');
      ir = TimelineOps.setClipVolume(ir, -100);
      expect(ir.clips.every((c) => c.volumeDb == -60), isTrue);
      ir = TimelineOps.setTransition(ir, const EditIrTransition(durationMs: 300));
      expect(ir.clips[0].transitionIn, isNull);
      expect(ir.clips[1].transitionIn, isNotNull);
    });

    test('crop outside the frame is rejected', () {
      expect(() => TimelineOps.setCrop(base(), const EditIrCrop(x: 0.8, y: 0, width: 0.5, height: 1)), throwsA(isA<MediaEngineException>()));
    });

    test('music needs https and ducks only with speech', () {
      expect(() => TimelineOps.setMusic(base(), url: 'file:///sdcard/a.mp3'), throwsA(isA<MediaEngineException>()));
      final noSpeech = TimelineOps.initial(projectId: 'p', durationMs: 5000, width: 1080, height: 1920);
      expect(TimelineOps.setMusic(noSpeech, url: 'https://x.test/m.mp3').audio.music.single.duck!.enabled, isFalse);
      expect(TimelineOps.setMusic(base(), url: 'https://x.test/m.mp3').audio.music.single.duck!.enabled, isTrue);
      expect(() => TimelineOps.updateMusic(noSpeech, volumeDb: -10), throwsA(isA<MediaEngineException>()));
    });
  });

  group('text and captions', () {
    test('auto captions group words, break on sentence end, never overlap, carry a full style', () {
      final ir = TimelineOps.autoCaptions(base(), words, wordsPerCaption: 4);
      final caps = ir.captions;
      expect(caps.map((c) => c.words.length).reduce((a, b) => a + b), words.length);
      for (var i = 0; i < caps.length - 1; i++) {
        expect(caps[i].endMs, lessThanOrEqualTo(caps[i + 1].startMs));
      }
      expect(caps.last.text.endsWith('v5.'), isTrue);
      for (final k in ['preset', 'animation', 'fontFamily', 'fontWeight', 'fontSizePx', 'textColor', 'highlightColor', 'strokeColor', 'strokeWidthPx', 'shadow', 'background', 'uppercase', 'positionX', 'positionY', 'maxWidthFraction']) {
        expect(caps.first.style.containsKey(k), isTrue, reason: 'style.$k is required by the server schema');
      }
    });

    test('captions skip words that were cut out', () {
      final cut = TimelineOps.removeRange(base(), 900, 4000);
      final caps = TimelineOps.autoCaptions(cut, words);
      expect(caps.captions.expand((c) => c.words).any((w) => w.text.startsWith('w')), isFalse);
    });

    test('no transcript, no captions', () {
      expect(() => TimelineOps.autoCaptions(base(), const []), throwsA(isA<MediaEngineException>()));
    });

    test('titles survive caption regeneration and clear', () {
      var ir = TimelineOps.addText(base(), 'Hello', startMs: 0, durationMs: 2000);
      ir = TimelineOps.autoCaptions(ir, words);
      ir = TimelineOps.clearCaptions(ir);
      expect(ir.captions.single.kind, 'text');
      expect(() => TimelineOps.addText(ir, '   ', startMs: 0, durationMs: 1000), throwsA(isA<MediaEngineException>()));
    });

    test('overlapping zooms are refused', () {
      final ir = TimelineOps.addZoom(base(), startMs: 1000, durationMs: 2000);
      expect(() => TimelineOps.addZoom(ir, startMs: 2000, durationMs: 1000), throwsA(isA<MediaEngineException>()));
    });
  });

  group('face-centred reframe', () {
    final faces = [
      for (var i = 0; i < 10; i++) FaceSample(tMs: i * 500, x: i == 4 ? 0.1 : 0.75, y: 0.35, w: 0.1, h: 0.18),
      const FaceSample(tMs: 0, x: 0.2, y: 0.5, w: 0.02, h: 0.03), // smaller face in the same frame: ignored
    ];

    test('faceFocus is the median of the largest face per sample, clamped', () {
      expect(TimelineOps.faceFocus(faces), (x: 0.75, y: 0.35));
      expect(TimelineOps.faceFocus(const []), isNull);
      expect(TimelineOps.faceFocus(const [FaceSample(tMs: 0, x: 0.99, y: 0.01, w: 0.1, h: 0.1)]), (x: 0.9, y: 0.1));
    });

    test('initial and setAspect centre the crop on the face and keep it inside the frame', () {
      final focus = TimelineOps.faceFocus(faces);
      final ir = TimelineOps.initial(projectId: 'p', durationMs: 5000, width: 1920, height: 1080, focus: focus);
      final c = ir.clips.single.crop!;
      expect(c.x + c.width / 2, closeTo(0.75, 0.001));
      final square = TimelineOps.setAspect(ir, '1:1', focus: focus).clips.single.crop!;
      expect(square.x + square.width, lessThanOrEqualTo(1.0001)); // clamped at the right edge
      expect(square.x, closeTo(1 - square.width, 0.001));
      final centred = TimelineOps.setAspect(ir, '9:16').clips.single.crop!;
      expect(centred.x, closeTo((1 - centred.width) / 2, 0.001));
    });
  });

  test('director sound effects round-trip and follow the footage through cuts', () {
    final json = base().toJson();
    (json['audio'] as Map)['sfx'] = [
      {'id': 's1', 'timelineStartMs': 2000, 'source': {'kind': 'url', 'url': 'https://x.test/whoosh.mp3'}, 'volumeDb': -12, 'credit': 'Whoosh by A (CC BY)'},
      {'id': 's2', 'timelineStartMs': 7000, 'durationMs': 800, 'source': {'kind': 'url', 'url': 'https://x.test/pop.mp3'}, 'volumeDb': -10},
    ];
    final ir = MobileEditIr.fromJson(json);
    expect(ir.audio.sfx, hasLength(2));
    expect(((ir.toJson()['audio'] as Map)['sfx'] as List).first['credit'], 'Whoosh by A (CC BY)');
    // Cut [1000, 3000): s1 (at 2000) is inside the cut and dropped; s2 moves 2 s earlier.
    final cut = TimelineOps.removeRange(ir, 1000, 3000);
    expect(cut.audio.sfx.map((e) => e.id), ['s2']);
    expect(cut.audio.sfx.single.timelineStartMs, 5000);
    expect((base().toJson()['audio'] as Map).containsKey('sfx'), isFalse, reason: 'omitted when empty');
    // Manual audio edits keep them.
    expect(TimelineOps.setOriginalVolume(ir, -6).audio.sfx, hasLength(2));
  });
}
