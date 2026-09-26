import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:video_player/video_player.dart';

import '../../core/native_engine/edit_ir.dart';
import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../../core/widgets/universal_skeleton.dart';
import '../director/ai_director_service.dart';
import '../projects/project_provider.dart';
import 'studio_controller.dart';
import 'studio_session_screen.dart' show timecode;
import 'text_templates.dart';
import 'timeline_ops.dart';

enum StudioTool {
  director('AI Director', Icons.auto_awesome_rounded),
  library('Library', Icons.library_add_rounded),
  trim('Trim', Icons.straighten_rounded),
  delete('Delete', Icons.delete_outline_rounded),
  order('Reorder', Icons.swap_horiz_rounded),
  speed('Speed', Icons.speed_rounded),
  volume('Volume', Icons.volume_up_rounded),
  canvas('Canvas', Icons.crop_rounded),
  rotate('Rotate', Icons.rotate_90_degrees_cw_rounded),
  filter('Filters', Icons.filter_vintage_rounded),
  adjust('Adjust', Icons.tune_rounded),
  text('Text', Icons.title_rounded),
  captions('Captions', Icons.closed_caption_rounded),
  music('Music', Icons.music_note_rounded),
  zoom('Zoom', Icons.zoom_in_rounded),
  broll('B-roll', Icons.layers_rounded),
  transition('Transition', Icons.compare_rounded);

  const StudioTool(this.label, this.icon);
  final String label;
  final IconData icon;
}

typedef EditFn = void Function(MobileEditIr Function(MobileEditIr) op, {String? done});

/// Filter looks the renderer supports (contract §3.2) with their colour multipliers.
const filterLooks = <String, EditIrFilter>{
  'Vivid': EditIrFilter(preset: 'VIVID', brightness: 1.03, contrast: 1.1, saturation: 1.3),
  'Cinematic': EditIrFilter(preset: 'CINEMATIC_TEAL_ORANGE', brightness: 0.98, contrast: 1.15, saturation: 1.05),
  'Warm': EditIrFilter(preset: 'VINTAGE_WARM', brightness: 1.02, contrast: 0.95, saturation: 0.9),
  'Mono': EditIrFilter(preset: 'NOIR_BW', brightness: 1.0, contrast: 1.2, saturation: 0),
  'Neon': EditIrFilter(preset: 'CYBER_NEON', brightness: 1.0, contrast: 1.15, saturation: 1.45),
  'Glow': EditIrFilter(preset: 'GLOW', brightness: 1.08, contrast: 0.92, saturation: 1.05),
};

Future<void> showStudioTool(BuildContext context, StudioTool tool, StudioController c, {required EditFn onEdit}) {
  final ir = c.ir!;
  final selected = c.selectedClip;
  final clipIndex = selected ?? TimelineOps.clipIndexAt(ir, c.playheadMs);
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppTheme.surface,
    builder: (ctx) => Padding(
      padding: EdgeInsets.fromLTRB(16, 16, 16, MediaQuery.of(ctx).viewInsets.bottom + 16),
      child: SafeArea(
        child: switch (tool) {
          StudioTool.trim => _TrimSheet(c: c, index: clipIndex, onEdit: onEdit),
          StudioTool.delete => _DeleteSheet(c: c, index: clipIndex, onEdit: onEdit),
          StudioTool.order => _OrderSheet(c: c, index: clipIndex, onEdit: onEdit),
          StudioTool.speed => _SpeedSheet(c: c, index: clipIndex, onEdit: onEdit),
          StudioTool.volume => _VolumeSheet(c: c, index: clipIndex, onEdit: onEdit),
          StudioTool.canvas => _CanvasSheet(c: c, onEdit: onEdit),
          StudioTool.rotate => _RotateSheet(c: c, index: clipIndex, onEdit: onEdit),
          StudioTool.filter => _FilterSheet(c: c, index: clipIndex, onEdit: onEdit),
          StudioTool.adjust => _AdjustSheet(c: c, index: clipIndex, onEdit: onEdit),
          StudioTool.text => _TextSheet(c: c, onEdit: onEdit),
          StudioTool.captions => _CaptionsSheet(c: c, onEdit: onEdit),
          StudioTool.music => _MusicSheet(c: c, onEdit: onEdit),
          StudioTool.zoom => _ZoomSheet(c: c, onEdit: onEdit),
          StudioTool.broll => _BrollSheet(c: c, onEdit: onEdit),
          StudioTool.transition => _TransitionSheet(c: c, onEdit: onEdit),
          StudioTool.library => _LibrarySheet(c: c, onEdit: onEdit),
          StudioTool.director => const SizedBox.shrink(),
        },
      ),
    ),
  );
}

// ── shared bits ──────────────────────────────────────────────────────────────

class _Title extends StatelessWidget {
  const _Title(this.text, {this.subtitle});
  final String text;
  final String? subtitle;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(text, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 18)),
          if (subtitle != null) Text(subtitle!, style: Theme.of(context).textTheme.labelSmall),
        ]),
      );
}

/// "This clip / All clips" switch for per-clip tools.
class _Scope extends StatelessWidget {
  const _Scope({required this.all, required this.onChanged, required this.index, required this.count});
  final bool all;
  final ValueChanged<bool> onChanged;
  final int index;
  final int count;

  @override
  Widget build(BuildContext context) => count < 2
      ? const SizedBox.shrink()
      : Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: SegmentedButton<bool>(
            segments: [
              ButtonSegment(value: false, label: Text('Clip ${index + 1}')),
              const ButtonSegment(value: true, label: Text('All clips')),
            ],
            selected: {all},
            onSelectionChanged: (s) => onChanged(s.first),
          ),
        );
}

void _close(BuildContext context) => Navigator.of(context).pop();

// ── clip tools ───────────────────────────────────────────────────────────────

class _TrimSheet extends StatefulWidget {
  const _TrimSheet({required this.c, required this.index, required this.onEdit});
  final StudioController c;
  final int index;
  final EditFn onEdit;

  @override
  State<_TrimSheet> createState() => _TrimSheetState();
}

class _TrimSheetState extends State<_TrimSheet> {
  late final EditIrClip clip = widget.c.ir!.clips[widget.index];
  late final int srcLen = widget.c.ir!.sources.firstOrNull?.durationMs ?? clip.sourceEndMs;
  late RangeValues v = RangeValues(clip.sourceStartMs.toDouble(), clip.sourceEndMs.toDouble());

  @override
  Widget build(BuildContext context) => Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        _Title('Trim clip ${widget.index + 1}', subtitle: 'Drag the handles to set where this clip starts and ends in the original video.'),
        RangeSlider(
          values: v,
          min: 0,
          max: srcLen.toDouble(),
          divisions: (srcLen / 100).clamp(1, 2000).round(),
          labels: RangeLabels(timecode(v.start.round()), timecode(v.end.round())),
          onChanged: (r) => setState(() => v = r),
        ),
        Text('${timecode(v.start.round())} → ${timecode(v.end.round())}  (${((v.end - v.start) / 1000).toStringAsFixed(1)}s)',
            textAlign: TextAlign.center, style: const TextStyle(fontFeatures: [FontFeature.tabularFigures()])),
        const SizedBox(height: 16),
        FilledButton(
          onPressed: () {
            _close(context);
            widget.onEdit((ir) => TimelineOps.trim(ir, widget.index, sourceStartMs: v.start.round(), sourceEndMs: v.end.round()));
          },
          child: const Text('Apply trim'),
        ),
      ]);
}

