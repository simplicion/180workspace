// On-device verification of the native media engine (Android Media3 renderer).
//
// Fixtures are real files pushed by the host before the run (see test_assets/, gitignored):
//   adb push test_assets/speech_obama_30s.mp4 <ext>/test_assets/speech.mp4   (public-domain speech, 1280x720)
//   adb push test_assets/sample-15s.mp4        <ext>/test_assets/broll.mp4    (samplelib, 1920x1080)
//   adb push test_assets/sample-15s.mp3        <ext>/test_assets/music.mp3    (samplelib)
// where <ext> = /sdcard/Android/data/com.workspace180.social_studio_mobile/files
//
// Evidence (rendered MP4s, frame JPEGs, report.json) is written to <ext>/evidence for `adb pull`.
import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:path_provider/path_provider.dart';
import 'package:social_studio_mobile/core/native_engine/media_engine_service.dart';

late Directory ext;
late String speech, broll, music;
late Directory evidence;
final report = <String, dynamic>{};

const canvas = {'aspect': '9:16', 'width': 1080, 'height': 1920, 'fps': 30, 'background': '#000000'};

Map<String, dynamic> captionStyle({String animation = 'word_pop', double y = 0.72}) => {
      'preset': 'HORMOZI_BOUNCE',
      'animation': animation,
      'fontFamily': 'Inter',
      'fontWeight': 800,
      'fontSizePx': 84,
      'textColor': '#FFFFFF',
      'highlightColor': '#FFE600',
      'strokeColor': '#000000',
      'strokeWidthPx': 6,
      'shadow': true,
      'background': null,
      'uppercase': true,
      'positionX': 0.5,
      'positionY': y,
      'maxWidthFraction': 0.86,
    };

/// Evenly spreads word timings across [start, end) of the timeline.
List<Map<String, dynamic>> words(String text, int start, int end, {int? highlightIndex}) {
  final parts = text.split(' ');
  final step = (end - start) ~/ parts.length;
  return [
    for (var i = 0; i < parts.length; i++)
      {
        'text': parts[i],
        'startMs': start + i * step,
        'endMs': i == parts.length - 1 ? end : start + (i + 1) * step,
        'highlight': i == highlightIndex,
        'color': i == highlightIndex ? '#00FF88' : null,
        'scale': 1.25,
      },
  ];
}

