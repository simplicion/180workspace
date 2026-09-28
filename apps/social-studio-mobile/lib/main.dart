import 'dart:async';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/providers.dart';
import 'core/routing/app_router.dart';
import 'core/services/push_notifications.dart';
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

  runApp(ProviderScope(child: SocialStudioApp()));
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
      // Push: gated on Firebase config; a tapped notification opens the post.
      unawaited(ref.read(pushServiceProvider.notifier).init(navigate: (location) => ref.read(routerProvider).push(location)).then((_) {
        if (ref.read(sessionProvider).valueOrNull != null) unawaited(ref.read(pushServiceProvider.notifier).enable());
      }));
    });
    // After each sign-in, ask for the notification permission (Android 13+) and register this device's token.
    ref.listenManual(sessionProvider, (prev, next) {
      if (prev?.valueOrNull == null && next.valueOrNull != null) unawaited(ref.read(pushServiceProvider.notifier).enable());
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
    final themeMode = ref.watch(themeModeProvider);
    
    return MaterialApp.router(
      title: '180 Manager',
      debugShowCheckedModeBanner: false,
      // Screens still use the dark studio tokens directly, so light is not safe yet (see ThemeModeNotifier):
      // System resolves to the dark palette until ThemeModeNotifier.lightModeAvailable is true.
      theme: ThemeModeNotifier.lightModeAvailable ? AppTheme.lightTheme : AppTheme.darkTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: themeMode,
      routerConfig: ref.watch(routerProvider),
    );
  }
}
