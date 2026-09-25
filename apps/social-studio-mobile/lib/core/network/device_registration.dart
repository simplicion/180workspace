import 'dart:io';

import '../util/json.dart';
import 'api_client.dart';
import 'api_exception.dart';

/// Native device token for the media routes (`x-device-token`).
///
/// `POST /api/desktop/devices/register { label, platform: ios|android, deviceId? }` → token
/// valid for 30 days. The stored `deviceId` is sent back so a renewal reuses the same slot
/// (the server allows 5 devices per user).
class DeviceRegistration {
  DeviceRegistration(this._api, {String? platformOverride}) : _platformOverride = platformOverride;

  final ApiClient _api;
  final String? _platformOverride;

  static const _renewBefore = Duration(days: 2);

  String get platform => _platformOverride ?? (Platform.isIOS ? 'ios' : 'android');

  Future<String> ensureToken({bool forceRenew = false}) async {
    final tokens = _api.tokens;
    final existing = await tokens.deviceToken;
    final expiresAt = await tokens.deviceExpiresAt;
    final fresh = expiresAt != null && expiresAt.isAfter(DateTime.now().add(_renewBefore));
    if (!forceRenew && existing != null && existing.isNotEmpty && fresh) return existing;

    final deviceId = await tokens.deviceId;
    final r = await _api.post('/api/desktop/devices/register', body: compact({
      'label': '180 Manager ($platform)',
      'platform': platform,
      'deviceId': deviceId,
    }));
    final token = jStr(r['token']);
    final id = jStr(r['deviceId']);
    if (token == null || id == null) {
      throw const ApiException(kind: ApiErrorKind.server, message: 'Device registration returned no token.');
    }
    final exp = jDate(r['expiresAt']) ?? DateTime.now().add(const Duration(days: 30));
    await tokens.saveDevice(deviceId: id, token: token, expiresAt: exp);
    return token;
  }

  /// Stores (or clears, with null) this device's push token: `PUT /desktop/devices/:id/push-token`.
  /// Push delivery is not live on the server yet; this only registers readiness.
  Future<void> setPushToken({required String provider, required String? token}) async {
    final id = await _api.tokens.deviceId ?? (await ensureToken().then((_) => _api.tokens.deviceId));
    if (id == null) return;
    await _api.put('/api/desktop/devices/$id/push-token', body: {'provider': provider, 'token': token});
  }

  /// Returns the current device's registered ID if any.
  Future<String?> get currentDeviceId => _api.tokens.deviceId;

  /// Lists all active devices registered under this account (`GET /api/desktop/devices`).
  Future<List<Map<String, dynamic>>> listDevices() async {
    final r = await _api.get('/api/desktop/devices');
    final list = (r['devices'] as List?)?.whereType<Map>().map((m) => m.cast<String, dynamic>()).toList();
    return list ?? [];
  }

  /// Revokes a specific device slot on the server (`DELETE /api/desktop/devices/:deviceId`).
  Future<void> revokeDevice(String deviceId) async {
    await _api.delete('/api/desktop/devices/$deviceId');
    final myId = await _api.tokens.deviceId;
    if (myId == deviceId) {
      await _api.tokens.clearDeviceToken();
    }
  }

  /// Frees this device's slot on the server (used on sign-out). Best effort.
  Future<void> revoke() async {
    final id = await _api.tokens.deviceId;
    if (id == null) return;
    try {
      await _api.delete('/api/desktop/devices/$id');
    } catch (_) {
      // The token expires on its own; sign-out must not be blocked by this.
    }
    await _api.tokens.clearDeviceToken();
  }
}
