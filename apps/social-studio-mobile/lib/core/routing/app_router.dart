import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/auth_provider.dart';
import '../../features/auth/login_screen.dart';
import '../../features/common/feature_lock_view.dart';
import '../../features/dashboard/studio_dashboard_screen.dart';
import '../../features/shell/app_shell.dart';
import '../../features/shell/extra_routes.dart';
import '../widgets/common.dart';
import '../widgets/sync_indicator.dart';

final _rootKey = GlobalKey<NavigatorState>();

/// Bridges the Riverpod session into go_router's refresh mechanism.
class _SessionListenable extends ChangeNotifier {
  _SessionListenable(Ref ref) {
    ref.listen(sessionProvider, (_, _) => notifyListeners());
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  final listenable = _SessionListenable(ref);
  ref.onDispose(listenable.dispose);

  return GoRouter(
    navigatorKey: _rootKey,
    initialLocation: '/splash',
    refreshListenable: listenable,
    redirect: (context, state) {
      final loc = state.matchedLocation;
      if (loc.startsWith('/review/')) return null; // public client portal, no login
      final session = ref.read(sessionProvider);
      if (!session.hasValue) return loc == '/splash' ? null : '/splash';
      final s = session.value;
      if (s == null) return loc == '/login' ? null : '/login';
      if (!s.entitlement.hasSocial) return loc == '/locked' ? null : '/locked';
      if (loc == '/login' || loc == '/splash' || loc == '/locked') return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, _) => const SplashScreen()),
      GoRoute(path: '/login', builder: (_, _) => const LoginScreen()),
      GoRoute(path: '/locked', builder: (_, _) => const FeatureLockView()),
      GoRoute(path: '/sync', builder: (_, _) => const OutboxScreen()),
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => AppShell(shell: shell),
        branches: [
          StatefulShellBranch(routes: [GoRoute(path: '/home', builder: (_, _) => const StudioDashboardScreen())]),
          ...shellBranches(),
        ],
      ),
      ...extraRoutes(),
    ],
  );
});

class SplashScreen extends ConsumerWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    return Scaffold(
      body: session.hasError
          ? Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              ErrorView(error: session.error!, onRetry: () => ref.read(sessionProvider.notifier).retryRestore()),
              TextButton(onPressed: () => ref.read(sessionProvider.notifier).logout(), child: const Text('Sign out')),
            ])
          : const LoadingView(label: 'Initializing 180 Manager...'),
    );
  }
}
