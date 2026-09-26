import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:video_player/video_player.dart';

import '../../core/native_engine/edit_ir.dart';
import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import 'caption_fonts.dart';
import 'director_panel.dart';
import 'export_sheet.dart';
import 'studio_controller.dart';
import 'studio_timeline.dart';
import 'studio_tools.dart';
import 'timeline_ops.dart';

String timecode(int ms) {
  final t = ms < 0 ? 0 : ms;
  final m = t ~/ 60000;
  final s = (t ~/ 1000) % 60;
  final f = (t % 1000) ~/ 100;
  return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}.$f';
}

/// The editor: preview, timeline, manual tools and the AI Director on one timeline.
class StudioSessionScreen extends ConsumerStatefulWidget {
  const StudioSessionScreen({
    super.key,
    this.sourcePath,
    this.postId,
    this.projectId,
    this.pieceId,
    this.hook,
    this.script,
  });
  final String? sourcePath;
  final String? postId;
  final String? projectId;
  final String? pieceId;
  final String? hook;
  final String? script;

  @override
  ConsumerState<StudioSessionScreen> createState() => _StudioSessionScreenState();
}

class _StudioSessionScreenState extends ConsumerState<StudioSessionScreen> {
  late final StudioController c = StudioController(
    director: ref.read(aiDirectorServiceProvider),
    transcriber: ref.read(transcriptionServiceProvider),
    projectId: widget.projectId,
    postId: widget.postId,
    pieceId: widget.pieceId,
    hook: widget.hook,
    script: widget.script,
  );
  VideoPlayerController? _player;
  Object? _loadError;
  bool _loading = false;
  bool _playing = false;
  Timer? _tick;

  @override
  void initState() {
    super.initState();
    c.addListener(_onChange);
    if (widget.sourcePath != null) _load(widget.sourcePath!);

  }

  @override
  void dispose() {
    _tick?.cancel();
    c.removeListener(_onChange);
    c.dispose();
    _player?.dispose();
    super.dispose();
  }

  void _onChange() {
    if (!mounted) return;
    setState(() {});
    if (!_playing) _player?.seekTo(Duration(milliseconds: c.sourcePositionMs));
  }

  Future<void> _load(String path) async {
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      await c.load(path);
      final p = VideoPlayerController.file(File(path));
      await p.initialize();
      await _player?.dispose();
      _player = p;
    } catch (e) {
      _loadError = e;
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _pick() async {
    final f = await ImagePicker().pickVideo(source: ImageSource.gallery);
    if (f != null) await _load(f.path);
  }

  /// Plays the edited timeline by stepping through clips on the source file.
  void _togglePlay() {
    final p = _player;
    final ir = c.ir;
    if (p == null || ir == null) return;
    if (_playing) {
      _tick?.cancel();
      p.pause();
      setState(() => _playing = false);
      return;
    }
    if (c.playheadMs >= ir.durationMs - 50) c.seek(0);
    setState(() => _playing = true);
    var clipIndex = TimelineOps.clipIndexAt(ir, c.playheadMs);
    p.seekTo(Duration(milliseconds: c.sourcePositionMs));
    p.setPlaybackSpeed(ir.clips[clipIndex].speed);
    p.setVolume(ir.clips[clipIndex].volumeDb <= -60 ? 0 : 1);
    p.play();
    _tick = Timer.periodic(const Duration(milliseconds: 40), (_) {
      final cur = c.ir;
      if (cur == null || !mounted) return;
      final clip = cur.clips[clipIndex.clamp(0, cur.clips.length - 1)];
      final src = p.value.position.inMilliseconds;
      if (src >= clip.sourceEndMs - 20) {
        clipIndex++;
        if (clipIndex >= cur.clips.length) {
          _tick?.cancel();
          p.pause();
          c.seek(cur.durationMs);
          setState(() => _playing = false);
          return;
        }
        final next = cur.clips[clipIndex];
        p.seekTo(Duration(milliseconds: next.sourceStartMs));
        p.setPlaybackSpeed(next.speed);
        p.setVolume(next.volumeDb <= -60 ? 0 : 1);
        c.playheadMs = next.timelineStartMs;
      } else {
        c.playheadMs = clip.timelineStartMs + ((src - clip.sourceStartMs).clamp(0, clip.sourceEndMs) / clip.speed).round();
      }
      setState(() {});
    });
  }

  void _stop() {
    if (_playing) _togglePlay();
  }

  void _edit(MobileEditIr Function(MobileEditIr) op, {String? done}) {
    _stop();
    try {
      c.apply(op);
      if (done != null) showInfo(context, done);
    } catch (e) {
      showError(context, e);
    }
  }

  Future<void> _openTool(StudioTool tool) async {
    _stop();
    if (tool == StudioTool.director) {
      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        backgroundColor: AppTheme.surface,
        builder: (_) => DirectorPanel(controller: c),
      );
      return;
    }
    await showStudioTool(context, tool, c, onEdit: _edit);
  }

