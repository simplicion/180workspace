import 'package:dio/dio.dart';

import '../../core/config/app_config.dart';
import '../../core/native_engine/media_engine_service.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../../core/network/audio_transcription_service.dart';
import '../../core/network/device_registration.dart';
import '../../core/util/json.dart';

class DirectorTurn {
  const DirectorTurn({required this.role, required this.content});
  final String role; // user | assistant
  final String content;

  Json toJson() => {'role': role, 'content': content};
}

class SilenceRange {
  const SilenceRange(this.startMs, this.endMs);
  final int startMs;
  final int endMs;
  Json toJson() => {'startMs': startMs, 'endMs': endMs};
}

/// The on-device analysis of the source clip sent with every turn (contract §2.1 `media`).
class MediaAnalysis {
  const MediaAnalysis({
    this.assetId = 'primary',
    required this.durationMs,
    required this.width,
    required this.height,
    this.fps,
    this.words = const [],
    this.silences,
  });

  final String assetId;
  final int durationMs;
  final int width;
  final int height;
  final double? fps;
  final List<TranscriptWord> words;
  final List<SilenceRange>? silences;

  bool get hasTranscript => words.isNotEmpty;

  Json toJson() => compact({
        'assetId': assetId,
        'durationMs': durationMs,
        'width': width,
        'height': height,
        'fps': fps,
        'transcript': words.isEmpty ? null : {'words': words.map((w) => w.toJson()).toList()},
        'silences': silences?.map((s) => s.toJson()).toList(),
      });
}

class DirectorResponse {
  const DirectorResponse({
    required this.plannerSource,
    required this.plannerReason,
    required this.summary,
    required this.reply,
    required this.operations,
    required this.appliedOperations,
    required this.rejectedOperations,
    required this.warnings,
    required this.requiresConfirmation,
    required this.editIrJson,
    required this.editIr,
  });

  final String plannerSource;
  final String? plannerReason;
  final String summary;
  final String reply;
  final List<Json> operations;
  final List<String> appliedOperations;
  final List<String> rejectedOperations;
  final List<String> warnings;
  final bool requiresConfirmation;

  /// Raw `editIR`, sent back unchanged as `currentEditIR` on the next turn.
  final Json editIrJson;
  final MobileEditIr editIr;

  bool get isDeterministic => plannerSource == 'deterministic';

  factory DirectorResponse.fromData(Json d) {
    final ir = jMap(d['editIR']);
    if (ir.isEmpty) {
      throw const ApiException(kind: ApiErrorKind.server, message: 'The AI Director returned no timeline (editIR).');
    }
    MobileEditIr parsed;
    try {
      parsed = MobileEditIr.fromJson(ir);
    } on MediaEngineException catch (e) {
      throw ApiException(kind: ApiErrorKind.server, code: e.code, message: 'The AI Director returned an invalid timeline: ${e.message}');
    }
    final summary = jStr(d['summary']) ?? '';
    return DirectorResponse(
      plannerSource: jStr(d['plannerSource']) ?? 'unknown',
      plannerReason: jStr(d['plannerReason']),
      summary: summary,
      reply: jStr(d['reply']) ?? summary,
      operations: jList(d['operations'], (m) => m),
      appliedOperations: jStrList(d['appliedOperations']),
      rejectedOperations: jStrList(d['rejectedOperations']),
      warnings: jStrList(d['warnings']),
      requiresConfirmation: jBool(d['requiresConfirmation']),
      editIrJson: ir,
      editIr: parsed,
    );
  }
}

class StockVideoResult {
  const StockVideoResult({
    required this.id,
    required this.downloadUrl,
    this.previewUrl,
    this.thumbnailUrl,
    this.durationSec,
    this.width,
    this.height,
    required this.provider,
    this.author,
  });

  final String id;
  final String downloadUrl;
  final String? previewUrl;
  final String? thumbnailUrl;
  final double? durationSec;
  final int? width;
  final int? height;
  final String provider; // 'pexels' | 'pixabay'
  final String? author;
}

class StockAudioResult {
  const StockAudioResult({
    required this.id,
    required this.url,
    required this.title,
    this.durationSec,
    required this.provider,
    required this.kind, // 'music' | 'sfx'
    this.attribution,
  });

  final String id;
  final String url;
  final String title;
  final double? durationSec;
  final String provider;
  final String kind;
  final String? attribution;
}

