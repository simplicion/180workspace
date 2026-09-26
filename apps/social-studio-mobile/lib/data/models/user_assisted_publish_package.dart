import '../../core/util/json.dart';

/// Payload prepared specifically for X (Twitter) user-assisted handoff.
class XPublishPayload {
  const XPublishPayload({
    required this.text,
    this.mediaPath,
    this.mimeType = 'video/mp4',
    this.sourceContentId,
    this.calendarItemId,
    this.projectId,
  });

  final String text;
  final String? mediaPath;
  final String mimeType;
  final String? sourceContentId;
  final String? calendarItemId;
  final String? projectId;

  factory XPublishPayload.fromJson(Json j) => XPublishPayload(
        text: jStrOr(j['text'], ''),
        mediaPath: jStr(j['mediaPath']) ?? jStr(j['mediaUri']),
        mimeType: jStrOr(j['mimeType'], 'video/mp4'),
        sourceContentId: jStr(j['sourceContentId']),
        calendarItemId: jStr(j['calendarItemId']),
        projectId: jStr(j['projectId']),
      );

  Json toJson() => compact({
        'platform': 'x',
        'text': text,
        'mediaPath': mediaPath,
        'mimeType': mimeType,
        'sourceContentId': sourceContentId,
        'calendarItemId': calendarItemId,
        'projectId': projectId,
      });
}

/// Payload prepared specifically for Reddit user-assisted handoff.
class RedditPublishPayload {
  const RedditPublishPayload({
    this.subreddit,
    required this.title,
    this.body,
    this.mediaPath,
    this.mimeType = 'video/mp4',
    this.flairId,
    this.markNsfw = false,
    this.markSpoiler = false,
    this.sourceContentId,
    this.calendarItemId,
    this.projectId,
  });

  final String? subreddit;
  final String title;
  final String? body;
  final String? mediaPath;
  final String mimeType;
  final String? flairId;
  final bool markNsfw;
  final bool markSpoiler;
  final String? sourceContentId;
  final String? calendarItemId;
  final String? projectId;

  /// Returns normalized subreddit (without leading 'r/' or '/r/').
  String get normalizedSubreddit {
    final s = subreddit?.trim() ?? '';
    if (s.isEmpty) return '';
    return s.replaceFirst(RegExp(r'^/?r/'), '');
  }

  factory RedditPublishPayload.fromJson(Json j) => RedditPublishPayload(
        subreddit: jStr(j['subreddit']),
        title: jStrOr(j['title'], ''),
        body: jStr(j['body']),
        mediaPath: jStr(j['mediaPath']) ?? jStr(j['mediaUri']),
        mimeType: jStrOr(j['mimeType'], 'video/mp4'),
        flairId: jStr(j['flairId']),
        markNsfw: jBool(j['markNsfw']),
        markSpoiler: jBool(j['markSpoiler']),
        sourceContentId: jStr(j['sourceContentId']),
        calendarItemId: jStr(j['calendarItemId']),
        projectId: jStr(j['projectId']),
      );

  Json toJson() => compact({
        'platform': 'reddit',
        'subreddit': normalizedSubreddit.isNotEmpty ? normalizedSubreddit : null,
        'title': title,
        'body': body,
        'mediaPath': mediaPath,
        'mimeType': mimeType,
        'flairId': flairId,
        'markNsfw': markNsfw ? true : null,
        'markSpoiler': markSpoiler ? true : null,
        'sourceContentId': sourceContentId,
        'calendarItemId': calendarItemId,
        'projectId': projectId,
      });
}

/// Universal publishing package for user-assisted platform handoffs.
class UserAssistedPublishPackage {
  const UserAssistedPublishPackage({
    required this.id,
    required this.projectId,
    this.calendarItemId,
    this.mediaPath,
    this.mimeType = 'video/mp4',
    this.title,
    this.caption,
    this.xPayload,
    this.redditPayload,
    this.status = 'ready',
    this.createdAt,
  });

  final String id;
  final String projectId;
  final String? calendarItemId;
  final String? mediaPath;
  final String mimeType;
  final String? title;
  final String? caption;
  final XPublishPayload? xPayload;
  final RedditPublishPayload? redditPayload;
  final String status;
  final DateTime? createdAt;

  factory UserAssistedPublishPackage.fromJson(Json j) => UserAssistedPublishPackage(
        id: jStrOr(j['id'], ''),
        projectId: jStrOr(j['projectId'], ''),
        calendarItemId: jStr(j['calendarItemId']),
        mediaPath: jStr(j['mediaPath']) ?? jStr(j['mediaUri']),
        mimeType: jStrOr(j['mimeType'], 'video/mp4'),
        title: jStr(j['title']),
        caption: jStr(j['caption']),
        xPayload: j['xPayload'] is Map ? XPublishPayload.fromJson(jMap(j['xPayload'])) : null,
        redditPayload: j['redditPayload'] is Map ? RedditPublishPayload.fromJson(jMap(j['redditPayload'])) : null,
        status: jStrOr(j['status'], 'ready'),
        createdAt: jDate(j['createdAt']),
      );

  Json toJson() => compact({
        'id': id,
        'projectId': projectId,
        'calendarItemId': calendarItemId,
        'mediaPath': mediaPath,
        'mimeType': mimeType,
        'title': title,
        'caption': caption,
        'xPayload': xPayload?.toJson(),
        'redditPayload': redditPayload?.toJson(),
        'status': status,
        'createdAt': createdAt?.toIso8601String(),
      });
}
