import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:app_links/app_links.dart';
import 'core/theme/pitch_theme.dart';
import 'core/auth/auth_provider.dart';
import 'features/shell/main_nav_shell.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: PitchTheme.surface,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  runApp(
    const ProviderScope(
      child: PitchApp(),
    ),
  );
}

class PitchApp extends ConsumerStatefulWidget {
  const PitchApp({super.key});

  @override
  ConsumerState<PitchApp> createState() => _PitchAppState();
}

class _PitchAppState extends ConsumerState<PitchApp> {
  late final AppLinks _appLinks;
  StreamSubscription<Uri>? _linkSub;

  @override
  void initState() {
    super.initState();
    _initDeepLinks();
  }

  void _initDeepLinks() {
    _appLinks = AppLinks();
    _linkSub = _appLinks.uriLinkStream.listen(
      (uri) {
        if (uri.scheme == '180pitch' && uri.host == 'oauth-callback') {
          ref.read(authStateProvider.notifier).handleDeepLink(uri);
        }
      },
      onError: (err) {
        // Handle deep link error
      },
    );
  }

  @override
  void dispose() {
    _linkSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Pitch in 180',
      debugShowCheckedModeBanner: false,
      theme: PitchTheme.darkTheme,
      home: const MainNavShell(),
    );
  }
}