/// `POST /api/v1/media-editor/ai-direct` (docs/social-studio-mobile/AI_DIRECTOR_CONTRACT.md).
///
/// Every failure is thrown; there is no fallback edit plan.
class AiDirectorService {
  AiDirectorService(this._api, this._device);

  final ApiClient _api;
  final DeviceRegistration _device;

  static const path = '/api/v1/media-editor/ai-direct';
  static const maxHistory = 20;

  static Json buildRequest({
    required String prompt,
    required List<DirectorTurn> history,
    required MediaAnalysis media,
    String? projectId,
    Json? currentEditIR,
  }) {
    final trimmed = history.length > maxHistory ? history.sublist(history.length - maxHistory) : history;
    return {
      'prompt': prompt.length > 2000 ? prompt.substring(0, 2000) : prompt,
      'history': trimmed.map((t) => t.toJson()).toList(),
      'projectId': ?projectId,
      'media': media.toJson(),
      'currentEditIR': currentEditIR,
    };
  }

  Future<DirectorResponse> direct({
    required String prompt,
    required List<DirectorTurn> history,
    required MediaAnalysis media,
    String? projectId,
    Json? currentEditIR,
    CancelToken? cancelToken,
  }) async {
    if (prompt.trim().isEmpty) {
      throw const ApiException(kind: ApiErrorKind.validation, message: 'Tell the director what to change.');
    }
    await _device.ensureToken();
    final body = buildRequest(
      prompt: prompt.trim(),
      history: history,
      media: media,
      projectId: projectId,
      currentEditIR: currentEditIR,
    );
    Future<Json> call() => _api.post(path,
        body: body, device: true, timeout: AppConfig.aiReceiveTimeout, cancelToken: cancelToken);
    Json r;
    try {
      r = await call();
    } on ApiException catch (e) {
      if (e.kind != ApiErrorKind.deviceRequired) rethrow;
      await _device.ensureToken(forceRenew: true);
      r = await call();
    }
    if (r['success'] != true) throw ApiException.fromResponse(200, r);
    return DirectorResponse.fromData(jMap(r['data']));
  }

  static String? _firstHttpUrl(Object? list, List<String> keys) {
    if (list is! List) return null;
    for (final item in list.whereType<Map>()) {
      for (final k in keys) {
        final v = jStr(item[k]);
        if (v != null && v.startsWith('http')) return v;
      }
    }
    return null;
  }

  /// Searches unified stock media (Pexels + Pixabay) for B-roll video clips.
  Future<List<StockVideoResult>> searchStockVideos(String query, {String orientation = 'portrait'}) async {
    try {
      final r = await _api.get('/api/v1/media-editor/stock/unified', query: {
        'query': query,
        'type': 'video',
        'orientation': orientation,
        'perPage': 18,
      });
      final list = <StockVideoResult>[];
      final unified = (r['unifiedVideos'] as List?)?.whereType<Map>().toList() ?? const [];
      for (final v in unified) {
        final downloadUrl = jStr(v['downloadUrl']) ?? jStr(v['previewVideoUrl']) ?? _firstHttpUrl(v['video_files'], const ['link']);
        if (downloadUrl == null) continue;
        final preview = jStr(v['previewVideoUrl']) ?? downloadUrl;
        final thumb = jStr(v['thumbnailUrl']) ?? jStr(v['image']) ?? jStr(v['picture_url']);
        final id = jStr(v['id']) ?? 'vid_${list.length}';
        final provider = jStr(v['provider']) ?? (id.startsWith('pexels') ? 'pexels' : 'pixabay');
        final author = jStr(v['photographer']) ?? jStr(v['user']) ?? 'Creator';
        final dur = (v['durationSec'] ?? v['duration'] as num?)?.toDouble();
        final w = (v['width'] as num?)?.toInt();
        final h = (v['height'] as num?)?.toInt();
        list.add(StockVideoResult(
          id: id,
          downloadUrl: downloadUrl,
          previewUrl: preview,
          thumbnailUrl: thumb,
          durationSec: dur,
          width: w,
          height: h,
          provider: provider,
          author: author,
        ));
      }
      if (list.isNotEmpty) return list;
    } on ApiException catch (e) {
      if (e.isAccessLock || e.kind == ApiErrorKind.unauthorized) rethrow;
    } catch (_) {}

    // Fallback to stock search if unified fails or yields no items
    try {
      final r = await _api.get('/api/v1/media-editor/stock/search', query: {
        'query': query,
        'type': 'videos',
        'orientation': orientation,
        'perPage': 18,
      });
      final videos = (r['videos'] as List?)?.whereType<Map>().toList() ?? const [];
      final list = <StockVideoResult>[];
      for (final v in videos) {
        final dl = jStr(v['downloadUrl']) ?? _firstHttpUrl(v['video_files'], const ['link']) ?? '';
        if (dl.isEmpty) continue;
        list.add(StockVideoResult(
          id: jStr(v['id']) ?? 'vid',
          downloadUrl: dl,
          previewUrl: jStr(v['previewVideoUrl']) ?? dl,
          thumbnailUrl: jStr(v['thumbnailUrl']) ?? jStr(v['image']),
          durationSec: (v['duration'] as num?)?.toDouble(),
          width: (v['width'] as num?)?.toInt(),
          height: (v['height'] as num?)?.toInt(),
          provider: 'pexels',
          author: jStr(v['photographer']) ?? 'Pexels Creator',
        ));
      }
      return list;
    } on ApiException catch (e) {
      if (e.isAccessLock || e.kind == ApiErrorKind.unauthorized) rethrow;
      return const [];
    } catch (_) {
      return const [];
    }
  }