class _DeleteSheet extends StatelessWidget {
  const _DeleteSheet({required this.c, required this.index, required this.onEdit});
  final StudioController c;
  final int index;
  final EditFn onEdit;

  @override
  Widget build(BuildContext context) {
    final clip = c.ir!.clips[index];
    return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      _Title('Delete', subtitle: 'Everything after the deleted part moves up; captions, music and B-roll stay in sync.'),
      ListTile(
        leading: const Icon(Icons.delete_outline_rounded, color: AppTheme.error),
        title: Text('Delete clip ${index + 1}'),
        subtitle: Text('${timecode(clip.timelineStartMs)} – ${timecode(clip.timelineEndMs)}'),
        enabled: c.ir!.clips.length > 1,
        onTap: () {
          _close(context);
          onEdit((ir) => TimelineOps.deleteClip(ir, index), done: 'Clip deleted');
        },
      ),
      ListTile(
        leading: const Icon(Icons.first_page_rounded),
        title: const Text('Delete everything before the playhead'),
        enabled: c.playheadMs > TimelineOps.minClipMs,
        onTap: () {
          _close(context);
          onEdit((ir) => TimelineOps.removeRange(ir, 0, c.playheadMs));
        },
      ),
      ListTile(
        leading: const Icon(Icons.last_page_rounded),
        title: const Text('Delete everything after the playhead'),
        enabled: c.ir!.durationMs - c.playheadMs > TimelineOps.minClipMs,
        onTap: () {
          _close(context);
          onEdit((ir) => TimelineOps.removeRange(ir, c.playheadMs, ir.durationMs));
        },
      ),
    ]);
  }
}

class _OrderSheet extends StatelessWidget {
  const _OrderSheet({required this.c, required this.index, required this.onEdit});
  final StudioController c;
  final int index;
  final EditFn onEdit;

  @override
  Widget build(BuildContext context) {
    final n = c.ir!.clips.length;
    return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      _Title('Reorder clip ${index + 1} of $n', subtitle: n < 2 ? 'Split the video first to get clips to reorder.' : null),
      Row(children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: index == 0
                ? null
                : () {
                    _close(context);
                    c.select(index - 1);
                    onEdit((ir) => TimelineOps.moveClip(ir, index, index - 1));
                  },
            icon: const Icon(Icons.arrow_back_rounded),
            label: const Text('Earlier'),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: index >= n - 1
                ? null
                : () {
                    _close(context);
                    c.select(index + 1);
                    onEdit((ir) => TimelineOps.moveClip(ir, index, index + 1));
                  },
            icon: const Icon(Icons.arrow_forward_rounded),
            label: const Text('Later'),
          ),
        ),
      ]),
    ]);
  }
}

class _SpeedSheet extends StatefulWidget {
  const _SpeedSheet({required this.c, required this.index, required this.onEdit});
  final StudioController c;
  final int index;
  final EditFn onEdit;

  @override
  State<_SpeedSheet> createState() => _SpeedSheetState();
}

class _SpeedSheetState extends State<_SpeedSheet> {
  late double speed = widget.c.ir!.clips[widget.index].speed;
  bool all = false;

  @override
  Widget build(BuildContext context) => Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const _Title('Speed', subtitle: 'Voice pitch is preserved.'),
        _Scope(all: all, onChanged: (v) => setState(() => all = v), index: widget.index, count: widget.c.ir!.clips.length),
        Wrap(spacing: 8, children: [
          for (final s in const [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0])
            ChoiceChip(label: Text('${s}x'), selected: speed == s, onSelected: (_) => setState(() => speed = s)),
        ]),
        Slider(value: speed, min: 0.25, max: 4, divisions: 75, label: '${speed.toStringAsFixed(2)}x', onChanged: (v) => setState(() => speed = (v * 100).round() / 100)),
        FilledButton(
          onPressed: () {
            _close(context);
            widget.onEdit((ir) => TimelineOps.setSpeed(ir, speed, index: all ? null : widget.index));
          },
          child: Text('Set ${speed.toStringAsFixed(2)}x'),
        ),
      ]);
}

class _VolumeSheet extends StatefulWidget {
  const _VolumeSheet({required this.c, required this.index, required this.onEdit});
  final StudioController c;
  final int index;
  final EditFn onEdit;

  @override
  State<_VolumeSheet> createState() => _VolumeSheetState();
}

class _VolumeSheetState extends State<_VolumeSheet> {
  late double clipDb = widget.c.ir!.clips[widget.index].volumeDb.clamp(-60, 12);
  late double masterDb = widget.c.ir!.audio.originalVolumeDb.clamp(-60, 12);
  bool all = false;

  String _fmt(double db) => db <= -60 ? 'Muted' : '${db >= 0 ? '+' : ''}${db.toStringAsFixed(0)} dB';

  @override
  Widget build(BuildContext context) => Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const _Title('Original audio'),
        _Scope(all: all, onChanged: (v) => setState(() => all = v), index: widget.index, count: widget.c.ir!.clips.length),
        Text('Clip volume: ${_fmt(clipDb)}'),
        Slider(value: clipDb, min: -60, max: 12, divisions: 72, onChanged: (v) => setState(() => clipDb = v.roundToDouble())),
        Text('Whole video voice level: ${_fmt(masterDb)}'),
        Slider(value: masterDb, min: -60, max: 12, divisions: 72, onChanged: (v) => setState(() => masterDb = v.roundToDouble())),
        Row(children: [
          TextButton(onPressed: () => setState(() => clipDb = -60), child: const Text('Mute clip')),
          const Spacer(),
          FilledButton(
            onPressed: () {
              _close(context);
              widget.onEdit((ir) => TimelineOps.setOriginalVolume(TimelineOps.setClipVolume(ir, clipDb, index: all ? null : widget.index), masterDb));
            },
            child: const Text('Apply'),
          ),
        ]),
      ]);
}

class _CanvasSheet extends StatefulWidget {
  const _CanvasSheet({required this.c, required this.onEdit});
  final StudioController c;
  final EditFn onEdit;

  @override
  State<_CanvasSheet> createState() => _CanvasSheetState();
}

class _CanvasSheetState extends State<_CanvasSheet> {
  late String aspect = widget.c.ir!.canvas.aspect;
  late bool fill = widget.c.ir!.clips.first.crop != null || TimelineOps.centerCrop(
            widget.c.ir!.sources.firstOrNull?.width ?? 0, widget.c.ir!.sources.firstOrNull?.height ?? 0, widget.c.ir!.canvas) ==
        null;

  static const _labels = {'9:16': 'Reels · TikTok · Shorts', '1:1': 'Square', '4:5': 'Feed portrait', '16:9': 'YouTube · landscape'};

  @override
  Widget build(BuildContext context) => Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const _Title('Canvas & crop'),
        RadioGroup<String>(
          groupValue: aspect,
          onChanged: (v) => setState(() => aspect = v ?? aspect),
          child: Column(children: [
            for (final a in TimelineOps.aspects)
              RadioListTile<String>(value: a, title: Text(a), subtitle: Text(_labels[a] ?? ''), dense: true),
          ]),
        ),
        SegmentedButton<bool>(
          segments: const [
            ButtonSegment(value: true, label: Text('Fill (crop)'), icon: Icon(Icons.crop_rounded)),
            ButtonSegment(value: false, label: Text('Fit (bars)'), icon: Icon(Icons.fit_screen_rounded)),
          ],
          selected: {fill},
          onSelectionChanged: (s) => setState(() => fill = s.first),
        ),
        const SizedBox(height: 16),
        FilledButton(
          onPressed: () {
            _close(context);
            widget.onEdit((ir) => TimelineOps.setAspect(ir, aspect, fill: fill, focus: widget.c.faceFocus));
          },
          child: const Text('Apply'),
        ),
      ]);
}

