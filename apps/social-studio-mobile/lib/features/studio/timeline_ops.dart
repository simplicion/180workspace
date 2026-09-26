import 'dart:math' as math;

import 'package:uuid/uuid.dart';

import '../../core/native_engine/edit_ir.dart';
import '../../core/native_engine/media_engine_exception.dart';
import '../../core/network/audio_transcription_service.dart';

/// Manual editing operations on a `mobile-editir/1` timeline.
///
/// Every operation is pure: it returns a new, valid timeline (see [MobileEditIr.validate]) and
/// never mutates its input, which gives the editor undo/redo for free. The AI Director edits
/// the same structure, so manual and AI edits compose in either order.
///
/// Main-track changes (split, delete, trim, reorder, speed) ripple **every** other track —
/// captions and their word timings, zooms, B-roll, music and speech ranges — through one
/// old-timeline → new-timeline mapping, so nothing drifts out of sync with the speech.
class TimelineOps {
  const TimelineOps._();

  static const minClipMs = 100;
  static const _uuid = Uuid();
  static String _id(String prefix) => '${prefix}_${_uuid.v4().substring(0, 8)}';

  static const aspects = ['9:16', '1:1', '4:5', '16:9'];

  static EditIrCanvas canvasFor(
    String aspect, {
    num fps = 30,
    String background = '#000000',
  }) => switch (aspect) {
    '16:9' => EditIrCanvas(
      aspect: aspect,
      width: 1920,
      height: 1080,
      fps: fps,
      background: background,
    ),
    '1:1' => EditIrCanvas(
      aspect: aspect,
      width: 1080,
      height: 1080,
      fps: fps,
      background: background,
    ),
    '4:5' => EditIrCanvas(
      aspect: aspect,
      width: 1080,
      height: 1350,
      fps: fps,
      background: background,
    ),
    _ => EditIrCanvas(
      aspect: '9:16',
      width: 1080,
      height: 1920,
      fps: fps,
      background: background,
    ),
  };

  /// Crop of a [srcW]×[srcH] (display-oriented) source that fills [canvas], centred on [focus]
  /// (0..1 source fractions, e.g. the speaker's face) and kept inside the frame; the frame centre
  /// when [focus] is null. Null when the aspect ratios already match (no crop needed).
  static EditIrCrop? centerCrop(
    int srcW,
    int srcH,
    EditIrCanvas canvas, {
    ({double x, double y})? focus,
  }) {
    if (srcW <= 0 || srcH <= 0) return null;
    final src = srcW / srcH;
    final dst = canvas.width / canvas.height;
    if ((src - dst).abs() < 0.01) return null;
    final fx = focus?.x ?? 0.5;
    final fy = focus?.y ?? 0.5;
    if (src > dst) {
      final w = dst / src;
      return EditIrCrop(
        x: _r((fx - w / 2).clamp(0.0, 1 - w)),
        y: 0,
        width: _r(w),
        height: 1,
      );
    }
    final h = src / dst;
    return EditIrCrop(
      x: 0,
      y: _r((fy - h / 2).clamp(0.0, 1 - h)),
      width: 1,
      height: _r(h),
    );
  }

  /// The dominant face centre: the largest face of each sample, then the median x/y over all
  /// samples, clamped to 0.1..0.9 (same rule as the server's `dominantFaceCenter`). Null without faces.
  static ({double x, double y})? faceFocus(List<FaceSample> faces) {
    if (faces.isEmpty) return null;
    final largest = <int, FaceSample>{};
    for (final f in faces) {
      final cur = largest[f.tMs];
      if (cur == null || f.w * f.h > cur.w * cur.h) largest[f.tMs] = f;
    }
    double median(Iterable<double> v) {
      final s = v.toList()..sort();
      final m = s.length ~/ 2;
      return s.length.isOdd ? s[m] : (s[m - 1] + s[m]) / 2;
    }

    return (
      x: _r(median(largest.values.map((f) => f.x)).clamp(0.1, 0.9)),
      y: _r(median(largest.values.map((f) => f.y)).clamp(0.1, 0.9)),
    );
  }

  static double _r(double v) => (v * 10000).roundToDouble() / 10000;

  /// A one-clip timeline covering the whole source, reframed to [aspect] by centre crop.
  static MobileEditIr initial({
    required String projectId,
    required int durationMs,
    required int width,
    required int height,
    String aspect = '9:16',
    num fps = 30,
    List<TranscriptWord> words = const [],
    ({double x, double y})? focus,
  }) {
    if (durationMs < minClipMs) {
      throw MediaEngineException(
        'INVALID_SOURCE',
        'The video is too short to edit (${durationMs}ms).',
      );
    }
    final canvas = canvasFor(aspect, fps: fps);
    final clip = EditIrClip(
      id: _id('c'),
      sourceStartMs: 0,
      sourceEndMs: durationMs,
      timelineStartMs: 0,
      timelineEndMs: durationMs,
      crop: centerCrop(width, height, canvas, focus: focus),
    );
    final ir = MobileEditIr(
      projectId: projectId,
      canvas: canvas,
      durationMs: durationMs,
      sources: [
        EditIrSource(durationMs: durationMs, width: width, height: height),
      ],
      clips: [clip],
    );
    return _withAudio(ir, speechRangesMs: speechRanges(words, ir));
  }

  // ── Mapping helpers ────────────────────────────────────────────────────────

  /// Timeline time of a source time, or null when that source moment was cut.
  static int? sourceToTimeline(
    MobileEditIr ir,
    int sourceMs, {
    String assetId = 'primary',
  }) {
    for (final c in ir.clips) {
      if (c.assetId == assetId &&
          sourceMs >= c.sourceStartMs &&
          sourceMs < c.sourceEndMs) {
        return c.timelineStartMs +
            ((sourceMs - c.sourceStartMs) / c.speed).round();
      }
    }
    return null;
  }

  /// Speech intervals on the timeline from source-time transcript words (gaps < 300 ms merge).
  static List<List<int>> speechRanges(
    List<TranscriptWord> words,
    MobileEditIr ir,
  ) {
    final out = <List<int>>[];
    for (final w in words) {
      final s = sourceToTimeline(ir, w.startMs);
      final e = sourceToTimeline(ir, math.max(w.startMs, w.endMs - 1));
      if (s == null || e == null || e < s) continue;
      if (out.isNotEmpty && s - out.last[1] < 300 && s >= out.last[0]) {
        out.last[1] = math.max(out.last[1], e + 1);
      } else {
        out.add([s, e + 1]);
      }
    }
    out.sort((a, b) => a[0].compareTo(b[0]));
    final merged = <List<int>>[];
    for (final r in out) {
      if (merged.isNotEmpty && r[0] <= merged.last[1]) {
        merged.last[1] = math.max(merged.last[1], r[1]);
      } else {
        merged.add([r[0], math.min(r[1], ir.durationMs)]);
      }
    }
    return merged.where((r) => r[1] > r[0]).toList();
  }

