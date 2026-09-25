import 'package:dio/dio.dart';
import 'package:uuid/uuid.dart';

import '../../data/models/brand_voice.dart';
import '../../data/models/content_calendar.dart';
import '../../data/models/engagement_rule.dart';
import '../../data/models/inbox.dart';
import '../../data/models/library.dart';
import '../../data/models/platform.dart';
import '../../data/models/project.dart';
import '../../data/models/review.dart';
import '../../data/models/social_account.dart';
import '../../data/models/social_post.dart';
import '../../data/models/task.dart';
import '../config/app_config.dart';
import '../offline/outbox.dart';
import '../util/json.dart';
import 'api_client.dart';
import 'api_exception.dart';
import 'device_registration.dart';

/// Result of a write that may have been queued for later because the device is offline.
class MutationOutcome {
  const MutationOutcome.applied(this.data) : queued = false;
  const MutationOutcome.queued()
      : data = null,
        queued = true;

  final Json? data;
  final bool queued;
}

/// Input of the project create wizard (`POST /projects`).
class CreateProjectInput {
  CreateProjectInput({
    required this.name,
    this.clientId,
    this.clientName,
    this.clientEmail,
    this.description = '',
    this.startDate,
    this.endDate,
    this.socialServices = const [],
    required this.brandVoice,
    this.connectedAccountIds = const [],
    this.teamMemberIds = const [],
    this.settings = const ProjectSettings(),
  });

  final String name;
  final String? clientId;
  final String? clientName;
  final String? clientEmail;
  final String description;
  final DateTime? startDate;
  final DateTime? endDate;
  final List<String> socialServices;
  final BrandVoice brandVoice;
  final List<String> connectedAccountIds;
  final List<String> teamMemberIds;
  final ProjectSettings settings;

  Json toJson() {
    final bv = brandVoice.toJson();
    return compact({
      'name': name.trim(),
      'clientId': clientId,
      'clientName': clientId == null && (clientName?.trim().isNotEmpty ?? false) ? clientName!.trim() : null,
      'clientEmail': clientId == null && (clientEmail?.trim().isNotEmpty ?? false) ? clientEmail!.trim() : null,
      'description': description.trim(),
      'startDate': isoOrNull(startDate),
      'endDate': isoOrNull(endDate),
      'socialServices': socialServices,
      'brandProfile': {
        ...bv,
        // The web wizard sends pillars top-level too; the server keeps them via metadata.
        'contentPillars': brandVoice.contentPillars,
      },
      'connectedAccountIds': connectedAccountIds,
      'teamMemberIds': teamMemberIds,
      'settings': settings.toJson(),
    });
  }
}

/// All `/api/v1/social-media/*` endpoints plus the few platform endpoints the social app needs.
/// Paths and payloads follow docs/social-studio-mobile/FEATURE_PARITY.md.
class SocialApi {
  SocialApi(this._api, {Outbox? outbox, DeviceRegistration? device})
      : _outbox = outbox,
        _device = device;

  final ApiClient _api;
  final Outbox? _outbox;
  final DeviceRegistration? _device;
  final _uuid = const Uuid();

  static const base = '/api/v1/social-media';

  /// Tries the write online; on a network failure (not a server rejection) it is queued in
  /// the outbox and replayed later with the same idempotency key.
  Future<MutationOutcome> _mutate(String method, String path, {Object? body, required String label}) async {
    final key = _uuid.v4();
    try {
      final data = await _api.send(method, path, body: body, idempotencyKey: key);
      return MutationOutcome.applied(data);
    } on ApiException catch (e) {
      final outbox = _outbox;
      if (e.isNetwork && outbox != null) {
        await outbox.enqueue(method: method, path: path, body: body, label: label, clientMutationId: key);
        return const MutationOutcome.queued();
      }
      rethrow;
    }
  }

  // ── Projects ───────────────────────────────────────────────────────────────

  Future<List<Project>> listProjects({String? search, String? status, int limit = 50, int offset = 0}) async {
    final r = await _api.get('$base/projects', query: compact({
      'search': (search?.trim().isEmpty ?? true) ? null : search!.trim(),
      'status': status,
      'limit': limit,
      'offset': offset,
    }));
    return jList(r['projects'], Project.fromJson);
  }

  Future<ProjectDetail> getProject(String id) async {
    final r = await _api.get('$base/projects/$id');
    return ProjectDetail.fromJson(jMap(r['project']));
  }

