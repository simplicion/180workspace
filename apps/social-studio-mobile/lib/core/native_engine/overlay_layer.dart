import 'dart:math' as math;

/// CapCut-style overlay layer (contract `OverlayLayerSchema`). `cutaway` replaces the main picture for the slot;
/// `overlay` is composited on top of it (PiP, sticker, layered B-roll).
///
/// x / y: the layer centre as canvas fractions from the top-left. scale: size relative to the largest size that fits
/// the canvas (1 = fits the canvas; 0.4 = a PiP). rotation in degrees. Keyframe times are relative to the overlay
/// start and animate any property linearly. [layerAt] is mirrored by `LayerMotion.at` in the Android renderer.
class EditIrLayer {
  const EditIrLayer({
    this.mode = 'overlay',
    this.x = 0.5,
    this.y = 0.5,
    this.scale = 1,
    this.rotation = 0,
    this.keyframes = const [],
  });

  final String mode;
  final double x, y, scale, rotation;
  final List<LayerKeyframe> keyframes;

  bool get isOverlay => mode == 'overlay';

  /// The PiP placement older drafts stored as `source.pip` (bottom-right, about a third of the canvas).
  static const legacyPip = EditIrLayer(x: 0.78, y: 0.78, scale: 0.36);

  EditIrLayer copyWith({String? mode, double? x, double? y, double? scale, double? rotation, List<LayerKeyframe>? keyframes}) => EditIrLayer(
        mode: mode ?? this.mode,
        x: x ?? this.x,
        y: y ?? this.y,
        scale: scale ?? this.scale,
        rotation: rotation ?? this.rotation,
        keyframes: keyframes ?? this.keyframes,
      );

  static EditIrLayer? fromJson(Object? raw) {
    if (raw is! Map) return null;
    double n(Object? v, double d) => (v is num && v.isFinite) ? v.toDouble() : d;
    return EditIrLayer(
      mode: raw['mode'] == 'cutaway' ? 'cutaway' : 'overlay',
      x: n(raw['x'], 0.5).clamp(-0.5, 1.5),
      y: n(raw['y'], 0.5).clamp(-0.5, 1.5),
      scale: n(raw['scale'], 1).clamp(0.05, 3),
      rotation: n(raw['rotation'], 0).clamp(-720, 720),
      keyframes: [
        for (final k in (raw['keyframes'] as List? ?? const []).whereType<Map>()) LayerKeyframe.fromJson(k),
      ]..sort((a, b) => a.atMs.compareTo(b.atMs)),
    );
  }

  Map<String, dynamic> toJson() => {
        'mode': mode,
        'x': _r(x),
        'y': _r(y),
        'scale': _r(scale),
        'rotation': _r(rotation),
        if (keyframes.isNotEmpty) 'keyframes': [for (final k in keyframes) k.toJson()],
      };
}

double _r(double v) => (v * 10000).roundToDouble() / 10000;

class LayerKeyframe {
  const LayerKeyframe({required this.atMs, this.x, this.y, this.scale, this.rotation, this.opacity});
  final int atMs;
  final double? x, y, scale, rotation, opacity;

  factory LayerKeyframe.fromJson(Map raw) {
    double? n(Object? v) => (v is num && v.isFinite) ? v.toDouble() : null;
    return LayerKeyframe(
      atMs: (raw['atMs'] as num?)?.toInt().clamp(0, 1 << 30) ?? 0,
      x: n(raw['x']),
      y: n(raw['y']),
      scale: n(raw['scale']),
      rotation: n(raw['rotation']),
      opacity: n(raw['opacity']),
    );
  }

  Map<String, dynamic> toJson() => {
        'atMs': atMs,
        if (x != null) 'x': _r(x!),
        if (y != null) 'y': _r(y!),
        if (scale != null) 'scale': _r(scale!),
        if (rotation != null) 'rotation': _r(rotation!),
        if (opacity != null) 'opacity': _r(opacity!),
      };
}

/// Where and how a layer is drawn at one moment.
class LayerPose {
  const LayerPose(this.x, this.y, this.scale, this.rotation, this.opacity);
  final double x, y, scale, rotation, opacity;
}

/// Pose of [layer] at [relMs] after the overlay start, with [baseOpacity] (the overlay's own opacity).
LayerPose layerAt(EditIrLayer layer, int relMs, double baseOpacity) {
  double prop(double base, double? Function(LayerKeyframe) pick) {
    final ks = layer.keyframes.where((k) => pick(k) != null).toList();
    if (ks.isEmpty) return base;
    if (relMs <= ks.first.atMs) return pick(ks.first)!;
    if (relMs >= ks.last.atMs) return pick(ks.last)!;
    for (var i = 0; i < ks.length - 1; i++) {
      final a = ks[i], b = ks[i + 1];
      if (relMs >= a.atMs && relMs <= b.atMs) {
        final span = math.max(1, b.atMs - a.atMs);
        final t = (relMs - a.atMs) / span;
        return pick(a)! + (pick(b)! - pick(a)!) * t;
      }
    }
    return base;
  }

  return LayerPose(
    prop(layer.x, (k) => k.x),
    prop(layer.y, (k) => k.y),
    prop(layer.scale, (k) => k.scale).clamp(0.05, 3),
    prop(layer.rotation, (k) => k.rotation),
    prop(baseOpacity, (k) => k.opacity).clamp(0.0, 1.0),
  );
}
