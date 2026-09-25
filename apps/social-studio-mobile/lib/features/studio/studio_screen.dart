import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../../data/models/social_post.dart';
import '../dashboard/studio_dashboard_screen.dart';
import '../posts/post_providers.dart';
import '../projects/project_provider.dart';

/// The on-device video engine exists for Android only; iOS shows this instead of failing later.
bool get studioSupported => !Platform.isIOS;

/// Studio tab: shoot, edit, and the active project's posts that still need a video.
class StudioScreen extends ConsumerWidget {
  const StudioScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final projectId = ref.watch(activeProjectProvider).valueOrNull?.id;
    final posts = projectId == null ? null : ref.watch(projectPostsProvider(PostQuery(projectId: projectId)));
    return Scaffold(
      appBar: workspaceAppBar(context, ref),
      body: !studioSupported
          ? const EmptyView(
              icon: Icons.phone_iphone_rounded,
              title: 'Video editing is Android-only for now',
              message: 'The on-device editor is coming to iPhone. You can still plan, write, review and publish from here.',
            )
          : ListView(padding: const EdgeInsets.fromLTRB(16, 12, 16, 96), children: [
              Row(children: [
                Expanded(
                  child: _Action(
                    icon: Icons.videocam_rounded,
                    label: 'Shoot',
                    hint: 'Teleprompter camera',
                    onTap: () => context.push('/camera${projectId == null ? '' : '?projectId=$projectId'}'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _Action(
                    icon: Icons.movie_edit,
                    label: 'Edit a video',
                    hint: 'From your gallery',
                    onTap: () => context.push('/studio/session${projectId == null ? '' : '?projectId=$projectId'}'),
                  ),
                ),
              ]),
              const SectionHeader('Needs a video'),
              if (posts == null)
                const SectionCard(child: Text('Pick a project on Home to see posts waiting for footage.'))
              else
                posts.when(
                  loading: () => const Padding(padding: EdgeInsets.all(24), child: LoadingView()),
                  error: (e, _) => ErrorView(error: e, compact: true, onRetry: () => ref.invalidate(projectPostsProvider(PostQuery(projectId: projectId!)))),
                  data: (list) {
                    final todo = list
                        .where((p) =>
                            (p.mediaType == null || p.mediaType == 'video') &&
                            p.finalVideoUrl == null &&
                            const {PostStatus.draft, PostStatus.inEditing, PostStatus.scheduled, PostStatus.approved}.contains(p.status))
                        .toList()
                      ..sort((a, b) => (a.scheduledFor ?? DateTime(9999)).compareTo(b.scheduledFor ?? DateTime(9999)));
                    if (todo.isEmpty) return const SectionCard(child: Text('Every video post has its final video. Nice.'));
                    return Column(children: [
                      for (final p in todo)
                        PostTile(
                          post: p,
                          trailing: IconButton(
                            tooltip: 'Shoot for this post',
                            icon: const Icon(Icons.videocam_rounded, color: AppTheme.primary),
                            onPressed: () => context.push('/camera?projectId=$projectId&postId=${p.id}',
                                extra: {'hook': p.hook ?? p.displayTitle, 'script': p.content}),
                          ),
                        ),
                    ]);
                  },
                ),
            ]),
    );
  }
}

class _Action extends StatelessWidget {
  const _Action({required this.icon, required this.label, required this.hint, required this.onTap});
  final IconData icon;
  final String label;
  final String hint;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => SectionCard(
        onTap: onTap,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(icon, color: AppTheme.primary, size: 28),
          const SizedBox(height: 12),
          Text(label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          Text(hint, style: Theme.of(context).textTheme.labelSmall),
        ]),
      );
}
