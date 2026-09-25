import '../../core/config/app_config.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../../core/util/json.dart';

class SessionUser {
  const SessionUser({required this.id, required this.name, required this.email, this.role, this.imageUrl});
  final String id;
  final String name;
  final String email;
  final String? role;
  final String? imageUrl;

  bool get isAdmin {
    final r = role?.toLowerCase() ?? '';
    return r == 'admin' || r == 'owner' || r == 'super_admin' || r == 'superadmin';
  }

  factory SessionUser.fromJson(Json j) => SessionUser(
        id: jStr(j['id']) ?? jStrOr(j['_id'], ''),
        name: jStr(j['name']) ??
            [jStr(j['firstName']), jStr(j['lastName'])].whereType<String>().join(' ').trim(),
        email: jStrOr(j['email'], ''),
        role: jStr(j['role']),
        imageUrl: jStr(j['image']) ?? jStr(j['photoUrl']),
      );
}

class SessionCompany {
  const SessionCompany({required this.id, required this.name, this.logoUrl});
  final String id;
  final String name;
  final String? logoUrl;

  factory SessionCompany.fromJson(Json j) => SessionCompany(
        id: jStr(j['_id']) ?? jStrOr(j['id'], ''),
        name: jStr(j['companyName']) ?? jStr(j['name']) ?? 'Workspace',
        logoUrl: jStr(j['logoUrl']),
      );
}

enum LockReason { appNotEnabled, adminDisabled, subscriptionExpired, companySuspended }

class Entitlement {
  const Entitlement({this.lockReason, this.isPaidPlan = false, this.enabledApps = const [], this.message});
  final LockReason? lockReason;
  final bool isPaidPlan;
  final List<String> enabledApps;
  final String? message;

  bool get hasSocial => lockReason == null;

  static const unknown = Entitlement();
}

sealed class LoginResult {
  const LoginResult();
}

class LoginSuccess extends LoginResult {
  const LoginSuccess(this.me);
  final Json me;
}

class LoginMfaRequired extends LoginResult {
  const LoginMfaRequired(this.userId);
  final String? userId;
}

class LoginOnboardingRequired extends LoginResult {
  const LoginOnboardingRequired(this.message);
  final String message;
}

class LoginPasswordSetupRequired extends LoginResult {
  const LoginPasswordSetupRequired(this.message);
  final String message;
}

class AuthRepository {
  AuthRepository(this._api);
  final ApiClient _api;

  Future<LoginResult> login({required String email, required String password, String? mfaToken}) async {
    Json r;
    try {
      r = await _api.post('/api/auth/login',
          auth: false,
          body: compact({'email': email.trim(), 'password': password, 'mfaToken': mfaToken}));
    } on ApiException catch (e) {
      final d = e.data;
      if (e.statusCode == 403 && d is Map) {
        if (d['onboardingRequired'] == true) {
          return LoginOnboardingRequired(e.message);
        }
        if (d['setupToken'] != null) return LoginPasswordSetupRequired(e.message);
      }
      rethrow;
    }
    if (r['mfaRequired'] == true) return LoginMfaRequired(jStr(r['userId']));
    return _completeLogin(r);
  }

  /// Native Google Sign-In: the SDK's ID token is verified by the backend.
  Future<LoginResult> loginWithGoogle(String idToken) async {
    final r = await _api.post('/api/auth/google', auth: false, body: {'idToken': idToken, 'tokenId': idToken});
    return _completeLogin(r);
  }

  Future<LoginResult> _completeLogin(Json r) async {
    final token = jStr(r['token']) ?? jStr(r['accessToken']);
    if (token == null || token.isEmpty) {
      throw const ApiException(kind: ApiErrorKind.server, message: 'Sign-in response did not include a session token.');
    }
    await _api.tokens.saveSession(accessToken: token, refreshToken: jStr(r['refreshToken']));
    final me = await fetchMe();
    return LoginSuccess(me);
  }

  Future<Json> fetchMe() => _api.get('/api/auth/me');

  Future<void> forgotPassword(String email) => _api.post('/api/auth/forgot-password', auth: false, body: {'email': email.trim()});

  /// Revokes the refresh token server-side (on servers that support it) and clears local credentials.
  Future<void> logout() async {
    final refresh = await _api.tokens.refreshToken;
    try {
      await _api.post('/api/auth/logout', body: compact({'refreshToken': refresh}));
    } catch (_) {
      // Local sign-out must always succeed.
    }
    await _api.tokens.clearSession();
  }

  /// Entitlement for the social app. Uses `/me.entitlements` when the server provides it, else
  /// the web's sources: `GET /api/billing` + `GET /api/feature-flags`.
  Future<Entitlement> entitlement(Json me) async {
    const app = AppConfig.socialAppId;
    final ent = jMapOrNull(me['entitlements']);
    if (ent != null) {
      final status = jStr(ent['subscriptionStatus'])?.toLowerCase();
      final available = jStrList(ent['availableApps']);
      final enabled = jStrList(ent['enabledApps']);
      final disabled = jStrList(ent['disabledByAdmin']);
      LockReason? reason;
      if (status == 'suspended') {
        reason = LockReason.companySuspended;
      } else if (status == 'expired' || status == 'trial_expired') {
        reason = LockReason.subscriptionExpired;
      } else if (disabled.contains(app) || disabled.contains('social_media')) {
        reason = LockReason.adminDisabled;
      } else if (!available.contains(app)) {
        reason = LockReason.appNotEnabled;
      }
      return Entitlement(lockReason: reason, isPaidPlan: jBool(ent['isPaidPlan']), enabledApps: enabled);
    }

    Json billing;
    Json flags = const {};
    try {
      billing = await _api.get('/api/billing');
    } on ApiException catch (e) {
      if (e.isAccessLock) return Entitlement(lockReason: _lockFor(e), message: e.message);
      // The server's guards remain authoritative: any 403 later locks the app.
      return Entitlement.unknown;
    }
    try {
      flags = await _api.get('/api/feature-flags');
    } on ApiException catch (_) {}

    final isPaid = jBool(billing['isPaidPlan']);
    final enabled = jStrList(billing['enabledApps']);
    final disabledApps = jStrList(flags['disabledApps']);
    final flagMap = jMap(flags['flags']);
    final adminDisabled =
        disabledApps.contains(app) || disabledApps.contains('social_media') || flagMap['app_social_media'] == false;

    LockReason? reason;
    if (jBool(billing['isExpired'])) {
      reason = LockReason.subscriptionExpired;
    } else if (adminDisabled) {
      reason = LockReason.adminDisabled;
    } else if (!(isPaid || enabled.contains(app))) {
      reason = LockReason.appNotEnabled;
    }
    return Entitlement(lockReason: reason, isPaidPlan: isPaid, enabledApps: enabled);
  }

  static LockReason _lockFor(ApiException e) => switch (e.kind) {
        ApiErrorKind.companySuspended => LockReason.companySuspended,
        ApiErrorKind.subscriptionExpired => LockReason.subscriptionExpired,
        _ => LockReason.appNotEnabled,
      };

  static LockReason lockFor(ApiException e) => _lockFor(e);
}
