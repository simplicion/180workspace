import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/providers.dart';

class InstagramTeamClient {
  InstagramTeamClient(this._apiClient);
  final ApiClient _apiClient;

  Future<Map<String, dynamic>> scoreHook(String hook) async {
    final res = await _apiClient.dio.post(
      '/api/v1/social-media/instagram/hook-score',
      data: {'hook': hook},
    );
    return (res.data['data'] as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> analyzeBeatSheet(String script, {int? targetSeconds}) async {
    final res = await _apiClient.dio.post(
      '/api/v1/social-media/instagram/beat-sheet',
      data: {'script': script, 'targetSeconds': targetSeconds ?? 30},
    );
    return (res.data['data'] as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> lintCaption(String caption, {List<String>? keywords}) async {
    final res = await _apiClient.dio.post(
      '/api/v1/social-media/instagram/caption-lint',
      data: {'caption': caption, 'keywords': keywords},
    );
    return (res.data['data'] as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> humanizeText(String text) async {
    final res = await _apiClient.dio.post(
      '/api/v1/social-media/instagram/humanize',
      data: {'text': text},
    );
    return (res.data['data'] as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> auditProfile(Map<String, dynamic> profile) async {
    final res = await _apiClient.dio.post(
      '/api/v1/social-media/instagram/profile-audit',
      data: profile,
    );
    return (res.data['data'] as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> generateReel(String rawIdea, {int? targetSeconds}) async {
    final res = await _apiClient.dio.post(
      '/api/v1/social-media/instagram/crew/reel',
      data: {'rawIdea': rawIdea, 'targetSeconds': targetSeconds ?? 30},
    );
    return (res.data['data'] as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> triageComments(List<Map<String, dynamic>> comments) async {
    final res = await _apiClient.dio.post(
      '/api/v1/social-media/instagram/crew/triage',
      data: {'comments': comments},
    );
    return (res.data['data'] as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> analyzeSwipeRadar(List<Map<String, dynamic>> records) async {
    final res = await _apiClient.dio.post(
      '/api/v1/social-media/instagram/swipe-radar',
      data: {'records': records},
    );
    return (res.data['data'] as Map<String, dynamic>);
  }
}

final instagramClientProvider = Provider<InstagramTeamClient>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return InstagramTeamClient(apiClient);
});