  static List<EditIrClip> _relayout(List<EditIrClip> clips) {
    var t = 0;
    return [
      for (var i = 0; i < clips.length; i++)
        () {
          final c = clips[i];
          final len = ((c.sourceEndMs - c.sourceStartMs) / c.speed).round();
          final out = EditIrClip(
            id: c.id,
            assetId: c.assetId,
            sourceStartMs: c.sourceStartMs,
            sourceEndMs: c.sourceEndMs,
            timelineStartMs: t,
            timelineEndMs: t + len,
            speed: c.speed,
            volumeDb: c.volumeDb,
            crop: c.crop,
            filter: c.filter,
            transitionIn: i == 0 ? null : c.transitionIn,
            rotationDeg: c.rotationDeg,
            flipH: c.flipH,
          );
          t += len;
          return out;
        }(),
    ];
  }

  /// Replaces the main track and ripples every other track onto the new timing.
  static MobileEditIr _replaceClips(
    MobileEditIr ir,
    List<EditIrClip> newClips,
  ) {
    if (newClips.isEmpty) {
      throw MediaEngineException(
        'INVALID_EDIT',
        'A video needs at least one clip.',
      );
    }
    final laid = _relayout(newClips);
    final segs = <_Seg>[];
    for (final n in laid) {
      final old = ir.clips
          .where(
            (o) =>
                o.assetId == n.assetId &&
                n.sourceStartMs >= o.sourceStartMs &&
                n.sourceEndMs <= o.sourceEndMs,
          )
          .firstOrNull;
      if (old == null) {
        continue; // newly revealed source (trim extend): nothing to carry over
      }
      segs.add(
        _Seg(
          old.timelineStartMs +
              (n.sourceStartMs - old.sourceStartMs) / old.speed,
          old.timelineStartMs + (n.sourceEndMs - old.sourceStartMs) / old.speed,
          n.timelineStartMs.toDouble(),
          n.timelineEndMs.toDouble(),
        ),
      );
    }
    final duration = laid.last.timelineEndMs;
    final map = _Mapper(segs, duration);

    final captions = <EditIrCaption>[];
    for (final c in ir.captions) {
      final r = map.range(c.startMs, c.endMs);
      if (r == null) continue;
      final words = <EditIrWord>[];
      for (final w in c.words) {
        final wr = map.range(w.startMs, w.endMs);
        if (wr == null) continue;
        words.add(
          EditIrWord(
            text: w.text,
            startMs: math.max(wr.$1, r.$1),
            endMs: math.min(wr.$2, r.$2),
            highlight: w.highlight,
            color: w.color,
            scale: w.scale,
          ),
        );
      }
      if (c.kind == 'caption' && c.words.isNotEmpty && words.isEmpty) continue;
      captions.add(
        EditIrCaption(
          id: c.id,
          kind: c.kind,
          startMs: r.$1,
          endMs: r.$2,
          text: c.kind == 'caption' && words.isNotEmpty
              ? words.map((w) => w.text).join(' ')
              : c.text,
          words: c.kind == 'text'
              ? [EditIrWord(text: c.text, startMs: r.$1, endMs: r.$2)]
              : words,
          style: c.style,
        ),
      );
    }
    final zooms = <EditIrZoom>[];
    for (final z in ir.zooms) {
      final r = map.range(z.startMs, z.endMs);
      if (r == null || (zooms.isNotEmpty && r.$1 < zooms.last.endMs)) continue;
      zooms.add(
        EditIrZoom(
          id: z.id,
          startMs: r.$1,
          endMs: r.$2,
          scale: z.scale,
          centerX: z.centerX,
          centerY: z.centerY,
          rampMs: math.min(z.rampMs, (r.$2 - r.$1) ~/ 2),
        ),
      );
    }
    final overlays = <EditIrOverlay>[
      for (final o in ir.overlays)
        if (map.range(o.timelineStartMs, o.timelineEndMs) case final r?)
          o.copyWith(timelineStartMs: r.$1, timelineEndMs: r.$2),
    ];
    final effects = <EditIrEffect>[
      for (final e in ir.effects)
        if (map.range(e.startMs, e.endMs) case final r?)
          if (r.$2 - r.$1 >= 100) e.copyWith(startMs: r.$1, endMs: r.$2),
    ];
    final music = <EditIrMusic?>[
      for (final m in ir.audio.music)
        () {
          // Music under the whole video keeps covering the whole (new) video.
          final full =
              m.timelineStartMs == 0 && m.timelineEndMs >= ir.durationMs - 1;
          final r = full
              ? (0, duration)
              : map.range(m.timelineStartMs, m.timelineEndMs);
          return r == null ? null : _music(m, start: r.$1, end: r.$2);
        }(),
    ].whereType<EditIrMusic>().toList();
    final speech = <List<int>>[
      for (final s in ir.audio.speechRangesMs)
        if (s.length == 2)
          if (map.range(s[0], s[1]) case final r?) [r.$1, r.$2],
    ]..sort((a, b) => a[0].compareTo(b[0]));
    final mergedSpeech = <List<int>>[];
    for (final s in speech) {
      if (mergedSpeech.isNotEmpty && s[0] <= mergedSpeech.last[1]) {
        mergedSpeech.last[1] = math.max(mergedSpeech.last[1], s[1]);
      } else {
        mergedSpeech.add(s);
      }
    }
    final out = MobileEditIr(
      projectId: ir.projectId,
      canvas: ir.canvas,
      durationMs: duration,
      sources: ir.sources,
      watermark: ir.watermark,
      clips: laid,
      overlays: overlays,
      captions: captions..sort((a, b) => a.startMs.compareTo(b.startMs)),
      zooms: zooms,
      effects: effects,
      audio: EditIrAudio(
        originalVolumeDb: ir.audio.originalVolumeDb,
        music: music,
        speechRangesMs: mergedSpeech,
        // Effects follow the footage they were placed on; ones inside a cut are dropped.
        sfx: [
          for (final e in ir.audio.sfx)
            if (map.range(e.timelineStartMs, e.timelineStartMs + 1)
                case final r?)
              e.moved(r.$1),
        ],
      ),
    );
    out.validate();
    return out;
  }