  Future<Project> createProject(CreateProjectInput input) async {
    final r = await _api.post('$base/projects', body: input.toJson(), idempotencyKey: _uuid.v4());
    return Project.fromJson(jMap(r['project']));
  }

  Future<MutationOutcome> updateProject(String id, Json body) =>
      _mutate('PUT', '$base/projects/$id', body: body, label: 'Update project settings');

  Future<void> deleteProject(String id) => _api.delete('$base/projects/$id');

  Future<ProjectDashboard> projectDashboard(String id) async {
    final r = await _api.get('$base/projects/$id/dashboard');
    return ProjectDashboard.fromJson(jMap(r['dashboard']));
  }

  Future<List<ActivityItem>> projectActivity(String id, {int limit = 10}) async {
    final r = await _api.get('$base/projects/$id/activity', query: {'limit': limit});
    return jList(r['activity'], ActivityItem.fromJson);
  }

  Future<void> linkAccount(String projectId, String accountId) =>
      _api.post('$base/projects/$projectId/accounts', body: {'accountId': accountId});

  Future<void> unlinkAccount(String projectId, String accountId) =>
      _api.delete('$base/projects/$projectId/accounts/$accountId');

  /// Analytics has no backend yet (FEATURE_PARITY N1). This is the proposed endpoint; a 404
  /// is surfaced to the user as "not available", never replaced with invented numbers.
  Future<Json> projectAnalytics(String projectId, {String range = '30d'}) =>
      _api.get('$base/projects/$projectId/analytics', query: {'range': range});

  // ── Brand voice ────────────────────────────────────────────────────────────

  Future<BrandVoice> getBrandVoice(String projectId) async {
    final r = await _api.get('$base/brand-voice/$projectId');
    return BrandVoice.fromJson(jMap(r['profile']), projectId: projectId);
  }

  Future<MutationOutcome> saveBrandVoice(String projectId, BrandVoice voice) =>
      _mutate('POST', '$base/brand-voice/$projectId', body: voice.toJson(), label: 'Save brand voice');

  /// Proposed endpoint (FEATURE_PARITY B4 has no backend). Errors are surfaced as-is.
  Future<List<ContentIdea>> generateIdeas(String projectId, {int count = 3}) async {
    final r = await _api.post('$base/brand-voice/$projectId/ideas',
        body: {'count': count}, timeout: AppConfig.aiReceiveTimeout);
    return jList(r['ideas'], ContentIdea.fromJson);
  }

  // ── Accounts ───────────────────────────────────────────────────────────────

  Future<List<SocialAccount>> listAccounts({String? projectId}) async {
    final r = await _api.get('$base/accounts', query: compact({'projectId': projectId}));
    return jList(r['accounts'], SocialAccount.fromJson);
  }

  /// Starts a server-side OAuth flow and returns the provider authorize URL to open in the
  /// system browser. The provider redirects back to [AppConfig.oauthRedirectUri].
  Future<Uri> startAccountOAuth(SocialPlatform platform, {String? projectId}) async {
    final r = await _api.get('$base/accounts/oauth/${platform.id}/authorize', query: compact({
      'projectId': projectId,
      'redirectUri': AppConfig.oauthRedirectUri,
      'client': 'mobile',
    }));
    final url = jStr(r['url']) ?? jStr(r['authorizeUrl']) ?? jStr(jMap(r['data'])['url']);
    final uri = url == null ? null : Uri.tryParse(url);
    if (uri == null || !(uri.isScheme('https') || uri.isScheme('http') || uri.scheme == AppConfig.deepLinkScheme)) {
      throw const ApiException(kind: ApiErrorKind.server, message: 'The server did not return an authorization URL.');
    }
    return uri;
  }

  Future<void> disconnectAccount(String id) => _api.delete('$base/accounts/$id');

  // ── AI content calendars ──────────────────────────────────────────────────

  Future<List<ContentCalendar>> listCalendars({int limit = 50, int offset = 0}) async {
    final r = await _api.get('$base/content-calendar', query: {'limit': limit, 'offset': offset});
    return jList(r['calendars'], ContentCalendar.fromJson);
  }

  Future<ContentCalendar> getCalendar(String id) async {
    final r = await _api.get('$base/content-calendar/$id');
    final pieces = jList(r['pieces'], CalendarPiece.fromJson);
    return ContentCalendar.fromJson(jMap(r['calendar']), pieces: pieces);
  }

