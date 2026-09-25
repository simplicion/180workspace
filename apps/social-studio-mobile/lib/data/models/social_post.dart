import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/util/json.dart';
import 'platform.dart';

/// `SocialPost.status` exactly as the backend stores it.
enum PostStatus {
  draft('draft', 'Draft', AppTheme.textSecondary),
  scheduled('scheduled', 'Scheduled', AppTheme.accentBlue),
  inEditing('in_editing', 'In editing', AppTheme.accent),
  inReview('in_review', 'In review', AppTheme.warning),
  pendingReview('pending_review', 'Pending review', AppTheme.warning),
  approved('approved', 'Approved', AppTheme.success),
  ready('ready', 'Ready', AppTheme.accentCyan),
  publishing('publishing', 'Publishing', AppTheme.accentBlue),
  published('published', 'Published', AppTheme.success),
  partiallyPublished('partially_published', 'Partially published', AppTheme.warning),
  failed('failed', 'Failed', AppTheme.error),
  unknown('unknown', 'Unknown', AppTheme.textMuted);

  const PostStatus(this.id, this.label, this.color);
  final String id;
  final String label;
  final Color color;

  /// Statuses offered in the content list filter (parity with ContentListTab).
  static const filterable = [draft, inEditing, inReview, approved, scheduled, published];

  static PostStatus parse(Object? raw) =>
      PostStatus.values.firstWhere((s) => s.id == raw, orElse: () => PostStatus.unknown);
}

class PostVariant {
  const PostVariant({
    this.id,
    required this.platform,
    this.customContent,
    this.firstComment,
    this.status,
    this.publishedUrl,
    this.errorMessage,
  });

  final String? id;
  final SocialPlatform platform;
  final String? customContent;
  final String? firstComment;
  final String? status;
  final String? publishedUrl;
  final String? errorMessage;

  factory PostVariant.fromJson(Json j) => PostVariant(
        id: jStr(j['id']),
        platform: SocialPlatform.parse(j['platform']),
        customContent: jStr(j['customContent']),
        firstComment: jStr(j['firstComment']),
        status: jStr(j['publishStatus']) ?? jStr(j['status']),
        publishedUrl: jStr(j['externalUrl']) ?? jStr(j['publishedUrl']),
        errorMessage: jStr(j['lastError']) ?? jStr(j['errorMessage']),
      );

  Json toCreateJson() => compact({
        'platform': platform.id,
        'customContent': customContent ?? '',
        'firstComment': firstComment,
      });
}

class ReviewComment {
  const ReviewComment({
    required this.id,
    required this.text,
    this.authorName,
    this.authorType,
    this.resolved = false,
    this.createdAt,
  });

  final String id;
  final String text;
  final String? authorName;
  final String? authorType;
  final bool resolved;
  final DateTime? createdAt;

  factory ReviewComment.fromJson(Json j) => ReviewComment(
        id: jStrOr(j['id'], ''),
        text: jStr(j['commentText']) ?? jStr(j['content']) ?? jStr(j['text']) ?? '',
        authorName: jStr(j['authorName']),
        authorType: jStr(j['authorType']),
        resolved: jBool(j['resolved']),
        createdAt: jDate(j['createdAt']),
      );
}

class ExternalLink {
  const ExternalLink({required this.url, this.provider, this.label, this.submittedAt});
  final String url;
  final String? provider;
  final String? label;
  final DateTime? submittedAt;

  factory ExternalLink.fromJson(Json j) => ExternalLink(
        url: jStrOr(j['url'], ''),
        provider: jStr(j['provider']),
        label: jStr(j['label']),
        submittedAt: jDate(j['submittedAt']),
      );

  Json toJson() => compact({
        'url': url,
        'provider': provider ?? detectProvider(url),
        'label': label,
        'submittedAt': isoOrNull(submittedAt ?? DateTime.now()),
      });

  static String detectProvider(String url) {
    final u = url.toLowerCase();
    if (u.contains('drive.google') || u.contains('docs.google')) return 'google_drive';
    if (u.contains('dropbox')) return 'dropbox';
    if (u.contains('box.com')) return 'box';
    if (u.contains('onedrive') || u.contains('sharepoint') || u.contains('1drv')) return 'onedrive';
    if (u.contains('wetransfer')) return 'wetransfer';
    return 'link';
  }
}

