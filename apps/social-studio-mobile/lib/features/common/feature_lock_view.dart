import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/config/app_config.dart';
import '../../core/theme/app_theme.dart';
import '../auth/auth_provider.dart';
import '../auth/auth_repository.dart';

/// Shown when the workspace cannot use the social app: not in the plan, disabled by an admin,
/// subscription expired, or company suspended. The server's 403s are authoritative.
class FeatureLockView extends ConsumerWidget {
  const FeatureLockView({super.key});

  static (String, String) copyFor(LockReason? reason) => switch (reason) {
        LockReason.subscriptionExpired => (
            'Subscription expired',
            'Your workspace subscription has ended. An administrator can renew it from the 180 Workspace billing page to restore access.'
          ),
        LockReason.companySuspended => (
            'Workspace suspended',
            'This workspace has been suspended. Contact 180 Workspace support to restore access.'
          ),
        LockReason.adminDisabled => (
            'Temporarily unavailable',
            'The Social Media Manager has been disabled by the platform administrator. Please check back later.'
          ),
        _ => (
            'Social Media Manager is locked',
            'Your workspace plan does not include the Social Media Manager. An administrator can enable it from the 180 Workspace billing hub.'
          ),
      };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider).valueOrNull;
    final ent = session?.entitlement;
    final (title, body) = copyFor(ent?.lockReason);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: AppTheme.surfaceElevated,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppTheme.border),
                ),
                child: const Icon(Icons.lock_outline_rounded, size: 38, color: AppTheme.warning),
              ),
              const SizedBox(height: 24),
              Text(title,
                  key: const Key('lock.title'),
                  style: Theme.of(context).textTheme.titleLarge,
                  textAlign: TextAlign.center),
              const SizedBox(height: 12),
              Text(ent?.message ?? body, style: Theme.of(context).textTheme.bodyMedium, textAlign: TextAlign.center),
              if (session != null) ...[
                const SizedBox(height: 8),
                Text('${session.user.email} · ${session.company.name}',
                    style: Theme.of(context).textTheme.labelSmall, textAlign: TextAlign.center),
              ],
              const SizedBox(height: 28),
              if (ent?.lockReason == LockReason.appNotEnabled || ent?.lockReason == LockReason.subscriptionExpired)
                ElevatedButton.icon(
                  onPressed: () => launchUrl(Uri.parse('${AppConfig.webAppUrl}/dashboard/billing'),
                      mode: LaunchMode.externalApplication),
                  icon: const Icon(Icons.bolt_rounded, size: 18),
                  label: const Text('Open billing'),
                ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: () => ref.read(sessionProvider.notifier).refreshEntitlement(),
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Check again'),
              ),
              TextButton(
                onPressed: () => ref.read(sessionProvider.notifier).logout(),
                child: const Text('Sign out'),
              ),
            ]),
          ),
        ),
      ),
    );
  }
}