  /// Slow: the server calls the workspace's LLM. Returns the new calendar id.
  Future<({String calendarId, int totalPieces, String? message})> createCalendar(CalendarConfig config) async {
    final r = await _api.post('$base/content-calendar/create',
        body: config.toJson(), timeout: AppConfig.calendarGenerationTimeout, idempotencyKey: _uuid.v4());
    final id = jStr(r['calendar_id']);
    if (id == null || id.isEmpty) {
      throw ApiException(
          kind: ApiErrorKind.server, message: jStr(r['message']) ?? 'The server did not return a calendar id.');
    }
    return (calendarId: id, totalPieces: jInt(r['total_pieces']) ?? 0, message: jStr(r['message']));
  }

  Future<ContentCalendar> updateCalendar(String id, Json body) async {
    final r = await _api.put('$base/content-calendar/$id', body: body);
    return ContentCalendar.fromJson(jMap(r['calendar']));
  }

  Future<void> deleteCalendar(String id) => _api.delete('$base/content-calendar/$id');

  Future<MutationOutcome> updatePiece(String calendarId, String pieceId, Json body) => _mutate(
      'PUT', '$base/content-calendar/$calendarId/pieces/$pieceId',
      body: body, label: 'Update calendar piece');

  /// Autopilot regeneration of a single piece with an AI instruction (WS2).
  Future<CalendarPiece> regeneratePiece(String projectId, String pieceId, {String? instruction}) async {
    final r = await _api.post(
      '$base/projects/$projectId/autopilot/pieces/$pieceId/regenerate',
      body: {'instruction': ?instruction},
      timeout: AppConfig.aiReceiveTimeout,
    );
    return CalendarPiece.fromJson(jMap(r['piece']));
  }

  // ── Posts ──────────────────────────────────────────────────────────────────

  Future<List<SocialPost>> listPosts({
    String? projectId,
    String? clientId,
    String? status,
    String? calendarId,
    bool? isEvergreen,
    DateTime? from,
    DateTime? to,
    int limit = 200,
    int offset = 0,
  }) async {
    final r = await _api.get('$base/posts', query: compact({
      'projectId': projectId,
      'clientId': clientId,
      'status': status,
      'calendarId': calendarId,
      'isEvergreen': isEvergreen?.toString(),
      // Proposed range filter (FEATURE_PARITY F1); ignored by servers that lack it.
      'from': isoOrNull(from),
      'to': isoOrNull(to),
      'limit': limit,
      'offset': offset,
    }));
    return jList(r['posts'], SocialPost.fromJson);
  }

  Future<SocialPost> getPost(String id) async {
    final r = await _api.get('$base/posts/$id');
    return SocialPost.fromJson(jMap(r['post']));
  }

  Future<MutationOutcome> createPost(Json body) => _mutate('POST', '$base/posts', body: body, label: 'Create post');

  Future<MutationOutcome> updatePost(String id, Json body) =>
      _mutate('PUT', '$base/posts/$id', body: body, label: 'Update post');

  /// Uploads a rendered/recorded MP4 as the post's deliverable and moves it to `in_review`
  /// (`POST /posts/:id/submit-for-approval`, device-gated multipart, max 300 MB).
  Future<SocialPost> submitForApproval(
    String postId, {
    required String videoPath,
    String? thumbnailPath,
    String? notes,
    void Function(int sent, int total)? onProgress,
  }) async {
    Future<Json> call() async {
      final form = FormData.fromMap({
        'video': await MultipartFile.fromFile(videoPath,
            contentType: videoPath.toLowerCase().endsWith('.mov') ? DioMediaType('video', 'quicktime') : DioMediaType('video', 'mp4')),
        if (thumbnailPath != null)
          'thumbnail': await MultipartFile.fromFile(thumbnailPath,
              contentType: thumbnailPath.toLowerCase().endsWith('.png') ? DioMediaType('image', 'png') : DioMediaType('image', 'jpeg')),
        if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
        'source': 'social-studio-mobile',
      });
      return _api.postForm('$base/posts/$postId/submit-for-approval', form, device: true, onProgress: onProgress);
    }

    await _device?.ensureToken();
    Json r;
    try {
      r = await call();
    } on ApiException catch (e) {
      if (e.kind != ApiErrorKind.deviceRequired || _device == null) rethrow;
      await _device.ensureToken(forceRenew: true);
      r = await call();
    }
    return SocialPost.fromJson(jMap(r['post']));
  }