  static EditIrMusic _music(
    EditIrMusic m, {
    int? start,
    int? end,
    double? volumeDb,
    int? fadeInMs,
    int? fadeOutMs,
    EditIrDuck? duck,
    bool clearDuck = false,
  }) => EditIrMusic(
    id: m.id,
    timelineStartMs: start ?? m.timelineStartMs,
    timelineEndMs: end ?? m.timelineEndMs,
    sourceStartMs: m.sourceStartMs,
    source: m.source,
    volumeDb: volumeDb ?? m.volumeDb,
    fadeInMs: fadeInMs ?? m.fadeInMs,
    fadeOutMs: fadeOutMs ?? m.fadeOutMs,
    duck: clearDuck ? null : (duck ?? m.duck),
  );

  static MobileEditIr _copy(
    MobileEditIr ir, {
    EditIrCanvas? canvas,
    List<EditIrClip>? clips,
    List<EditIrOverlay>? overlays,
    List<EditIrCaption>? captions,
    List<EditIrZoom>? zooms,
    EditIrAudio? audio,
    List<EditIrEffect>? effects,
  }) {
    final out = ir.copyWith(
      canvas: canvas,
      clips: clips,
      overlays: overlays,
      captions: captions,
      zooms: zooms,
      audio: audio,
      effects: effects,
    );
    out.validate();
    return out;
  }

  static MobileEditIr _withAudio(
    MobileEditIr ir, {
    double? originalVolumeDb,
    List<EditIrMusic>? music,
    List<List<int>>? speechRangesMs,
  }) => _copy(
    ir,
    audio: EditIrAudio(
      originalVolumeDb: originalVolumeDb ?? ir.audio.originalVolumeDb,
      music: music ?? ir.audio.music,
      speechRangesMs: speechRangesMs ?? ir.audio.speechRangesMs,
      sfx: ir.audio.sfx,
    ),
  );

  static EditIrClip _clip(
    EditIrClip c, {
    String? id,
    int? sourceStartMs,
    int? sourceEndMs,
    double? speed,
    double? volumeDb,
    EditIrCrop? crop,
    bool clearCrop = false,
    EditIrFilter? filter,
    bool clearFilter = false,
    EditIrTransition? transitionIn,
    bool clearTransition = false,
    int? rotationDeg,
    bool? flipH,
  }) => EditIrClip(
    id: id ?? c.id,
    assetId: c.assetId,
    sourceStartMs: sourceStartMs ?? c.sourceStartMs,
    sourceEndMs: sourceEndMs ?? c.sourceEndMs,
    timelineStartMs: c.timelineStartMs,
    timelineEndMs: c.timelineEndMs,
    speed: speed ?? c.speed,
    volumeDb: volumeDb ?? c.volumeDb,
    crop: clearCrop ? null : (crop ?? c.crop),
    filter: clearFilter ? null : (filter ?? c.filter),
    transitionIn: clearTransition ? null : (transitionIn ?? c.transitionIn),
    rotationDeg: rotationDeg ?? c.rotationDeg,
    flipH: flipH ?? c.flipH,
  );

  static int clipIndexAt(MobileEditIr ir, int timelineMs) {
    for (var i = 0; i < ir.clips.length; i++) {
      if (timelineMs >= ir.clips[i].timelineStartMs &&
          timelineMs < ir.clips[i].timelineEndMs) {
        return i;
      }
    }
    return ir.clips.length - 1;
  }

  static Iterable<int> _targets(MobileEditIr ir, int? index) => index == null
      ? Iterable.generate(ir.clips.length)
      : [index.clamp(0, ir.clips.length - 1)];

  // ── Main track ─────────────────────────────────────────────────────────────

  /// Splits the clip under [timelineMs] into two at that point.
  static MobileEditIr split(MobileEditIr ir, int timelineMs) {
    final i = clipIndexAt(ir, timelineMs);
    final c = ir.clips[i];
    final at =
        c.sourceStartMs + ((timelineMs - c.timelineStartMs) * c.speed).round();
    if (at - c.sourceStartMs < minClipMs || c.sourceEndMs - at < minClipMs) {
      throw MediaEngineException(
        'INVALID_EDIT',
        'Move the playhead away from the clip edge to split.',
      );
    }
    final clips = [...ir.clips]
      ..replaceRange(i, i + 1, [
        _clip(c, sourceEndMs: at),
        _clip(c, id: _id('c'), sourceStartMs: at, clearTransition: true),
      ]);
    return _replaceClips(ir, clips);
  }

  /// Ripple-deletes clip [index]; everything after moves up.
  static MobileEditIr deleteClip(MobileEditIr ir, int index) {
    if (ir.clips.length == 1) {
      throw MediaEngineException(
        'INVALID_EDIT',
        'This is the only clip. Trim it instead.',
      );
    }
    return _replaceClips(ir, [...ir.clips]..removeAt(index));
  }

  /// Ripple-deletes the timeline range [startMs, endMs) across the main track.
  static MobileEditIr removeRange(MobileEditIr ir, int startMs, int endMs) {
    final clips = <EditIrClip>[];
    for (final c in ir.clips) {
      if (endMs <= c.timelineStartMs || startMs >= c.timelineEndMs) {
        clips.add(c);
        continue;
      }
      final cutS =
          c.sourceStartMs +
          ((math.max(startMs, c.timelineStartMs) - c.timelineStartMs) * c.speed)
              .round();
      final cutE =
          c.sourceStartMs +
          ((math.min(endMs, c.timelineEndMs) - c.timelineStartMs) * c.speed)
              .round();
      if (cutS - c.sourceStartMs >= minClipMs) {
        clips.add(_clip(c, sourceEndMs: cutS));
      }
      if (c.sourceEndMs - cutE >= minClipMs) {
        clips.add(
          _clip(
            c,
            id: cutS - c.sourceStartMs >= minClipMs ? _id('c') : c.id,
            sourceStartMs: cutE,
          ),
        );
      }
    }
    if (clips.isEmpty) {
      throw MediaEngineException(
        'INVALID_EDIT',
        'That would remove the whole video.',
      );
    }
    return _replaceClips(ir, clips);
  }