class _RotateSheet extends StatefulWidget {
  const _RotateSheet({required this.c, required this.index, required this.onEdit});
  final StudioController c;
  final int index;
  final EditFn onEdit;

  @override
  State<_RotateSheet> createState() => _RotateSheetState();
}

class _RotateSheetState extends State<_RotateSheet> {
  bool all = true;

  @override
  Widget build(BuildContext context) => Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const _Title('Rotate & flip'),
        _Scope(all: all, onChanged: (v) => setState(() => all = v), index: widget.index, count: widget.c.ir!.clips.length),
        Row(children: [
          Expanded(
            child: OutlinedButton.icon(
              onPressed: () {
                _close(context);
                widget.onEdit((ir) => TimelineOps.rotate(ir, index: all ? null : widget.index));
              },
              icon: const Icon(Icons.rotate_90_degrees_cw_rounded),
              label: const Text('Rotate 90°'),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: OutlinedButton.icon(
              onPressed: () {
                _close(context);
                widget.onEdit((ir) => TimelineOps.rotate(ir, index: all ? null : widget.index, rotate90: false, toggleFlip: true));
              },
              icon: const Icon(Icons.flip_rounded),
              label: const Text('Flip'),
            ),
          ),
        ]),
      ]);
}

class _FilterSheet extends StatefulWidget {
  const _FilterSheet({required this.c, required this.index, required this.onEdit});
  final StudioController c;
  final int index;
  final EditFn onEdit;

  @override
  State<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<_FilterSheet> {
  bool all = true;

  @override
  Widget build(BuildContext context) {
    final current = widget.c.ir!.clips[widget.index].filter?.preset;
    return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const _Title('Filters'),
      _Scope(all: all, onChanged: (v) => setState(() => all = v), index: widget.index, count: widget.c.ir!.clips.length),
      Wrap(spacing: 8, runSpacing: 8, children: [
        ChoiceChip(
          label: const Text('None'),
          selected: current == null,
          onSelected: (_) {
            _close(context);
            widget.onEdit((ir) => TimelineOps.setFilter(ir, null, index: all ? null : widget.index));
          },
        ),
        for (final e in filterLooks.entries)
          ChoiceChip(
            label: Text(e.key),
            selected: current == e.value.preset,
            onSelected: (_) {
              _close(context);
              widget.onEdit((ir) => TimelineOps.setFilter(ir, e.value, index: all ? null : widget.index));
            },
          ),
      ]),
    ]);
  }
}

class _AdjustSheet extends StatefulWidget {
  const _AdjustSheet({required this.c, required this.index, required this.onEdit});
  final StudioController c;
  final int index;
  final EditFn onEdit;

  @override
  State<_AdjustSheet> createState() => _AdjustSheetState();
}

class _AdjustSheetState extends State<_AdjustSheet> {
  late final EditIrFilter f = widget.c.ir!.clips[widget.index].filter ?? const EditIrFilter();
  late double b = f.brightness, ct = f.contrast, s = f.saturation;
  bool all = true;

  Widget _slider(String label, double v, ValueChanged<double> on) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('$label  ${((v - 1) * 100).round() >= 0 ? '+' : ''}${((v - 1) * 100).round()}'),
        Slider(value: v, min: 0, max: 2, divisions: 40, onChanged: on),
      ]);

  @override
  Widget build(BuildContext context) => Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const _Title('Adjust colour'),
        _Scope(all: all, onChanged: (v) => setState(() => all = v), index: widget.index, count: widget.c.ir!.clips.length),
        _slider('Brightness', b, (v) => setState(() => b = v)),
        _slider('Contrast', ct, (v) => setState(() => ct = v)),
        _slider('Saturation', s, (v) => setState(() => s = v)),
        Row(children: [
          TextButton(onPressed: () => setState(() => b = ct = s = 1), child: const Text('Reset')),
          const Spacer(),
          FilledButton(
            onPressed: () {
              _close(context);
              final unchanged = b == 1 && ct == 1 && s == 1 && f.preset == 'NORMAL';
              widget.onEdit((ir) => TimelineOps.setFilter(
                  ir, unchanged ? null : EditIrFilter(preset: f.preset, brightness: b, contrast: ct, saturation: s),
                  index: all ? null : widget.index));
            },
            child: const Text('Apply'),
          ),
        ]),
      ]);
}

// ── overlays & audio ─────────────────────────────────────────────────────────

class _TextSheet extends StatefulWidget {
  const _TextSheet({required this.c, required this.onEdit});
  final StudioController c;
  final EditFn onEdit;

  @override
  State<_TextSheet> createState() => _TextSheetState();
}

class _TextSheetState extends State<_TextSheet> {
  final _text = TextEditingController();
  double seconds = 3;
  double y = 0.2;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final titles = widget.c.ir!.captions.where((c) => c.kind == 'text').toList();
    return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      _Title('Add text', subtitle: 'Starts at ${timecode(widget.c.playheadMs)}'),
      TextField(controller: _text, autofocus: true, maxLines: 2, decoration: fieldDecoration('Title or lower third')),
      Text('Show for ${seconds.toStringAsFixed(1)}s'),
      Slider(value: seconds, min: 0.5, max: 10, divisions: 19, onChanged: (v) => setState(() => seconds = v)),
      SegmentedButton<double>(
        segments: const [ButtonSegment(value: 0.2, label: Text('Top')), ButtonSegment(value: 0.5, label: Text('Middle')), ButtonSegment(value: 0.82, label: Text('Bottom'))],
        selected: {y},
        onSelectionChanged: (v) => setState(() => y = v.first),
      ),
      const SizedBox(height: 12),
      FilledButton(
        onPressed: () {
          final t = _text.text;
          _close(context);
          widget.onEdit((ir) => TimelineOps.addText(ir, t, startMs: widget.c.playheadMs, durationMs: (seconds * 1000).round(), positionY: y));
        },
        child: const Text('Add text'),
      ),
      if (titles.isNotEmpty) ...[
        const SectionHeader('On this video'),
        for (final t in titles)
          ListTile(
            dense: true,
            title: Text(t.text, maxLines: 1, overflow: TextOverflow.ellipsis),
            subtitle: Text('${timecode(t.startMs)} – ${timecode(t.endMs)}'),
            trailing: IconButton(
              icon: const Icon(Icons.delete_outline_rounded),
              onPressed: () {
                _close(context);
                widget.onEdit((ir) => TimelineOps.removeCaption(ir, t.id));
              },
            ),
          ),
      ],
    ]);
  }
}

class _CaptionsSheet extends StatefulWidget {
  const _CaptionsSheet({required this.c, required this.onEdit});
  final StudioController c;
  final EditFn onEdit;

  @override
  State<_CaptionsSheet> createState() => _CaptionsSheetState();
}

class _CaptionsSheetState extends State<_CaptionsSheet> {
  String preset = 'BOLD_POP';
  int words = 3;
  String color = '#FFE600';
  double y = 0.72;