  Future<bool> _confirmLeave() async {
    if (!c.canUndo) return true;
    return confirm(context, title: 'Leave the editor?', message: 'Unexported edits are lost.', action: 'Leave', destructive: true);
  }

  @override
  Widget build(BuildContext context) {
    final ir = c.ir;
    return PopScope(
      canPop: !c.canUndo,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        if (await _confirmLeave() && context.mounted) context.pop();
      },
      child: Scaffold(
        backgroundColor: AppTheme.background,
        appBar: AppBar(
          backgroundColor: AppTheme.surface,
          title: const Text('Studio'),
          actions: [
            IconButton(tooltip: 'Undo', onPressed: c.canUndo ? c.undo : null, icon: const Icon(Icons.undo_rounded)),
            IconButton(tooltip: 'Redo', onPressed: c.canRedo ? c.redo : null, icon: const Icon(Icons.redo_rounded)),
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: FilledButton(
                onPressed: ir == null
                    ? null
                    : () {
                        _stop();
                        showExportSheet(context, c);
                      },
                child: const Text('Export'),
              ),
            ),
          ],
        ),
        body: _loading
            ? const LoadingView(label: 'Opening video…')
            : ir == null
                ? _Empty(error: _loadError, onPick: _pick, onRecord: () => context.pushReplacement(
                    '/camera?projectId=${widget.projectId ?? ''}&postId=${widget.postId ?? ''}'))
                : Column(children: [
                    Expanded(child: _Preview(controller: c, player: _player, playing: _playing)),
                    _TransportBar(controller: c, playing: _playing, onPlay: _togglePlay, onSplit: () => _edit((ir) => TimelineOps.split(ir, c.playheadMs))),
                    _TranscriptChip(controller: c),
                    StudioTimeline(
                      controller: c,
                      onScrub: (ms) {
                        _stop();
                        c.seek(ms);
                      },
                      onEdit: _edit,
                      onOpenTool: _openTool,
                    ),
                    _ToolBar(onTool: _openTool),
                  ]),
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty({required this.error, required this.onPick, required this.onRecord});
  final Object? error;
  final VoidCallback onPick;
  final VoidCallback onRecord;

  @override
  Widget build(BuildContext context) => Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            if (error != null) ...[ErrorView(error: error!, compact: true), const SizedBox(height: 16)],
            const Icon(Icons.movie_edit, size: 48, color: AppTheme.textSecondary),
            const SizedBox(height: 12),
            Text('Choose a video to edit', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 20),
            FilledButton.icon(onPressed: onPick, icon: const Icon(Icons.video_library_rounded), label: const Text('Choose from gallery')),
            const SizedBox(height: 8),
            OutlinedButton.icon(onPressed: onRecord, icon: const Icon(Icons.videocam_rounded), label: const Text('Record with teleprompter')),
          ]),
        ),
      );
}

/// Source frame at the playhead, cropped/letterboxed like the export, with text and zoom
/// indicators. It is a guide, not a frame-accurate render: Export produces the real video.
class _Preview extends StatelessWidget {
  const _Preview({required this.controller, required this.player, required this.playing});
  final StudioController controller;
  final VideoPlayerController? player;
  final bool playing;

  @override
  Widget build(BuildContext context) {
    final ir = controller.ir!;
    final clip = ir.clips[TimelineOps.clipIndexAt(ir, controller.playheadMs)];
    final t = controller.playheadMs;
    final captions = ir.captions.where((c) => t >= c.startMs && t < c.endMs).toList();
    final zoom = ir.zooms.where((z) => t >= z.startMs && t < z.endMs).firstOrNull;
    final broll = ir.overlays.where((o) => t >= o.timelineStartMs && t < o.timelineEndMs).firstOrNull;
    final p = player;
    final canvasAspect = ir.canvas.width / ir.canvas.height;
    return Container(
      color: AppTheme.background,
      padding: const EdgeInsets.all(12),
      child: Center(
        child: AspectRatio(
          aspectRatio: canvasAspect,
          child: ClipRect(
            child: Container(
              color: _hex(ir.canvas.background),
              child: Stack(fit: StackFit.expand, children: [
                if (p != null && p.value.isInitialized)
                  Transform.scale(
                    scale: zoom?.scale ?? 1,
                    alignment: Alignment(((zoom?.centerX ?? 0.5) * 2) - 1, ((zoom?.centerY ?? 0.5) * 2) - 1),
                    child: _CroppedVideo(player: p, clip: clip, filter: clip.filter),
                  ),
                if (broll != null && broll.isImage && broll.source['url'] is String)
                  Image.network(
                    broll.source['url'] as String,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => const SizedBox.shrink(),
                  ),
                if (broll != null)
                  Container(
                    color: broll.isImage ? null : Colors.black54,
                    alignment: Alignment.topLeft,
                    padding: const EdgeInsets.all(8),
                    child: StatusChip(label: '${broll.isImage ? 'Photo' : 'B-roll'}: ${broll.source['query'] ?? broll.source['kind']}', color: AppTheme.accentBlue, icon: Icons.layers_rounded),
                  ),
                for (final cap in captions)
                  Align(
                    alignment: Alignment(0, ((cap.style['positionY'] as num?)?.toDouble() ?? 0.72) * 2 - 1),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      child: _CaptionPreview(caption: cap, t: t),
                    ),
                  ),
              ]),
            ),
          ),
        ),
      ),
    );
  }

  static Color _hex(String hex) {
    final h = hex.replaceFirst('#', '');
    final v = int.tryParse(h.length == 6 ? 'FF$h' : h, radix: 16);
    return v == null ? Colors.black : Color(v);
  }
}