  /// Sets the source in/out of clip [index] (bounded by the source length).
  static MobileEditIr trim(
    MobileEditIr ir,
    int index, {
    required int sourceStartMs,
    required int sourceEndMs,
  }) {
    final c = ir.clips[index];
    final srcLen =
        ir.sources
            .where((s) => s.assetId == c.assetId)
            .firstOrNull
            ?.durationMs ??
        c.sourceEndMs;
    final s = sourceStartMs.clamp(0, srcLen);
    final e = sourceEndMs.clamp(0, srcLen);
    if (e - s < minClipMs) {
      throw MediaEngineException(
        'INVALID_EDIT',
        'A clip must be at least ${minClipMs}ms long.',
      );
    }
    return _replaceClips(
      ir,
      [...ir.clips]..[index] = _clip(c, sourceStartMs: s, sourceEndMs: e),
    );
  }

  static MobileEditIr moveClip(MobileEditIr ir, int from, int to) {
    final clips = [...ir.clips];
    final c = clips.removeAt(from);
    clips.insert(to.clamp(0, clips.length), c);
    return _replaceClips(ir, clips);
  }

  /// Playback speed of clip [index], or of every clip when null. Range [0.25, 4].
  static MobileEditIr setSpeed(MobileEditIr ir, double speed, {int? index}) {
    final s = speed.clamp(0.25, 4.0);
    final targets = _targets(ir, index).toSet();
    return _replaceClips(ir, [
      for (var i = 0; i < ir.clips.length; i++)
        targets.contains(i) ? _clip(ir.clips[i], speed: s) : ir.clips[i],
    ]);
  }

  /// Clip audio gain in dB (≤ -60 mutes), for clip [index] or all clips.
  static MobileEditIr setClipVolume(MobileEditIr ir, double db, {int? index}) {
    final targets = _targets(ir, index).toSet();
    return _copy(
      ir,
      clips: [
        for (var i = 0; i < ir.clips.length; i++)
          targets.contains(i)
              ? _clip(ir.clips[i], volumeDb: db.clamp(-60.0, 12.0))
              : ir.clips[i],
      ],
    );
  }

  static MobileEditIr setFilter(
    MobileEditIr ir,
    EditIrFilter? filter, {
    int? index,
  }) {
    final targets = _targets(ir, index).toSet();
    return _copy(
      ir,
      clips: [
        for (var i = 0; i < ir.clips.length; i++)
          targets.contains(i)
              ? _clip(ir.clips[i], filter: filter, clearFilter: filter == null)
              : ir.clips[i],
      ],
    );
  }

  /// Transition into clip [index] (≥ 1), or at every cut when null.
  static MobileEditIr setTransition(
    MobileEditIr ir,
    EditIrTransition? t, {
    int? index,
  }) {
    final targets = _targets(ir, index).where((i) => i > 0).toSet();
    return _copy(
      ir,
      clips: [
        for (var i = 0; i < ir.clips.length; i++)
          targets.contains(i)
              ? _clip(ir.clips[i], transitionIn: t, clearTransition: t == null)
              : ir.clips[i],
      ],
    );
  }

  /// Rotates clip [index] (or all clips) 90° clockwise and/or toggles horizontal flip.
  /// A 90/270 rotation swaps the effective source dimensions, so the crop is re-centred.
  static MobileEditIr rotate(
    MobileEditIr ir, {
    int? index,
    bool rotate90 = true,
    bool toggleFlip = false,
  }) {
    final targets = _targets(ir, index).toSet();
    return _copy(
      ir,
      clips: [
        for (var i = 0; i < ir.clips.length; i++)
          if (!targets.contains(i))
            ir.clips[i]
          else
            () {
              final c = ir.clips[i];
              final deg = rotate90 ? (c.rotationDeg + 90) % 360 : c.rotationDeg;
              final src = ir.sources
                  .where((s) => s.assetId == c.assetId)
                  .firstOrNull;
              final sideways = deg == 90 || deg == 270;
              final crop = src == null
                  ? c.crop
                  : centerCrop(
                      sideways ? src.height : src.width,
                      sideways ? src.width : src.height,
                      ir.canvas,
                    );
              return _clip(
                c,
                rotationDeg: deg,
                flipH: toggleFlip ? !c.flipH : c.flipH,
                crop: crop,
                clearCrop: crop == null,
              );
            }(),
      ],
    );
  }

  /// Normalized crop (source display coordinates) for clip [index] or all clips; null = fit.
  static MobileEditIr setCrop(MobileEditIr ir, EditIrCrop? crop, {int? index}) {
    if (crop != null &&
        (crop.x < 0 ||
            crop.y < 0 ||
            crop.width <= 0 ||
            crop.height <= 0 ||
            crop.x + crop.width > 1.0001 ||
            crop.y + crop.height > 1.0001)) {
      throw MediaEngineException(
        'INVALID_EDIT',
        'The crop must stay inside the frame.',
      );
    }
    final targets = _targets(ir, index).toSet();
    return _copy(
      ir,
      clips: [
        for (var i = 0; i < ir.clips.length; i++)
          targets.contains(i)
              ? _clip(ir.clips[i], crop: crop, clearCrop: crop == null)
              : ir.clips[i],
      ],
    );
  }

  /// Changes the output aspect. With [fill] every clip is cropped to fill the frame, centred on
  /// [focus] for the primary asset (the detected face) or the frame centre; otherwise the source
  /// is letterboxed on [background].
  static MobileEditIr setAspect(
    MobileEditIr ir,
    String aspect, {
    bool fill = true,
    String? background,
    ({double x, double y})? focus,
  }) {
    final canvas = canvasFor(
      aspect,
      fps: ir.canvas.fps,
      background: background ?? ir.canvas.background,
    );
    return _copy(
      ir,
      canvas: canvas,
      clips: [
        for (final c in ir.clips)
          () {
            final src = ir.sources
                .where((s) => s.assetId == c.assetId)
                .firstOrNull;
            final crop = fill && src != null
                ? centerCrop(
                    src.width,
                    src.height,
                    canvas,
                    focus: c.assetId == 'primary' ? focus : null,
                  )
                : null;
            return _clip(c, crop: crop, clearCrop: crop == null);
          }(),
      ],
    );
  }

  // ── Text & captions ────────────────────────────────────────────────────────