  @override
  Widget build(BuildContext context) {
    final c = widget.c;
    final has = c.ir!.captions.any((x) => x.kind == 'caption');
    final ready = c.transcriptState == TranscriptState.ready;
    return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      _Title('Captions',
          subtitle: ready
              ? 'Word-synced from the transcript (${c.words.length} words).'
              : c.transcriptState == TranscriptState.running
                  ? 'Waiting for the transcript…'
                  : 'Captions need a transcript. ${errorText(c.transcriptError ?? '')}'),
      Wrap(spacing: 8, children: [
        for (final e in TimelineOps.captionPresets.entries)
          ChoiceChip(label: Text(e.value), selected: preset == e.key, onSelected: (_) => setState(() => preset = e.key)),
      ]),
      const SizedBox(height: 8),
      Row(children: [
        const Text('Highlight'),
        const SizedBox(width: 8),
        for (final hex in const ['#FFE600', '#22D3EE', '#4ADE80', '#F472B6', '#FFFFFF'])
          GestureDetector(
            onTap: () => setState(() => color = hex),
            child: Container(
              width: 32,
              height: 32,
              margin: const EdgeInsets.only(right: 8),
              decoration: BoxDecoration(
                color: Color(int.parse('FF${hex.substring(1)}', radix: 16)),
                shape: BoxShape.circle,
                border: Border.all(color: color == hex ? AppTheme.primary : AppTheme.border, width: color == hex ? 3 : 1),
              ),
            ),
          ),
      ]),
      Text('Words per caption: $words'),
      Slider(value: words.toDouble(), min: 1, max: 6, divisions: 5, onChanged: (v) => setState(() => words = v.round())),
      SegmentedButton<double>(
        segments: const [ButtonSegment(value: 0.25, label: Text('Top')), ButtonSegment(value: 0.5, label: Text('Middle')), ButtonSegment(value: 0.72, label: Text('Bottom'))],
        selected: {y},
        onSelectionChanged: (v) => setState(() => y = v.first),
      ),
      const SizedBox(height: 12),
      Row(children: [
        if (has)
          TextButton(
            onPressed: () {
              _close(context);
              widget.onEdit((ir) => TimelineOps.clearCaptions(ir), done: 'Captions removed');
            },
            child: const Text('Remove', style: TextStyle(color: AppTheme.error)),
          ),
        if (!ready && c.transcriptState == TranscriptState.failed)
          TextButton(onPressed: c.transcribe, child: const Text('Retry transcript')),
        const Spacer(),
        if (has)
          OutlinedButton(
            onPressed: () {
              _close(context);
              widget.onEdit((ir) => TimelineOps.styleCaptions(ir, preset, highlightColor: color, positionY: y));
            },
            child: const Text('Restyle'),
          ),
        const SizedBox(width: 8),
        FilledButton(
          onPressed: !ready
              ? null
              : () {
                  _close(context);
                  widget.onEdit((ir) => TimelineOps.autoCaptions(ir, c.words, preset: preset, wordsPerCaption: words, highlightColor: color, positionY: y),
                      done: 'Captions added');
                },
          child: Text(has ? 'Regenerate' : 'Add captions'),
        ),
      ]),
    ]);
  }
}

class _MusicSheet extends ConsumerStatefulWidget {
  const _MusicSheet({required this.c, required this.onEdit});
  final StudioController c;
  final EditFn onEdit;

  @override
  ConsumerState<_MusicSheet> createState() => _MusicSheetState();
}

class _MusicSheetState extends ConsumerState<_MusicSheet> {
  late final EditIrMusic? m = widget.c.ir!.audio.music.firstOrNull;
  late double vol = m?.volumeDb ?? -16;
  late bool duck = m?.duck?.enabled ?? true;
  late bool fades = (m?.fadeInMs ?? 500) > 0;
  final _query = TextEditingController(text: 'upbeat');
  bool _busy = false;
  bool _searching = false;
  List<StockAudioResult>? _results;
  String? _previewingUrl;
  VideoPlayerController? _previewPlayer;