class _CroppedVideo extends StatelessWidget {
  const _CroppedVideo({required this.player, required this.clip, this.filter});
  final VideoPlayerController player;
  final EditIrClip clip;
  final EditIrFilter? filter;

  @override
  Widget build(BuildContext context) {
    final size = player.value.size;
    final sideways = clip.rotationDeg == 90 || clip.rotationDeg == 270;
    final srcW = sideways ? size.height : size.width;
    final srcH = sideways ? size.width : size.height;
    final crop = clip.crop ?? const EditIrCrop(x: 0, y: 0, width: 1, height: 1);
    Widget video = Transform(
      alignment: Alignment.center,
      transform: Matrix4.identity()
        ..rotateZ(clip.rotationDeg * 3.1415926535 / 180)
        ..scaleByDouble(clip.flipH ? -1.0 : 1.0, 1.0, 1.0, 1.0),
      child: SizedBox(width: size.width, height: size.height, child: VideoPlayer(player)),
    );
    video = SizedBox(width: srcW, height: srcH, child: FittedBox(child: video));
    final f = filter;
    if (f != null) {
      final b = (f.brightness - 1) * 255 * 0.5;
      final ct = f.contrast;
      final s = f.saturation;
      const lr = 0.2126, lg = 0.7152, lb = 0.0722;
      final sr = (1 - s) * lr, sg = (1 - s) * lg, sb = (1 - s) * lb;
      final off = (1 - ct) * 128 + b;
      video = ColorFiltered(
        colorFilter: ColorFilter.matrix([
          ct * (sr + s), ct * sg, ct * sb, 0, off,
          ct * sr, ct * (sg + s), ct * sb, 0, off,
          ct * sr, ct * sg, ct * (sb + s), 0, off,
          0, 0, 0, 1, 0,
        ]),
        child: video,
      );
    }
    // Show only the crop rect, scaled to fill (crop) or fit (no crop) the canvas.
    return FittedBox(
      fit: clip.crop == null ? BoxFit.contain : BoxFit.cover,
      clipBehavior: Clip.hardEdge,
      child: ClipRect(
        child: SizedBox(
          width: srcW * crop.width,
          height: srcH * crop.height,
          child: OverflowBox(
            alignment: Alignment.topLeft,
            maxWidth: srcW,
            maxHeight: srcH,
            child: Transform.translate(offset: Offset(-srcW * crop.x, -srcH * crop.y), child: video),
          ),
        ),
      ),
    );
  }
}

class _CaptionPreview extends StatelessWidget {
  const _CaptionPreview({required this.caption, required this.t});
  final EditIrCaption caption;
  final int t;