/// Real-looking AI Director output: 3 cuts (one at 1.25x), 9:16 reframe crop, B-roll cutaway,
/// kinetic word captions, a zoom punch-in, a crossfade, and ducked background music.
Map<String, dynamic> directorIr() {
  // Source is 1280x720 → a centred 9:16 window is 405/1280 of the width.
  const cropW = 405 / 1280;
  const crop = {'x': (1 - cropW) / 2, 'y': 0.0, 'width': cropW, 'height': 1.0};
  return {
    'schemaVersion': 'mobile-editir/1',
    'projectId': 'emulator-verification',
    'canvas': canvas,
    'durationMs': 11150,
    'sources': [
      {'assetId': 'primary', 'durationMs': 30090, 'width': 1280, 'height': 720},
    ],
    'clips': [
      {'id': 'c1', 'assetId': 'primary', 'sourceStartMs': 600, 'sourceEndMs': 4080, 'timelineStartMs': 0, 'timelineEndMs': 3480,
        'speed': 1.0, 'volumeDb': 0, 'crop': crop, 'filter': null, 'transitionIn': null},
      {'id': 'c2', 'assetId': 'primary', 'sourceStartMs': 8020, 'sourceEndMs': 12490, 'timelineStartMs': 3480, 'timelineEndMs': 7950,
        'speed': 1.0, 'volumeDb': 0, 'crop': crop, 'filter': null, 'transitionIn': {'type': 'CROSSFADE', 'durationMs': 300}},
      {'id': 'c3', 'assetId': 'primary', 'sourceStartMs': 15010, 'sourceEndMs': 19010, 'timelineStartMs': 7950, 'timelineEndMs': 11150,
        'speed': 1.25, 'volumeDb': 0, 'crop': crop, 'filter': {'preset': 'VIVID', 'brightness': 1.05, 'contrast': 1.0, 'saturation': 1.0},
        'transitionIn': null},
    ],
    'overlays': [
      {'id': 'b1', 'kind': 'broll', 'timelineStartMs': 5000, 'timelineEndMs': 6500, 'sourceStartMs': 2000,
        'source': {'kind': 'url', 'url': 'https://download.samplelib.com/mp4/sample-15s.mp4'}, 'fit': 'cover', 'opacity': 1, 'muted': true},
    ],
    'captions': [
      {'id': 't1', 'kind': 'caption', 'startMs': 0, 'endMs': 1700, 'text': 'thank you so much',
        'words': words('thank you so much', 0, 1700, highlightIndex: 2), 'style': captionStyle()},
      {'id': 't2', 'kind': 'caption', 'startMs': 1700, 'endMs': 3480, 'text': 'for being here today',
        'words': words('for being here today', 1700, 3480), 'style': captionStyle()},
      {'id': 't3', 'kind': 'caption', 'startMs': 3480, 'endMs': 7950, 'text': 'education is the key to your future',
        'words': words('education is the key to your future', 3480, 7950), 'style': captionStyle(animation: 'karaoke')},
      {'id': 't4', 'kind': 'caption', 'startMs': 7950, 'endMs': 11150, 'text': 'my education my future',
        'words': words('my education my future', 7950, 11150), 'style': captionStyle()},
    ],
    'zooms': [
      {'id': 'z1', 'startMs': 8500, 'endMs': 10500, 'scale': 1.3, 'centerX': 0.5, 'centerY': 0.4, 'rampMs': 300},
    ],
    'audio': {
      'originalTrack': {'volumeDb': 0},
      'music': [
        // Starts 10 s into a 15 s track, so the renderer must loop it to cover 11.15 s.
        {'id': 'm1', 'timelineStartMs': 0, 'timelineEndMs': 11150, 'sourceStartMs': 10000,
          'source': {'kind': 'stock_query', 'query': 'upbeat', 'url': null},
          'volumeDb': -14, 'fadeInMs': 500, 'fadeOutMs': 1000, 'duck': {'enabled': true, 'duckDb': -12, 'attackMs': 120, 'releaseMs': 350}},
      ],
      'speechRangesMs': [
        [200, 3300],
        [3700, 7900],
        [8200, 10900],
      ],
    },
  };
}

/// Music-only timeline (speech muted) to measure the ducking envelope in the output.
Map<String, dynamic> duckIr() => {
      'schemaVersion': 'mobile-editir/1',
      'projectId': 'duck-verification',
      'canvas': canvas,
      'durationMs': 8000,
      'clips': [
        {'id': 'c1', 'assetId': 'primary', 'sourceStartMs': 0, 'sourceEndMs': 8000, 'timelineStartMs': 0, 'timelineEndMs': 8000,
          'speed': 1.0, 'volumeDb': -60, 'crop': null, 'filter': null, 'transitionIn': null},
      ],
      'audio': {
        'originalTrack': {'volumeDb': 0},
        'music': [
          {'id': 'm1', 'timelineStartMs': 0, 'timelineEndMs': 8000, 'sourceStartMs': 0, 'source': {'kind': 'stock_query', 'query': 'x'},
            'volumeDb': 0, 'fadeInMs': 0, 'fadeOutMs': 0, 'duck': {'enabled': true, 'duckDb': -12, 'attackMs': 120, 'releaseMs': 350}},
        ],
        'speechRangesMs': [
          [3000, 5500],
        ],
      },
    };

Future<RenderResult> render(Map<String, dynamic> ir, String out, {Map<String, String> overlays = const {}, List<double>? progressOut}) async {
  RenderResult? result;
  await for (final p in MediaEngineService.renderEditIr(
    editIr: MobileEditIr.fromJson(ir),
    outputPath: out,
    assetPaths: {'primary': speech},
    overlayPaths: overlays,
    musicPaths: {'m1': music},
  )) {
    progressOut?.add(p.progress);
    if (p.result != null) result = p.result;
  }
  return result!;
}

