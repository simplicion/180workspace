import 'dart:convert';
import 'dart:math';
import 'package:crypto/crypto.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:url_launcher/url_launcher.dart';
import '../config/app_config.dart';
import 'package:universal_html/html.dart' as html;
import 'package:flutter/foundation.dart';
class OneEightySsoService {
  final FlutterSecureStorage _storage;
  final Dio _dio;

  static const _kCodeVerifier = '180_oauth_code_verifier';
  static const _kOAuthState = '180_oauth_state';
  static const _kAccessToken = '180_access_token';
  static const _kRefreshToken = '180_refresh_token';
  static const _kIdToken = '180_id_token';

  OneEightySsoService({FlutterSecureStorage? storage, Dio? dio})
      : _storage = storage ?? FlutterSecureStorage(),
        _dio = dio ?? Dio();

  /// Generate high-entropy cryptographically random string
  String _randomString(int length) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~';
    final rand = Random.secure();
    return List.generate(length, (_) => chars[rand.nextInt(chars.length)]).join();
  }

  /// Base64URL encoding without padding (RFC 7636)
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
        'scope': 'openid identity:read identity:email messages:send',
        'state': state,
        'code_challenge': challenge,
        'code_challenge_method': 'S256',
        'ux_mode': kIsWeb ? 'popup' : 'redirect',
      },
    );

    if (kIsWeb) {
      // Use web-native popup and postMessage
      html.window.open(
        authUrl.toString(),
        '180 Identity',
        'width=500,height=700,left=100,top=100',
      );

      // Wait for postMessage from the popup
      await for (final event in html.window.onMessage) {
        final data = event.data;
        if (data is Map && data['type'] == '180_IDENTITY_SUCCESS') {
          final returnedCode = data['code'];
          final returnedState = data['state'];
          
          if (returnedCode != null && returnedState != null) {
            // Re-construct the callback URI format to reuse handleCallbackUri logic
            final callbackUri = Uri.parse('${AppConfig.identityRedirectUri}?code=$returnedCode&state=$returnedState');
            await handleCallbackUri(callbackUri);
            return;
          }
        }
      }
    } else {
      if (!await launchUrl(authUrl, mode: LaunchMode.externalApplication)) {
        throw Exception('Could not launch 180 Identity authentication browser.');
      }
    }
  }

  /// Handle incoming deep link or web callback (180social://, workspace180://, http://localhost:3007/#/oauth-callback)
  Future<Map<String, dynamic>> handleCallbackUri(Uri uri) async {
    final params = Map<String, String>.from(uri.queryParameters);
    if (uri.fragment.contains('?')) {
      final fragmentQuery = uri.fragment.substring(uri.fragment.indexOf('?') + 1);
      params.addAll(Uri.splitQueryString(fragmentQuery));
    }

    final code = params['code'];
    final state = params['state'];
    final error = params['error'];

    if (error != null) {
      throw Exception('180 Identity error: $error (${params['error_description'] ?? ''})');
    }

    if (code == null || code.isEmpty) {
      throw Exception('Authorization code missing in OAuth callback.');
    }

    final savedState = await _storage.read(key: _kOAuthState);
    if (savedState != null && state != null && savedState != state) {
      throw Exception('Invalid OAuth state parameter: CSRF validation failed.');
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
      options: Options(
        headers: {'Content-Type': 'application/json'},
      ),
    );

    final data = response.data as Map<String, dynamic>;
    final accessToken = data['access_token'] as String;
    final refreshToken = data['refresh_token'] as String?;
    final idToken = data['id_token'] as String?;

    // Persist session tokens
    await _storage.write(key: _kAccessToken, value: accessToken);
    if (refreshToken != null) {
      await _storage.write(key: _kRefreshToken, value: refreshToken);
    }
    if (idToken != null) {
      await _storage.write(key: _kIdToken, value: idToken);
    }

    // Cleanup ephemeral PKCE keys
    await _storage.delete(key: _kCodeVerifier);
    await _storage.delete(key: _kOAuthState);

    return data;
  }

  /// Get current access token
  Future<String?> getAccessToken() => _storage.read(key: _kAccessToken);

  /// Clear session
  Future<void> logout() async {
    await _storage.delete(key: _kAccessToken);
    await _storage.delete(key: _kRefreshToken);
    await _storage.delete(key: _kIdToken);
  }
}