  @override
  Widget build(BuildContext context) {
    final st = caption.style;

    Color col2(Object? v, Color d) {
      if (v is! String) return d;
      final h = v.replaceFirst('#', '');
      if (h.length != 6 && h.length != 8) return d;
      final n = int.tryParse(h.length == 6 ? 'FF$h' : h.substring(6) + h.substring(0, 6), radix: 16);
      return n == null ? d : Color(n);
    }

    Color col(String k, Color d) => col2(st[k], d);

    final upper = st['uppercase'] == true;
    final text = col('textColor', Colors.white);
    final hi = col('highlightColor', const Color(0xFFFFE600));
    final bgSpec = st['background'];
    final bg = bgSpec is Map ? col2(bgSpec['color'], Colors.black.withValues(alpha: 0.7)) : null;
    final spans = caption.words.isEmpty || caption.kind == 'text'
        ? [TextSpan(text: upper ? caption.text.toUpperCase() : caption.text)]
        : [
            for (final w in caption.words)
              TextSpan(
                text: '${upper ? w.text.toUpperCase() : w.text} ',
                style: TextStyle(
                  color: st['animation'] == 'none'
                      ? text
                      : (t >= w.startMs && t < w.endMs) || (st['animation'] == 'karaoke' && t >= w.endMs) || w.highlight
                          ? hi
                          : text,
                ),
              ),
          ];
    return Container(
      padding: bg == null ? null : const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: bg == null ? null : BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
      child: Text.rich(
        TextSpan(children: spans),
        textAlign: TextAlign.center,
        style: CaptionFonts.textStyle(
          st,
          color: text,
          fontSize: caption.kind == 'text' ? 22 : 18,
          shadows: [
            if (st['glow'] == true) Shadow(blurRadius: 12, color: hi),
            if (st['shadow'] == true || (st['strokeWidthPx'] as num? ?? 0) > 0) ...const [
              Shadow(blurRadius: 4, color: Colors.black),
              Shadow(blurRadius: 1, color: Colors.black),
            ],
          ],
        ),
      ),
    );
  }
}

class _TransportBar extends StatelessWidget {
  const _TransportBar({required this.controller, required this.playing, required this.onPlay, required this.onSplit});
  final StudioController controller;
  final bool playing;
  final VoidCallback onPlay;
  final VoidCallback onSplit;

  @override
  Widget build(BuildContext context) {
    final ir = controller.ir!;
    final mono = GoogleFonts.jetBrainsMono(fontSize: 13, color: AppTheme.textPrimary);
    return Container(
      color: AppTheme.surface,
      padding: const EdgeInsets.symmetric(horizontal: 8),
      height: 48,
      child: Row(children: [
        IconButton(tooltip: playing ? 'Pause' : 'Play', onPressed: onPlay, icon: Icon(playing ? Icons.pause_rounded : Icons.play_arrow_rounded)),
        Text(timecode(controller.playheadMs), style: mono),
        Text(' / ${timecode(ir.durationMs)}', style: mono.copyWith(color: AppTheme.textMuted)),
        const Spacer(),
        Text('${ir.canvas.aspect} · ${ir.clips.length} clip${ir.clips.length == 1 ? '' : 's'}',
            style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
        IconButton(tooltip: 'Split at playhead', onPressed: onSplit, icon: const Icon(Icons.content_cut_rounded)),
      ]),
    );
  }
}

class _TranscriptChip extends StatelessWidget {
  const _TranscriptChip({required this.controller});
  final StudioController controller;

  @override
  Widget build(BuildContext context) {
    final c = controller;
    final (label, color, icon) = switch (c.transcriptState) {
      TranscriptState.running => ('Transcribing speech…', AppTheme.accentBlue, Icons.graphic_eq_rounded),
      TranscriptState.ready => ('Transcript ready · ${c.words.length} words', AppTheme.success, Icons.check_circle_rounded),
      TranscriptState.failed => ('No transcript: ${errorText(c.transcriptError ?? '')}', AppTheme.warning, Icons.info_rounded),
      TranscriptState.idle => ('', AppTheme.textMuted, Icons.info_rounded),
    };
    if (label.isEmpty) return const SizedBox.shrink();
    return Container(
      width: double.infinity,
      color: AppTheme.surface,
      padding: const EdgeInsets.fromLTRB(12, 0, 4, 4),
      child: Row(children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 6),
        Expanded(child: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, color: color))),
        if (c.transcriptState == TranscriptState.failed && (c.meta?.hasAudio ?? false))
          TextButton(onPressed: c.transcribe, child: const Text('Retry')),
      ]),
    );
  }
}

/// Main track as proportional blocks, with caption / zoom / B-roll / music lanes and a scrubber.
class _ToolBar extends StatelessWidget {
  const _ToolBar({required this.onTool});
  final ValueChanged<StudioTool> onTool;

  @override
  Widget build(BuildContext context) => Container(
        decoration: const BoxDecoration(color: AppTheme.surface, border: Border(top: BorderSide(color: AppTheme.border))),
        child: SafeArea(
          top: false,
          child: SizedBox(
            height: 68,
            child: ListView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: 4), children: [
              for (final t in StudioTool.values)
                InkWell(
                  onTap: () => onTool(t),
                  child: SizedBox(
                    width: 64,
                    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      Icon(t.icon, color: t == StudioTool.director ? AppTheme.primary : AppTheme.textPrimary, size: 22),
                      const SizedBox(height: 4),
                      Text(t.label, style: const TextStyle(fontSize: 10, color: AppTheme.textSecondary), maxLines: 1),
                    ]),
                  ),
                ),
            ]),
          ),
        ),
      );
}
