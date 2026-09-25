import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../../data/models/project.dart';
import '../../data/models/social_post.dart';
import '../posts/post_detail_screen.dart';
import '../posts/post_providers.dart';

class _MediaItem {
  const _MediaItem(this.url, this.kind, this.post);
  final String url;
  final String kind;
  final SocialPost post;
}

/// Every media file attached to the project's posts. The backend has no separate media
/// library, so this is derived from posts; workspace-wide links live in the Library tab.
class MediaTab extends ConsumerWidget {
  const MediaTab({super.key, required this.project});
  final Project project;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final q = PostQuery(projectId: project.id);
    return AsyncBody<List<SocialPost>>(
      value: ref.watch(projectPostsProvider(q)),
      onRetry: () => ref.invalidate(projectPostsProvider(q)),
      builder: (posts) {
        final items = <_MediaItem>[
          for (final p in posts) ...[
            if (p.finalVideoUrl != null) _MediaItem(p.finalVideoUrl!, 'Final video', p),
            for (final u in p.mediaUrls) _MediaItem(u, 'Media', p),
            for (final u in p.rawMediaUrls) _MediaItem(u, 'Raw footage', p),
            for (final l in p.externalStorageLinks) _MediaItem(l.url, l.provider ?? 'Link', p),
          ],
        ];
        if (items.isEmpty) {
          return EmptyView(
            icon: Icons.perm_media_rounded,
            title: 'No media yet',
            message: 'Footage, uploads and final videos attached to this project\'s posts show up here.',
            actionLabel: 'Open Library',
            onAction: () => context.go('/library'),
          );
        }
        return ListView.separated(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
          itemCount: items.length,
          separatorBuilder: (_, _) => const SizedBox(height: 8),
          itemBuilder: (_, i) {
            final m = items[i];
            return SectionCard(
              padding: const EdgeInsets.all(12),
              onTap: () => openExternal(context, m.url),
              child: Row(children: [
                Icon(
                  m.kind == 'Final video'
                      ? Icons.movie_rounded
                      : m.kind == 'Raw footage'
                          ? Icons.video_file_rounded
                          : Icons.attachment_rounded,
                  color: m.kind == 'Final video' ? AppTheme.success : AppTheme.textSecondary,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(Uri.tryParse(m.url)?.pathSegments.lastOrNull ?? m.url, maxLines: 1, overflow: TextOverflow.ellipsis),
                    Text('${m.kind} · ${m.post.displayTitle}', style: Theme.of(context).textTheme.labelSmall, maxLines: 1),
                  ]),
                ),
                IconButton(
                  tooltip: 'Open post',
                  icon: const Icon(Icons.article_rounded, size: 18),
                  onPressed: () => context.push('/posts/${m.post.id}'),
                ),
              ]),
            );
          },
        );
      },
    );
  }
}