  static const _moodChips = ['upbeat', 'lo-fi', 'cinematic', 'ambient', 'energetic', 'calm', 'electronic'];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _searchAudio(_query.text);
    });
  }

  @override
  void dispose() {
    _query.dispose();
    _previewPlayer?.dispose();
    super.dispose();
  }

  Future<void> _togglePreview(String url) async {
    if (_previewingUrl == url) {
      if (_previewPlayer?.value.isPlaying ?? false) {
        await _previewPlayer?.pause();
      } else {
        await _previewPlayer?.play();
      }
      setState(() {});
      return;
    }

    await _previewPlayer?.dispose();
    _previewPlayer = null;
    setState(() => _previewingUrl = url);

    try {
      final player = VideoPlayerController.networkUrl(Uri.parse(url));
      _previewPlayer = player;
      await player.initialize();
      await player.play();
      if (mounted) setState(() {});
    } catch (_) {
      if (mounted) {
        setState(() {
          _previewingUrl = null;
          _previewPlayer = null;
        });
      }
    }
  }

  Future<void> _searchAudio(String mood) async {
    final q = mood.trim();
    if (q.isEmpty) return;
    setState(() => _searching = true);
    try {
      final res = await ref.read(aiDirectorServiceProvider).searchStockAudio(q);
      if (!mounted) return;
      setState(() {
        _results = res;
        _searching = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _searching = false);
    }
  }

  Future<void> _applyTrack(String url, String title, String? credit) async {
    await _previewPlayer?.dispose();
    _previewPlayer = null;
    if (credit != null && credit.isNotEmpty) {
      widget.c.mediaCredits[url] = credit;
    }
    if (!mounted) return;
    _close(context);
    widget.onEdit(
      (ir) => TimelineOps.setMusic(
        ir,
        url: url,
        title: title,
        volumeDb: vol,
        fadeInMs: fades ? 500 : 0,
        fadeOutMs: fades ? 1000 : 0,
        duckUnderSpeech: duck,
      ),
      done: 'Music added',
    );
  }

  Future<void> _upload() async {
    final files = await FilePicker.pickFiles(type: FileType.audio);
    final file = files.firstOrNull;
    final path = file?.path;
    if (file == null || path == null || !mounted) return;
    setState(() => _busy = true);
    final url = await guarded(context, () => ref.read(socialApiProvider).uploadFile(path));
    if (!mounted) return;
    setState(() => _busy = false);
    if (url != null) {
      _applyTrack(url, file.name, null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasSpeech = widget.c.ir!.audio.speechRangesMs.isNotEmpty;
    return ConstrainedBox(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.8),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _Title('Music & Soundtracks',
                subtitle: m == null
                    ? 'Plays under the video and loops automatically.'
                    : 'Current: ${m!.source['query'] ?? 'custom track'}'),
            Row(children: [
              Expanded(
                child: TextField(
                  controller: _query,
                  onSubmitted: _searchAudio,
                  decoration: fieldDecoration('Mood / Genre', hint: 'upbeat, chill, cinematic…'),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton.icon(
                onPressed: _searching || _busy ? null : () => _searchAudio(_query.text),
                icon: const Icon(Icons.search_rounded, size: 18),
                label: const Text('Find'),
              ),
            ]),
            const SizedBox(height: 8),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final tag in _moodChips)
                    Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: ActionChip(
                        label: Text(tag, style: const TextStyle(fontSize: 12)),
                        backgroundColor: _query.text.trim().toLowerCase() == tag ? AppTheme.primary.withValues(alpha: 0.3) : AppTheme.surfaceSubtle,
                        side: BorderSide(
                          color: _query.text.trim().toLowerCase() == tag ? AppTheme.primary : AppTheme.border,
                        ),
                        onPressed: () {
                          _query.text = tag;
                          _searchAudio(tag);
                        },
                      ),
                    ),
                ],
              ),
            ),
            if (_searching)
              const SizedBox(height: 160, child: UniversalSkeleton(type: SkeletonType.projects)),
            if (_results != null && !_searching) ...[
              const SizedBox(height: 12),
              Text(
                'Found ${_results!.length} tracks (Pixabay / Freesound):',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textSecondary),
              ),
              const SizedBox(height: 6),
              if (_results!.isEmpty)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: AppTheme.surfaceSubtle, borderRadius: BorderRadius.circular(12)),
                  child: const Text('No tracks found for this mood. Try "energetic" or "calm", or upload an audio file.',
                      style: TextStyle(color: AppTheme.textMuted)),
                )
              else
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _results!.length.clamp(0, 10),
                  separatorBuilder: (_, _) => const Divider(height: 1, color: AppTheme.borderSubtle),
                  itemBuilder: (ctx, i) {
                    final t = _results![i];
                    final isPlaying = _previewingUrl == t.url && (_previewPlayer?.value.isPlaying ?? false);
                    final durStr = t.durationSec != null ? '${(t.durationSec! / 60).floor()}:${(t.durationSec! % 60).round().toString().padLeft(2, '0')}' : '';
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: IconButton(
                        icon: Icon(
                          isPlaying ? Icons.pause_circle_filled_rounded : Icons.play_circle_fill_rounded,
                          color: isPlaying ? AppTheme.success : AppTheme.primary,
                          size: 36,
                        ),
                        onPressed: () => _togglePreview(t.url),
                      ),
                      title: Text(t.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                      subtitle: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                            decoration: BoxDecoration(color: AppTheme.surfaceElevated, borderRadius: BorderRadius.circular(4)),
                            child: Text(t.provider.toUpperCase(), style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppTheme.textSecondary)),
                          ),
                          if (durStr.isNotEmpty) ...[
                            const SizedBox(width: 6),
                            Text(durStr, style: const TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                          ],
                        ],
                      ),
                      trailing: FilledButton.tonal(
                        style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6)),
                        onPressed: () => _applyTrack(t.url, t.title, t.attribution),
                        child: const Text('Use', style: TextStyle(fontSize: 12)),
                      ),
                    );
                  },
                ),
            ],
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: _busy || _searching ? null : _upload,
              icon: const Icon(Icons.upload_file_rounded),
              label: const Text('Use my own audio file'),
            ),
            if (_busy) const Padding(padding: EdgeInsets.only(top: 8), child: LinearProgressIndicator()),
            const SizedBox(height: 12),
            Text('Music volume: ${vol.toStringAsFixed(0)} dB'),
            Slider(value: vol, min: -40, max: 0, divisions: 40, onChanged: (v) => setState(() => vol = v.roundToDouble())),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              value: duck && hasSpeech,
              onChanged: hasSpeech ? (v) => setState(() => duck = v) : null,
              title: const Text('Lower music while someone speaks'),
              subtitle: hasSpeech ? null : const Text('Needs a transcript'),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              value: fades,
              onChanged: (v) => setState(() => fades = v),
              title: const Text('Fade in and out'),
            ),
            if (m != null)
              Row(children: [
                TextButton(
                  onPressed: () {
                    _close(context);
                    widget.onEdit((ir) => TimelineOps.removeMusic(ir), done: 'Music removed');
                  },
                  child: const Text('Remove music', style: TextStyle(color: AppTheme.error)),
                ),
                const Spacer(),
                FilledButton(
                  onPressed: () {
                    _close(context);
                    widget.onEdit((ir) => TimelineOps.updateMusic(ir, volumeDb: vol, duck: duck, fadeInMs: fades ? 500 : 0, fadeOutMs: fades ? 1000 : 0));
                  },
                  child: const Text('Update'),
                ),
              ]),
          ],
        ),
      ),
    );
  }
}

class _ZoomSheet extends StatefulWidget {
  const _ZoomSheet({required this.c, required this.onEdit});
  final StudioController c;
  final EditFn onEdit;

  @override
  State<_ZoomSheet> createState() => _ZoomSheetState();
}

class _ZoomSheetState extends State<_ZoomSheet> {
  double scale = 1.3;
  double seconds = 1.5;

  @override
  Widget build(BuildContext context) {
    final zooms = widget.c.ir!.zooms;
    return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      _Title('Punch-in zoom', subtitle: 'At ${timecode(widget.c.playheadMs)}'),
      Text('Zoom ${scale.toStringAsFixed(1)}x'),
      Slider(value: scale, min: 1.1, max: 2.0, divisions: 9, onChanged: (v) => setState(() => scale = v)),
      Text('Hold ${seconds.toStringAsFixed(1)}s'),
      Slider(value: seconds, min: 0.5, max: 5, divisions: 9, onChanged: (v) => setState(() => seconds = v)),
      FilledButton(
        onPressed: () {
          _close(context);
          widget.onEdit((ir) => TimelineOps.addZoom(ir, startMs: widget.c.playheadMs, durationMs: (seconds * 1000).round(), scale: scale));
        },
        child: const Text('Add zoom'),
      ),
      for (final z in zooms)
        ListTile(
          dense: true,
          title: Text('${z.scale.toStringAsFixed(1)}x zoom'),
          subtitle: Text('${timecode(z.startMs)} – ${timecode(z.endMs)}'),
          trailing: IconButton(
            icon: const Icon(Icons.delete_outline_rounded),
            onPressed: () {
              _close(context);
              widget.onEdit((ir) => TimelineOps.removeZoom(ir, z.id));
            },
          ),
        ),
    ]);
  }
}

class _BrollSheet extends ConsumerStatefulWidget {
  const _BrollSheet({required this.c, required this.onEdit});
  final StudioController c;
  final EditFn onEdit;

  @override
  ConsumerState<_BrollSheet> createState() => _BrollSheetState();
}

class _BrollSheetState extends ConsumerState<_BrollSheet> {
  final _query = TextEditingController(text: 'cinematic');
  double seconds = 3;
  bool _busy = false;
  bool _searching = false;
  List<StockVideoResult>? _results;

