import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/native_engine/edit_ir.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import 'studio_controller.dart';
import 'studio_session_screen.dart' show timecode;
import 'studio_tools.dart';
import 'text_templates.dart';
import 'timeline_ops.dart';

/// Multi-track timeline: one row per track (video, B-roll, text, captions, zoom, music, SFX) with every
/// placed item — including everything the AI Director added — as a tappable block. Tap an item to edit it.
class StudioTimeline extends StatefulWidget {
  const StudioTimeline({
    super.key,
    required this.controller,
    required this.onScrub,
    required this.onEdit,
    required this.onOpenTool,
  });

  final StudioController controller;
  final ValueChanged<int> onScrub;
  final EditFn onEdit;
  final ValueChanged<StudioTool> onOpenTool;

  @override
  State<StudioTimeline> createState() => _StudioTimelineState();
}

class _StudioTimelineState extends State<StudioTimeline> {
  static const _labelW = 36.0;
  static const _videoH = 44.0;
  static const _trackH = 30.0;

  /// 1 = whole video fits the width; up to 8x for fine edits.
  double _zoom = 1;
  double _zoomStart = 1;

  static const _colors = {
    TrackKind.video: AppTheme.accentBlue,
    TrackKind.broll: AppTheme.accent,
    TrackKind.text: AppTheme.primary,
    TrackKind.captions: AppTheme.accentCyan,
    TrackKind.zoom: AppTheme.warning,
    TrackKind.effect: AppTheme.accent,
    TrackKind.music: AppTheme.success,
    TrackKind.sfx: AppTheme.accentCyan,
  };

  static const _icons = {
    TrackKind.video: Icons.movie_rounded,
    TrackKind.broll: Icons.layers_rounded,
    TrackKind.text: Icons.title_rounded,
    TrackKind.captions: Icons.closed_caption_rounded,
    TrackKind.zoom: Icons.zoom_in_rounded,
    TrackKind.effect: Icons.auto_fix_high_rounded,
    TrackKind.music: Icons.music_note_rounded,
    TrackKind.sfx: Icons.graphic_eq_rounded,
  };

  @override
  Widget build(BuildContext context) {
    final c = widget.controller;
    final ir = c.ir!;
    final items = TimelineOps.items(ir);
    final tracks = [
      for (final k in TrackKind.values)
        if (k == TrackKind.video || items.any((i) => i.kind == k)) k,
    ];
    final total = math.max(1, ir.durationMs).toDouble();

    return Container(
      color: AppTheme.surfaceSubtle,
      padding: const EdgeInsets.fromLTRB(8, 6, 8, 4),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Row(children: [
          Text('${timecode(c.playheadMs)} / ${timecode(ir.durationMs)}',
              style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
          const Spacer(),
          IconButton(
            tooltip: 'Zoom out timeline',
            visualDensity: VisualDensity.compact,
            onPressed: _zoom <= 1 ? null : () => setState(() => _zoom = math.max(1, _zoom / 2)),
            icon: const Icon(Icons.zoom_out_rounded, size: 20),
          ),
          IconButton(
            tooltip: 'Zoom in timeline',
            visualDensity: VisualDensity.compact,
            onPressed: _zoom >= 8 ? null : () => setState(() => _zoom = math.min(8, _zoom * 2)),
            icon: const Icon(Icons.zoom_in_rounded, size: 20),
          ),
        ]),
        ConstrainedBox(
          constraints: const BoxConstraints(maxHeight: 190),
          child: SingleChildScrollView(
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Column(children: [
                for (final k in tracks)
                  SizedBox(
                    width: _labelW,
                    height: k == TrackKind.video ? _videoH : _trackH,
                    child: Tooltip(message: k.label, child: Icon(_icons[k], size: 16, color: _colors[k])),
                  ),
              ]),
              Expanded(
                child: LayoutBuilder(builder: (context, box) {
                  final width = box.maxWidth * _zoom;
                  double x(int ms) => ms / total * width;
                  return GestureDetector(
                    onScaleStart: (_) => _zoomStart = _zoom,
                    onScaleUpdate: (d) {
                      if (d.pointerCount > 1) setState(() => _zoom = (_zoomStart * d.scale).clamp(1, 8).toDouble());
                    },
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: SizedBox(
                        width: width,
                        child: Stack(children: [
                          Column(children: [
                            for (final k in tracks)
                              SizedBox(
                                height: k == TrackKind.video ? _videoH : _trackH,
                                child: GestureDetector(
                                  behavior: HitTestBehavior.opaque,
                                  onTapDown: (d) => widget.onScrub((d.localPosition.dx / width * total).round()),
                                  child: Stack(children: [
                                    for (final (i, it) in items.where((i) => i.kind == k).indexed)
                                      Positioned(
                                        left: x(it.startMs),
                                        width: math.max(14, x(it.endMs) - x(it.startMs)),
                                        top: 3,
                                        bottom: 3,
                                        child: _Block(
                                          item: it,
                                          color: _colors[k]!,
                                          selected: k == TrackKind.video && c.selectedClip == i,
                                          onTap: () => _onItem(it, i),
                                        ),
                                      ),
                                  ]),
                                ),
                              ),
                          ]),
                          Positioned(
                            left: x(c.playheadMs).clamp(0, width - 2).toDouble(),
                            top: 0,
                            bottom: 0,
                            child: IgnorePointer(child: Container(width: 2, color: AppTheme.textPrimary)),
                          ),
                        ]),
                      ),
                    ),
                  );
                }),
              ),
            ]),
          ),
        ),
      ]),
    );
  }

  void _onItem(TimelineItem it, int index) {
    final c = widget.controller;
    if (it.kind == TrackKind.video) {
      c.select(c.selectedClip == index ? null : index);
      widget.onScrub(it.startMs);
      return;
    }
    widget.onScrub(it.startMs);
    showTimelineItemSheet(context, c, it, onEdit: widget.onEdit, onOpenTool: widget.onOpenTool);
  }
}

