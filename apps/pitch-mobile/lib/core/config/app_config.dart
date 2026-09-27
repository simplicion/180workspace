import 'package:flutter/foundation.dart' show kIsWeb, kDebugMode, defaultTargetPlatform, TargetPlatform;

class AppConfig {
  AppConfig._();

  /// 180 Unified Backend API Base URL
  static String get apiBaseUrl {
    const fromEnv = String.fromEnvironment('API_BASE_URL');
    if (fromEnv.isNotEmpty) return fromEnv;

    if (kDebugMode) {
      if (kIsWeb) return 'http://localhost:4000';
      if (defaultTargetPlatform == TargetPlatform.android) return 'http://10.0.2.2:4000';
      return 'http://localhost:4000';
    }

    return 'https://api.180workspace.com';
  }

  /// 180 Identity Provider Base URL
  static String get identityServerUrl {
    const fromEnv = String.fromEnvironment('IDENTITY_SERVER_URL');
    if (fromEnv.isNotEmpty) return fromEnv;
    return apiBaseUrl;
  }

  /// OAuth Client ID for Pitch in 180
  static const String identityClientId = '180-pitch-network';

  /// Deep link redirect URI registered in 180 Identity Provider
  static const String identityRedirectUri = '180pitch://oauth-callback';

  /// Socket.IO URL for live transcoding updates
  static String get socketUrl => apiBaseUrl;

  /// Maximum allowed duration for pitch video reels (180.0 seconds)
  static const double maxPitchDurationSeconds = 180.0;
}