  /// Searches unified royalty-free music and sound effects (Pixabay Music + Freesound SFX).
  Future<List<StockAudioResult>> searchStockAudio(String query, {String type = 'all'}) async {
    try {
      final r = await _api.get('/api/v1/media-editor/stock/unified', query: {
        'query': query,
        'type': type,
        'perPage': 20,
      });
      final audioList = (r['unifiedAudio'] as List?)?.whereType<Map>().toList() ?? const [];
      final list = <StockAudioResult>[];
      for (final a in audioList) {
        final url = jStr(a['url']) ?? jStr(a['downloadUrl']) ?? jStr(a['previewUrl']);
        if (url == null || !url.startsWith('http')) continue;
        list.add(StockAudioResult(
          id: jStr(a['id']) ?? 'aud_${list.length}',
          url: url,
          title: jStr(a['title']) ?? jStr(a['name']) ?? 'Audio Track',
          durationSec: (a['durationSec'] as num?)?.toDouble(),
          provider: jStr(a['provider']) ?? 'royalty-free',
          kind: jStr(a['kind']) ?? 'music',
          attribution: jStr(a['attribution']) ?? jStr(a['license']),
        ));
      }
      if (list.isNotEmpty) return list;
    } on ApiException catch (e) {
      if (e.isAccessLock || e.kind == ApiErrorKind.unauthorized) rethrow;
    } catch (_) {}

    // Fallback: /stock/music catalogue
    try {
      final r = await _api.get('/api/v1/media-editor/stock/music', query: {'query': query});
      final tracks = (r['tracks'] as List?)?.whereType<Map>().toList() ?? const [];
      final list = <StockAudioResult>[];
      for (final t in tracks) {
        final u = jStr(t['url']) ?? '';
        if (u.isEmpty) continue;
        list.add(StockAudioResult(
          id: jStr(t['id']) ?? 'track',
          url: u,
          title: jStr(t['title']) ?? query,
          durationSec: (t['durationSec'] as num?)?.toDouble(),
          provider: 'catalogue',
          kind: 'music',
          attribution: jStr(t['attribution']),
        ));
      }
      return list;
    } on ApiException catch (e) {
      if (e.isAccessLock || e.kind == ApiErrorKind.unauthorized) rethrow;
      return const [];
    } catch (_) {
      return const [];
    }
  }

  /// Resolves a `stock_query` B-roll overlay to a video URL (contract §3.3). Null if none found.
  Future<String?> resolveStockVideo(String query) async {
    final results = await searchStockVideos(query);
    return results.firstOrNull?.downloadUrl;
  }

  /// Resolves a `stock_query` music phrase through the unified stock search.
  Future<String?> resolveMusic(String query) async => (await resolveMusicTrack(query))?.url;

  /// A music track for a mood [query], with the credit line its licence requires.
  Future<({String url, String? credit})?> resolveMusicTrack(String query, {String? preferUrl}) async {
    final results = await searchStockAudio(query);
    final match = results.where((t) => preferUrl == null || t.url == preferUrl).firstOrNull;
    if (match != null) {
      final m = match;
      return (url: m.url, credit: m.attribution);
    }
    return null;
  }

  /// Downloads a remote media file for the renderer (which only takes local paths).
  Future<String> download(String url, String destPath, {CancelToken? cancelToken}) async {
    await Dio(BaseOptions(receiveTimeout: AppConfig.uploadTimeout)).download(url, destPath, cancelToken: cancelToken);
    return destPath;
  }
}
