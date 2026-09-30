import 'dart:async';
import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
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
import '../../data/models/vault_item.dart';
import '../library/vault_provider.dart';
import 'caption_fonts.dart';
import 'director_panel.dart';
import 'export_sheet.dart';
import 'studio_controller.dart';
import 'studio_drafts_service.dart';
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
    this.folderId,
    this.folderName,
    this.draftId,
    this.draft,
  });
  final String? sourcePath;
  final String? postId;
  final String? projectId;
  final String? pieceId;
  final String? hook;
  final String? script;
  final String? folderId;
  final String? folderName;
  final String? draftId;
  final StudioDraft? draft;

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
    draftId: widget.draftId ?? widget.draft?.id,
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
    if (widget.draft != null) {
      _loadDraft(widget.draft!);
    } else if (widget.draftId != null) {
      _loadDraftById(widget.draftId!);
    } else if (widget.sourcePath != null && widget.sourcePath!.isNotEmpty) {
      _load(widget.sourcePath!);
    } else if (widget.folderId != null) {
      _loadFromFolder(widget.folderId!);
    }
  }

  Future<void> _loadFromFolder(String folderId) async {
    final allItems = ref.read(vaultItemsProvider).valueOrNull ?? [];
    final folderItems = allItems.where((i) => i.folderId == folderId).toList();
    final videos = folderItems.where((i) => i.type == VaultItemType.video && (i.localPath?.isNotEmpty ?? false)).toList();
    if (videos.isNotEmpty && videos.first.localPath != null) {
      await _load(videos.first.localPath!);
    }
  }

  Future<void> _loadDraft(StudioDraft draft) async {
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      await c.restoreFromDraft(draft);
      final path = draft.sourcePath;
      if (path.isNotEmpty) {
        final p = kIsWeb
            ? VideoPlayerController.networkUrl(Uri.parse(path))
            : VideoPlayerController.file(File(path));
        await p.initialize();
        await _player?.dispose();
        _player = p;
        await p.seekTo(Duration(milliseconds: c.sourcePositionMs));
      }
    } catch (e) {
      _loadError = e;
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _loadDraftById(String draftId) async {
    final d = ref.read(studioDraftsProvider.notifier).getById(draftId);
    if (d != null) {
      await _loadDraft(d);
    } else if (widget.sourcePath != null) {
      await _load(widget.sourcePath!);
    }
  }

  Future<void> _saveDraft({bool popOnSuccess = false}) async {
    final draft = c.createDraft();
    if (draft == null) {
      showError(context, 'No active timeline to save as draft.');
      return;
    }
    await ref.read(studioDraftsProvider.notifier).save(draft);
    if (!mounted) return;
    showInfo(context, 'Draft saved! You can resume from the Studio page.');
    if (popOnSuccess) {
      context.pop();
    }
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
      final p = kIsWeb
          ? VideoPlayerController.networkUrl(Uri.parse(path))
          : VideoPlayerController.file(File(path));
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
    _tick = Timer.periodic(Duration(milliseconds: 40), (_) {
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

  Future<void> _promptLeaveOrSave() async {
    if (!c.canUndo && c.ir != null) {
      context.pop();
      return;
    }

    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppTheme.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: EdgeInsets.fromLTRB(20, 20, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(Icons.bookmark_add_rounded, color: AppTheme.primary, size: 24),
                ),
                SizedBox(width: 14),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Save your draft?', style: Theme.of(ctx).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                    SizedBox(height: 2),
                    Text('Resume editing from where you left off on Studio.', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                  ]),
                ),
              ]),
              SizedBox(height: 20),
              FilledButton.icon(
                icon: Icon(Icons.bookmark_added_rounded),
                label: Text('Save as Draft & Leave'),
                onPressed: () async {
                  Navigator.pop(ctx);
                  await _saveDraft(popOnSuccess: true);
                },
              ),
              SizedBox(height: 10),
              OutlinedButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  context.pop();
                },
                style: OutlinedButton.styleFrom(foregroundColor: AppTheme.error),
                child: Text('Discard Edits & Leave'),
              ),
              SizedBox(height: 4),
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: Text('Keep Editing', style: TextStyle(color: AppTheme.textSecondary)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final ir = c.ir;
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        await _promptLeaveOrSave();
      },
      child: Scaffold(
        backgroundColor: AppTheme.background,
        appBar: AppBar(
          backgroundColor: AppTheme.surface,
          leading: IconButton(
            icon: Icon(Icons.arrow_back),
            onPressed: _promptLeaveOrSave,
          ),
          title: Text('Studio'),
          actions: [
            IconButton(tooltip: 'Undo', onPressed: c.canUndo ? c.undo : null, icon: Icon(Icons.undo_rounded)),
            IconButton(tooltip: 'Redo', onPressed: c.canRedo ? c.redo : null, icon: Icon(Icons.redo_rounded)),
            if (ir != null)
              TextButton.icon(
                onPressed: () => _saveDraft(),
                icon: Icon(Icons.bookmark_border_rounded, size: 18),
                label: Text('Save Draft'),
              ),
            Padding(
              padding: EdgeInsets.only(right: 8),
              child: FilledButton(
                onPressed: ir == null
                    ? null
                    : () {
                        _stop();
                        showExportSheet(context, c);
                      },
                child: Text('Export'),
              ),
            ),
          ],
        ),
        body: _loading
            ? LoadingView(label: 'Opening video…')
            : ir == null
                ? _Empty(error: _loadError, onPick: _pick, onRecord: () => context.pushReplacement(
                    '/camera?projectId=${widget.projectId ?? ''}&postId=${widget.postId ?? ''}'))
                : Column(children: [
                    Expanded(
                      child: _Preview(
                        controller: c,
                        player: _player,
                        playing: _playing,
                        onOpenTool: _openTool,
                        onEdit: _edit,
                      ),
                    ),
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
          padding: EdgeInsets.all(32),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            if (error != null) ...[ErrorView(error: error!, compact: true), SizedBox(height: 16)],
            Icon(Icons.movie_edit, size: 48, color: AppTheme.textSecondary),
            SizedBox(height: 12),
            Text('Choose a video to edit', style: Theme.of(context).textTheme.titleLarge),
            SizedBox(height: 20),
            FilledButton.icon(onPressed: onPick, icon: Icon(Icons.video_library_rounded), label: Text('Choose from gallery')),
            SizedBox(height: 8),
            OutlinedButton.icon(onPressed: onRecord, icon: Icon(Icons.videocam_rounded), label: Text('Record with teleprompter')),
          ]),
        ),
      );
}