  Future<SocialPost> submitFootage(String postId, {List<String>? rawMediaUrls, List<ExternalLink>? links}) async {
    final r = await _api.post('$base/posts/$postId/footage', body: compact({
      'rawMediaUrls': rawMediaUrls,
      'externalStorageLinks': links?.map((l) => l.toJson()).toList(),
    }));
    return SocialPost.fromJson(jMap(r['post']));
  }

  Future<EditingTask> assignEditor(String postId, Json body) async {
    final r = await _api.post('$base/posts/$postId/assign-editor', body: body);
    return EditingTask.fromJson(jMap(r['task']));
  }

  Future<Json> submitDeliverable(String taskId, {required String deliverableUrl, String? thumbnailUrl, String? notes}) =>
      _api.post('$base/posts/tasks/$taskId/submit-deliverable',
          body: compact({'deliverableUrl': deliverableUrl, 'thumbnailUrl': thumbnailUrl, 'notes': notes}));

  Future<Json> studioLaunchContext(String postId) async {
    final r = await _api.get('$base/posts/$postId/studio-launch-context');
    return jMap(r['context']);
  }

  Future<PublishReadiness> validatePublish(String postId) async =>
      PublishReadiness.fromJson(await _api.get('$base/posts/$postId/validate-publish'));

  /// Never queued: publishing must report the server's real outcome immediately.
  Future<PublishResult> publish(String postId) async =>
      PublishResult.fromJson(await _api.post('$base/posts/$postId/publish', timeout: AppConfig.aiReceiveTimeout));

  Future<SocialPost> retryVariant(String postId, String platform) async {
    final r = await _api.post('$base/posts/$postId/retry-variant',
        body: {'platform': platform}, timeout: AppConfig.aiReceiveTimeout);
    return SocialPost.fromJson(jMap(r['post']));
  }

  Future<SocialPost> repurpose(String postId, {DateTime? newScheduleDate, String? newProjectId, String? newContent}) async {
    final r = await _api.post('$base/posts/$postId/repurpose', body: compact({
      'newScheduleDate': isoOrNull(newScheduleDate),
      'newProjectId': newProjectId,
      'newContent': newContent,
    }));
    return SocialPost.fromJson(jMap(r['post']));
  }

  // ── Tasks / users / clients (other modules) ────────────────────────────────

  Future<List<EditingTask>> listTasks(String projectId) async {
    final r = await _api.get('/api/tasks', query: {'projectId': projectId});
    return jList(r['tasks'], EditingTask.fromJson);
  }

  Future<Json> createTask(Json body) => _api.post('/api/tasks', body: body);

  Future<List<WorkspaceUser>> listUsers() async {
    final r = await _api.get('/api/users');
    final list = r['users'] ?? r['data'];
    return jList(list, WorkspaceUser.fromJson);
  }

  Future<List<ClientRef>> listClients() async {
    final r = await _api.get('/api/clients');
    return jList(r['clients'] ?? r['data'], ClientRef.fromJson);
  }

  // ── Reviews ────────────────────────────────────────────────────────────────

  Future<ReviewSession> createReviewSession({
    required String clientId,
    String? projectId,
    required String name,
    required DateTime startDate,
    required DateTime endDate,
    List<String>? postIds,
    int expiresInDays = 14,
  }) async {
    final r = await _api.post('$base/reviews/sessions', body: compact({
      'clientId': clientId,
      'projectId': projectId,
      'name': name,
      'startDate': isoOrNull(startDate),
      'endDate': isoOrNull(endDate),
      'postIds': postIds,
      'expiresInDays': expiresInDays,
    }));
    return ReviewSession.fromJson(jMap(r['session']));
  }

  Future<PublicReview> publicReview(String token) async =>
      PublicReview.fromJson(await _api.get('$base/reviews/public/$token', auth: false));

  Future<ReviewComment> publicComment(String token, {required String postId, required String text, String? authorName}) async {
    final r = await _api.post('$base/reviews/public/$token/comments',
        auth: false,
        body: compact({'postId': postId, 'commentText': text, 'authorName': authorName, 'authorType': 'client'}));
    return ReviewComment.fromJson(jMap(r['comment']));
  }

  Future<Json> approveBatch(String token, {String? clientNotes}) =>
      _api.post('$base/reviews/public/$token/approve-batch', auth: false, body: compact({'clientNotes': clientNotes}));

