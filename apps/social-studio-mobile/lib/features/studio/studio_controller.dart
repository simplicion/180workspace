import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';

import '../../core/native_engine/media_engine_service.dart';
import '../../core/network/audio_transcription_service.dart';
import '../director/ai_director_service.dart';
import 'caption_fonts.dart';
import 'timeline_ops.dart';

enum TranscriptState { idle, running, ready, failed }

class DirectorMessage {
  const DirectorMessage({
    required this.fromUser,
    required this.text,
    this.response,
    this.applied = false,
  });
  final bool fromUser;
  final String text;
  final DirectorResponse? response;
  final bool applied;

  DirectorMessage copyWith({bool? applied}) => DirectorMessage(
    fromUser: fromUser,
    text: text,
    response: response,
    applied: applied ?? this.applied,
  );
}

class ExportState {
  const ExportState({
    this.progress = 0,
    this.stage = '',
    this.result,
    this.error,
    this.warnings = const [],
    this.credits = const [],
  });

  /// Credit lines of the stock music, B-roll and SFX in the export (to paste into the post caption).
  final List<String> credits;
  final double progress;
  final String stage;
  final RenderResult? result;
  final Object? error;
  final List<String> warnings;
  bool get running => result == null && error == null;
}

/// One editing session: the source clip, its analysis, the timeline with undo/redo, the AI
/// Director conversation and the export. The UI only reads state and calls methods.
class StudioController extends ChangeNotifier {
  StudioController({
    required this.director,
    required this.transcriber,
    this.projectId,
    this.postId,
    this.pieceId,
    this.hook,
    this.script,
    this.aspect = '9:16',
  });

  final AiDirectorService director;
  final AudioTranscriptionService transcriber;
  final String? projectId;
  final String? postId;
  final String? pieceId;
  final String? hook;
  final String? script;
  final String aspect;

  bool _greeted = false;

  /// Opening turn from a calendar piece or post: the server loads the brand and the piece's
  /// script and replies with a concrete proposal the user can Apply (nothing is applied here).
  Future<void> greet() async {
    final ir = _ir;
    if (_greeted ||
        ir == null ||
        directorBusy ||
        (projectId == null && pieceId == null && postId == null)) {
      return;
    }
    _greeted = true;
    directorBusy = true;
    _notify();
    try {
      final r = await director.direct(
        prompt: '',
        intent: 'greet',
        history: const [],
        media: _analysis(),
        projectId: projectId,
        calendarPieceId: pieceId,
        postId: postId,
        currentEditIR: ir.toJson(),
      );
      r.editIr.validate();
      messages.add(
        DirectorMessage(fromUser: false, text: r.reply, response: r),
      );
    } catch (_) {
      // Optional opening turn: the user can still direct the edit themselves.
    } finally {
      directorBusy = false;
      _notify();
    }
  }

  static const _maxUndo = 50;

  String? sourcePath;
  VideoMetadata? meta;
  MobileEditIr? _ir;
  final List<MobileEditIr> _undo = [];
  final List<MobileEditIr> _redo = [];

  TranscriptState transcriptState = TranscriptState.idle;
  Transcript? transcript;
  Object? transcriptError;

  /// Source-time silences from the on-device detector; lets the director cut pauses even
  /// when there is no transcript.
  List<SilenceRange>? silences;

  /// Licence credit lines by media URL (music, B-roll, SFX). CC BY / BY-SA items must be credited
  /// in the post caption; the others are credited as a courtesy.
  final Map<String, String> mediaCredits = {};

  /// On-device ML Kit face samples of the source (null until detected / when unavailable).
  List<FaceSample>? faces;

  /// On-device beat times of the source audio (source ms).
  List<int>? beatsMs;

  /// Where fill crops centre: the dominant detected face, else the frame centre.
  ({double x, double y})? get faceFocus =>
      faces == null ? null : TimelineOps.faceFocus(faces!);

  int playheadMs = 0;
  int? selectedClip;

  final List<DirectorMessage> messages = [];
  bool directorBusy = false;

  ExportState? export;
  StreamSubscription<RenderProgress>? _renderSub;
  bool _disposed = false;

