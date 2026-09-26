import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';

import 'edit_ir.dart';
import 'media_engine_exception.dart';

export 'edit_ir.dart';
export 'media_engine_exception.dart';

/// Metadata of a local media file, read natively with MediaMetadataRetriever / AVAsset.
class VideoMetadata {
  VideoMetadata({
    required this.durationMs,
    required this.width,
    required this.height,
    required this.rotation,
    int? displayWidth,
    int? displayHeight,
    this.hasVideo = true,
    this.hasAudio = false,
    this.frameRate,
    this.fileSizeBytes,
    this.isHdr = false,
  })  : displayWidth = displayWidth ?? (rotation % 180 == 0 ? width : height),
        displayHeight = displayHeight ?? (rotation % 180 == 0 ? height : width);

  final int durationMs;

  /// Coded size, before rotation metadata.
  final int width;
  final int height;
  final int rotation;

  /// Size as displayed (rotation applied). This is what `/ai-direct` expects in `media.width/height`.
  final int displayWidth;
  final int displayHeight;
  final bool hasVideo;
  final bool hasAudio;
  final double? frameRate;
  final int? fileSizeBytes;

  /// HLG or PQ video. Renders tone-map it to SDR.
  final bool isHdr;

  factory VideoMetadata.fromMap(Map<String, dynamic> m) => VideoMetadata(
        durationMs: (m['durationMs'] as num).toInt(),
        width: (m['width'] as num?)?.toInt() ?? 0,
        height: (m['height'] as num?)?.toInt() ?? 0,
        rotation: (m['rotation'] as num?)?.toInt() ?? 0,
        displayWidth: (m['displayWidth'] as num?)?.toInt(),
        displayHeight: (m['displayHeight'] as num?)?.toInt(),
        hasVideo: m['hasVideo'] as bool? ?? false,
        hasAudio: m['hasAudio'] as bool? ?? false,
        frameRate: (m['frameRate'] as num?)?.toDouble(),
        fileSizeBytes: (m['fileSizeBytes'] as num?)?.toInt(),
        isHdr: m['isHdr'] as bool? ?? false,
      );
}

/// Output format for speech-to-text audio. Both are 16 kHz mono.
enum SttAudioFormat { wav, m4a }

class ExtractedAudio {
  const ExtractedAudio({required this.path, required this.format, required this.sampleRate, required this.channels, required this.durationMs, required this.fileSizeBytes});

  final String path;
  final SttAudioFormat format;
  final int sampleRate;
  final int channels;
  final int durationMs;
  final int fileSizeBytes;

  factory ExtractedAudio.fromMap(Map<String, dynamic> m) => ExtractedAudio(
        path: m['path'] as String,
        format: m['format'] == 'wav' ? SttAudioFormat.wav : SttAudioFormat.m4a,
        sampleRate: (m['sampleRate'] as num).toInt(),
        channels: (m['channels'] as num).toInt(),
        durationMs: (m['durationMs'] as num).toInt(),
        fileSizeBytes: (m['fileSizeBytes'] as num).toInt(),
      );
}

enum RenderState { started, progress, completed }

/// Verified facts about a finished render, read back from the written file.
class RenderResult {
  const RenderResult({
    required this.outputPath,
    required this.durationMs,
    required this.expectedDurationMs,
    required this.width,
    required this.height,
    required this.hasAudio,
    required this.fileSizeBytes,
    this.videoEncoder,
    this.audioEncoder,
    this.warnings = const [],
  });

  final String outputPath;
  final int durationMs;
  final int expectedDurationMs;
  final int width;
  final int height;
  final bool hasAudio;
  final int fileSizeBytes;
  final String? videoEncoder;
  final String? audioEncoder;

  /// Parts of the timeline that were rendered approximately (for example a missing font).
  final List<String> warnings;

