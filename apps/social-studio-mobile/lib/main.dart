import 'dart:async';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/providers.dart';
import 'core/routing/app_router.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_provider.dart';
import 'features/auth/auth_provider.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  FlutterError.onError = (details) {
    FlutterError.presentError(details);
    debugPrint('[180Social] Flutter error: ${details.exception}');
  };
  PlatformDispatcher.instance.onError = (error, stack) {
    debugPrint('[180Social] Uncaught async error: $error\n$stack');
    return true;
  };

  runApp(const ProviderScope(child: SocialStudioApp()));
}

class SocialStudioApp extends ConsumerStatefulWidget {
  const SocialStudioApp({super.key});

  @override
  ConsumerState<SocialStudioApp> createState() => _SocialStudioAppState();
}

class _SocialStudioAppState extends ConsumerState<SocialStudioApp> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(deepLinksProvider).start((location) => ref.read(routerProvider).push(location));
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      // Re-check subscription / kill-switch and flush queued offline writes.
      unawaited(ref.read(sessionProvider.notifier).refreshEntitlement());
      unawaited(ref.read(outboxProvider).drain());
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: '180 Manager',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ref.watch(themeModeProvider),
      routerConfig: ref.watch(routerProvider),
    );
  }
}
