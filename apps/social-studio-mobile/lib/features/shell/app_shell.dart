import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';

/// Bottom navigation: Home (active project), Planner (AI calendars), Inbox, Library, Studio.
class AppShell extends ConsumerWidget {
  const AppShell({super.key, required this.shell});
  final StatefulNavigationShell shell;

  static const _destinations = [
    (Icons.dashboard_rounded, 'Home'),
    (Icons.calendar_month_rounded, 'Planner'),
    (Icons.forum_rounded, 'Inbox'),
    (Icons.perm_media_rounded, 'Library'),
    (Icons.videocam_rounded, 'Studio'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      body: shell,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppTheme.surface,
          border: Border(top: BorderSide(color: AppTheme.border)),
        ),
        child: NavigationBar(
          selectedIndex: shell.currentIndex,
          backgroundColor: Colors.transparent,
          indicatorColor: AppTheme.primary.withValues(alpha: 0.25),
          onDestinationSelected: (i) => shell.goBranch(i, initialLocation: i == shell.currentIndex),
          destinations: [
            for (final (icon, label) in _destinations)
              NavigationDestination(
                icon: Icon(icon, color: AppTheme.textSecondary),
                selectedIcon: Icon(icon, color: AppTheme.primary),
                label: label,
              ),
          ],
        ),
      ),
    );
  }
}
