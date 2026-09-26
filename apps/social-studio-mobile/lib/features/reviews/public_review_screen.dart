import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../../core/widgets/universal_skeleton.dart';
import '../../data/models/review.dart';
import '../../data/models/social_post.dart';
import '../posts/post_detail_screen.dart';

final publicReviewProvider = FutureProvider.autoDispose.family<PublicReview, String>(
    (ref, token) => ref.watch(socialApiProvider).publicReview(token));

/// Client portal for a magic review link (`/review/:token`). No login: the token is the key.
class PublicReviewScreen extends ConsumerStatefulWidget {
  const PublicReviewScreen({super.key, required this.token});
  final String token;

  @override
  ConsumerState<PublicReviewScreen> createState() => _PublicReviewScreenState();
}

class _PublicReviewScreenState extends ConsumerState<PublicReviewScreen> {
  final _name = TextEditingController();
  bool _approving = false;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _comment(SocialPost p) async {
    final text = await promptText(context, title: 'Feedback on "${p.displayTitle}"', label: 'What should change?', action: 'Send', maxLines: 4);
    if (text == null || text.isEmpty || !mounted) return;
    final c = await guarded(context, () => ref.read(socialApiProvider).publicComment(widget.token,
        postId: p.id, text: text, authorName: _name.text.trim().isEmpty ? null : _name.text.trim()));
    if (c != null && mounted) {
      showInfo(context, 'Feedback sent', color: AppTheme.success);
      ref.invalidate(publicReviewProvider(widget.token));
    }
  }

  Future<void> _approveAll(List<SocialPost> posts) async {
    final count = posts.length;
    final notes = await promptText(context, title: 'Approve all $count posts?', label: 'Notes for the team (optional)', action: 'Approve', maxLines: 3);
    if (notes == null || !mounted) return;
    setState(() => _approving = true);
    final r = await guarded(context, () => ref.read(socialApiProvider).approveBatch(
          widget.token,
          clientNotes: notes.isEmpty ? null : notes,
          seenVersions: {for (final p in posts) p.id: p.versionNumber},
        ));
    if (!mounted) return;
    setState(() => _approving = false);
    if (r == null) {
      // A stale page (REVIEW_STALE) or any failure: reload so the client sees the latest versions.
      ref.invalidate(publicReviewProvider(widget.token));
    } else {
      showInfo(context, 'Approved. Thank you!', color: AppTheme.success);
      ref.invalidate(publicReviewProvider(widget.token));
    }
  }

  @override
  Widget build(BuildContext context) {
    final review = ref.watch(publicReviewProvider(widget.token));
    return Scaffold(
      appBar: AppBar(title: Text(review.valueOrNull?.session.name ?? 'Content review')),
      body: AsyncBody<PublicReview>(
        value: review,
        skeleton: SkeletonType.detail,
        onRetry: () => ref.invalidate(publicReviewProvider(widget.token)),
        builder: (r) {
          final s = r.session;
          final done = s.status == ReviewStatus.approved;
          return ListView(padding: const EdgeInsets.fromLTRB(16, 8, 16, 48), children: [
            SectionCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(s.companyName ?? s.projectName ?? 'Content review', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 4),
                Text('${fmtDate(s.startDate)} – ${fmtDate(s.endDate)} · ${r.posts.length} posts', style: Theme.of(context).textTheme.bodyMedium),
                const SizedBox(height: 8),
                StatusChip(label: s.isExpired && !done ? 'Link expired' : s.status.label, color: s.isExpired && !done ? AppTheme.textMuted : s.status.color),
              ]),
            ),
            if (!done && !s.isExpired) ...[
              const SizedBox(height: 12),
              TextField(controller: _name, decoration: fieldDecoration('Your name', hint: 'Shown with your feedback')),
            ],
            for (final p in r.posts)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: SectionCard(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Expanded(child: Text(p.displayTitle, style: const TextStyle(fontWeight: FontWeight.w700))),
                      StatusChip(label: p.status.label, color: p.status.color),
                    ]),
                    Text(fmtDateTime(p.scheduledFor), style: Theme.of(context).textTheme.labelSmall),
                    if (p.thumbnailUrl != null) ...[
                      const SizedBox(height: 8),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: Image.network(p.thumbnailUrl!, height: 220, width: double.infinity, fit: BoxFit.cover, errorBuilder: (_, _, _) => const SizedBox.shrink()),
                      ),
                    ],
                    const SizedBox(height: 8),
                    Text(p.content),
                    if (p.finalVideoUrl != null)
                      TextButton.icon(
                        onPressed: () => openExternal(context, p.finalVideoUrl!),
                        icon: const Icon(Icons.play_circle_rounded),
                        label: const Text('Watch video'),
                      ),
                    for (final c in p.reviewComments)
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text('${c.authorName ?? 'Reviewer'}: ${c.text}', style: Theme.of(context).textTheme.bodyMedium),
                      ),
                    if (!done && !s.isExpired)
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton.icon(onPressed: () => _comment(p), icon: const Icon(Icons.rate_review_rounded, size: 18), label: const Text('Request changes')),
                      ),
                  ]),
                ),
              ),
            if (!done && !s.isExpired && r.posts.isNotEmpty) ...[
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: _approving ? null : () => _approveAll(r.posts),
                icon: const Icon(Icons.verified_rounded),
                label: const Text('Approve all'),
              ),
            ],
          ]);
        },
      ),
    );
  }
}