  /// Complete caption style objects (contract §3.4). The server rejects partial styles.
  static Map<String, dynamic> captionStyle(
    String preset, {
    String highlightColor = '#FFE600',
    double positionY = 0.72,
  }) {
    final base = <String, dynamic>{
      'preset': preset,
      'animation': 'none',
      'fontFamily': 'Inter',
      'fontWeight': 800,
      'fontSizePx': 64,
      'textColor': '#FFFFFF',
      'highlightColor': highlightColor,
      'strokeColor': '#000000',
      'strokeWidthPx': 6,
      'shadow': true,
      'background': null,
      'uppercase': false,
      'positionX': 0.5,
      'positionY': positionY,
      'maxWidthFraction': 0.86,
    };
    return switch (preset) {
      'BOLD_POP' => {
        ...base,
        'animation': 'word_pop',
        'fontSizePx': 72,
        'uppercase': true,
      },
      'KARAOKE' => {...base, 'animation': 'karaoke'},
      'BOXED' => {
        ...base,
        'strokeWidthPx': 0,
        'shadow': false,
        'fontWeight': 600,
        'background': {'color': '#000000B3', 'paddingPx': 16, 'radiusPx': 16},
      },
      'TITLE' => {...base, 'fontSizePx': 88, 'positionY': positionY},
      _ => {...base, 'preset': 'CLEAN', 'fontWeight': 600, 'strokeWidthPx': 4},
    };
  }

  static const captionPresets = {
    'CLEAN': 'Clean',
    'BOLD_POP': 'Bold pop',
    'KARAOKE': 'Karaoke',
    'BOXED': 'Boxed',
  };

  /// Word-synced captions from a source-time transcript, [wordsPerCaption] words each, breaking
  /// early on pauses and sentence ends. Replaces existing speech captions; titles are kept.
  static MobileEditIr autoCaptions(
    MobileEditIr ir,
    List<TranscriptWord> words, {
    String preset = 'BOLD_POP',
    int wordsPerCaption = 3,
    String highlightColor = '#FFE600',
    double positionY = 0.72,
  }) {
    if (words.isEmpty) {
      throw MediaEngineException(
        'NO_TRANSCRIPT',
        'Captions need a transcript. Transcribe the video first.',
      );
    }
    final style = captionStyle(
      preset,
      highlightColor: highlightColor,
      positionY: positionY,
    );
    final mapped = <EditIrWord>[];
    for (final w in words) {
      final s = sourceToTimeline(ir, w.startMs);
      if (s == null) continue;
      final e = sourceToTimeline(ir, math.max(w.startMs, w.endMs - 1)) ?? s;
      mapped.add(
        EditIrWord(text: w.text, startMs: s, endMs: math.max(e + 1, s + 1)),
      );
    }
    final captions = <EditIrCaption>[];
    var group = <EditIrWord>[];
    void flush() {
      if (group.isEmpty) return;
      captions.add(
        EditIrCaption(
          id: _id('cap'),
          startMs: group.first.startMs,
          endMs: group.last.endMs,
          text: group.map((w) => w.text).join(' '),
          words: group,
          style: style,
        ),
      );
      group = [];
    }

    for (final w in mapped) {
      final gap = group.isEmpty ? 0 : w.startMs - group.last.endMs;
      if (group.length >= wordsPerCaption || gap > 600 || gap < 0) flush();
      group.add(w);
      if (RegExp(r'[.!?]$').hasMatch(w.text)) flush();
    }
    flush();
    // Captions must not overlap each other.
    for (var i = 0; i < captions.length - 1; i++) {
      final a = captions[i], b = captions[i + 1];
      if (a.endMs > b.startMs) {
        captions[i] = EditIrCaption(
          id: a.id,
          startMs: a.startMs,
          endMs: b.startMs,
          text: a.text,
          words: [
            for (final w in a.words)
              EditIrWord(
                text: w.text,
                startMs: w.startMs,
                endMs: math.min(w.endMs, b.startMs),
              ),
          ],
          style: a.style,
        );
      }
    }
    return _copy(
      ir,
      captions: [...ir.captions.where((c) => c.kind == 'text'), ...captions]
        ..sort((a, b) => a.startMs.compareTo(b.startMs)),
    );
  }

  /// Restyles every speech caption.
  static MobileEditIr styleCaptions(
    MobileEditIr ir,
    String preset, {
    String highlightColor = '#FFE600',
    double? positionY,
  }) {
    final style = captionStyle(
      preset,
      highlightColor: highlightColor,
      positionY: positionY ?? 0.72,
    );
    return _copy(
      ir,
      captions: [
        for (final c in ir.captions)
          c.kind == 'caption'
              ? EditIrCaption(
                  id: c.id,
                  startMs: c.startMs,
                  endMs: c.endMs,
                  text: c.text,
                  words: c.words,
                  style: style,
                )
              : c,
      ],
    );
  }

  /// A title / lower third from [startMs] for [durationMs].
  static MobileEditIr addText(
    MobileEditIr ir,
    String text, {
    required int startMs,
    required int durationMs,
    double positionY = 0.2,
    Map<String, dynamic>? style,
  }) {
    final t = text.trim();
    if (t.isEmpty) {
      throw MediaEngineException('INVALID_EDIT', 'Type some text first.');
    }
    final s = startMs.clamp(0, math.max(0, ir.durationMs - minClipMs)).toInt();
    final e = math.min(ir.durationMs, s + math.max(durationMs, 300)).toInt();
    final cap = EditIrCaption(
      id: _id('txt'),
      kind: 'text',
      startMs: s,
      endMs: e,
      text: t,
      words: [EditIrWord(text: t, startMs: s, endMs: e)],
      style: style ?? captionStyle('TITLE', positionY: positionY),
    );
    return _copy(
      ir,
      captions: [...ir.captions, cap]
        ..sort((a, b) => a.startMs.compareTo(b.startMs)),
    );
  }

  static MobileEditIr removeCaption(MobileEditIr ir, String id) =>
      _copy(ir, captions: ir.captions.where((c) => c.id != id).toList());

  static MobileEditIr clearCaptions(MobileEditIr ir) =>
      _copy(ir, captions: ir.captions.where((c) => c.kind == 'text').toList());

  // ── Camera ─────────────────────────────────────────────────────────────────

