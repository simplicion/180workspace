import 'package:dio/dio.dart';

import '../config/app_config.dart';
import '../util/json.dart';
import 'api_client.dart';
import 'api_exception.dart';
import 'device_registration.dart';

class TranscriptWord {
  const TranscriptWord({required this.text, required this.startMs, required this.endMs});
  final String text;
  final int startMs;
  final int endMs;

  factory TranscriptWord.fromJson(Json j) => TranscriptWord(
        text: jStrOr(j['text'], ''),
        startMs: jInt(j['startMs']) ?? 0,
        endMs: jInt(j['endMs']) ?? 0,
      );

  Json toJson() => {'text': text, 'startMs': startMs, 'endMs': endMs};
}

class Transcript {
  const Transcript({required this.language, required this.durationMs, required this.text, required this.words});
  final String language;
  final int durationMs;
  final String text;
  final List<TranscriptWord> words;

  factory Transcript.fromJson(Json j) => Transcript(
        language: jStrOr(j['language'], 'en'),
        durationMs: jInt(j['durationMs']) ?? 0,
        text: jStrOr(j['text'], ''),
        words: jList(j['words'], TranscriptWord.fromJson),
      );
}

/// Word-level speech-to-text through the backend (`POST /api/v1/media-editor/transcribe`).
///
/// The app holds no speech-provider key: the server owns the STT credentials. Failures are
/// thrown as [ApiException] with the server's code (`TRANSCRIPTION_UNAVAILABLE`,
/// `AUDIO_TOO_LARGE`, …); there is no canned transcript.
class AudioTranscriptionService {
  AudioTranscriptionService(this._api, this._device);

  final ApiClient _api;
  final DeviceRegistration _device;

  static const maxBytes = 25 * 1024 * 1024;

  static DioMediaType contentTypeFor(String path) {
    final p = path.toLowerCase();
    if (p.endsWith('.wav')) return DioMediaType('audio', 'wav');
    if (p.endsWith('.mp3')) return DioMediaType('audio', 'mpeg');
    if (p.endsWith('.aac')) return DioMediaType('audio', 'aac');
    if (p.endsWith('.ogg')) return DioMediaType('audio', 'ogg');
    if (p.endsWith('.webm')) return DioMediaType('audio', 'webm');
    return DioMediaType('audio', 'mp4');
  }

  Future<Transcript> transcribe(String audioPath, {String language = 'en', CancelToken? cancelToken}) async {
    await _device.ensureToken();
    Future<Json> call() => _api.upload(
          '/api/v1/media-editor/transcribe',
          filePath: audioPath,
          field: 'audio',
          contentType: contentTypeFor(audioPath),
          fields: {'language': language},
          device: true,
          cancelToken: cancelToken,
          timeout: AppConfig.aiReceiveTimeout,
        );
    Json r;
    try {
      r = await call();
    } on ApiException catch (e) {
      if (e.kind != ApiErrorKind.deviceRequired) rethrow;
      await _device.ensureToken(forceRenew: true);
      r = await call();
    }
    if (r['success'] == false) throw ApiException.fromResponse(200, r);
    final data = jMap(r['data']);
    final t = Transcript.fromJson(data);
    if (t.words.isEmpty) {
      throw const ApiException(
        kind: ApiErrorKind.server,
        code: 'TRANSCRIPTION_FAILED',
        message: 'The transcription returned no word timings.',
      );
    }
    return t;
  }
}
