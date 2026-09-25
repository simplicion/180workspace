import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../../data/models/project.dart';
import '../../data/models/task.dart';
import '../posts/post_providers.dart';
import '../projects/project_provider.dart';

/// Editing tasks: footage → editor → deliverable (web `tabs/TasksTab.tsx`).
class TasksTab extends ConsumerWidget {
  const TasksTab({super.key, required this.project});
  final Project project;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return AsyncBody<List<EditingTask>>(
      value: ref.watch(projectTasksProvider(project.id)),
      onRetry: () => ref.invalidate(projectTasksProvider(project.id)),
      isEmpty: (l) => l.isEmpty,
      empty: EmptyView(
        icon: Icons.assignment_rounded,
        title: 'No editing tasks',
        message: 'Open a post and choose "Assign editor" to hand footage to an editor.',
        actionLabel: 'Open content',
        onAction: () => context.push('/projects/${project.id}/content'),
      ),
      builder: (tasks) {
        final sorted = [...tasks]..sort((a, b) {
            if (a.isOverdue != b.isOverdue) return a.isOverdue ? -1 : 1;
            return (a.dueDate ?? DateTime(9999)).compareTo(b.dueDate ?? DateTime(9999));
          });
        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(projectTasksProvider(project.id)),
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
            itemCount: sorted.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (_, i) => _TaskCard(task: sorted[i], project: project),
          ),
        );
      },
    );
  }
}

class _TaskCard extends ConsumerWidget {
  const _TaskCard({required this.task, required this.project});
  final EditingTask task;
  final Project project;

  bool get _done => const {'done', 'completed', 'submitted_for_review', 'approved'}.contains(task.status);

  Future<void> _submit(BuildContext context, WidgetRef ref) async {
    final choice = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: AppTheme.surface,
      builder: (ctx) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          ListTile(
            leading: const Icon(Icons.upload_rounded),
            title: const Text('Upload a video from this phone'),
            onTap: () => Navigator.pop(ctx, 'upload'),
          ),
          ListTile(
            leading: const Icon(Icons.link_rounded),
            title: const Text('Paste a video URL'),
            onTap: () => Navigator.pop(ctx, 'link'),
          ),
        ]),
      ),
    );
    if (choice == null || !context.mounted) return;
    final api = ref.read(socialApiProvider);
    String? url;
    if (choice == 'upload') {
      final file = await ImagePicker().pickVideo(source: ImageSource.gallery);
      if (file == null || !context.mounted) return;
      showInfo(context, 'Uploading…');
      url = await guarded(context, () => api.uploadFile(file.path));
    } else {
      url = await promptText(context, title: 'Final video URL', label: 'https://…', action: 'Next');
      if (url != null && Uri.tryParse(url)?.hasScheme != true) {
        if (context.mounted) showError(context, 'Enter a full URL starting with https://');
        return;
      }
    }
    if (url == null || url.isEmpty || !context.mounted) return;
    final notes = await promptText(context, title: 'Notes for the reviewer', label: 'Optional', action: 'Submit', maxLines: 3);
    if (notes == null || !context.mounted) return;
    final r = await guarded(context, () => api.submitDeliverable(task.id, deliverableUrl: url!, notes: notes.isEmpty ? null : notes));
    if (r == null || !context.mounted) return;
    showInfo(context, 'Deliverable submitted for review', color: AppTheme.success);
    ref.invalidate(projectTasksProvider(project.id));
    ref.refreshProjectData(project.id);
    if (task.postId != null) ref.refreshPost(task.postId!, projectId: project.id);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SectionCard(
      borderColor: task.isOverdue ? AppTheme.error.withValues(alpha: 0.6) : null,
      onTap: task.postId == null ? null : () => context.push('/posts/${task.postId}'),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text(task.title, style: const TextStyle(fontWeight: FontWeight.w700))),
          if (task.status != null) StatusChip(label: task.status!.replaceAll('_', ' '), color: _done ? AppTheme.success : AppTheme.accent),
        ]),
        if (task.description?.isNotEmpty ?? false) ...[
          const SizedBox(height: 4),
          Text(task.description!, maxLines: 3, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.bodyMedium),
        ],
        const SizedBox(height: 8),
        Wrap(spacing: 6, runSpacing: 6, crossAxisAlignment: WrapCrossAlignment.center, children: [
          StatusChip(label: task.assignee?.name ?? 'Unassigned', color: AppTheme.textSecondary, icon: Icons.person_rounded),
          if (task.dueDate != null)
            StatusChip(
              label: '${task.isOverdue ? 'Overdue · ' : 'Due '}${fmtDate(task.dueDate)}',
              color: task.isOverdue ? AppTheme.error : AppTheme.textSecondary,
              icon: Icons.alarm_rounded,
            ),
          if (task.priority != null) StatusChip(label: task.priority!, color: task.priority == 'urgent' || task.priority == 'high' ? AppTheme.warning : AppTheme.textMuted),
        ]),
        if (!_done) ...[
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton.icon(
              onPressed: () => _submit(context, ref),
              icon: const Icon(Icons.task_alt_rounded, size: 18),
              label: const Text('Submit deliverable'),
            ),
          ),
        ],
      ]),
    );
  }
}