  static const _ideaChips = ['cinematic', 'nature', 'office', 'city night', 'technology', 'people', 'coffee', 'coding'];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _searchVideos(_query.text);
    });
  }

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  Future<void> _searchVideos(String query) async {
    final q = query.trim();
    if (q.isEmpty) return;
    setState(() => _searching = true);
    try {
      final res = await ref.read(aiDirectorServiceProvider).searchStockVideos(q);
      if (!mounted) return;
      setState(() {
        _results = res;
        _searching = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _searching = false);
    }
  }

  void _addClip(String url, String label, {String? credit}) {
    if (credit != null && credit.isNotEmpty) widget.c.mediaCredits[url] = credit;
    _close(context);
    widget.onEdit(
      (ir) => TimelineOps.addBroll(
        ir,
        {'kind': 'url', 'url': url, 'query': label},
        startMs: widget.c.playheadMs,
        durationMs: (seconds * 1000).round(),
      ),
      done: 'B-roll added',
    );
  }

  Future<void> _fromGallery() async {
    final f = await ImagePicker().pickVideo(source: ImageSource.gallery);
    if (f == null || !mounted) return;
    setState(() => _busy = true);
    final url = await guarded(context, () => ref.read(socialApiProvider).uploadFile(f.path));
    if (!mounted) return;
    setState(() => _busy = false);
    if (url != null) {
      _addClip(url, f.name);
    }
  }

  @override
  Widget build(BuildContext context) {
    final overlays = widget.c.ir!.overlays;
    return ConstrainedBox(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.8),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _Title('B-roll Cutaways', subtitle: 'Full-screen overlay from ${timecode(widget.c.playheadMs)}. Voice keeps playing.'),
            Row(children: [
              Expanded(
                child: TextField(
                  controller: _query,
                  onSubmitted: _searchVideos,
                  decoration: fieldDecoration('Search stock video', hint: 'e.g. city at night'),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton.icon(
                onPressed: _searching || _busy ? null : () => _searchVideos(_query.text),
                icon: const Icon(Icons.search_rounded, size: 18),
                label: const Text('Find'),
              ),
            ]),
            const SizedBox(height: 8),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final tag in _ideaChips)
                    Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: ActionChip(
                        label: Text(tag, style: const TextStyle(fontSize: 12)),
                        backgroundColor: _query.text.trim().toLowerCase() == tag ? AppTheme.primary.withValues(alpha: 0.3) : AppTheme.surfaceSubtle,
                        side: BorderSide(
                          color: _query.text.trim().toLowerCase() == tag ? AppTheme.primary : AppTheme.border,
                        ),
                        onPressed: () {
                          _query.text = tag;
                          _searchVideos(tag);
                        },
                      ),
                    ),
                ],
              ),
            ),
            if (_searching)
              const SizedBox(height: 160, child: UniversalSkeleton(type: SkeletonType.projects)),
            if (_results != null && !_searching) ...[
              const SizedBox(height: 12),
              Text(
                'Found ${_results!.length} clips (Pexels & Pixabay):',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textSecondary),
              ),
              const SizedBox(height: 8),
              if (_results!.isEmpty)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: AppTheme.surfaceSubtle, borderRadius: BorderRadius.circular(12)),
                  child: const Text('No video clips found. Try another query like "city" or "drone".', style: TextStyle(color: AppTheme.textMuted)),
                )
              else
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 3,
                    crossAxisSpacing: 8,
                    mainAxisSpacing: 8,
                    childAspectRatio: 0.72,
                  ),
                  itemCount: _results!.length.clamp(0, 15),
                  itemBuilder: (ctx, i) {
                    final v = _results![i];
                    return InkWell(
                      borderRadius: BorderRadius.circular(10),
                      onTap: () => _addClip(v.downloadUrl, '${v.provider}: ${v.author ?? v.id}', credit: v.attribution),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            if (v.thumbnailUrl != null)
                              Image.network(
                                v.thumbnailUrl!,
                                fit: BoxFit.cover,
                                errorBuilder: (_, _, _) => Container(color: AppTheme.surfaceElevated, child: const Icon(Icons.videocam_rounded, color: AppTheme.textMuted)),
                              )
                            else
                              Container(color: AppTheme.surfaceElevated, child: const Icon(Icons.videocam_rounded, color: AppTheme.textMuted)),
                            // Gradient shadow
                            Positioned(
                              left: 0,
                              right: 0,
                              bottom: 0,
                              height: 48,
                              child: Container(
                                decoration: const BoxDecoration(
                                  gradient: LinearGradient(
                                    begin: Alignment.topCenter,
                                    end: Alignment.bottomCenter,
                                    colors: [Colors.transparent, Colors.black87],
                                  ),
                                ),
                              ),
                            ),
                            // Provider badge
                            Positioned(
                              top: 4,
                              left: 4,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.7), borderRadius: BorderRadius.circular(4)),
                                child: Text(v.provider.toUpperCase(), style: const TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: Colors.white)),
                              ),
                            ),
                            // Duration
                            if (v.durationSec != null)
                              Positioned(
                                bottom: 4,
                                right: 4,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                  decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.7), borderRadius: BorderRadius.circular(4)),
                                  child: Text('${v.durationSec!.round()}s', style: const TextStyle(fontSize: 9, color: Colors.white)),
                                ),
                              ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
            ],
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _busy || _searching ? null : _fromGallery,
              icon: const Icon(Icons.video_library_rounded),
              label: const Text('From my gallery'),
            ),
            if (_busy) const Padding(padding: EdgeInsets.only(top: 8), child: LinearProgressIndicator()),
            const SizedBox(height: 12),
            Text('Cutaway length: ${seconds.toStringAsFixed(1)}s'),
            Slider(value: seconds, min: 1, max: 10, divisions: 18, onChanged: (v) => setState(() => seconds = v)),
            for (final o in overlays)
              ListTile(
                dense: true,
                title: Text('${o.source['query'] ?? o.source['kind']}', maxLines: 1, overflow: TextOverflow.ellipsis),
                subtitle: Text('${timecode(o.timelineStartMs)} – ${timecode(o.timelineEndMs)}'),
                trailing: IconButton(
                  icon: const Icon(Icons.delete_outline_rounded),
                  onPressed: () {
                    _close(context);
                    widget.onEdit((ir) => TimelineOps.removeOverlay(ir, o.id));
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _TransitionSheet extends StatelessWidget {
  const _TransitionSheet({required this.c, required this.onEdit});
  final StudioController c;
  final EditFn onEdit;

  @override
  Widget build(BuildContext context) {
    final n = c.ir!.clips.length;
    return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      _Title('Transitions', subtitle: n < 2 ? 'Split the video first: transitions go between clips.' : 'Applied at every cut.'),
      for (final (label, t) in const [
        ('Hard cut', null),
        ('Crossfade', EditIrTransition(type: 'CROSSFADE', durationMs: 300)),
        ('Dissolve', EditIrTransition(type: 'DISSOLVE', durationMs: 500)),
      ])
        ListTile(
          enabled: n > 1,
          title: Text(label),
          onTap: () {
            _close(context);
            onEdit((ir) => TimelineOps.setTransition(ir, t));
          },
        ),
    ]);
  }
}

// ── Library: browse music, sound effects, stock video and text templates ─────

class _LibrarySheet extends StatelessWidget {
  const _LibrarySheet({required this.c, required this.onEdit});
  final StudioController c;
  final EditFn onEdit;

  @override
  Widget build(BuildContext context) => DefaultTabController(
        length: 6,
        child: SizedBox(
          height: MediaQuery.of(context).size.height * 0.8,
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const TabBar(
              isScrollable: true,
              tabAlignment: TabAlignment.start,
              tabs: [
                Tab(icon: Icon(Icons.music_note_rounded), text: 'Music'),
                Tab(icon: Icon(Icons.graphic_eq_rounded), text: 'Sound FX'),
                Tab(icon: Icon(Icons.movie_rounded), text: 'Video'),
                Tab(icon: Icon(Icons.photo_rounded), text: 'Photos'),
                Tab(icon: Icon(Icons.title_rounded), text: 'Text'),
                Tab(icon: Icon(Icons.auto_fix_high_rounded), text: 'Effects'),
              ],
            ),
            const SizedBox(height: 12),
            Expanded(
              child: TabBarView(children: [
                _MusicSheet(c: c, onEdit: onEdit),
                _SfxTab(c: c, onEdit: onEdit),
                _BrollSheet(c: c, onEdit: onEdit),
                _PhotosTab(c: c, onEdit: onEdit),
                _TextTemplatesTab(c: c, onEdit: onEdit),
                _EffectsTab(c: c, onEdit: onEdit),
              ]),
            ),
          ]),
        ),
      );
}

