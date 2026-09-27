import 'dart:convert';
import 'dart:math';
import 'package:crypto/crypto.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:url_launcher/url_launcher.dart';
import '../config/app_config.dart';

class OneEightyPitchSsoService {
  final FlutterSecureStorage _storage;
  final Dio _dio;

  static const _kCodeVerifier = '180_pitch_code_verifier';
  static const _kOAuthState = '180_pitch_oauth_state';
  static const _kAccessToken = '180_pitch_access_token';
  static const _kRefreshToken = '180_pitch_refresh_token';
  static const _kIdToken = '180_pitch_id_token';
  static const _kUserProfile = '180_pitch_user_profile';

  OneEightyPitchSsoService({FlutterSecureStorage? storage, Dio? dio})
      : _storage = storage ?? const FlutterSecureStorage(),
        _dio = dio ?? Dio();

  String _randomString(int length) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~';
    final rand = Random.secure();
    return List.generate(length, (_) => chars[rand.nextInt(chars.length)]).join();
  }

  String _base64UrlNoPadding(List<int> bytes) {
    return base64Url.encode(bytes).replaceAll('=', '');
  }

  /// Launch 180 Identity SSO in browser
  Future<void> launch180IdentityLogin() async {
    final verifier = _randomString(64);
    final digest = sha256.convert(utf8.encode(verifier));
    final challenge = _base64UrlNoPadding(digest.bytes);
    final state = _randomString(32);

    await _storage.write(key: _kCodeVerifier, value: verifier);
    await _storage.write(key: _kOAuthState, value: state);

    final authUrl = Uri.parse('${AppConfig.identityServerUrl}/oauth/authorize').replace(
      queryParameters: {
        'client_id': AppConfig.identityClientId,
        'redirect_uri': AppConfig.identityRedirectUri,
        'response_type': 'code',
        'scope': 'openid identity:read identity:email pitch:read pitch:write messages:send',
        'state': state,
        'code_challenge': challenge,
        'code_challenge_method': 'S256',
        'ux_mode': 'redirect',
      },
    );

    if (!await launchUrl(authUrl, mode: LaunchMode.externalApplication)) {
      throw Exception('Could not launch 180 Identity authentication browser.');
    }
  }

  /// Handle incoming deep link (180pitch://oauth-callback?code=...&state=...)
  Future<Map<String, dynamic>> handleCallbackUri(Uri uri) async {
    final code = uri.queryParameters['code'];
    final state = uri.queryParameters['state'];
    final error = uri.queryParameters['error'];

    if (error != null) {
      throw Exception('180 Identity error: $error');
    }

    if (code == null || code.isEmpty) {
      throw Exception('Authorization code missing in callback.');
    }

    final savedState = await _storage.read(key: _kOAuthState);
    if (savedState == null || savedState != state) {
      throw Exception('CSRF validation failed: State parameter mismatch.');
    }

    final codeVerifier = await _storage.read(key: _kCodeVerifier);
    if (codeVerifier == null || codeVerifier.isEmpty) {
      throw Exception('PKCE code verifier missing.');
    }

    // Exchange authorization code for tokens
    final tokenUrl = '${AppConfig.identityServerUrl}/oauth/token';
    final response = await _dio.post(
      tokenUrl,
      data: {
        'grant_type': 'authorization_code',
        'client_id': AppConfig.identityClientId,
        'code': code,
        'redirect_uri': AppConfig.identityRedirectUri,
        'code_verifier': codeVerifier,
      },
      options: Options(headers: {'Content-Type': 'application/json'}),
    );

    final data = response.data as Map<String, dynamic>;
    final accessToken = data['access_token'] as String;
    final refreshToken = data['refresh_token'] as String?;
    final idToken = data['id_token'] as String?;

    await _storage.write(key: _kAccessToken, value: accessToken);
    if (refreshToken != null) {
      await _storage.write(key: _kRefreshToken, value: refreshToken);
    }
    if (idToken != null) {
      await _storage.write(key: _kIdToken, value: idToken);
    }

    // Cleanup PKCE state
    await _storage.delete(key: _kCodeVerifier);
    await _storage.delete(key: _kOAuthState);

    // Fetch and store user profile
    await fetchAndCacheUserInfo(accessToken);

    return data;
  }

  Future<Map<String, dynamic>?> fetchAndCacheUserInfo(String accessToken) async {
    try {
      final response = await _dio.get(
        '${AppConfig.identityServerUrl}/oauth/userinfo',
        options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
      );
      final profile = response.data as Map<String, dynamic>;
      await _storage.write(key: _kUserProfile, value: jsonEncode(profile));
      return profile;
    } catch (_) {
      return null;
    }
  }

  Future<String?> getAccessToken() => _storage.read(key: _kAccessToken);

  Future<Map<String, dynamic>?> getCachedProfile() async {
    final raw = await _storage.read(key: _kUserProfile);
    if (raw == null) return null;
    try {
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  Future<void> logout() async {
    await _storage.delete(key: _kAccessToken);
    await _storage.delete(key: _kRefreshToken);
    await _storage.delete(key: _kIdToken);
    await _storage.delete(key: _kUserProfile);
  }
}