class _Block extends StatelessWidget {
  const _Block({required this.item, required this.color, required this.selected, required this.onTap});
  final TimelineItem item;
  final Color color;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        label: '${item.kind.label}: ${item.label}, ${timecode(item.startMs)} to ${timecode(item.endMs)}',
        child: GestureDetector(
          onTap: onTap,
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 0.5),
            padding: const EdgeInsets.symmetric(horizontal: 4),
            alignment: Alignment.centerLeft,
            decoration: BoxDecoration(
              color: color.withValues(alpha: selected ? 0.6 : 0.3),
              borderRadius: BorderRadius.circular(4),
              border: Border.all(color: selected ? color : color.withValues(alpha: 0.6)),
            ),
            child: Text(item.label,
                maxLines: 1, overflow: TextOverflow.clip, style: const TextStyle(fontSize: 10, color: AppTheme.textPrimary)),
          ),
        ),
      );
}

/// Inspector for one placed item: move, nudge, trim, volume/style, replace, delete.
Future<void> showTimelineItemSheet(
  BuildContext context,
  StudioController c,
  TimelineItem item, {
  required EditFn onEdit,
  required ValueChanged<StudioTool> onOpenTool,
}) =>
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.surface,
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(16, 16, 16, MediaQuery.of(ctx).viewInsets.bottom + 16),
        child: SafeArea(child: TimelineItemInspector(c: c, item: item, onEdit: onEdit, onOpenTool: onOpenTool)),
      ),
    );

class TimelineItemInspector extends StatefulWidget {
  const TimelineItemInspector({super.key, required this.c, required this.item, required this.onEdit, required this.onOpenTool});
  final StudioController c;
  final TimelineItem item;
  final EditFn onEdit;
  final ValueChanged<StudioTool> onOpenTool;

  @override
  State<TimelineItemInspector> createState() => _TimelineItemInspectorState();
}

class _TimelineItemInspectorState extends State<TimelineItemInspector> {
  late RangeValues _range = RangeValues(widget.item.startMs.toDouble(), widget.item.endMs.toDouble());
  late double _volume = _sfx?.volumeDb ?? widget.c.ir!.audio.music.firstOrNull?.volumeDb ?? -12;
  late final _text = TextEditingController(text: _caption?.text ?? '');
  late double _intensity = _effect?.intensity ?? 0.6;

  TimelineItem get it => widget.item;
  MobileEditIr get ir => widget.c.ir!;
  EditIrSfx? get _sfx => ir.audio.sfx.where((e) => e.id == it.id).firstOrNull;
  EditIrCaption? get _caption => ir.captions.where((e) => e.id == it.id).firstOrNull;
  EditIrEffect? get _effect => ir.effects.where((e) => e.id == it.id).firstOrNull;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  void _apply(MobileEditIr Function(MobileEditIr) op, String done) {
    Navigator.pop(context);
    widget.onEdit(op, done: done);
  }

  void _nudge(int deltaMs) =>
      _apply((ir) => TimelineOps.moveItem(ir, it.kind, it.id, it.startMs + deltaMs), 'Moved ${deltaMs > 0 ? 'later' : 'earlier'}');