  factory RenderResult.fromMap(Map<String, dynamic> m) => RenderResult(
        outputPath: m['outputPath'] as String,
        durationMs: (m['durationMs'] as num).toInt(),
        expectedDurationMs: (m['expectedDurationMs'] as num).toInt(),
        width: (m['width'] as num).toInt(),
        height: (m['height'] as num).toInt(),
        hasAudio: m['hasAudio'] as bool,
        fileSizeBytes: (m['fileSizeBytes'] as num).toInt(),
        videoEncoder: m['videoEncoder'] as String?,
        audioEncoder: m['audioEncoder'] as String?,
        warnings: ((m['warnings'] as List?) ?? const []).cast<String>(),
      );
}

/// A render progress update. The final event has [state] == completed and a non-null [result].
/// Failures and cancellation arrive as a [MediaEngineException] error on the stream.
class RenderProgress {
  const RenderProgress({required this.jobId, required this.state, required this.progress, this.result});
  final String jobId;
  final RenderState state;

  /// 0.0 – 1.0.
  final double progress;
  final RenderResult? result;

  @override
  String toString() => 'RenderProgress($jobId, $state, ${(progress * 100).toStringAsFixed(0)}%)';
}

/// On-device media engine: Media3 Transformer on Android, AVFoundation on iOS.
///
/// Every method either returns a real result or throws [MediaEngineException]. There are no
/// simulated outputs; unit tests must mock the channels explicitly.
class MediaEngineService {
  static const MethodChannel _channel = MethodChannel('com.workspace180.socialmanager/media_engine');
  static const EventChannel _events = EventChannel('com.workspace180.socialmanager/media_engine/render_events');

  /// One shared platform stream: it sends `listen` on the first subscriber and `cancel` when
  /// the last one leaves, so concurrent jobs share a single native EventSink.
  static Stream<dynamic>? _eventStream;
  static int _jobCounter = 0;

  static Future<T?> _invoke<T>(String method, Map<String, dynamic> args) async {
    try {
      return await _channel.invokeMethod<T>(method, args);
    } on PlatformException catch (e) {
      throw MediaEngineException.fromPlatform(e);
    } on MissingPluginException {
      throw MediaEngineException.unavailable(method);
    }
  }

  static Future<Map<String, dynamic>> _invokeMap(String method, Map<String, dynamic> args) async {
    final r = await _invoke<Map<Object?, Object?>>(method, args);
    if (r == null) throw MediaEngineException('NATIVE_ERROR', '$method returned no result');
    return r.cast<String, dynamic>();
  }

  /// Lossless GOP-aligned cut (no re-encode). The start snaps to the previous keyframe.
  static Future<String> sliceVideo({
    required String sourcePath,
    required String destPath,
    required int startMs,
    required int endMs,
  }) async {
    final r = await _invoke<String>('sliceVideo', {
      'sourcePath': sourcePath,
      'destPath': destPath,
      'startMs': startMs,
      'endMs': endMs,
    });
    if (r == null) throw MediaEngineException('NATIVE_ERROR', 'sliceVideo returned no path');
    return r;
  }

  /// Extracts the audio track as 16 kHz mono for speech-to-text (`/media-editor/transcribe`).
  /// The format comes from [format], or else from the extension of [destPath] (`.wav` gives WAV,
  /// anything else gives AAC in M4A).
  static Future<ExtractedAudio> extractAudio({
    required String sourcePath,
    required String destPath,
    SttAudioFormat? format,
  }) async {
    final fmt = format ?? (destPath.toLowerCase().endsWith('.wav') ? SttAudioFormat.wav : SttAudioFormat.m4a);
    final m = await _invokeMap('extractAudio', {
      'sourcePath': sourcePath,
      'destPath': destPath,
      'format': fmt.name,
    });
    return ExtractedAudio.fromMap(m);
  }

  /// Reads duration, size, rotation, and track presence from a media file.
  static Future<VideoMetadata> getVideoInfo(String sourcePath) async {
    return VideoMetadata.fromMap(await _invokeMap('getVideoInfo', {'sourcePath': sourcePath}));
  }

