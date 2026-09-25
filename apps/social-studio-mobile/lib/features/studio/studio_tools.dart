import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:video_player/video_player.dart';

import '../../core/native_engine/edit_ir.dart';
import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../director/ai_director_service.dart';
import 'studio_controller.dart';
import 'studio_session_screen.dart' show timecode;
import 'timeline_ops.dart';

enum StudioTool {
  director('AI Director', Icons.auto_awesome_rounded),
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
            widget.onEdit((ir) => TimelineOps.setAspect(ir, aspect, fill: fill));
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
      widget.c.musicCredits[url] = credit;
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
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 20),
                child: Center(child: CircularProgressIndicator()),
              ),
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

  void _addClip(String url, String label) {
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
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
              ),
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
                      onTap: () => _addClip(v.downloadUrl, '${v.provider}: ${v.author ?? v.id}'),
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