  /// Punch-in zoom; rejected if it would overlap another zoom.
  static MobileEditIr addZoom(
    MobileEditIr ir, {
    required int startMs,
    int durationMs = 1500,
    double scale = 1.3,
    double centerX = 0.5,
    double centerY = 0.45,
  }) {
    final s = startMs.clamp(0, math.max(0, ir.durationMs - 300)).toInt();
    final e = math.min(ir.durationMs, s + math.max(durationMs, 300)).toInt();
    if (ir.zooms.any((z) => s < z.endMs && e > z.startMs)) {
      throw MediaEngineException(
        'INVALID_EDIT',
        'There is already a zoom here.',
      );
    }
    final z = EditIrZoom(
      id: _id('z'),
      startMs: s,
      endMs: e,
      scale: scale.clamp(1.0, 4.0),
      centerX: centerX,
      centerY: centerY,
      rampMs: math.min(250, (e - s) ~/ 2),
    );
    return _copy(
      ir,
      zooms: [...ir.zooms, z]..sort((a, b) => a.startMs.compareTo(b.startMs)),
    );
  }

  static MobileEditIr removeZoom(MobileEditIr ir, String id) =>
      _copy(ir, zooms: ir.zooms.where((z) => z.id != id).toList());

  // ── B-roll ─────────────────────────────────────────────────────────────────

  /// B-roll over [startMs, startMs+durationMs). [source] is `{kind:url,url}` or `{kind:asset,assetId}`.
  static MobileEditIr addBroll(
    MobileEditIr ir,
    Map<String, dynamic> source, {
    required int startMs,
    int durationMs = 3000,
    bool image = false,
  }) {
    final s = startMs.clamp(0, math.max(0, ir.durationMs - 300)).toInt();
    final e = math.min(ir.durationMs, s + math.max(durationMs, 300)).toInt();
    final o = EditIrOverlay(
      id: _id('b'),
      timelineStartMs: s,
      timelineEndMs: e,
      source: source,
      mediaType: image ? 'image' : 'video',
    );
    return _copy(
      ir,
      overlays: [...ir.overlays, o]
        ..sort((a, b) => a.timelineStartMs.compareTo(b.timelineStartMs)),
    );
  }

  static MobileEditIr removeOverlay(MobileEditIr ir, String id) =>
      _copy(ir, overlays: ir.overlays.where((o) => o.id != id).toList());

  // ── Audio ──────────────────────────────────────────────────────────────────

  static MobileEditIr setOriginalVolume(MobileEditIr ir, double db) =>
      _withAudio(ir, originalVolumeDb: db.clamp(-60.0, 12.0));

  /// Background music under the whole video from an HTTPS [url] (upload local files first).
  static MobileEditIr setMusic(
    MobileEditIr ir, {
    required String url,
    String? title,
    double volumeDb = -16,
    int fadeInMs = 500,
    int fadeOutMs = 1000,
    bool duckUnderSpeech = true,
  }) {
    final uri = Uri.tryParse(url);
    if (uri == null || !uri.isScheme('https')) {
      throw MediaEngineException('INVALID_EDIT', 'Music must be an https URL.');
    }
    final m = EditIrMusic(
      id: ir.audio.music.firstOrNull?.id ?? _id('m'),
      timelineStartMs: 0,
      timelineEndMs: ir.durationMs,
      source: {'kind': 'url', 'url': url, 'query': ?title},
      volumeDb: volumeDb,
      fadeInMs: fadeInMs,
      fadeOutMs: fadeOutMs,
      duck: EditIrDuck(
        enabled: duckUnderSpeech && ir.audio.speechRangesMs.isNotEmpty,
      ),
    );
    return _withAudio(ir, music: [m]);
  }

  static MobileEditIr updateMusic(
    MobileEditIr ir, {
    double? volumeDb,
    int? fadeInMs,
    int? fadeOutMs,
    bool? duck,
  }) {
    final m = ir.audio.music.firstOrNull;
    if (m == null) {
      throw MediaEngineException('INVALID_EDIT', 'Add music first.');
    }
    return _withAudio(
      ir,
      music: [
        _music(
          m,
          volumeDb: volumeDb,
          fadeInMs: fadeInMs,
          fadeOutMs: fadeOutMs,
          duck: duck == null
              ? null
              : EditIrDuck(enabled: duck && ir.audio.speechRangesMs.isNotEmpty),
        ),
      ],
    );
  }

  static MobileEditIr removeMusic(MobileEditIr ir) =>
      _withAudio(ir, music: const []);

  // ── Sound effects ──────────────────────────────────────────────────────────

  static const maxSfx = 40;

