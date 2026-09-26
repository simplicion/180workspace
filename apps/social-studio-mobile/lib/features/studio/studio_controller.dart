import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';

import '../../core/native_engine/media_engine_service.dart';
import '../../core/network/audio_transcription_service.dart';
import '../director/ai_director_service.dart';
import 'timeline_ops.dart';

enum TranscriptState { idle, running, ready, failed }

class DirectorMessage {
  const DirectorMessage({required this.fromUser, required this.text, this.response, this.applied = false});
  final bool fromUser;
  final String text;
  final DirectorResponse? response;
  final bool applied;

  DirectorMessage copyWith({bool? applied}) => DirectorMessage(fromUser: fromUser, text: text, response: response, applied: applied ?? this.applied);
}

class ExportState {
  const ExportState({this.progress = 0, this.stage = '', this.result, this.error, this.warnings = const [], this.credit});
  final String? credit;
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

  void initBrandGreeting({String? brandName, String? primaryColor, String? font}) {
    if (messages.isEmpty && (hook != null || script != null)) {
      final name = brandName ?? 'Your Brand';
      messages.add(
        DirectorMessage(
          fromUser: false,
          text: "🎬 **AI Creative Director Ready**\n\n"
              "I have loaded your raw footage for **'${hook ?? 'Your Video'}'**.\n\n"
              "Following **$name**'s brand guidelines (using ${primaryColor ?? '#4F46E5'} accent and ${font ?? 'Inter'}), "
              "I can edit this into a high-retention 9:16 Reel with jump cuts, kinetic captions, and ducked audio. Shall I proceed?",
        ),
      );
      notifyListeners();
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

  /// Licence credit lines by music URL (CC BY tracks must be credited in the post caption).
  final Map<String, String> musicCredits = {};

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
    if (!await File(path).exists()) throw MediaEngineException('FILE_NOT_FOUND', 'The video file is no longer on this device.');
    final info = await MediaEngineService.getVideoInfo(path);
    if (!info.hasVideo) throw const MediaEngineException('NO_VIDEO_TRACK', 'This file has no video track.');
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
    if (info.hasAudio) {
      unawaited(_detectSilences(path));
      unawaited(transcribe());
    } else {
      transcriptState = TranscriptState.failed;
      transcriptError = 'This video has no audio, so there is nothing to transcribe. Captions and pause removal are unavailable.';
      _notify();
    }
  }

  Future<void> _detectSilences(String path) async {
    try {
      final r = await MediaEngineService.detectSilences(sourcePath: path);
      silences = [for (final s in r) SilenceRange(s.startMs, s.endMs)];
    } catch (_) {
      silences = null; // optional analysis: the director falls back to transcript gaps
    }
  }

  Future<void> transcribe() async {
    final path = sourcePath;
    if (path == null || transcriptState == TranscriptState.running) return;
    transcriptState = TranscriptState.running;
    transcriptError = null;
    _notify();
    try {
      final audioPath = await MediaEngineService.getOutputAudioPath('stt_${DateTime.now().millisecondsSinceEpoch}.m4a');
      final audio = await MediaEngineService.extractAudio(sourcePath: path, destPath: audioPath);
      if (audio.fileSizeBytes > AudioTranscriptionService.maxBytes) {
        throw const MediaEngineException('AUDIO_TOO_LARGE', 'This video is too long to transcribe (audio over 25 MB). Trim it first.');
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
          clips: ir.clips,
          overlays: ir.overlays,
          captions: ir.captions,
          zooms: ir.zooms,
          audio: EditIrAudio(
            originalVolumeDb: ir.audio.originalVolumeDb,
            music: ir.audio.music,
            speechRangesMs: TimelineOps.speechRanges(t.words, ir),
          ),
        );
      }
    } catch (e) {
      transcriptState = TranscriptState.failed;
      transcriptError = e;
    }
    _notify();
  }