  /// Finds silent stretches in the audio of [sourcePath], decoded on the device.
  ///
  /// A stretch counts when its RMS level stays below [thresholdDb] dBFS (measured in 20 ms
  /// windows) for at least [minSilenceMs]. Ranges are in source milliseconds, sorted and
  /// non-overlapping. Silence before the first audio sample and up to the end of the file is
  /// included. A source without an audio track returns an empty list.
  static Future<List<({int startMs, int endMs})>> detectSilences({
    required String sourcePath,
    int minSilenceMs = 500,
    double thresholdDb = -40,
  }) async {
    final r = await _invoke<List<Object?>>('detectSilences', {
      'sourcePath': sourcePath,
      'minSilenceMs': minSilenceMs,
      'thresholdDb': thresholdDb,
    });
    if (r == null) throw MediaEngineException('NATIVE_ERROR', 'detectSilences returned no result');
    return [
      for (final e in r.cast<Map<Object?, Object?>>())
        (startMs: (e['startMs'] as num).toInt(), endMs: (e['endMs'] as num).toInt()),
    ];
  }

  /// Detects faces on the device (Google ML Kit, bundled model; no network, no server tokens) in
  /// one frame every [sampleEveryMs]. Returns one [FaceSample] per face: the box centre and size as
  /// 0..1 fractions of the display-oriented frame. A frame without faces contributes nothing.
  static Future<List<FaceSample>> detectFaces({required String sourcePath, int sampleEveryMs = 500}) async {
    final r = await _invoke<List<Object?>>('detectFaces', {'sourcePath': sourcePath, 'sampleEveryMs': sampleEveryMs});
    if (r == null) throw MediaEngineException('NATIVE_ERROR', 'detectFaces returned no result');
    return [for (final e in r.cast<Map<Object?, Object?>>()) FaceSample.fromMap(e.cast<String, dynamic>())];
  }

  /// Beat/onset times (ms) of the audio in [audioPath] (a video or audio file), from energy flux
  /// with an adaptive threshold over decoded PCM. [bpm] is null when there is no steady pulse.
  /// A file without audio returns no beats.
  static Future<({List<int> beatsMs, double? bpm})> detectBeats({required String audioPath}) async {
    final m = await _invokeMap('detectBeats', {'audioPath': audioPath});
    return (
      beatsMs: ((m['beatsMs'] as List?) ?? const []).map((e) => (e as num).toInt()).toList(),
      bpm: (m['bpm'] as num?)?.toDouble(),
    );
  }

  /// Writes one JPEG per timestamp into [outputDir] and returns their paths in order.
  static Future<List<String>> generateThumbnails({
    required String sourcePath,
    required String outputDir,
    required List<int> timesMs,
    int maxWidth = 360,
    bool exact = false,
  }) async {
    final r = await _invoke<List<Object?>>('generateThumbnails', {
      'sourcePath': sourcePath,
      'outputDir': outputDir,
      'timesMs': timesMs,
      'maxWidth': maxWidth,
      'exact': exact,
    });
    if (r == null) throw MediaEngineException('NATIVE_ERROR', 'generateThumbnails returned no paths');
    return r.cast<String>();
  }

  static Stream<Map<String, dynamic>> get _renderEvents =>
      (_eventStream ??= _events.receiveBroadcastStream()).map((e) => (e as Map<Object?, Object?>).cast<String, dynamic>());