  /// One-shot sound effect at [startMs] from an HTTPS [url]. [credit] is kept for export attribution.
  static MobileEditIr addSfx(
    MobileEditIr ir, {
    required String url,
    required int startMs,
    int? durationMs,
    double volumeDb = -8,
    String? credit,
  }) {
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      throw MediaEngineException('INVALID_EDIT', 'Sound effects must come from the library (a web address).');
    }
    if (ir.audio.sfx.length >= maxSfx) {
      throw MediaEngineException('INVALID_EDIT', 'This video already has $maxSfx sound effects.');
    }
    final s = startMs.clamp(0, math.max(0, ir.durationMs - 100)).toInt();
    final e = EditIrSfx(
      id: _id('sfx'),
      timelineStartMs: s,
      durationMs: durationMs == null ? null : math.max(100, math.min(durationMs, ir.durationMs - s)),
      source: {'kind': 'url', 'url': url},
      volumeDb: volumeDb.clamp(-60.0, 12.0),
      credit: credit,
    );
    return _withSfx(ir, [...ir.audio.sfx, e]..sort((a, b) => a.timelineStartMs.compareTo(b.timelineStartMs)));
  }

  static MobileEditIr setSfxVolume(MobileEditIr ir, String id, double db) => _withSfx(ir, [
        for (final e in ir.audio.sfx)
          e.id == id
              ? EditIrSfx(id: e.id, timelineStartMs: e.timelineStartMs, durationMs: e.durationMs, source: e.source, volumeDb: db.clamp(-60.0, 12.0), credit: e.credit)
              : e,
      ]);

  static MobileEditIr removeSfx(MobileEditIr ir, String id) =>
      _withSfx(ir, ir.audio.sfx.where((e) => e.id != id).toList());

  static MobileEditIr _withSfx(MobileEditIr ir, List<EditIrSfx> sfx) => _copy(
        ir,
        audio: EditIrAudio(
          originalVolumeDb: ir.audio.originalVolumeDb,
          music: ir.audio.music,
          speechRangesMs: ir.audio.speechRangesMs,
          sfx: sfx,
        ),
      );

  // ── Timeline items (what the multi-track timeline shows) ───────────────────

  /// Every placed item, per track, in timeline order. Clips are the video track.
  static List<TimelineItem> items(MobileEditIr ir) => [
        for (var i = 0; i < ir.clips.length; i++)
          TimelineItem(TrackKind.video, ir.clips[i].id, ir.clips[i].timelineStartMs, ir.clips[i].timelineEndMs, 'Clip ${i + 1}'),
        for (final o in ir.overlays)
          TimelineItem(TrackKind.broll, o.id, o.timelineStartMs, o.timelineEndMs, '${o.isImage ? 'Photo' : 'Video'}: ${o.source['query'] ?? 'B-roll'}'),
        for (final e in ir.effects) TimelineItem(TrackKind.effect, e.id, e.startMs, e.endMs, e.label),
        for (final c in ir.captions)
          TimelineItem(c.kind == 'text' ? TrackKind.text : TrackKind.captions, c.id, c.startMs, c.endMs, c.text),
        for (final z in ir.zooms) TimelineItem(TrackKind.zoom, z.id, z.startMs, z.endMs, '${z.scale.toStringAsFixed(1)}x'),
        for (final m in ir.audio.music)
          TimelineItem(TrackKind.music, m.id, m.timelineStartMs, m.timelineEndMs, '${m.source['title'] ?? m.source['query'] ?? 'Music'}'),
        for (final e in ir.audio.sfx)
          TimelineItem(TrackKind.sfx, e.id, e.timelineStartMs, e.timelineStartMs + (e.durationMs ?? 1000), e.credit ?? 'Sound effect'),
      ];

  /// Moves an item so it starts at [startMs], keeping its length (clamped to the video). Captions keep their
  /// word timing relative to the caption. Video clips move with [moveClip] instead.
  static MobileEditIr moveItem(MobileEditIr ir, TrackKind kind, String id, int startMs) {
    int clampStart(int len) => startMs.clamp(0, math.max(0, ir.durationMs - len)).toInt();
    switch (kind) {
      case TrackKind.broll:
        return _copy(ir, overlays: [
          for (final o in ir.overlays)
            if (o.id != id)
              o
            else
              () {
                final len = o.timelineEndMs - o.timelineStartMs;
                final s = clampStart(len);
                return o.copyWith(timelineStartMs: s, timelineEndMs: s + len);
              }(),
        ]);
      case TrackKind.text:
      case TrackKind.captions:
        return _copy(ir, captions: [
          for (final c in ir.captions)
            if (c.id != id) c else _shiftCaption(c, clampStart(c.endMs - c.startMs) - c.startMs),
        ]..sort((a, b) => a.startMs.compareTo(b.startMs)));
      case TrackKind.zoom:
        final z = ir.zooms.firstWhere((z) => z.id == id);
        final s = clampStart(z.endMs - z.startMs);
        final moved = EditIrZoom(id: z.id, startMs: s, endMs: s + z.endMs - z.startMs, scale: z.scale, centerX: z.centerX, centerY: z.centerY, rampMs: z.rampMs);
        if (ir.zooms.any((o) => o.id != id && o.startMs < moved.endMs && moved.startMs < o.endMs)) {
          throw MediaEngineException('INVALID_EDIT', 'Zooms cannot overlap. Move the other zoom first.');
        }
        return _copy(ir, zooms: [for (final o in ir.zooms) o.id == id ? moved : o]..sort((a, b) => a.startMs.compareTo(b.startMs)));
      case TrackKind.sfx:
        return _withSfx(ir, [
          for (final e in ir.audio.sfx) e.id == id ? e.moved(clampStart(e.durationMs ?? 100)) : e,
        ]..sort((a, b) => a.timelineStartMs.compareTo(b.timelineStartMs)));
      case TrackKind.effect:
        return _copy(ir, effects: [
          for (final e in ir.effects)
            if (e.id != id) e else () {
              final s = clampStart(e.endMs - e.startMs);
              return e.copyWith(startMs: s, endMs: s + e.endMs - e.startMs);
            }(),
        ]..sort((a, b) => a.startMs.compareTo(b.startMs)));
      case TrackKind.music:
      case TrackKind.video:
        throw MediaEngineException('INVALID_EDIT', 'Use Trim for ${kind.label.toLowerCase()}.');
    }
  }

  /// Sets an item's start/end on the timeline (trim). Minimum 300 ms.
  static MobileEditIr setItemRange(MobileEditIr ir, TrackKind kind, String id, int startMs, int endMs) {
    if (kind == TrackKind.effect) {
      final s = startMs.clamp(0, math.max(0, ir.durationMs - 100)).toInt();
      final e = endMs.clamp(s + 100, ir.durationMs).toInt();
      return _copy(ir, effects: [for (final x in ir.effects) x.id == id ? x.copyWith(startMs: s, endMs: e) : x]);
    }
    final s = startMs.clamp(0, math.max(0, ir.durationMs - 300)).toInt();
    final e = endMs.clamp(s + 300, ir.durationMs).toInt();
    switch (kind) {
      case TrackKind.broll:
        return _copy(ir, overlays: [
          for (final o in ir.overlays)
            o.id != id
                ? o
                : o.copyWith(timelineStartMs: s, timelineEndMs: e, sourceStartMs: o.isImage ? 0 : o.sourceStartMs + math.max(0, s - o.timelineStartMs)),
        ]);
      case TrackKind.text:
      case TrackKind.captions:
        return _copy(ir, captions: [
          for (final c in ir.captions)
            c.id != id
                ? c
                : EditIrCaption(
                    id: c.id,
                    kind: c.kind,
                    startMs: s,
                    endMs: e,
                    text: c.text,
                    words: c.kind == 'text'
                        ? [EditIrWord(text: c.text, startMs: s, endMs: e)]
                        : [for (final w in c.words) if (w.endMs > s && w.startMs < e) EditIrWord(text: w.text, startMs: math.max(w.startMs, s), endMs: math.min(w.endMs, e), highlight: w.highlight, color: w.color, scale: w.scale)],
                    style: c.style,
                  ),
        ]..sort((a, b) => a.startMs.compareTo(b.startMs)));
      case TrackKind.zoom:
        final z = ir.zooms.firstWhere((z) => z.id == id);
        if (ir.zooms.any((o) => o.id != id && o.startMs < e && s < o.endMs)) {
          throw MediaEngineException('INVALID_EDIT', 'Zooms cannot overlap.');
        }
        return _copy(ir, zooms: [
          for (final o in ir.zooms)
            o.id == id ? EditIrZoom(id: z.id, startMs: s, endMs: e, scale: z.scale, centerX: z.centerX, centerY: z.centerY, rampMs: math.min(z.rampMs, (e - s) ~/ 2)) : o,
        ]);
      case TrackKind.music:
        final m = ir.audio.music.firstOrNull;
        if (m == null) throw MediaEngineException('INVALID_EDIT', 'Add music first.');
        return _withAudio(ir, music: [_music(m, start: s, end: e)]);
      case TrackKind.sfx:
        return _withSfx(ir, [
          for (final x in ir.audio.sfx)
            x.id == id ? EditIrSfx(id: x.id, timelineStartMs: s, durationMs: e - s, source: x.source, volumeDb: x.volumeDb, credit: x.credit) : x,
        ]);
      case TrackKind.effect:
      case TrackKind.video:
        throw MediaEngineException('INVALID_EDIT', 'Use Trim on the clip.');
    }
  }

  /// Removes any non-video item.
  static MobileEditIr deleteItem(MobileEditIr ir, TrackKind kind, String id) => switch (kind) {
        TrackKind.broll => removeOverlay(ir, id),
        TrackKind.text || TrackKind.captions => removeCaption(ir, id),
        TrackKind.zoom => removeZoom(ir, id),
        TrackKind.music => removeMusic(ir),
        TrackKind.sfx => removeSfx(ir, id),
        TrackKind.effect => removeEffect(ir, id),
        TrackKind.video => deleteClip(ir, ir.clips.indexWhere((c) => c.id == id)),
      };

  /// Replaces a text item's words and/or style (text templates, font, colours).
  static MobileEditIr editText(MobileEditIr ir, String id, {String? text, Map<String, dynamic>? style}) {
    final t = text?.trim();
    if (t != null && t.isEmpty) throw MediaEngineException('INVALID_EDIT', 'Type some text first.');
    return _copy(ir, captions: [
      for (final c in ir.captions)
        c.id != id
            ? c
            : EditIrCaption(
                id: c.id,
                kind: c.kind,
                startMs: c.startMs,
                endMs: c.endMs,
                text: t ?? c.text,
                words: t == null ? c.words : [EditIrWord(text: t, startMs: c.startMs, endMs: c.endMs)],
                style: style ?? c.style,
              ),
    ]);
  }

  // ── Effects ────────────────────────────────────────────────────────────────

  static const maxEffects = 60;

  /// Adds a [type] effect (see [EditIrEffect.types]) at [startMs]; default length per type.
  static MobileEditIr addEffect(MobileEditIr ir, String type, {required int startMs, int? durationMs, double intensity = 0.6}) {
    final spec = EditIrEffect.types[type];
    if (spec == null) throw MediaEngineException('INVALID_EDIT', 'Unknown effect "$type".');
    if (ir.effects.length >= maxEffects) throw MediaEngineException('INVALID_EDIT', 'This video already has $maxEffects effects.');
    final len = math.max(100, durationMs ?? spec.$3);
    final s = startMs.clamp(0, math.max(0, ir.durationMs - 100)).toInt();
    final e = math.min(ir.durationMs, s + len).toInt();
    final fx = EditIrEffect(id: _id('fx'), type: type, startMs: s, endMs: e, intensity: intensity.clamp(0.0, 1.0));
    return _copy(ir, effects: [...ir.effects, fx]..sort((a, b) => a.startMs.compareTo(b.startMs)));
  }

  static MobileEditIr setEffectIntensity(MobileEditIr ir, String id, double intensity) =>
      _copy(ir, effects: [for (final e in ir.effects) e.id == id ? e.copyWith(intensity: intensity.clamp(0.0, 1.0)) : e]);

  static MobileEditIr removeEffect(MobileEditIr ir, String id) =>
      _copy(ir, effects: ir.effects.where((e) => e.id != id).toList());

  static EditIrCaption _shiftCaption(EditIrCaption c, int d) => EditIrCaption(
        id: c.id,
        kind: c.kind,
        startMs: c.startMs + d,
        endMs: c.endMs + d,
        text: c.text,
        words: [for (final w in c.words) EditIrWord(text: w.text, startMs: w.startMs + d, endMs: w.endMs + d, highlight: w.highlight, color: w.color, scale: w.scale)],
        style: c.style,
      );
}

