import 'package:flutter_test/flutter_test.dart';
import 'package:social_studio_mobile/features/studio/timeline_ops.dart';

void main() {
  test('snapMs picks the nearest point inside the threshold, else null', () {
    expect(TimelineOps.snapMs(1040, [0, 1000, 1100, 5000], 60), 1000);
    expect(TimelineOps.snapMs(1060, [0, 1000, 1100, 5000], 60), 1100);
    expect(TimelineOps.snapMs(3000, [0, 1000, 5000], 60), isNull);
  });

  test('snap points include 0, the end, cuts and the playhead, without the dragged item', () {
    var ir = TimelineOps.initial(projectId: 'p', durationMs: 10000, width: 1080, height: 1920);
    ir = TimelineOps.split(ir, 4000);
    final pts = TimelineOps.snapPoints(ir, playheadMs: 7300);
    expect(pts, containsAll([0, 4000, 7300, 10000]));
    expect(pts, orderedEquals([...pts]..sort()));
  });

  test('duplicate inserts a copy after the clip and ripples later items', () {
    var ir = TimelineOps.initial(projectId: 'p', durationMs: 10000, width: 1080, height: 1920);
    ir = TimelineOps.split(ir, 4000); // clips: 0-4000, 4000-10000
    ir = TimelineOps.setClipAudioFades(ir, fadeInMs: 300, fadeOutMs: 0, index: 0);
    final dup = TimelineOps.duplicateClip(ir, 0);
    expect(dup.clips.length, 3);
    expect(dup.durationMs, 14000);
    expect(dup.clips[1].sourceStartMs, dup.clips[0].sourceStartMs);
    expect(dup.clips[1].id, isNot(dup.clips[0].id));
    expect(dup.clips[1].audioFadeInMs, 300);
    expect(dup.clips[1].transitionIn, isNull);
    expect(dup.clips[2].timelineStartMs, 8000);
  });

  test('insertStill splits at the playhead, holds the still with the clip look and ripples the rest', () {
    var ir = TimelineOps.initial(projectId: 'p', durationMs: 10000, width: 1080, height: 1920);
    ir = TimelineOps.addZoom(ir, startMs: 7000, durationMs: 1000);
    final out = TimelineOps.insertStill(ir, assetId: 'still_1', atMs: 4000, durationMs: 2000, width: 1080, height: 1920);
    expect(out.clips.length, 3);
    expect(out.durationMs, 12000);
    final still = out.clips[1];
    expect([still.assetId, still.timelineStartMs, still.timelineEndMs], ['still_1', 4000, 6000]);
    expect(out.clips[2].sourceStartMs, 4000);
    expect(out.zooms.single.startMs, 9000, reason: 'later items move by the hold');
    expect(out.sources.any((s) => s.assetId == 'still_1'), isTrue);
  });
}