  /// Renders an AI Director timeline to an H.264/AAC MP4 at [outputPath] on the device.
  ///
  /// The timeline holds no device paths. Supply local files for every referenced media item:
  /// [assetPaths] by `clips[].assetId`, [overlayPaths] by overlay id (B-roll downloaded
  /// beforehand), [musicPaths] by music id, and optionally [fontPaths] by family or `family:weight`.
  ///
  /// The stream emits progress and ends with a `completed` event whose [RenderProgress.result]
  /// is verified from the written file. Failure or cancellation is a [MediaEngineException]
  /// stream error. Cancelling the subscription cancels the native job. Too little free space for
  /// the estimated output fails with code `INSUFFICIENT_STORAGE` before encoding starts.
  ///
  /// On Android the export runs under a foreground service with a progress notification, so it
  /// keeps going while the app is in the background. On Android 13+ the notification is only
  /// visible once the app holds the POST_NOTIFICATIONS permission.
  static Stream<RenderProgress> renderEditIr({
    required MobileEditIr editIr,
    required String outputPath,
    required Map<String, String> assetPaths,
    Map<String, String> overlayPaths = const {},
    Map<String, String> musicPaths = const {},
    Map<String, String> fontPaths = const {},
    String? watermarkPath,
    Map<String, String> sfxPaths = const {},
    String? jobId,
  }) {
    final id = jobId ?? 'render_${DateTime.now().microsecondsSinceEpoch}_${_jobCounter++}';
    late final StreamController<RenderProgress> controller;
    StreamSubscription<Map<String, dynamic>>? sub;
    var done = false;

    void finish() {
      done = true;
      sub?.cancel();
      controller.close();
    }

    controller = StreamController<RenderProgress>(
      onListen: () async {
        try {
          editIr.validate();
        } on MediaEngineException catch (e) {
          controller.addError(e);
          finish();
          return;
        }
        sub = _renderEvents.where((e) => e['jobId'] == id).listen((e) {
          switch (e['state']) {
            case 'started':
              controller.add(RenderProgress(jobId: id, state: RenderState.started, progress: 0));
            case 'progress':
              controller.add(RenderProgress(jobId: id, state: RenderState.progress, progress: (e['progress'] as num?)?.toDouble() ?? 0));
            case 'completed':
              controller.add(RenderProgress(jobId: id, state: RenderState.completed, progress: 1, result: RenderResult.fromMap(e)));
              finish();
            case 'failed':
              controller.addError(MediaEngineException(e['errorCode'] as String? ?? 'EXPORT_FAILED', e['message'] as String? ?? 'Render failed',
                  detail: e['detail'] as String?));
              finish();
            case 'cancelled':
              controller.addError(const MediaEngineException(MediaEngineException.cancelledCode, 'Render was cancelled'));
              finish();
          }
        }, onError: (Object err) {
          controller.addError(err is PlatformException ? MediaEngineException.fromPlatform(err) : MediaEngineException('NATIVE_ERROR', '$err'));
          finish();
        });
        try {
          await _invoke<String>('renderEditIr', {
            'jobId': id,
            'editIrJson': jsonEncode(editIr.toJson()),
            'outputPath': outputPath,
            'assetPaths': assetPaths,
            'overlayPaths': overlayPaths,
            'musicPaths': musicPaths,
            'fontPaths': fontPaths,
            'watermarkPath': ?watermarkPath,
            'sfxPaths': sfxPaths,
          });
        } on MediaEngineException catch (e) {
          if (!done) {
            controller.addError(e);
            finish();
          }
        }
      },
      onCancel: () async {
        if (!done) {
          done = true;
          await sub?.cancel();
          await cancelRender(id);
        }
      },
    );
    return controller.stream;
  }

  /// Cancels a running render. Returns false if no such job was running.
  static Future<bool> cancelRender(String jobId) async {
    return await _invoke<bool>('cancelRender', {'jobId': jobId}) ?? false;
  }

  /// A standard path in the app documents directory for rendered videos.
  static Future<String> getOutputVideoPath(String fileName) async {
    final dir = await getApplicationDocumentsDirectory();
    final outDir = Directory('${dir.path}/rendered_videos');
    if (!await outDir.exists()) {
      await outDir.create(recursive: true);
    }
    return '${outDir.path}/$fileName';
  }

  /// A standard audio path for transcription.
  static Future<String> getOutputAudioPath(String fileName) async {
    final dir = await getApplicationDocumentsDirectory();
    final outDir = Directory('${dir.path}/extracted_audio');
    if (!await outDir.exists()) {
      await outDir.create(recursive: true);
    }
    return '${outDir.path}/$fileName';
  }
}