/// Timeline tracks, top to bottom.
enum TrackKind {
  video('Video'),
  broll('B-roll'),
  text('Text'),
  captions('Captions'),
  zoom('Zoom'),
  effect('Effects'),
  music('Music'),
  sfx('Sound FX');

  const TrackKind(this.label);
  final String label;
}

class TimelineItem {
  const TimelineItem(this.kind, this.id, this.startMs, this.endMs, this.label);
  final TrackKind kind;
  final String id;
  final int startMs;
  final int endMs;
  final String label;
}

class _Seg {
  const _Seg(this.oldStart, this.oldEnd, this.newStart, this.newEnd);
  final double oldStart, oldEnd, newStart, newEnd;

  double map(double t) {
    final oldLen = oldEnd - oldStart;
    if (oldLen <= 0) return newStart;
    return newStart + (t - oldStart) * (newEnd - newStart) / oldLen;
  }
}

/// Old-timeline → new-timeline mapping built from surviving source ranges.
class _Mapper {
  _Mapper(this.segs, this.duration);
  final List<_Seg> segs;
  final int duration;

  /// New range of old `[a, b)`, clipped to what survived; null if nothing survived.
  (int, int)? range(int a, int b) {
    if (b <= a) return null;
    double? ns, ne;
    // Earliest surviving moment inside [a, b).
    _Seg? first;
    for (final s in segs) {
      if (s.oldEnd <= a || s.oldStart >= b) continue;
      if (first == null ||
          math.max(s.oldStart, a.toDouble()) <
              math.max(first.oldStart, a.toDouble())) {
        first = s;
      }
    }
    _Seg? last;
    for (final s in segs) {
      if (s.oldEnd <= a || s.oldStart >= b) continue;
      if (last == null ||
          math.min(s.oldEnd, b.toDouble()) >
              math.min(last.oldEnd, b.toDouble())) {
        last = s;
      }
    }
    if (first == null || last == null) return null;
    ns = first.map(math.max(first.oldStart, a.toDouble()));
    ne = last.map(math.min(last.oldEnd, b.toDouble()));
    final s = ns.round().clamp(0, duration);
    final e = ne.round().clamp(0, duration);
    if (e - s < 1) return null;
    return (s, e);
  }
}