  @override
  Widget build(BuildContext context) {
    final movable = it.kind != TrackKind.music && it.kind != TrackKind.video;
    final total = ir.durationMs.toDouble();
    return ConstrainedBox(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.8),
      child: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text(it.kind.label, style: Theme.of(context).textTheme.labelSmall),
          Text(it.label, maxLines: 2, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.titleMedium),
          Text('${timecode(it.startMs)} – ${timecode(it.endMs)}', style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 12),
          if (movable) ...[
            Row(children: [
              Expanded(child: OutlinedButton(onPressed: () => _nudge(-500), child: const Text('← 0.5 s'))),
              const SizedBox(width: 8),
              Expanded(
                child: FilledButton.tonal(
                  onPressed: () => _apply((ir) => TimelineOps.moveItem(ir, it.kind, it.id, widget.c.playheadMs), 'Moved to the playhead'),
                  child: const Text('To playhead'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(child: OutlinedButton(onPressed: () => _nudge(500), child: const Text('0.5 s →'))),
            ]),
            const SizedBox(height: 12),
          ],
          if (it.kind != TrackKind.video) ...[
            Text('Start and end', style: Theme.of(context).textTheme.labelMedium),
            RangeSlider(
              values: _range,
              min: 0,
              max: total,
              divisions: math.max(1, total ~/ 100),
              labels: RangeLabels(timecode(_range.start.round()), timecode(_range.end.round())),
              onChanged: (v) => setState(() => _range = v),
            ),
            OutlinedButton(
              onPressed: () => _apply(
                (ir) => TimelineOps.setItemRange(ir, it.kind, it.id, _range.start.round(), _range.end.round()),
                'Timing updated',
              ),
              child: const Text('Apply timing'),
            ),
          ],
          if (it.kind == TrackKind.sfx || it.kind == TrackKind.music) ...[
            const SizedBox(height: 12),
            Text('Volume ${_volume.toStringAsFixed(0)} dB', style: Theme.of(context).textTheme.labelMedium),
            Slider(value: _volume.clamp(-40, 6).toDouble(), min: -40, max: 6, divisions: 46, onChanged: (v) => setState(() => _volume = v)),
            OutlinedButton(
              onPressed: () => _apply(
                (ir) => it.kind == TrackKind.sfx ? TimelineOps.setSfxVolume(ir, it.id, _volume) : TimelineOps.updateMusic(ir, volumeDb: _volume),
                'Volume updated',
              ),
              child: const Text('Apply volume'),
            ),
          ],
          if (it.kind == TrackKind.effect) ...[
            const SizedBox(height: 12),
            Text('Strength ${(_intensity * 100).round()}%', style: Theme.of(context).textTheme.labelMedium),
            Slider(value: _intensity, min: 0.1, max: 1, divisions: 9, onChanged: (v) => setState(() => _intensity = v)),
            OutlinedButton(
              onPressed: () => _apply((ir) => TimelineOps.setEffectIntensity(ir, it.id, _intensity), 'Strength updated'),
              child: const Text('Apply strength'),
            ),
          ],
          if (it.kind == TrackKind.text) ...[
            const SizedBox(height: 12),
            TextField(controller: _text, decoration: fieldDecoration('Text')),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: () => _apply((ir) => TimelineOps.editText(ir, it.id, text: _text.text), 'Text updated'),
              child: const Text('Update text'),
            ),
            const SizedBox(height: 8),
            Text('Style', style: Theme.of(context).textTheme.labelMedium),
            const SizedBox(height: 6),
            Wrap(spacing: 8, runSpacing: 6, children: [
              for (final t in TextTemplate.all)
                ActionChip(
                  label: Text(t.name),
                  onPressed: () => _apply((ir) => TimelineOps.editText(ir, it.id, style: t.style()), 'Style: ${t.name}'),
                ),
            ]),
          ],
          if (it.kind == TrackKind.captions) ...[
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () {
                Navigator.pop(context);
                widget.onOpenTool(StudioTool.captions);
              },
              icon: const Icon(Icons.closed_caption_rounded),
              label: const Text('Change caption style'),
            ),
          ],
          if (it.kind == TrackKind.music || it.kind == TrackKind.broll) ...[
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () {
                Navigator.pop(context);
                widget.onOpenTool(it.kind == TrackKind.music ? StudioTool.music : StudioTool.broll);
              },
              icon: const Icon(Icons.swap_horiz_rounded),
              label: Text(it.kind == TrackKind.music ? 'Replace music' : 'Add different B-roll'),
            ),
          ],
          const SizedBox(height: 16),
          TextButton.icon(
            style: TextButton.styleFrom(foregroundColor: AppTheme.error),
            onPressed: () => _apply((ir) => TimelineOps.deleteItem(ir, it.kind, it.id), '${it.kind.label} removed'),
            icon: const Icon(Icons.delete_outline_rounded),
            label: Text('Delete ${it.kind.label.toLowerCase()}'),
          ),
        ]),
      ),
    );
  }
}
