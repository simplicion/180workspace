import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/foundation.dart';

import '../config/app_config.dart';

/// Result delivered to `workspace180://oauth/callback?...` after a social-account OAuth hop.
class OAuthCallback {
  const OAuthCallback(this.uri);
  final Uri uri;

  String? get status => uri.queryParameters['status'];
  String? get error => uri.queryParameters['error_description'] ?? uri.queryParameters['error'];
  String? get platform => uri.queryParameters['platform'];
  String? get accountId => uri.queryParameters['accountId'];
  String? get state => uri.queryParameters['state'];
  bool get isSuccess => error == null && (status == null || status == 'success' || status == 'connected');
}

/// Maps `workspace180://` links to in-app routes. Flutter's built-in deep linking is disabled
/// in the manifests so all links come through here.
class DeepLinkService {
  DeepLinkService({AppLinks? appLinks}) : _appLinks = appLinks;

  AppLinks? _appLinks;
  StreamSubscription<Uri>? _sub;
  final _oauth = StreamController<OAuthCallback>.broadcast();

  Stream<OAuthCallback> get oauthCallbacks => _oauth.stream;

  /// Returns an in-app location for [uri], or null if it is an OAuth callback / unknown.
  String? routeFor(Uri uri) {
    if (uri.scheme != AppConfig.deepLinkScheme && !(uri.scheme == 'https' && uri.host.contains('180workspace'))) {
      return null;
    }
    final segments = [if (uri.scheme == AppConfig.deepLinkScheme && uri.host.isNotEmpty) uri.host, ...uri.pathSegments];
    if (segments.isEmpty) return '/home';
    switch (segments.first) {
      case 'oauth':
        _oauth.add(OAuthCallback(uri));
        return null;
      case 'review':
        return segments.length > 1 ? '/review/${segments[1]}' : null;
      case 'posts':
        return segments.length > 1 ? '/posts/${segments[1]}' : null;
      case 'inbox':
        return segments.length > 1 ? '/inbox/${segments[1]}' : '/inbox';
      case 'social-projects':
      case 'projects':
        if (segments.length > 1) {
          final tab = uri.queryParameters['tab'] ?? 'calendar';
          return '/projects/${segments[1]}/$tab';
        }
        return '/projects';
      default:
        return null;
    }
  }

  Future<void> start(void Function(String location) navigate) async {
    try {
      _appLinks ??= AppLinks();
      final initial = await _appLinks!.getInitialLink();
      if (initial != null) {
        final r = routeFor(initial);
        if (r != null) navigate(r);
      }
      _sub = _appLinks!.uriLinkStream.listen((uri) {
        final r = routeFor(uri);
        if (r != null) navigate(r);
      });
    } catch (e) {
      debugPrint('[DeepLinks] unavailable: $e');
    }
  }

  void dispose() {
    _sub?.cancel();
    _oauth.close();
  }
}