  // ── Inbox ──────────────────────────────────────────────────────────────────

  Future<List<Conversation>> listConversations({String? projectId, String? platform, bool? isRead, String? search}) async {
    final r = await _api.get('$base/inbox/conversations', query: compact({
      'projectId': projectId,
      'platform': platform,
      'isRead': isRead?.toString(),
      'search': (search?.trim().isEmpty ?? true) ? null : search!.trim(),
    }));
    return jList(r['conversations'], Conversation.fromJson);
  }

  Future<Conversation> getConversation(String id) async {
    final r = await _api.get('$base/inbox/conversations/$id');
    return Conversation.fromJson(jMap(r['conversation']));
  }

  Future<MutationOutcome> sendMessage(String conversationId, String content, {String senderType = 'agent'}) => _mutate(
      'POST', '$base/inbox/conversations/$conversationId/messages',
      body: {'content': content, 'senderType': senderType}, label: 'Send inbox reply');

  Future<({List<ReplySuggestion> suggestions, String? tone})> aiSuggestions(String conversationId) async {
    final r = await _api.get('$base/inbox/conversations/$conversationId/ai-suggestions',
        timeout: AppConfig.aiReceiveTimeout);
    final raw = r['suggestions'];
    final list = raw is List
        ? raw.map((s) => s is Map ? ReplySuggestion.fromJson(s.cast<String, dynamic>()) : ReplySuggestion(tone: '', text: '$s')).toList()
        : <ReplySuggestion>[];
    return (suggestions: list, tone: jStr(r['brandToneApplied']));
  }

  Future<Json> convertToLead(String conversationId) =>
      _api.post('$base/inbox/conversations/$conversationId/convert-to-lead');

  // ── AI Reply All & Autonomous Agent ──────────────────────────────────────────

  Future<List<BatchAiReplySuggestion>> getAiReplyAllSuggestions({
    String? projectId,
    String? platform,
    int limit = 20,
  }) async {
    final r = await _api.post('$base/inbox/ai-reply-all/suggestions', body: compact({
      'projectId': projectId,
      'platform': platform,
      'limit': limit,
    }), timeout: AppConfig.aiReceiveTimeout);
    return jList(r['suggestions'], BatchAiReplySuggestion.fromJson);
  }

  Future<Map<String, dynamic>> dispatchAiReplyAll(List<Map<String, dynamic>> replies) async {
    final r = await _api.post('$base/inbox/ai-reply-all/dispatch', body: {'replies': replies});
    return jMap(r);
  }

  Future<Map<String, dynamic>> toggleConversationAiAgent(String conversationId, {bool? active}) async {
    final r = await _api.post('$base/inbox/conversations/$conversationId/toggle-agent', body: compact({
      'active': active,
    }));
    return jMap(r);
  }

  Future<Map<String, dynamic>> takeoverConversation(String conversationId) async {
    final r = await _api.post('$base/inbox/conversations/$conversationId/takeover');
    return jMap(r);
  }

  // ── 180 Engagement Automation Rules ────────────────────────────────────────

  Future<List<EngagementRule>> listEngagementRules({String? projectId, String? socialAccountId, String? status}) async {
    final r = await _api.get('$base/engagement/rules', query: compact({
      'projectId': projectId,
      'socialAccountId': socialAccountId,
      'status': status,
    }));
    return jList(r['rules'], EngagementRule.fromJson);
  }

  Future<EngagementRule> createEngagementRule(Map<String, dynamic> data) async {
    final r = await _api.post('$base/engagement/rules', body: data);
    return EngagementRule.fromJson(jMap(r['rule']));
  }

  Future<EngagementRule> updateEngagementRule(String ruleId, Map<String, dynamic> data) async {
    final r = await _api.put('$base/engagement/rules/$ruleId', body: data);
    return EngagementRule.fromJson(jMap(r['rule']));
  }

  Future<void> deleteEngagementRule(String ruleId) => _api.delete('$base/engagement/rules/$ruleId');

  Future<EngagementRule> toggleEngagementRule(String ruleId) async {
    final r = await _api.patch('$base/engagement/rules/$ruleId/toggle');
    return EngagementRule.fromJson(jMap(r['rule']));
  }

  Future<EngagementStats> getEngagementStats({String? projectId}) async {
    final r = await _api.get('$base/engagement/stats', query: compact({'projectId': projectId}));
    return EngagementStats.fromJson(jMap(r['stats']));
  }

