import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/config/app_config.dart';
import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../../data/models/platform.dart';
import '../../data/models/project.dart';
import '../../data/models/social_account.dart';
import '../projects/project_provider.dart';
import 'account_selection_sheet.dart';

final allAccountsProvider = FutureProvider.autoDispose<List<SocialAccount>>((ref) => ref.watch(socialApiProvider).listAccounts());

/// Channels linked to the project: link existing workspace accounts, connect new ones via
/// OAuth in the system browser, unlink, and flag accounts needing re-authorization.
class AccountsTab extends ConsumerStatefulWidget {
  const AccountsTab({super.key, required this.project});
  final Project project;

  @override
  ConsumerState<AccountsTab> createState() => _AccountsTabState();
}

class _AccountsTabState extends ConsumerState<AccountsTab> {
  StreamSubscription? _oauthSub;

  @override
  void initState() {
    super.initState();
    _oauthSub = ref.read(deepLinksProvider).oauthCallbacks.listen((cb) {
      if (!mounted) return;
      if (cb.needsSelection) {
        showAccountSelectionSheet(context, cb.selectionId!).then((_) => _refresh());
        return;
      }
      if (cb.isSuccess) {
        showInfo(context, '${cb.platform ?? 'Account'} connected', color: AppTheme.success);
      } else {
        showError(context, 'Connection failed: ${cb.error ?? 'unknown error'}');
      }
      _refresh();
    });
  }

  @override
  void dispose() {
    _oauthSub?.cancel();
    super.dispose();
  }

  void _refresh() {
    ref.refreshProjectData(widget.project.id);
    ref.invalidate(allAccountsProvider);
  }

  Future<void> _connect(SocialPlatform platform) async {
    final uri = await guarded(context, () => ref.read(socialApiProvider).startAccountOAuth(platform, projectId: widget.project.id));
    if (uri == null || !mounted) return;
    if (uri.scheme == AppConfig.deepLinkScheme) {
      ref.read(deepLinksProvider).routeFor(uri);
      return;
    }
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication) && mounted) {
      showError(context, 'Could not open the browser for ${platform.label}.');
    }
  }

  Future<void> _link(SocialAccount a) async {
    final ok = await guarded(context, () async {
      await ref.read(socialApiProvider).linkAccount(widget.project.id, a.id);
      return true;
    });
    if (ok == true && mounted) {
      showInfo(context, '${a.accountName} linked', color: AppTheme.success);
      _refresh();
    }
  }

  Future<void> _unlink(SocialAccount a) async {
    final yes = await confirm(context,
        title: 'Unlink ${a.accountName}?', message: 'Scheduled posts from this account will not publish for this project.', action: 'Unlink', destructive: true);
    if (!yes || !mounted) return;
    final ok = await guarded(context, () async {
      await ref.read(socialApiProvider).unlinkAccount(widget.project.id, a.id);
      return true;
    });
    if (ok == true && mounted) _refresh();
  }

  @override
  Widget build(BuildContext context) {
    final linked = widget.project.socialAccounts;
    final all = ref.watch(allAccountsProvider);
    return RefreshIndicator(
      onRefresh: () async => _refresh(),
      child: ListView(padding: const EdgeInsets.fromLTRB(16, 8, 16, 96), children: [
        SectionHeader('Linked to this project (${linked.length})'),
        if (linked.isEmpty) const SectionCard(child: Text('No channels linked yet.')),
        for (final a in linked) _AccountTile(account: a, trailing: TextButton(onPressed: () => _unlink(a), child: const Text('Unlink'))),
        const SectionHeader('Connect a new channel'),
        Wrap(spacing: 8, runSpacing: 8, children: [
          for (final p in SocialPlatform.connectable)
            OutlinedButton.icon(
              onPressed: () => _connect(p),
              icon: Icon(p.icon, color: p.color, size: 18),
              label: Text(p.label),
            ),
        ]),
        const Padding(
          padding: EdgeInsets.only(top: 6),
          child: Text('Opens the platform sign-in in your browser and returns here when done.',
              style: TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
        ),
        const SectionHeader('Other workspace accounts'),
        all.when(
          loading: () => const Padding(padding: EdgeInsets.all(16), child: LoadingView()),
          error: (e, _) => ErrorView(error: e, compact: true, onRetry: () => ref.invalidate(allAccountsProvider)),
          data: (list) {
            final others = list.where((a) => a.projectId != widget.project.id).toList();
            if (others.isEmpty) return const SectionCard(child: Text('No other connected accounts.'));
            return Column(children: [
              for (final a in others)
                _AccountTile(
                  account: a,
                  subtitle: a.projectName == null ? 'Not linked to a project' : 'Linked to ${a.projectName}',
                  trailing: TextButton(onPressed: () => _link(a), child: Text(a.projectId == null ? 'Link' : 'Move here')),
                ),
            ]);
          },
        ),
      ]),
    );
  }
}

class _AccountTile extends StatelessWidget {
  const _AccountTile({required this.account, required this.trailing, this.subtitle});
  final SocialAccount account;
  final Widget trailing;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    final a = account;
    final status = a.reauthRequired
        ? 'Re-authorization required'
        : a.tokenExpired
            ? 'Access expired'
            : a.expiresSoon
                ? 'Access expires ${fmtDate(a.tokenExpiresAt)}'
                : null;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: SectionCard(
        padding: const EdgeInsets.fromLTRB(12, 8, 4, 8),
        borderColor: a.needsAttention ? AppTheme.error.withValues(alpha: 0.5) : null,
        child: Row(children: [
          CircleAvatar(
            backgroundColor: a.platform.color.withValues(alpha: 0.2),
            foregroundImage: a.profileImageUrl == null ? null : NetworkImage(a.profileImageUrl!),
            child: Icon(a.platform.icon, color: a.platform.color, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(a.accountName, style: const TextStyle(fontWeight: FontWeight.w600)),
              Text([a.platform.label, if (a.username != null) '@${a.username}', ?subtitle].join(' · '),
                  style: Theme.of(context).textTheme.labelSmall, maxLines: 1, overflow: TextOverflow.ellipsis),
              if (status != null)
                Text(status, style: TextStyle(fontSize: 12, color: a.needsAttention ? AppTheme.error : AppTheme.warning)),
            ]),
          ),
          trailing,
        ]),
      ),
    );
  }
}
