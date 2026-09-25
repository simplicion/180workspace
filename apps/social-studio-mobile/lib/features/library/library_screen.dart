import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../../data/models/library.dart';
import '../dashboard/studio_dashboard_screen.dart';
import '../posts/post_detail_screen.dart';

final assetsProvider = FutureProvider.autoDispose<List<LinkedAsset>>((ref) => ref.watch(socialApiProvider).listAssets());
final banksProvider = FutureProvider.autoDispose.family<List<SavedBankItem>, String>(
    (ref, type) => ref.watch(socialApiProvider).listBanks(type: type));

/// Library tab: linked assets plus saved hashtag and hook banks, shared across projects.
class LibraryScreen extends ConsumerWidget {
  const LibraryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: workspaceAppBar(context, ref),
        body: const Column(children: [
          TabBar(tabs: [Tab(text: 'Assets'), Tab(text: 'Hashtags'), Tab(text: 'Hooks')]),
          Expanded(child: TabBarView(children: [_AssetsView(), _BankView(type: 'hashtag'), _BankView(type: 'hook')])),
        ]),
      ),
    );
  }
}

class _AssetsView extends ConsumerWidget {
  const _AssetsView();

  Future<void> _add(BuildContext context, WidgetRef ref) async {
    var type = LinkedAsset.types.first;
    // The controllers belong to the dialog route (DialogControllers): disposing them when
    // showDialog returns crashed the dialog's exit animation.
    final result = await showDialog<(String, String)>(
      context: context,
      builder: (ctx) => DialogControllers(
        count: 2,
        builder: (ctx, c) => StatefulBuilder(
        builder: (ctx, set) => AlertDialog(
          backgroundColor: AppTheme.surfaceElevated,
          title: const Text('Link an asset'),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(controller: c[0], decoration: fieldDecoration('URL *', hint: 'Drive, Dropbox, Canva…')),
            const SizedBox(height: 12),
            TextField(controller: c[1], decoration: fieldDecoration('Title')),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: type,
              decoration: fieldDecoration('Type'),
              items: [for (final t in LinkedAsset.types) DropdownMenuItem(value: t, child: Text(t))],
              onChanged: (v) => set(() => type = v ?? type),
            ),
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            TextButton(onPressed: () => Navigator.pop(ctx, (c[0].text.trim(), c[1].text.trim())), child: const Text('Save')),
          ],
        ),
      ),
      ),
    );
    if (result == null || !context.mounted) return;
    final (u, t) = result;
    if (Uri.tryParse(u)?.hasScheme != true) {
      showError(context, 'Enter a full URL starting with https://');
      return;
    }
    final outcome = await guarded(context, () => ref.read(socialApiProvider).createAsset(url: u, type: type, title: t.isEmpty ? null : t));
    if (outcome == null || !context.mounted) return;
    showMutation(context, outcome, 'Asset linked');
    ref.invalidate(assetsProvider);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      floatingActionButton: FloatingActionButton(
        heroTag: 'library.asset',
        tooltip: 'Link an asset',
        onPressed: () => _add(context, ref),
        child: const Icon(Icons.add_link_rounded),
      ),
      body: AsyncBody<List<LinkedAsset>>(
        value: ref.watch(assetsProvider),
        onRetry: () => ref.invalidate(assetsProvider),
        isEmpty: (l) => l.isEmpty,
        empty: EmptyView(
          icon: Icons.perm_media_rounded,
          title: 'No linked assets',
          message: 'Keep brand kits, logos and footage folders one tap away.',
          actionLabel: 'Link an asset',
          onAction: () => _add(context, ref),
        ),
        builder: (list) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(assetsProvider),
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
            itemCount: list.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (_, i) {
              final a = list[i];
              return SectionCard(
                padding: const EdgeInsets.fromLTRB(12, 4, 4, 4),
                onTap: () => openExternal(context, a.url),
                child: Row(children: [
                  Icon(switch (a.type) {
                    'image' => Icons.image_rounded,
                    'video' => Icons.movie_rounded,
                    'folder' => Icons.folder_rounded,
                    _ => Icons.link_rounded,
                  }, color: AppTheme.textSecondary),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(a.title ?? a.url, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
                      Text(a.url, maxLines: 1, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.labelSmall),
                    ]),
                  ),
                  IconButton(
                    tooltip: 'Remove',
                    icon: const Icon(Icons.delete_outline_rounded),
                    onPressed: () async {
                      if (!await confirm(context, title: 'Remove asset link?', message: a.title ?? a.url, action: 'Remove', destructive: true)) return;
                      if (!context.mounted) return;
                      await guarded(context, () => ref.read(socialApiProvider).deleteAsset(a.id));
                      if (context.mounted) ref.invalidate(assetsProvider);
                    },
                  ),
                ]),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _BankView extends ConsumerWidget {
  const _BankView({required this.type});
  final String type;

  String get _label => type == 'hashtag' ? 'hashtag set' : 'hook';

  Future<void> _add(BuildContext context, WidgetRef ref) async {
    final name = await promptText(context, title: 'Name this $_label', label: 'e.g. ${type == 'hashtag' ? 'Fitness core' : 'Myth-buster opener'}', action: 'Next');
    if (name == null || name.isEmpty || !context.mounted) return;
    final content = await promptText(context,
        title: type == 'hashtag' ? 'Hashtags' : 'Hook text', label: type == 'hashtag' ? '#one #two #three' : '', maxLines: 4);
    if (content == null || content.isEmpty || !context.mounted) return;
    final outcome = await guarded(context, () => ref.read(socialApiProvider).createBank(type: type, name: name, content: content));
    if (outcome == null || !context.mounted) return;
    showMutation(context, outcome, 'Saved');
    ref.invalidate(banksProvider(type));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      floatingActionButton: FloatingActionButton(
        heroTag: 'library.$type',
        tooltip: 'New $_label',
        onPressed: () => _add(context, ref),
        child: const Icon(Icons.add_rounded),
      ),
      body: AsyncBody<List<SavedBankItem>>(
        value: ref.watch(banksProvider(type)),
        onRetry: () => ref.invalidate(banksProvider(type)),
        isEmpty: (l) => l.isEmpty,
        empty: EmptyView(
          icon: type == 'hashtag' ? Icons.tag_rounded : Icons.bolt_rounded,
          title: type == 'hashtag' ? 'No hashtag sets' : 'No saved hooks',
          message: 'Save what works and reuse it in any caption with one tap.',
          actionLabel: 'New $_label',
          onAction: () => _add(context, ref),
        ),
        builder: (list) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(banksProvider(type)),
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
            itemCount: list.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (_, i) {
              final b = list[i];
              return SectionCard(
                padding: const EdgeInsets.fromLTRB(12, 8, 4, 8),
                child: Row(children: [
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(b.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                      const SizedBox(height: 4),
                      Text(b.content, maxLines: 4, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.bodyMedium),
                    ]),
                  ),
                  IconButton(
                    tooltip: 'Copy',
                    icon: const Icon(Icons.copy_rounded, size: 18),
                    onPressed: () async {
                      await Clipboard.setData(ClipboardData(text: b.content));
                      if (context.mounted) showInfo(context, 'Copied');
                    },
                  ),
                  IconButton(
                    tooltip: 'Delete',
                    icon: const Icon(Icons.delete_outline_rounded, size: 18),
                    onPressed: () async {
                      if (!await confirm(context, title: 'Delete "${b.name}"?', message: 'This cannot be undone.', action: 'Delete', destructive: true)) return;
                      if (!context.mounted) return;
                      await guarded(context, () => ref.read(socialApiProvider).deleteBank(b.id));
                      if (context.mounted) ref.invalidate(banksProvider(type));
                    },
                  ),
                ]),
              );
            },
          ),
        ),
      ),
    );
  }
}