class _SfxTab extends ConsumerStatefulWidget {
  const _SfxTab({required this.c, required this.onEdit});
  final StudioController c;
  final EditFn onEdit;

  @override
  ConsumerState<_SfxTab> createState() => _SfxTabState();
}

class _SfxTabState extends ConsumerState<_SfxTab> {
  static const suggestions = ['whoosh', 'pop', 'click', 'swoosh', 'ding', 'bass drop', 'camera shutter', 'notification'];
  final _q = TextEditingController();
  List<StockAudioResult>? _results;
  Object? _error;
  bool _searching = false;
  String? _previewing;
  VideoPlayerController? _player;

  @override
  void dispose() {
    _q.dispose();
    _player?.dispose();
    super.dispose();
  }

  Future<void> _search([String? query]) async {
    final q = (query ?? _q.text).trim();
    if (q.isEmpty) return;
    _q.text = q;
    setState(() {
      _searching = true;
      _error = null;
    });
    try {
      final res = await ref.read(aiDirectorServiceProvider).searchStockAudio(q, type: 'sfx');
      if (mounted) setState(() => _results = res.where((r) => r.kind != 'music').toList());
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _searching = false);
    }
  }

  Future<void> _preview(StockAudioResult r) async {
    final same = _previewing == r.url;
    await _player?.dispose();
    _player = null;
    if (same) return setState(() => _previewing = null);
    final p = VideoPlayerController.networkUrl(Uri.parse(r.url));
    _player = p;
    setState(() => _previewing = r.url);
    try {
      await p.initialize();
      if (mounted && _player == p) await p.play();
    } catch (_) {
      if (mounted) {
        setState(() => _previewing = null);
        showError(context, 'This sound could not be played. Try another one.');
      }
    }
  }

  void _add(StockAudioResult r) {
    if (r.attribution != null && r.attribution!.isNotEmpty) widget.c.mediaCredits[r.url] = r.attribution!;
    final ms = r.durationSec == null ? null : (r.durationSec! * 1000).round();
    _close(context);
    widget.onEdit(
      (ir) => TimelineOps.addSfx(ir, url: r.url, startMs: widget.c.playheadMs, durationMs: ms, credit: r.attribution),
      done: 'Sound effect added at ${timecode(widget.c.playheadMs)}',
    );
  }

  @override
  Widget build(BuildContext context) {
    final results = _results;
    return ListView(children: [
      _Title('Sound effects', subtitle: 'Added at the playhead (${timecode(widget.c.playheadMs)}).'),
      TextField(
        controller: _q,
        textInputAction: TextInputAction.search,
        onSubmitted: (_) => _search(),
        decoration: fieldDecoration('Search sounds', hint: 'whoosh, pop, applause…').copyWith(
          suffixIcon: IconButton(tooltip: 'Search', icon: const Icon(Icons.search_rounded), onPressed: _search),
        ),
      ),
      const SizedBox(height: 8),
      Wrap(spacing: 8, runSpacing: 4, children: [
        for (final sgg in suggestions) ActionChip(label: Text(sgg), onPressed: () => _search(sgg)),
      ]),
      const SizedBox(height: 12),
      if (_searching) const SizedBox(height: 160, child: UniversalSkeleton(type: SkeletonType.activity)),
      if (_error != null && !_searching) ErrorView(error: _error!, compact: true, onRetry: _search),
      if (!_searching && _error == null && results != null && results.isEmpty)
        EmptyView(
          icon: Icons.graphic_eq_rounded,
          title: 'No sounds found',
          message: 'Try a simpler word like "whoosh" or "click".',
          actionLabel: 'Search "whoosh"',
          onAction: () => _search('whoosh'),
        ),
      if (!_searching && results != null)
        for (final r in results)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: IconButton(
              tooltip: _previewing == r.url ? 'Stop' : 'Preview',
              icon: Icon(_previewing == r.url ? Icons.stop_rounded : Icons.play_arrow_rounded),
              onPressed: () => _preview(r),
            ),
            title: Text(r.title, maxLines: 1, overflow: TextOverflow.ellipsis),
            subtitle: Text(
              [if (r.durationSec != null) '${r.durationSec!.toStringAsFixed(1)} s', r.provider].join(' · '),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            trailing: TextButton(onPressed: () => _add(r), child: const Text('Add')),
          ),
    ]);
  }
}

class _TextTemplatesTab extends ConsumerStatefulWidget {
  const _TextTemplatesTab({required this.c, required this.onEdit});
  final StudioController c;
  final EditFn onEdit;

  @override
  ConsumerState<_TextTemplatesTab> createState() => _TextTemplatesTabState();
}

class _TextTemplatesTabState extends ConsumerState<_TextTemplatesTab> {
  final _text = TextEditingController();

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  BrandLook _brand() {
    final pid = widget.c.projectId;
    if (pid == null) return BrandLook.none;
    final v = ref.watch(brandVoiceProvider(pid)).valueOrNull;
    if (v == null) return BrandLook.none;
    return BrandLook(font: v.font, primaryColor: v.primaryColor, accentColor: v.accentColor);
  }

  void _add(TextTemplate t, BrandLook brand) {
    final words = _text.text.trim().isEmpty ? t.sample : _text.text.trim();
    _close(context);
    widget.onEdit(
      (ir) => TimelineOps.addText(
        ir,
        words,
        startMs: widget.c.playheadMs,
        durationMs: t.defaultSeconds * 1000,
        positionY: t.positionY,
        style: t.style(brand),
      ),
      done: '${t.name} added. Tap it on the timeline to edit.',
    );
  }

  @override
  Widget build(BuildContext context) {
    final brand = _brand();
    return ListView(children: [
      _Title('Text templates', subtitle: brand.font == null ? 'Tap a style to add it at the playhead.' : 'Using your brand font ${brand.font}.'),
      TextField(controller: _text, decoration: fieldDecoration('Your text', hint: 'Leave empty to use the sample')),
      const SizedBox(height: 12),
      GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        childAspectRatio: 1.6,
        children: [
          for (final t in TextTemplate.all)
            Semantics(
              button: true,
              label: 'Add ${t.name} text',
              child: InkWell(
                borderRadius: BorderRadius.circular(12),
                onTap: () => _add(t, brand),
                child: Ink(
                  decoration: BoxDecoration(
                    color: AppTheme.surfaceElevated,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.border),
                  ),
                  padding: const EdgeInsets.all(10),
                  child: Column(mainAxisAlignment: MainAxisAlignment.spaceBetween, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    Expanded(child: Center(child: _TemplateSample(template: t, brand: brand))),
                    Text(t.name, textAlign: TextAlign.center, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                  ]),
                ),
              ),
            ),
        ],
      ),
    ]);
  }
}

/// Small approximation of a template (the export uses the full style).
class _TemplateSample extends StatelessWidget {
  const _TemplateSample({required this.template, required this.brand});
  final TextTemplate template;
  final BrandLook brand;