class SocialPost {
  const SocialPost({
    required this.id,
    required this.content,
    this.title,
    this.status = PostStatus.draft,
    this.mediaType,
    this.mediaUrls = const [],
    this.rawMediaUrls = const [],
    this.externalStorageLinks = const [],
    this.finalVideoUrl,
    this.thumbnailUrl,
    this.scheduledFor,
    this.publishedAt,
    this.publishedLinks = const {},
    this.errorMessage,
    this.isEvergreen = false,
    this.reuseCount = 0,
    this.versionNumber = 1,
    this.metadata = const {},
    this.revisionNotes,
    this.projectId,
    this.projectName,
    this.clientId,
    this.clientName,
    this.calendarId,
    this.calendarPieceId,
    this.socialAccountId,
    this.accountPlatform,
    this.accountName,
    this.variants = const [],
    this.reviewComments = const [],
    this.repurposedFromId,
    this.derivedPosts = const [],
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String? title;
  final String content;
  final PostStatus status;
  final String? mediaType;
  final List<String> mediaUrls;
  final List<String> rawMediaUrls;
  final List<ExternalLink> externalStorageLinks;
  final String? finalVideoUrl;
  final String? thumbnailUrl;
  final DateTime? scheduledFor;
  final DateTime? publishedAt;
  final Map<String, String> publishedLinks;
  final String? errorMessage;
  final bool isEvergreen;
  final int reuseCount;
  final int versionNumber;
  final Json metadata;
  final String? revisionNotes;
  final String? projectId;
  final String? projectName;
  final String? clientId;
  final String? clientName;
  final String? calendarId;
  final String? calendarPieceId;
  final String? socialAccountId;
  final SocialPlatform? accountPlatform;
  final String? accountName;
  final List<PostVariant> variants;
  final List<ReviewComment> reviewComments;
  final String? repurposedFromId;
  final List<Json> derivedPosts;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  String get displayTitle {
    final t = title?.trim();
    if (t != null && t.isNotEmpty) return t;
    final c = content.trim();
    if (c.isEmpty) return 'Untitled post';
    return c.length > 60 ? '${c.substring(0, 60)}…' : c;
  }

  String? get hook => jStr(metadata['hook']);
  String? get objective => jStr(metadata['objective']);
  String? get firstComment => jStr(metadata['firstComment']);

  /// Target platforms: variants first, else the linked account's platform.
  List<SocialPlatform> get platforms {
    final fromVariants = variants.map((v) => v.platform).toSet().toList();
    if (fromVariants.isNotEmpty) return fromVariants;
    if (accountPlatform != null) return [accountPlatform!];
    return const [];
  }

  int get unresolvedComments => reviewComments.where((c) => !c.resolved).length;

  /// Per-platform publishing errors. `errorMessage` is a JSON string `{platform: message}`.
  Map<String, String> get platformErrors {
    final raw = errorMessage;
    if (raw == null || raw.isEmpty) return const {};
    final m = jMap(raw);
    if (m.isEmpty) return {'error': raw};
    return m.map((k, v) => MapEntry(k, '$v'));
  }

  factory SocialPost.fromJson(Json j) {
    final project = jMapOrNull(j['project']);
    final client = jMapOrNull(j['client']);
    final account = jMapOrNull(j['socialAccount']);
    final links = jMap(j['publishedLinks']);
    final parsedVariants = jList(j['variants'], PostVariant.fromJson);
    final combinedLinks = <String, String>{
      ...links.map((k, v) => MapEntry(k, '$v')),
      for (final v in parsedVariants)
        if (v.publishedUrl != null && v.publishedUrl!.isNotEmpty)
          v.platform.label: v.publishedUrl!,
    };
    return SocialPost(
      id: jStrOr(j['id'], ''),
      title: jStr(j['title']),
      content: jStr(j['content']) ?? '',
      status: PostStatus.parse(j['status']),
      mediaType: jStr(j['mediaType']),
      mediaUrls: jStrList(j['mediaUrls']),
      rawMediaUrls: jStrList(j['rawMediaUrls']),
      externalStorageLinks: jList(j['externalStorageLinks'], ExternalLink.fromJson),
      finalVideoUrl: jStr(j['finalVideoUrl']),
      thumbnailUrl: jStr(j['thumbnailUrl']),
      scheduledFor: jDate(j['scheduledFor']),
      publishedAt: jDate(j['publishedAt']),
      publishedLinks: combinedLinks,
      errorMessage: jStr(j['errorMessage']),
      isEvergreen: jBool(j['isEvergreen']),
      reuseCount: jInt(j['reuseCount']) ?? 0,
      versionNumber: jInt(j['versionNumber']) ?? 1,
      metadata: jMap(j['metadata']),
      revisionNotes: jStr(j['revisionNotes']),
      projectId: jStr(j['projectId']) ?? (project == null ? null : jStr(project['id'])),
      projectName: project == null ? null : jStr(project['name']),
      clientId: jStr(j['clientId']),
      clientName: client == null ? null : jStr(client['name']),
      calendarId: jStr(j['calendarId']),
      calendarPieceId: jStr(j['calendarPieceId']),
      socialAccountId: jStr(j['socialAccountId']),
      accountPlatform: account == null ? null : SocialPlatform.parse(account['platform']),
      accountName: account == null ? null : jStr(account['accountName']),
      variants: parsedVariants,
      reviewComments: jList(j['reviewComments'], ReviewComment.fromJson),
      repurposedFromId: jStr(j['repurposedFromId']),
      derivedPosts: jList(j['derivedPosts'], (m) => m),
      createdAt: jDate(j['createdAt']),
      updatedAt: jDate(j['updatedAt']),
    );
  }
}

/// Result of `GET /posts/:id/validate-publish`.
class PublishReadiness {
  const PublishReadiness({required this.isReady, required this.issues});
  final bool isReady;
  final List<String> issues;

  factory PublishReadiness.fromJson(Json j) =>
      PublishReadiness(isReady: jBool(j['isReady']), issues: jStrList(j['issues']));
}

/// Result of `POST /posts/:id/publish`, shown verbatim (including per-platform errors).
class PublishResult {
  const PublishResult({
    required this.status,
    required this.message,
    required this.publishedLinks,
    required this.errors,
    this.post,
  });

  final String status;
  final String message;
  final Map<String, String> publishedLinks;
  final Map<String, String> errors;
  final SocialPost? post;

  factory PublishResult.fromJson(Json j) => PublishResult(
        status: jStr(j['status']) ?? 'unknown',
        message: jStr(j['message']) ?? '',
        publishedLinks: jMap(j['publishedLinks']).map((k, v) => MapEntry(k, '$v')),
        errors: jMap(j['errors']).map((k, v) => MapEntry(k, '$v')),
        post: j['post'] is Map ? SocialPost.fromJson(jMap(j['post'])) : null,
      );
}