/// RMS in dBFS of a 16-bit mono WAV between [fromMs, toMs).
double rmsDb(Uint8List wav, int fromMs, int toMs) {
  final data = ByteData.sublistView(wav, 44);
  final a = fromMs * 16;
  final b = math.min(toMs * 16, data.lengthInBytes ~/ 2);
  var sum = 0.0;
  for (var i = a; i < b; i++) {
    final s = data.getInt16(i * 2, Endian.little) / 32768.0;
    sum += s * s;
  }
  return 20 * math.log(math.sqrt(sum / (b - a)) + 1e-12) / math.ln10;
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() async {
    ext = (await getExternalStorageDirectory())!;
    speech = '${ext.path}/test_assets/speech.mp4';
    broll = '${ext.path}/test_assets/broll.mp4';
    music = '${ext.path}/test_assets/music.mp3';
    // `flutter test` reinstalls the app (wiping this directory), so the host pushes fixtures
    // right after install; wait for them rather than failing immediately.
    final deadline = DateTime.now().add(const Duration(minutes: 3));
    bool ready() => [speech, broll, music].every((f) => File(f).existsSync()) && File('${ext.path}/test_assets/.ready').existsSync();
    while (!ready() && DateTime.now().isBefore(deadline)) {
      await Future<void>.delayed(const Duration(seconds: 1));
    }
    for (final f in [speech, broll, music]) {
      expect(File(f).existsSync(), isTrue, reason: 'fixture missing: $f (push it with adb)');
    }
    evidence = Directory('${ext.path}/evidence');
    if (evidence.existsSync()) evidence.deleteSync(recursive: true);
    evidence.createSync(recursive: true);
  });

  tearDownAll(() {
    File('${evidence.path}/report.json').writeAsStringSync(const JsonEncoder.withIndent('  ').convert(report));
    // ignore: avoid_print
    print('MEDIA_ENGINE_REPORT ${jsonEncode(report)}');
  });

  testWidgets('getVideoInfo reads the real source', (tester) async {
    final info = await MediaEngineService.getVideoInfo(speech);
    report['sourceInfo'] = {'durationMs': info.durationMs, 'w': info.displayWidth, 'h': info.displayHeight, 'hasAudio': info.hasAudio, 'fps': info.frameRate};
    expect(info.displayWidth, 1280);
    expect(info.displayHeight, 720);
    expect(info.hasAudio, isTrue);
    expect(info.durationMs, closeTo(30090, 200));
  });

  testWidgets('extractAudio produces 16 kHz mono WAV and M4A for STT', (tester) async {
    final wav = await MediaEngineService.extractAudio(sourcePath: speech, destPath: '${evidence.path}/speech_16k.wav');
    final bytes = File(wav.path).readAsBytesSync();
    final header = ByteData.sublistView(bytes, 0, 44);
    report['extractWav'] = {'durationMs': wav.durationMs, 'bytes': wav.fileSizeBytes, 'rate': header.getUint32(24, Endian.little), 'channels': header.getUint16(22, Endian.little), 'speechRmsDb': rmsDb(bytes, 1000, 4000)};
    expect(String.fromCharCodes(bytes.sublist(0, 4)), 'RIFF');
    expect(header.getUint32(24, Endian.little), 16000);
    expect(header.getUint16(22, Endian.little), 1);
    expect(wav.durationMs, closeTo(30090, 150));
    expect(rmsDb(bytes, 1000, 4000), greaterThan(-40), reason: 'speech must be audible, not silence');

    final m4a = await MediaEngineService.extractAudio(sourcePath: speech, destPath: '${evidence.path}/speech_16k.m4a');
    final m4aInfo = await MediaEngineService.getVideoInfo(m4a.path);
    report['extractM4a'] = {'durationMs': m4a.durationMs, 'bytes': m4a.fileSizeBytes, 'rate': m4a.sampleRate, 'channels': m4a.channels, 'hasVideo': m4aInfo.hasVideo};
    expect(m4a.sampleRate, 16000);
    expect(m4a.channels, 1);
    expect(m4aInfo.hasVideo, isFalse);
    expect(m4a.durationMs, closeTo(30090, 200));
  });

  testWidgets('renderEditIr: cuts + speed + 9:16 crop + B-roll + kinetic captions + zoom + ducked music', (tester) async {
    final out = '${evidence.path}/director_render.mp4';
    final progress = <double>[];
    final sw = Stopwatch()..start();
    final r = await render(directorIr(), out, overlays: {'b1': broll}, progressOut: progress);
    sw.stop();
    final verify = await MediaEngineService.getVideoInfo(out);
    report['directorRender'] = {
      'expectedDurationMs': r.expectedDurationMs,
      'durationMs': r.durationMs,
      'width': r.width,
      'height': r.height,
      'hasAudio': r.hasAudio,
      'bytes': r.fileSizeBytes,
      'videoEncoder': r.videoEncoder,
      'audioEncoder': r.audioEncoder,
      'warnings': r.warnings,
      'progressEvents': progress.length,
      'renderWallMs': sw.elapsedMilliseconds,
      'verifyDurationMs': verify.durationMs,
    };
    expect(progress, isNotEmpty);
    expect(r.durationMs, closeTo(11150, 150));
    expect(verify.displayWidth, 1080);
    expect(verify.displayHeight, 1920);
    expect(verify.hasAudio, isTrue);
    expect(verify.hasVideo, isTrue);

    final frames = await MediaEngineService.generateThumbnails(
      sourcePath: out,
      outputDir: '${evidence.path}/frames',
      timesMs: [400, 1250, 2600, 5700, 6800, 9600, 10900],
      maxWidth: 540,
      exact: true,
    );
    report['frames'] = frames;
    expect(frames, hasLength(7));

    final audio = await MediaEngineService.extractAudio(sourcePath: out, destPath: '${evidence.path}/director_render_16k.wav');
    report['directorRender']['audioDurationMs'] = audio.durationMs;
  });

  testWidgets('ducking: music drops by ~duckDb inside speech ranges', (tester) async {
    final out = '${evidence.path}/duck_render.mp4';
    final r = await render(duckIr(), out);
    final wav = await MediaEngineService.extractAudio(sourcePath: out, destPath: '${evidence.path}/duck_render_16k.wav');
    final bytes = File(wav.path).readAsBytesSync();
    final before = rmsDb(bytes, 1000, 2700);
    final ducked = rmsDb(bytes, 3300, 5300);
    final after = rmsDb(bytes, 6000, 7800);
    report['duckRender'] = {'durationMs': r.durationMs, 'rmsBeforeDb': before, 'rmsDuckedDb': ducked, 'rmsAfterDb': after, 'deltaDb': ducked - before};
    // The music itself varies, so allow a few dB of slack around the -12 dB target.
    expect(ducked - before, lessThan(-8));
    expect(ducked - before, greaterThan(-16));
    expect(after - ducked, greaterThan(6));
  });

  testWidgets('cancel stops the export with CANCELLED and removes the partial file', (tester) async {
    final out = '${evidence.path}/cancelled.mp4';
    final stream = MediaEngineService.renderEditIr(
      editIr: MobileEditIr.fromJson(directorIr()),
      outputPath: out,
      assetPaths: {'primary': speech},
      overlayPaths: {'b1': broll},
      musicPaths: {'m1': music},
      jobId: 'cancel-me',
    );
    Object? error;
    var cancelRequested = false;
    try {
      await for (final p in stream) {
        if (!cancelRequested && p.state == RenderState.progress) {
          cancelRequested = true;
          expect(await MediaEngineService.cancelRender('cancel-me'), isTrue);
        }
      }
    } catch (e) {
      error = e;
    }
    report['cancel'] = {'error': '$error', 'fileExists': File(out).existsSync()};
    expect(error, isA<MediaEngineException>().having((e) => e.code, 'code', 'CANCELLED'));
    expect(File(out).existsSync(), isFalse);
  });

  testWidgets('missing media is a typed error, never a placeholder file', (tester) async {
    final out = '${evidence.path}/missing.mp4';
    await expectLater(
      render(directorIr(), out), // no overlayPaths for b1
      throwsA(isA<MediaEngineException>().having((e) => e.code, 'code', 'MISSING_MEDIA')),
    );
    expect(File(out).existsSync(), isFalse);
  });
}