  static Color _hex(Object? v, Color d) {
    if (v is! String) return d;
    final h = v.replaceFirst('#', '');
    if (h.length != 6 && h.length != 8) return d;
    final n = int.tryParse(h.length == 6 ? 'FF$h' : h.substring(6) + h.substring(0, 6), radix: 16);
    return n == null ? d : Color(n);
  }

  @override
  Widget build(BuildContext context) {
    final st = template.style(brand);
    final bg = st['background'] is Map ? _hex((st['background'] as Map)['color'], Colors.black) : null;
    final text = st['uppercase'] == true ? template.sample.toUpperCase() : template.sample;
    return Container(
      padding: bg == null ? EdgeInsets.zero : const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: bg == null ? null : BoxDecoration(color: bg, borderRadius: BorderRadius.circular(6)),
      child: Text(
        text,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          fontSize: ((st['fontSizePx'] as num?) ?? 64).toDouble().clamp(40, 180) / 5,
          fontWeight: FontWeight.values[(((st['fontWeight'] as num?) ?? 700).toInt() ~/ 100 - 1).clamp(0, 8)],
          color: _hex(st['textColor'], Colors.white),
          shadows: st['shadow'] == true ? const [Shadow(blurRadius: 3)] : null,
        ),
      ),
    );
  }
}

class _PhotosTab extends ConsumerStatefulWidget {
  const _PhotosTab({required this.c, required this.onEdit});
  final StudioController c;
  final EditFn onEdit;

  @override
  ConsumerState<_PhotosTab> createState() => _PhotosTabState();
}

class _PhotosTabState extends ConsumerState<_PhotosTab> {
  final _q = TextEditingController();
  List<StockPhotoResult>? _results;
  Object? _error;
  bool _busy = false;
  double _seconds = 3;

  @override
  void dispose() {
    _q.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    final q = _q.text.trim();
    if (q.isEmpty) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final res = await ref.read(aiDirectorServiceProvider).searchStockPhotos(q, orientation: widget.c.ir!.canvas.width < widget.c.ir!.canvas.height ? 'portrait' : 'landscape');
      if (mounted) setState(() => _results = res);
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _add(String url, String label, String? credit) {
    if (credit != null && credit.isNotEmpty) widget.c.mediaCredits[url] = credit;
    _close(context);
    widget.onEdit(
      (ir) => TimelineOps.addBroll(ir, {'kind': 'url', 'url': url, 'query': label},
          startMs: widget.c.playheadMs, durationMs: (_seconds * 1000).round(), image: true),
      done: 'Photo added. Tap it on the timeline to adjust.',
    );
  }

  Future<void> _fromGallery() async {
    final f = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 2160, maxHeight: 2160);
    if (f == null || !mounted) return;
    setState(() => _busy = true);
    final url = await guarded(context, () => ref.read(socialApiProvider).uploadFile(f.path));
    if (!mounted) return;
    setState(() => _busy = false);
    if (url != null) _add(url, 'my photo', null);
  }

  @override
  Widget build(BuildContext context) {
    final results = _results;
    return ListView(children: [
      _Title('Photos', subtitle: 'Shown full-screen at the playhead (${timecode(widget.c.playheadMs)}).'),
      Row(children: [
        Expanded(
          child: TextField(
            controller: _q,
            textInputAction: TextInputAction.search,
            onSubmitted: (_) => _search(),
            decoration: fieldDecoration('Search free photos', hint: 'coffee beans, city at night…').copyWith(
              suffixIcon: IconButton(tooltip: 'Search', icon: const Icon(Icons.search_rounded), onPressed: _search),
            ),
          ),
        ),
        const SizedBox(width: 8),
        IconButton.filledTonal(tooltip: 'From my gallery', onPressed: _busy ? null : _fromGallery, icon: const Icon(Icons.add_photo_alternate_rounded)),
      ]),
      Row(children: [
        Text('Show for ${_seconds.toStringAsFixed(1)} s', style: Theme.of(context).textTheme.bodySmall),
        Expanded(child: Slider(value: _seconds, min: 1, max: 8, divisions: 14, onChanged: (v) => setState(() => _seconds = v))),
      ]),
      if (_busy) const SizedBox(height: 200, child: UniversalSkeleton(type: SkeletonType.projects)),
      if (_error != null && !_busy) ErrorView(error: _error!, compact: true, onRetry: _search),
      if (!_busy && _error == null && results != null && results.isEmpty)
        EmptyView(
          icon: Icons.photo_rounded,
          title: 'No photos found',
          message: 'Try another word, or add one from your gallery.',
          actionLabel: 'From my gallery',
          onAction: _fromGallery,
        ),
      if (!_busy && results != null && results.isNotEmpty)
        GridView.count(
          crossAxisCount: 3,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 6,
          crossAxisSpacing: 6,
          childAspectRatio: 0.75,
          children: [
            for (final p in results)
              Semantics(
                button: true,
                label: 'Add photo ${p.title}',
                child: InkWell(
                  onTap: () => _add(p.url, p.title, p.attribution),
                  borderRadius: BorderRadius.circular(8),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.network(
                      p.thumbnailUrl,
                      fit: BoxFit.cover,
                      loadingBuilder: (_, child, prog) => prog == null ? child : Container(color: AppTheme.surfaceElevated),
                      errorBuilder: (_, _, _) => Container(color: AppTheme.surfaceElevated, child: const Icon(Icons.broken_image_rounded)),
                    ),
                  ),
                ),
              ),
          ],
        ),
    ]);
  }
}

class _EffectsTab extends StatefulWidget {
  const _EffectsTab({required this.c, required this.onEdit});
  final StudioController c;
  final EditFn onEdit;

  @override
  State<_EffectsTab> createState() => _EffectsTabState();
}

class _EffectsTabState extends State<_EffectsTab> {
  double _intensity = 0.6;

  static const _icons = {
    'flash': Icons.flash_on_rounded,
    'fade_black': Icons.brightness_3_rounded,
    'shake': Icons.vibration_rounded,
    'zoom_pulse': Icons.center_focus_strong_rounded,
    'black_white': Icons.filter_b_and_w_rounded,
    'vignette': Icons.vignette_rounded,
  };

  @override
  Widget build(BuildContext context) => ListView(children: [
        _Title('Effects', subtitle: 'Added at the playhead (${timecode(widget.c.playheadMs)}). Tap it on the timeline to change timing.'),
        Row(children: [
          Text('Strength ${(_intensity * 100).round()}%', style: Theme.of(context).textTheme.bodySmall),
          Expanded(child: Slider(value: _intensity, min: 0.1, max: 1, divisions: 9, onChanged: (v) => setState(() => _intensity = v))),
        ]),
        for (final e in EditIrEffect.types.entries)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(_icons[e.key] ?? Icons.auto_fix_high_rounded, color: AppTheme.primary),
            title: Text(e.value.$1),
            subtitle: Text('${e.value.$2} · ${(e.value.$3 / 1000).toStringAsFixed(1)} s'),
            trailing: TextButton(
              onPressed: () {
                _close(context);
                widget.onEdit(
                  (ir) => TimelineOps.addEffect(ir, e.key, startMs: widget.c.playheadMs, intensity: _intensity),
                  done: '${e.value.$1} added',
                );
              },
              child: const Text('Add'),
            ),
          ),
      ]);
}