/// Source frame at the playhead, cropped/letterboxed like the export, with text and zoom
/// indicators. It is a guide, not a frame-accurate render: Export produces the real video.
/// Source frame at the playhead, cropped/letterboxed like the export, with text and zoom
/// indicators. It is a guide, not a frame-accurate render: Export produces the real video.
class _Preview extends StatelessWidget {
  const _Preview({
    required this.controller,
    required this.player,
    required this.playing,
    required this.onOpenTool,
    required this.onEdit,
  });

  final StudioController controller;
  final VideoPlayerController? player;
  final bool playing;
  final ValueChanged<StudioTool> onOpenTool;
  final EditFn onEdit;

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
      padding: EdgeInsets.all(12),
      child: Center(
        child: AspectRatio(
          aspectRatio: canvasAspect,
          child: ClipRect(
            child: Container(
              color: _hex(ir.canvas.background),
              child: Stack(fit: StackFit.expand, children: [
                // Base primary video
                if (p != null && p.value.isInitialized)
                  Transform.scale(
                    scale: zoom?.scale ?? 1,
                    alignment: Alignment(((zoom?.centerX ?? 0.5) * 2) - 1, ((zoom?.centerY ?? 0.5) * 2) - 1),
                    child: _CroppedVideo(player: p, clip: clip, filter: clip.filter),
                  ),

                // B-roll Video or Image Overlay
                if (broll != null) ...[
                  if (broll.isImage)
                    _BrollOverlayImage(
                      broll: broll,
                      onTap: () => onOpenTool(StudioTool.broll),
                    )
                  else
                    _BrollOverlayVideo(
                      broll: broll,
                      playheadMs: t,
                      playing: playing,
                      onTap: () => onOpenTool(StudioTool.broll),
                    ),

                  // Overlay status chip with mute indicator & shortcut
                  Positioned(
                    top: 8,
                    left: 8,
                    child: InkWell(
                      onTap: () => onOpenTool(StudioTool.broll),
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.75),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppTheme.accentBlue.withValues(alpha: 0.5)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(broll.isImage ? Icons.photo_rounded : Icons.layers_rounded, size: 14, color: AppTheme.accentBlue),
                            SizedBox(width: 5),
                            ConstrainedBox(
                              constraints: BoxConstraints(maxWidth: 160),
                              child: Text(
                                '${broll.isImage ? 'Photo' : 'B-roll'}: ${broll.source['query'] ?? broll.source['kind'] ?? 'Cutaway'}',
                                style: TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.w600),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            if (!broll.isImage && broll.muted) ...[
                              SizedBox(width: 4),
                              Icon(Icons.volume_off_rounded, size: 12, color: AppTheme.warning),
                            ],
                            SizedBox(width: 4),
                            Icon(Icons.tune_rounded, size: 12, color: AppTheme.textMuted),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],

                // Draggable text / captions on top of the preview canvas
                for (final cap in captions)
                  _DraggableCaption(
                    caption: cap,
                    t: t,
                    controller: controller,
                    onTap: () => onOpenTool(cap.kind == 'text' ? StudioTool.text : StudioTool.captions),
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

/// Image B-roll cutaway overlay
class _BrollOverlayImage extends StatelessWidget {
  const _BrollOverlayImage({required this.broll, required this.onTap});
  final EditIrOverlay broll;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final url = broll.source['url'] as String?;
    if (url == null || url.isEmpty) return SizedBox.shrink();
    final isPip = broll.source['pip'] == true;
    final fit = (broll.source['fit'] as String?) ?? 'cover';
    final boxFit = fit == 'contain' ? BoxFit.contain : BoxFit.cover;

    Widget img = Image.network(
      url,
      fit: boxFit,
      errorBuilder: (_, o, s) => Container(color: Colors.black54, child: Icon(Icons.broken_image_rounded, color: AppTheme.textMuted)),
    );

    img = Opacity(opacity: broll.opacity.clamp(0.05, 1.0), child: img);

    if (isPip) {
      return Align(
        alignment: Alignment(0.82, 0.72),
        child: GestureDetector(
          onTap: onTap,
          child: Container(
            width: 120,
            height: 180,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.accentBlue, width: 2),
              boxShadow: [BoxShadow(color: Colors.black54, blurRadius: 8, offset: Offset(0, 4))],
            ),
            child: ClipRRect(borderRadius: BorderRadius.circular(10), child: img),
          ),
        ),
      );
    }

    return GestureDetector(onTap: onTap, child: img);
  }
}

/// Synchronized B-roll Video Player with PiP, framing, cropping, volume and opacity controls
class _BrollOverlayVideo extends StatefulWidget {
  const _BrollOverlayVideo({
    required this.broll,
    required this.playheadMs,
    required this.playing,
    required this.onTap,
  });

  final EditIrOverlay broll;
  final int playheadMs;
  final bool playing;
  final VoidCallback onTap;

  @override
  State<_BrollOverlayVideo> createState() => _BrollOverlayVideoState();
}

class _BrollOverlayVideoState extends State<_BrollOverlayVideo> {
  VideoPlayerController? _controller;
  String? _loadedUrl;
  bool _initializing = false;

  @override
  void initState() {
    super.initState();
    _initPlayer();
  }

  @override
  void didUpdateWidget(_BrollOverlayVideo oldWidget) {
    super.didUpdateWidget(oldWidget);
    final url = widget.broll.source['url'] as String?;
    if (url != _loadedUrl) {
      _initPlayer();
    } else {
      _syncPlayback();
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _initPlayer() async {
    final url = widget.broll.source['url'] as String?;
    if (url == null || url.isEmpty) return;
    setState(() {
      _initializing = true;
      _loadedUrl = url;
    });
    await _controller?.dispose();
    try {
      final isNet = url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || kIsWeb;
      final c = isNet
          ? VideoPlayerController.networkUrl(Uri.parse(url))
          : VideoPlayerController.file(File(url));
      await c.initialize();
      c.setLooping(true);
      if (!mounted) {
        await c.dispose();
        return;
      }
      _controller = c;
      _syncPlayback();
    } catch (e) {
      debugPrint('B-roll player error: $e');
    } finally {
      if (mounted) setState(() => _initializing = false);
    }
  }

  void _syncPlayback() {
    final c = _controller;
    if (c == null || !c.value.isInitialized) return;
    c.setVolume(widget.broll.muted ? 0.0 : 1.0);
    final targetMs = (widget.playheadMs - widget.broll.timelineStartMs).clamp(0, widget.broll.timelineEndMs - widget.broll.timelineStartMs) + widget.broll.sourceStartMs;
    final curMs = c.value.position.inMilliseconds;
    if ((curMs - targetMs).abs() > 200) {
      c.seekTo(Duration(milliseconds: targetMs));
    }
    if (widget.playing && !c.value.isPlaying) {
      c.play();
    } else if (!widget.playing && c.value.isPlaying) {
      c.pause();
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = _controller;
    final broll = widget.broll;
    final isPip = broll.source['pip'] == true;
    final fit = (broll.source['fit'] as String?) ?? 'cover';
    final boxFit = fit == 'contain' ? BoxFit.contain : BoxFit.cover;

    Widget content;
    if (c != null && c.value.isInitialized) {
      content = SizedBox.expand(
        child: FittedBox(
          fit: boxFit,
          clipBehavior: Clip.hardEdge,
          child: SizedBox(
            width: c.value.size.width,
            height: c.value.size.height,
            child: VideoPlayer(c),
          ),
        ),
      );
    } else {
      final thumb = broll.source['thumbnailUrl'] as String?;
      content = thumb != null
          ? Image.network(thumb, fit: boxFit, errorBuilder: (_, o, s) => _placeholder())
          : _placeholder();
    }

    content = Opacity(
      opacity: broll.opacity.clamp(0.05, 1.0),
      child: content,
    );

    if (isPip) {
      return Align(
        alignment: Alignment(0.82, 0.72),
        child: GestureDetector(
          onTap: widget.onTap,
          child: Container(
            width: 125,
            height: 190,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.accentBlue, width: 2),
              boxShadow: [
                BoxShadow(color: Colors.black54, blurRadius: 8, offset: Offset(0, 4)),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  content,
                  Positioned(
                    top: 4,
                    left: 4,
                    child: Container(
                      padding: EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                      decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.7), borderRadius: BorderRadius.circular(4)),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        Icon(Icons.picture_in_picture_alt_rounded, size: 10, color: AppTheme.primary),
                        SizedBox(width: 3),
                        Text('PiP', style: TextStyle(fontSize: 9, color: Colors.white, fontWeight: FontWeight.bold)),
                      ]),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return GestureDetector(
      onTap: widget.onTap,
      child: content,
    );
  }

  Widget _placeholder() => Container(
        color: Colors.black87,
        child: Center(
          child: _initializing
              ? SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primary))
              : Icon(Icons.movie_rounded, color: AppTheme.textMuted, size: 36),
        ),
      );
}

/// CapCut-style draggable text overlay on top of the preview canvas
class _DraggableCaption extends StatefulWidget {
  const _DraggableCaption({
    required this.caption,
    required this.t,
    required this.controller,
    required this.onTap,
  });

  final EditIrCaption caption;
  final int t;
  final StudioController controller;
  final VoidCallback onTap;

  @override
  State<_DraggableCaption> createState() => _DraggableCaptionState();
}

class _DraggableCaptionState extends State<_DraggableCaption> {
  bool _active = false;

  @override
  Widget build(BuildContext context) {
    final posX = (widget.caption.style['positionX'] as num?)?.toDouble() ?? 0.5;
    final posY = (widget.caption.style['positionY'] as num?)?.toDouble() ?? (widget.caption.kind == 'text' ? 0.25 : 0.72);

    return LayoutBuilder(builder: (context, constraints) {
      return Align(
        alignment: Alignment(posX * 2 - 1, posY * 2 - 1),
        child: GestureDetector(
          onTap: () {
            widget.controller.selectTrackItem(widget.caption.id, TrackKind.captions);
            widget.onTap();
          },
          onPanStart: (_) => setState(() => _active = true),
          onPanUpdate: (d) {
            if (constraints.maxWidth <= 0 || constraints.maxHeight <= 0) return;
            final nextX = (posX + d.delta.dx / constraints.maxWidth).clamp(0.05, 0.95);
            final nextY = (posY + d.delta.dy / constraints.maxHeight).clamp(0.05, 0.95);
            widget.controller.applyWithoutHistory((ir) => TimelineOps.updateCaptionPosition(ir, widget.caption.id, positionX: nextX, positionY: nextY));
          },
          onPanEnd: (_) {
            setState(() => _active = false);
            widget.controller.apply((ir) => TimelineOps.updateCaptionPosition(ir, widget.caption.id, positionX: posX, positionY: posY));
          },
          onPanCancel: () => setState(() => _active = false),
          child: Container(
            padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: _active
                ? BoxDecoration(
                    border: Border.all(color: AppTheme.primary, width: 1.5),
                    borderRadius: BorderRadius.circular(8),
                    color: Colors.black.withValues(alpha: 0.2),
                  )
                : null,
            child: _CaptionPreview(caption: widget.caption, t: widget.t),
          ),
        ),
      );
    });
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
    final crop = clip.crop ?? EditIrCrop(x: 0, y: 0, width: 1, height: 1);
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
    final hi = col('highlightColor', Color(0xFFFFE600));
    final bgSpec = st['background'];
    final bg = bgSpec is Map ? col2(bgSpec['color'], Colors.black.withValues(alpha: 0.7)) : null;

    final anim = (st['animation'] as String?) ?? 'none';
    final elapsedMs = (t - caption.startMs).clamp(0, caption.endMs - caption.startMs);
    final textStr = caption.text;

    // Typewriter effect
    String renderedText = textStr;
    if (anim == 'typewriter' && textStr.isNotEmpty) {
      final chars = ((elapsedMs / 80).floor()).clamp(1, textStr.length);
      renderedText = textStr.substring(0, chars);
    }

    final spans = caption.words.isEmpty || caption.kind == 'text'
        ? [TextSpan(text: upper ? renderedText.toUpperCase() : renderedText)]
        : [
            for (final w in caption.words)
              TextSpan(
                text: '${upper ? w.text.toUpperCase() : w.text} ',
                style: TextStyle(
                  color: anim == 'none'
                      ? text
                      : (t >= w.startMs && t < w.endMs) || (anim == 'karaoke' && t >= w.endMs) || w.highlight
                          ? hi
                          : text,
                ),
              ),
          ];

    Widget textWidget = Container(
      padding: bg == null ? null : EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: bg == null ? null : BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
      child: Text.rich(
        TextSpan(children: spans),
        textAlign: TextAlign.center,
        style: CaptionFonts.textStyle(
          st,
          color: text,
          fontSize: (st['fontSizePx'] as num?)?.toDouble() ?? (caption.kind == 'text' ? 24 : 18),
          shadows: [
            if (st['glow'] == true) Shadow(blurRadius: 16, color: hi),
            if (st['shadow'] == true || (st['strokeWidthPx'] as num? ?? 0) > 0) ...[
              Shadow(blurRadius: 4, color: Colors.black),
              Shadow(blurRadius: 1, color: Colors.black),
            ],
          ],
        ),
      ),
    );

    // Apply CapCut motion animations
    if (anim == 'fade_in') {
      final alpha = (elapsedMs / 300).clamp(0.0, 1.0);
      textWidget = Opacity(opacity: alpha, child: textWidget);
    } else if (anim == 'word_pop') {
      final p = (elapsedMs / 250).clamp(0.0, 1.0);
      final s = p < 0.7 ? 0.7 + (p / 0.7) * 0.4 : 1.1 - ((p - 0.7) / 0.3) * 0.1;
      textWidget = Transform.scale(scale: s, child: textWidget);
    } else if (anim == 'slide_up') {
      final p = (elapsedMs / 300).clamp(0.0, 1.0);
      final dy = (1.0 - p) * 20;
      textWidget = Transform.translate(offset: Offset(0, dy), child: textWidget);
    } else if (anim == 'pulse') {
      final s = 1.0 + 0.05 * math.sin(t / 200);
      textWidget = Transform.scale(scale: s, child: textWidget);
    }

    return textWidget;
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
      padding: EdgeInsets.symmetric(horizontal: 8),
      height: 48,
      child: Row(children: [
        IconButton(tooltip: playing ? 'Pause' : 'Play', onPressed: onPlay, icon: Icon(playing ? Icons.pause_rounded : Icons.play_arrow_rounded)),
        Text(timecode(controller.playheadMs), style: mono),
        Text(' / ${timecode(ir.durationMs)}', style: mono.copyWith(color: AppTheme.textMuted)),
        Spacer(),
        Text('${ir.canvas.aspect} · ${ir.clips.length} clip${ir.clips.length == 1 ? '' : 's'}',
            style: TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
        IconButton(tooltip: 'Split at playhead', onPressed: onSplit, icon: Icon(Icons.content_cut_rounded)),
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
    if (label.isEmpty) return SizedBox.shrink();
    return Container(
      width: double.infinity,
      color: AppTheme.surface,
      padding: EdgeInsets.fromLTRB(12, 0, 4, 4),
      child: Row(children: [
        Icon(icon, size: 14, color: color),
        SizedBox(width: 6),
        Expanded(child: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, color: color))),
        if (c.transcriptState == TranscriptState.failed && (c.meta?.hasAudio ?? false))
          TextButton(onPressed: c.transcribe, child: Text('Retry')),
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
        decoration: BoxDecoration(color: AppTheme.surface, border: Border(top: BorderSide(color: AppTheme.border))),
        child: SafeArea(
          top: false,
          child: SizedBox(
            height: 68,
            child: ListView(scrollDirection: Axis.horizontal, padding: EdgeInsets.symmetric(horizontal: 4), children: [
              for (final t in StudioTool.values)
                InkWell(
                  onTap: () => onTool(t),
                  child: SizedBox(
                    width: 64,
                    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      Icon(t.icon, color: t == StudioTool.director ? AppTheme.primary : AppTheme.textPrimary, size: 22),
                      SizedBox(height: 4),
                      Text(t.label, style: TextStyle(fontSize: 10, color: AppTheme.textSecondary), maxLines: 1),
                    ]),
                  ),
                ),
            ]),
          ),
        ),
      );
}
