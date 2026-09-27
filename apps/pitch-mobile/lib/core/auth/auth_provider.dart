import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'one_eighty_sso_service.dart';

sealed class AuthState {
  const AuthState();
}

class AuthInitial extends AuthState {
  const AuthInitial();
}

class AuthLoading extends AuthState {
  const AuthLoading();
}

class Authenticated extends AuthState {
  final String accessToken;
  final Map<String, dynamic> user;
  const Authenticated({required this.accessToken, required this.user});
}

class Unauthenticated extends AuthState {
  final String? message;
  const Unauthenticated([this.message]);
}

class AuthNotifier extends StateNotifier<AuthState> {
  final OneEightyPitchSsoService _sso;

  AuthNotifier(this._sso) : super(const AuthInitial()) {
    checkSession();
  }

  Future<void> checkSession() async {
    state = const AuthLoading();
    final token = await _sso.getAccessToken();
    if (token == null) {
      state = const Unauthenticated();
      return;
    }

    final profile = await _sso.getCachedProfile();
    if (profile != null) {
      state = Authenticated(accessToken: token, user: profile);
    } else {
      state = const Unauthenticated();
    }
  }

  Future<void> launchSso() async {
    await _sso.launch180IdentityLogin();
  }

  Future<void> handleDeepLink(Uri uri) async {
    state = const AuthLoading();
    try {
      final tokenData = await _sso.handleCallbackUri(uri);
      final accessToken = tokenData['access_token'] as String;
      final profile = await _sso.getCachedProfile() ?? {};
      state = Authenticated(accessToken: accessToken, user: profile);
    } catch (e) {
      state = Unauthenticated(e.toString());
    }
  }

  Future<void> logout() async {
    await _sso.logout();
    state = const Unauthenticated();
  }
}

final ssoServiceProvider = Provider((ref) => OneEightyPitchSsoService());

final authStateProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final sso = ref.watch(ssoServiceProvider);
  return AuthNotifier(sso);
});