  /// Applies a manual edit. Throws (without changing anything) if the edit is invalid.
  void apply(MobileEditIr Function(MobileEditIr ir) edit) {
    final current = _ir;
    if (current == null) return;
    final next = edit(current);
    _push(current);
    _ir = next;
    playheadMs = playheadMs.clamp(0, next.durationMs);
    if (selectedClip != null && selectedClip! >= next.clips.length) selectedClip = next.clips.length - 1;
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
    return (c.sourceStartMs + (playheadMs - c.timelineStartMs) * c.speed).round().clamp(c.sourceStartMs, c.sourceEndMs - 1);
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
    );
  }

  Future<void> askDirector(String prompt) async {
    final ir = _ir;
    if (ir == null || directorBusy || prompt.trim().isEmpty) return;
    final history = [
      for (final m in messages)
        DirectorTurn(role: m.fromUser ? 'user' : 'assistant', content: m.fromUser ? m.text : (m.response?.reply ?? m.text)),
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
        currentEditIR: ir.toJson(),
      );
      r.editIr.validate();
      final autoApply = !r.requiresConfirmation && r.appliedOperations.isNotEmpty;
      messages.add(DirectorMessage(fromUser: false, text: r.reply, response: r, applied: autoApply));
      if (autoApply) _applyDirector(r);
    } catch (e) {
      messages.add(DirectorMessage(fromUser: false, text: 'I could not do that: ${e is MediaEngineException ? e.message : e}'));
    } finally {
      directorBusy = false;
      _notify();
    }
  }

  void _applyDirector(DirectorResponse r) {
    final ir = _ir;
    if (ir == null) return;
    final next = r.editIr;
    // Keep the source metadata if the server omitted it, so the next turn stays valid.
    final withSources = next.sources.isNotEmpty
        ? next
        : MobileEditIr(
            projectId: next.projectId,
            canvas: next.canvas,
            durationMs: next.durationMs,
            sources: ir.sources,
            clips: next.clips,
            overlays: next.overlays,
            captions: next.captions,
            zooms: next.zooms,
            audio: next.audio,
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
      var working = ir;
      for (final o in ir.overlays) {
        final kind = o.source['kind'];
        String? url = kind == 'url' ? o.source['url'] as String? : null;
        if (kind == 'stock_query') {
          url = await director.resolveStockVideo('${o.source['query'] ?? ''}');
        }
        if (kind == 'asset' && o.source['assetId'] == 'primary') {
          overlayPaths[o.id] = src;
          continue;
        }
        if (url == null) {
          warnings.add('Skipped B-roll "${o.source['query'] ?? o.id}": no matching clip was found.');
          working = TimelineOps.removeOverlay(working, o.id);
          continue;
        }
        export = ExportState(stage: 'Downloading B-roll…', warnings: warnings);
        _notify();
        overlayPaths[o.id] = await director.download(url, '${dir.path}/${o.id}.mp4');
      }
      final musicPaths = <String, String>{};
      for (final m in working.audio.music) {
        final kind = m.source['kind'];
        String? url = kind == 'url' ? m.source['url'] as String? : null;
        final query = '${m.source['query'] ?? ''}';
        if (kind == 'stock_query') {
          final t = await director.resolveMusicTrack(query);
          url = t?.url;
          if (t?.credit != null) musicCredits[t!.url] = t.credit!;
        } else if (url != null && !musicCredits.containsKey(url) && query.isNotEmpty) {
          // Director-picked catalogue track: look up its credit line (best effort).
          try {
            final t = await director.resolveMusicTrack(query, preferUrl: url);
            if (t?.credit != null) musicCredits[url] = t!.credit!;
          } catch (_) {}
        }
        if (url == null) {
          warnings.add('Music "${m.source['query'] ?? ''}" could not be found, so the video was exported without music.');
          working = TimelineOps.removeMusic(working);
          continue;
        }
        export = ExportState(stage: 'Downloading music…', warnings: warnings);
        _notify();
        final ext = Uri.tryParse(url)?.path.split('.').last.toLowerCase();
        musicPaths[m.id] = await director.download(url, '${dir.path}/${m.id}.${const {'mp3', 'm4a', 'aac', 'wav', 'ogg'}.contains(ext) ? ext : 'mp3'}');
      }
      final out = await MediaEngineService.getOutputVideoPath('export_${DateTime.now().millisecondsSinceEpoch}.mp4');
      export = ExportState(stage: 'Rendering…', warnings: warnings);
      _notify();
      final done = Completer<void>();
      _renderSub = MediaEngineService.renderEditIr(
        editIr: working,
        outputPath: out,
        assetPaths: {for (final id in working.assetIds) id: src},
        overlayPaths: overlayPaths,
        musicPaths: musicPaths,
      ).listen(
        (p) {
          export = ExportState(
            progress: p.progress,
            stage: p.state == RenderState.completed ? 'Done' : 'Rendering…',
            result: p.result,
            warnings: [...warnings, ...?p.result?.warnings],
            credit: working.audio.music.map((m) => musicCredits[m.source['url']]).whereType<String>().firstOrNull,
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
