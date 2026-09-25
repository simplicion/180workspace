/// Build-time configuration. Nothing in here is a secret.
///
/// Override per build with `--dart-define`, e.g.
/// `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4002`.
class AppConfig {
  AppConfig._();

  /// Origin of the 180 Workspace backend (no trailing slash, no `/api`).
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api.180workspace.com',
  );

  /// Origin of the web app. Used to build shareable links such as `/review/<token>`.
  static const String webAppUrl = String.fromEnvironment(
    'WEB_APP_URL',
    defaultValue: 'https://app.180workspace.com',
  );

  /// Google OAuth *web* client id used as `serverClientId` so the native SDK mints an ID token
  /// the backend accepts. A public identifier, not a secret.
  static const String googleServerClientId = String.fromEnvironment(
    'GOOGLE_SERVER_CLIENT_ID',
    defaultValue: '188560578303-2bih1dg5qhbq5uao9q451r6db3986e6f.apps.googleusercontent.com',
  );

  /// Custom scheme the OS hands back to the app after a browser OAuth hop.
  static const String deepLinkScheme = 'workspace180';
  static const String oauthRedirectUri = 'workspace180://oauth/callback';

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
