import 'package:flutter/foundation.dart' show kIsWeb;

/// Build-time configuration. Nothing in here is a secret.
///
/// Override per build with `--dart-define`, e.g.
/// `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4002`.
class AppConfig {
  AppConfig._();

  /// Origin of the 180 Workspace backend (no trailing slash, no `/api`).
  static String get apiBaseUrl {
    const fromEnv = String.fromEnvironment('API_BASE_URL');
    if (fromEnv.isNotEmpty) return fromEnv;
    return 'https://api.180workspace.com';
  }

  /// Origin of the web app. Used to build shareable links such as `/review/<token>`.
  static const String webAppUrl = String.fromEnvironment(
    'WEB_APP_URL',
    defaultValue: 'https://app.180workspace.com',
  );

  /// Google OAuth *web* client id used as `serverClientId` so the native SDK mints an ID token
  /// the backend accepts. A public identifier, not a secret.
  static const String googleServerClientId = String.fromEnvironment(
    'GOOGLE_SERVER_CLIENT_ID',
    defaultValue: '',
  );

  /// Custom scheme the OS hands back to the app after a browser OAuth hop.
  static const String deepLinkScheme = 'workspace180';
  static String get oauthRedirectUri {
    const fromEnv = String.fromEnvironment('OAUTH_REDIRECT_URI');
    if (fromEnv.isNotEmpty) return fromEnv;
    if (kIsWeb) {
      final base = Uri.base.origin;
      return base.isNotEmpty ? '$base/#/oauth-callback' : 'https://social.180workspace.com/#/oauth-callback';
    }
    return 'workspace180://oauth/callback';
  }

  /// 180 Identity Provider Configurations
  static String get identityServerUrl {
    const fromEnv = String.fromEnvironment('IDENTITY_SERVER_URL');
    if (fromEnv.isNotEmpty) return fromEnv;
    return 'https://180identity.180workspace.com';
  }

  /// 180 Profile / Identity Web Auth UI Server (Universal 180 Profile login)
  static String get identityAuthUrl {
    const fromEnv = String.fromEnvironment('IDENTITY_AUTH_URL');
    if (fromEnv.isNotEmpty) return fromEnv;
    return 'https://profile.180workspace.com';
  }

  static const String identityClientId = '180-social-studio-mobile';
  static String get identityRedirectUri {
    const fromEnv = String.fromEnvironment('IDENTITY_REDIRECT_URI');
    if (fromEnv.isNotEmpty) return fromEnv;
    if (kIsWeb) {
      final base = Uri.base.origin;
      return base.isNotEmpty ? '$base/#/oauth-callback' : 'http://localhost:3007/#/oauth-callback';
    }
    return '180social://oauth-callback';
  }

  /// Kebab-case app id used by billing, feature flags and `moduleGuard`.
  static const String socialAppId = 'social-media';

  /// Timeouts. LLM-backed endpoints are slow; uploads are slower.
  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration defaultReceiveTimeout = Duration(seconds: 30);
  static const Duration aiReceiveTimeout = Duration(seconds: 120);
  static const Duration calendarGenerationTimeout = Duration(seconds: 180);
  static const Duration uploadTimeout = Duration(minutes: 10);

  static String absoluteWebUrl(String pathOrUrl) {
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl;
    final p = pathOrUrl.startsWith('/') ? pathOrUrl : '/$pathOrUrl';
    return '$webAppUrl$p';
  }
}