  Future<Map<String, dynamic>> testEngagementMatch({
    required String platform,
    required String text,
    String? mediaId,
    String? commentId,
    String senderHandle = 'test_user',
  }) async {
    final body = <String, dynamic>{
      'platform': platform,
      'eventType': 'comment',
      'text': text,
      'senderId': 'sim_user_1',
      'senderHandle': senderHandle,
    };
    if (mediaId != null) body['mediaId'] = mediaId;
    if (commentId != null) body['commentId'] = commentId;
    final r = await _api.post('$base/engagement/test-match', body: body);
    return jMap(r);
  }

  Future<List<Map<String, dynamic>>> getLivePlatformMetrics(String projectId) async {
    final r = await _api.get('$base/projects/$projectId/platform-metrics');
    final list = r['metrics'] as List<dynamic>? ?? [];
    return list.map((m) => jMap(m)).toList();
  }

  // ── Assets & banks ─────────────────────────────────────────────────────────

  Future<List<LinkedAsset>> listAssets({String? type}) async {
    final r = await _api.get('$base/assets', query: compact({'type': type}));
    return jList(r['assets'], LinkedAsset.fromJson).where((a) => !a.isBankItem).toList();
  }

  Future<MutationOutcome> createAsset({
    required String url,
    required String type,
    String? title,
    String? description,
    List<String> tags = const [],
  }) =>
      _mutate('POST', '$base/assets',
          body: compact({'url': url, 'type': type, 'title': title, 'description': description, 'tags': tags}),
          label: 'Link asset');

  Future<void> deleteAsset(String id) => _api.delete('$base/assets/$id');

  Future<List<SavedBankItem>> listBanks({String? type}) async {
    final r = await _api.get('$base/saved-banks');
    final all = jList(r['banks'], SavedBankItem.fromJson);
    return type == null ? all : all.where((b) => b.type == type).toList();
  }

  Future<MutationOutcome> createBank({required String type, required String name, required String content, List<String> tags = const []}) =>
      _mutate('POST', '$base/saved-banks',
          body: {'type': type, 'name': name, 'content': content, 'tags': tags}, label: 'Save $type');

  Future<void> deleteBank(String id) => _api.delete('$base/saved-banks/$id');

  // ── Evergreen ──────────────────────────────────────────────────────────────

  Future<List<EvergreenSlot>> listEvergreenSlots(String projectId) async {
    final r = await _api.get('$base/evergreen/$projectId/slots');
    return jList(r['slots'], EvergreenSlot.fromJson);
  }

  Future<EvergreenSlot> createEvergreenSlot({
    required String projectId,
    required int dayOfWeek,
    required String timeSlotUtc,
    required String category,
  }) async {
    final r = await _api.post('$base/evergreen/slots', body: {
      'projectId': projectId,
      'dayOfWeek': dayOfWeek,
      'timeSlotUtc': timeSlotUtc,
      'category': category,
    });
    return EvergreenSlot.fromJson(jMap(r['slot']));
  }

  Future<void> deleteEvergreenSlot(String id) => _api.delete('$base/evergreen/slots/$id');

  // ── Storage ────────────────────────────────────────────────────────────────

  /// Uploads a local file to workspace storage and returns its public URL.
  Future<String> uploadFile(String filePath, {void Function(int sent, int total)? onProgress}) async {
    final r = await _api.upload('/api/files/upload', filePath: filePath, onProgress: onProgress);
    final doc = jMap(r['document']);
    final url = jStr(doc['fileUrl']) ?? jStr(r['fileUrl']) ?? jStr(r['url']);
    if (url == null || url.isEmpty) {
      throw const ApiException(kind: ApiErrorKind.server, message: 'Upload finished but the server returned no file URL.');
    }
    return url;
  }

  /// Uploads a brand logo to Cloudflare R2 and updates the project's brand identity.
  Future<String> uploadBrandLogo(String projectId, String filePath) async {
    final r = await _api.upload(
      '$base/projects/$projectId/brand-consciousness/logo',
      filePath: filePath,
      field: 'logo',
    );
    final url = jStr(r['logoUrl']);
    if (url == null || url.isEmpty) {
      throw const ApiException(kind: ApiErrorKind.server, message: 'Logo uploaded but the server returned no logo URL.');
    }
    return url;
  }
}