  MobileEditIr? get ir => _ir;
  bool get canUndo => _undo.isNotEmpty;
  bool get canRedo => _redo.isNotEmpty;
  List<TranscriptWord> get words => transcript?.words ?? const [];

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    _renderSub?.cancel();
    super.dispose();
  }

  /// Loads a local video, builds the starting timeline and starts transcription in the background.
  Future<void> load(String path) async {
    if (!await File(path).exists()) {
      throw MediaEngineException(
        'FILE_NOT_FOUND',
        'The video file is no longer on this device.',
      );
    }
    final info = await MediaEngineService.getVideoInfo(path);
    if (!info.hasVideo) {
      throw const MediaEngineException(
        'NO_VIDEO_TRACK',
        'This file has no video track.',
      );
    }
    sourcePath = path;
    meta = info;
    _ir = TimelineOps.initial(
      projectId: projectId ?? 'local',
      durationMs: info.durationMs,
      width: info.displayWidth,
      height: info.displayHeight,
      aspect: aspect,
      fps: info.frameRate == null ? 30 : info.frameRate!.clamp(24, 60).round(),
    );
    _undo.clear();
    _redo.clear();
    playheadMs = 0;
    selectedClip = null;
    _notify();
    unawaited(_detectFaces(path));
    if (info.hasAudio) {
      unawaited(_detectSilences(path));
      unawaited(_detectBeats(path));
      unawaited(transcribe());
    } else {
      transcriptState = TranscriptState.failed;
      transcriptError = 'This video has no audio, so there is nothing to transcribe. Captions and pause removal are unavailable.';
      _notify();
      unawaited(greet());
    }
  }

  Future<void> _detectSilences(String path) async {
    try {
      final r = await MediaEngineService.detectSilences(sourcePath: path);
      silences = [for (final s in r) SilenceRange(s.startMs, s.endMs)];
    } catch (_) {
      silences =
          null; // optional analysis: the director falls back to transcript gaps
    }
  }

  /// Face track for smart reframe. While the user has not edited yet, the starting crop is re-centred
  /// on the dominant face. Optional: without it crops stay centred.
  Future<void> _detectFaces(String path) async {
    try {
      faces = await MediaEngineService.detectFaces(sourcePath: path);
    } catch (_) {
      faces = null;
      return;
    }
    final ir = _ir;
    final focus = faceFocus;
    if (ir == null ||
        focus == null ||
        _undo.isNotEmpty ||
        ir.clips.length != 1 ||
        _disposed) {
      return;
    }
    final src = ir.sources.firstOrNull;
    final crop = src == null
        ? null
        : TimelineOps.centerCrop(
            src.width,
            src.height,
            ir.canvas,
            focus: focus,
          );
    if (crop != null && ir.clips.single.crop != null) {
      _ir = TimelineOps.setCrop(ir, crop, index: 0);
      _notify();
    }
  }

  Future<void> _detectBeats(String path) async {
    try {
      beatsMs = (await MediaEngineService.detectBeats(audioPath: path)).beatsMs;
    } catch (_) {
      beatsMs = null; // optional analysis
    }
  }

  Future<void> transcribe() async {
    final path = sourcePath;
    if (path == null || transcriptState == TranscriptState.running) return;
    transcriptState = TranscriptState.running;
    transcriptError = null;
    _notify();
    try {
      final audioPath = await MediaEngineService.getOutputAudioPath(
        'stt_${DateTime.now().millisecondsSinceEpoch}.m4a',
      );
      final audio = await MediaEngineService.extractAudio(
        sourcePath: path,
        destPath: audioPath,
      );
      if (audio.fileSizeBytes > AudioTranscriptionService.maxBytes) {
        throw const MediaEngineException(
          'AUDIO_TOO_LARGE',
          'This video is too long to transcribe (audio over 25 MB). Trim it first.',
        );
      }
      final t = await transcriber.transcribe(audio.path);
      unawaited(File(audio.path).delete().catchError((_) => File(audio.path)));
      transcript = t;
      transcriptState = TranscriptState.ready;
      // Speech ranges drive music ducking; recompute them for the current cut.
      final ir = _ir;
      if (ir != null) {
        _ir = MobileEditIr(
          projectId: ir.projectId,
          canvas: ir.canvas,
          durationMs: ir.durationMs,
          sources: ir.sources,
          watermark: ir.watermark,
          clips: ir.clips,
          overlays: ir.overlays,
          captions: ir.captions,
          zooms: ir.zooms,
          effects: ir.effects,
          audio: EditIrAudio(
            originalVolumeDb: ir.audio.originalVolumeDb,
            music: ir.audio.music,
            speechRangesMs: TimelineOps.speechRanges(t.words, ir),
            sfx: ir.audio.sfx,
          ),
        );
      }
    } catch (e) {
      transcriptState = TranscriptState.failed;
      transcriptError = e;
    }
    _notify();
    unawaited(greet());
  }

  /// Applies a manual edit. Throws (without changing anything) if the edit is invalid.
  void apply(MobileEditIr Function(MobileEditIr ir) edit) {
    final current = _ir;
    if (current == null) return;
    final next = edit(current);
    _push(current);
    _ir = next;
    playheadMs = playheadMs.clamp(0, next.durationMs);
    if (selectedClip != null && selectedClip! >= next.clips.length) {
      selectedClip = next.clips.length - 1;
    }
    _notify();
  }

  void _push(MobileEditIr ir) {
    _undo.add(ir);
    if (_undo.length > _maxUndo) _undo.removeAt(0);
    _redo.clear();
  }

  void undo() {
    if (_undo.isEmpty || _ir == null) return;
    _redo.add(_ir!);
    _ir = _undo.removeLast();
    playheadMs = playheadMs.clamp(0, _ir!.durationMs);
    selectedClip = null;
    _notify();
  }

  void redo() {
    if (_redo.isEmpty || _ir == null) return;
    _undo.add(_ir!);
    _ir = _redo.removeLast();
    playheadMs = playheadMs.clamp(0, _ir!.durationMs);
    selectedClip = null;
    _notify();
  }

  void seek(int ms) {
    playheadMs = ms.clamp(0, _ir?.durationMs ?? 0);
    _notify();
  }

  void select(int? clip) {
    selectedClip = clip;
    _notify();
  }

  /// Source position shown in the preview for the current playhead.
  int get sourcePositionMs {
    final ir = _ir;
    if (ir == null) return 0;
    final c = ir.clips[TimelineOps.clipIndexAt(ir, playheadMs)];
    return (c.sourceStartMs + (playheadMs - c.timelineStartMs) * c.speed)
        .round()
        .clamp(c.sourceStartMs, c.sourceEndMs - 1);
  }

  // ── AI Director ────────────────────────────────────────────────────────────

  MediaAnalysis _analysis() {
    final m = meta!;
    return MediaAnalysis(
      durationMs: m.durationMs,
      width: m.displayWidth,
      height: m.displayHeight,
      fps: m.frameRate,
      words: words,
      silences: silences,
      faces: faces,
      beatsMs: beatsMs,
    );
  }

  Future<void> askDirector(String prompt) async {
    final ir = _ir;
    if (ir == null || directorBusy || prompt.trim().isEmpty) return;
    final history = [
      for (final m in messages)
        DirectorTurn(
          role: m.fromUser ? 'user' : 'assistant',
          content: m.fromUser ? m.text : (m.response?.reply ?? m.text),
        ),
    ];
    messages.add(DirectorMessage(fromUser: true, text: prompt.trim()));
    directorBusy = true;
    _notify();
    try {
      final r = await director.direct(
        prompt: prompt,
        history: history,
        media: _analysis(),
        projectId: projectId,
        calendarPieceId: pieceId,
        postId: postId,
        currentEditIR: ir.toJson(),
      );
      r.editIr.validate();
      final autoApply =
          !r.requiresConfirmation && r.appliedOperations.isNotEmpty;
      messages.add(
        DirectorMessage(
          fromUser: false,
          text: r.reply,
          response: r,
          applied: autoApply,
        ),
      );
      if (autoApply) _applyDirector(r);
    } catch (e) {
      messages.add(
        DirectorMessage(
          fromUser: false,
          text:
              'I could not do that: ${e is MediaEngineException ? e.message : e}',
        ),
      );
    } finally {
      directorBusy = false;
      _notify();
    }
  }

  void _applyDirector(DirectorResponse r) {
    final ir = _ir;
    if (ir == null) return;
    final next = r.editIr;
    mediaCredits.addAll(r.credits);
    // Keep the source metadata if the server omitted it, so the next turn stays valid.
    final withSources = next.sources.isNotEmpty
        ? next
        : MobileEditIr(
            projectId: next.projectId,
            canvas: next.canvas,
            durationMs: next.durationMs,
            sources: ir.sources,
            watermark: next.watermark,
            clips: next.clips,
            overlays: next.overlays,
            captions: next.captions,
            zooms: next.zooms,
            audio: next.audio,
            effects: next.effects,
          );
    _push(ir);
    _ir = withSources;
    playheadMs = playheadMs.clamp(0, withSources.durationMs);
    selectedClip = null;
  }

  /// Applies a proposal the director asked the user to confirm.
  void applyProposal(int messageIndex) {
    final m = messages[messageIndex];
    if (m.response == null || m.applied) return;
    _applyDirector(m.response!);
    messages[messageIndex] = m.copyWith(applied: true);
    _notify();
  }

  // ── Export ─────────────────────────────────────────────────────────────────

  Future<Directory> _tempDir() async {
    final d = Directory('${(await getTemporaryDirectory()).path}/studio_media');
    if (!await d.exists()) await d.create(recursive: true);
    return d;
  }

  /// Resolves remote B-roll and music to local files, then renders on the device.
  Future<void> startExport() async {
    final ir = _ir;
    final src = sourcePath;
    if (ir == null || src == null || (export?.running ?? false)) return;
    final warnings = <String>[];
    export = const ExportState(stage: 'Preparing media…');
    _notify();
    try {
      final dir = await _tempDir();
      final overlayPaths = <String, String>{};
      final usedUrls =
          <String>[]; // resolved remote media in this export, for the credits
      var working = ir;
      for (final o in ir.overlays) {
        final kind = o.source['kind'];
        String? url = kind == 'url' ? o.source['url'] as String? : null;
        if (kind == 'stock_query' && !o.isImage) {
          final hit = await director.resolveStockVideo(
            '${o.source['query'] ?? ''}',
          );
          url = hit?.url;
          if (hit?.credit != null) mediaCredits[hit!.url] = hit.credit!;
        }
        if (kind == 'asset' && o.source['assetId'] == 'primary') {
          overlayPaths[o.id] = src;
          continue;
        }
        if (url == null) {
          warnings.add(
            'Skipped B-roll "${o.source['query'] ?? o.id}": no matching clip was found.',
          );
          working = TimelineOps.removeOverlay(working, o.id);
          continue;
        }
        export = ExportState(stage: 'Downloading B-roll…', warnings: warnings);
        _notify();
        // The renderer detects photos by file type, so keep the image extension.
        final imgExt = Uri.tryParse(url)?.path.split('.').last.toLowerCase();
        final ext = !o.isImage
            ? 'mp4'
            : const {'jpg', 'jpeg', 'png', 'webp'}.contains(imgExt)
                ? imgExt!
                : 'jpg';
        overlayPaths[o.id] = await director.download(
          url,
          '${dir.path}/${o.id}.$ext',
        );
        usedUrls.add(url);
      }
      final musicPaths = <String, String>{};
      for (final m in working.audio.music) {
        final kind = m.source['kind'];
        String? url = kind == 'url' ? m.source['url'] as String? : null;
        final query = '${m.source['query'] ?? ''}';
        if (kind == 'stock_query') {
          final t = await director.resolveMusicTrack(query);
          url = t?.url;
          if (t?.credit != null) mediaCredits[t!.url] = t.credit!;
        } else if (url != null &&
            !mediaCredits.containsKey(url) &&
            query.isNotEmpty) {
          // Director-picked catalogue track: look up its credit line (best effort).
          try {
            final t = await director.resolveMusicTrack(query, preferUrl: url);
            if (t?.credit != null) mediaCredits[url] = t!.credit!;
          } catch (_) {}
        }
        if (url == null) {
          warnings.add(
            'Music "${m.source['query'] ?? ''}" could not be found, so the video was exported without music.',
          );
          working = TimelineOps.removeMusic(working);
          continue;
        }
        export = ExportState(stage: 'Downloading music…', warnings: warnings);
        _notify();
        final ext = Uri.tryParse(url)?.path.split('.').last.toLowerCase();
        usedUrls.add(url);
        musicPaths[m.id] = await director.download(
          url,
          '${dir.path}/${m.id}.${const {'mp3', 'm4a', 'aac', 'wav', 'ogg'}.contains(ext) ? ext : 'mp3'}',
        );
      }
      final sfxPaths = <String, String>{};
      final keptSfx = <EditIrSfx>[];
      for (final e in working.audio.sfx) {
        final url = e.source['url'] as String?;
        if (url == null || !url.startsWith('https://')) {
          warnings.add('Skipped a sound effect with no downloadable file.');
          continue;
        }
        try {
          final ext = Uri.tryParse(url)?.path.split('.').last.toLowerCase();
          final safeExt =
              const {'mp3', 'm4a', 'aac', 'wav', 'ogg'}.contains(ext)
              ? ext
              : 'mp3';
          sfxPaths[e.id] = await director.download(
            url,
            '${dir.path}/${e.id}.$safeExt',
          );
          keptSfx.add(e);
          if (e.credit != null) mediaCredits[url] = e.credit!;
        } catch (_) {
          warnings.add(
            'A sound effect could not be downloaded and was left out.',
          );
        }
      }
      if (keptSfx.length != working.audio.sfx.length) {
        final a = working.audio;
        working = MobileEditIr(
          projectId: working.projectId,
          canvas: working.canvas,
          durationMs: working.durationMs,
          clips: working.clips,
          sources: working.sources,
          overlays: working.overlays,
          captions: working.captions,
          zooms: working.zooms,
          effects: working.effects,
          audio: EditIrAudio(
            originalVolumeDb: a.originalVolumeDb,
            music: a.music,
            speechRangesMs: a.speechRangesMs,
            sfx: keptSfx,
          ),
          watermark: working.watermark,
        );
      }
      String? watermarkPath;
      final wm = working.watermark;
      if (wm != null) {
        try {
          export = ExportState(stage: 'Downloading logo…', warnings: warnings);
          _notify();
          final ext = Uri.tryParse(wm.imageUrl)?.path
              .split('.')
              .last
              .toLowerCase();
          final safeExt = const {'png', 'jpg', 'jpeg', 'webp'}.contains(ext)
              ? ext
              : 'png';
          watermarkPath = await director.download(
            wm.imageUrl,
            '${dir.path}/watermark.$safeExt',
          );
        } catch (_) {
          warnings.add(
            'The brand logo could not be downloaded, so the video was exported without the watermark.',
          );
          working = working.withWatermark(null);
        }
      }
      var fontPaths = const <String, String>{};
      if (working.captions.isNotEmpty) {
        export = ExportState(stage: 'Preparing caption fonts…', warnings: warnings);
        _notify();
        final (paths, fontWarnings) = await CaptionFonts.resolveForExport(working);
        fontPaths = paths;
        warnings.addAll(fontWarnings);
      }
      final out = await MediaEngineService.getOutputVideoPath(
        'export_${DateTime.now().millisecondsSinceEpoch}.mp4',
      );
      export = ExportState(stage: 'Rendering…', warnings: warnings);
      _notify();
      final done = Completer<void>();
      _renderSub =
          MediaEngineService.renderEditIr(
            editIr: working,
            outputPath: out,
            assetPaths: {for (final id in working.assetIds) id: src},
            overlayPaths: overlayPaths,
            musicPaths: musicPaths,
            watermarkPath: watermarkPath,
            sfxPaths: sfxPaths,
            fontPaths: fontPaths,
          ).listen(
            (p) {
              export = ExportState(
                progress: p.progress,
                stage: p.state == RenderState.completed ? 'Done' : 'Rendering…',
                result: p.result,
                warnings: [...warnings, ...?p.result?.warnings],
                credits: {for (final u in usedUrls) mediaCredits[u]}
                    .whereType<String>()
                    .toList(),
              );
              _notify();
            },
            onError: (Object e) {
              export = ExportState(error: e, warnings: warnings);
              _notify();
              if (!done.isCompleted) done.complete();
            },
            onDone: () {
              if (!done.isCompleted) done.complete();
            },
            cancelOnError: true,
          );
      await done.future;
    } catch (e) {
      export = ExportState(error: e, warnings: warnings);
      _notify();
    }
  }

  Future<void> cancelExport() async {
    await _renderSub?.cancel();
    _renderSub = null;
    export = null;
    _notify();
  }

  void clearExport() {
    export = null;
    _notify();
  }
}
