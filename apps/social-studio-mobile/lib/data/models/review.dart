import 'package:flutter/material.dart';

import '../../core/config/app_config.dart';
import '../../core/theme/app_theme.dart';
import '../../core/util/json.dart';
import 'social_post.dart';

enum ReviewStatus {
  pending('pending', 'Pending', AppTheme.warning),
  revisionsRequested('revisions_requested', 'Revisions requested', AppTheme.error),
  approved('approved', 'Approved', AppTheme.success),
  unknown('unknown', 'Unknown', AppTheme.textMuted);

  const ReviewStatus(this.id, this.label, this.color);
  final String id;
  final String label;
  final Color color;

  static ReviewStatus parse(Object? raw) =>
      ReviewStatus.values.firstWhere((s) => s.id == raw, orElse: () => ReviewStatus.unknown);
}

/// `ClientReviewSession`: a magic-link approval window for a client.
class ReviewSession {
  const ReviewSession({
    required this.id,
    required this.token,
    required this.name,
    this.status = ReviewStatus.pending,
    this.clientId,
    this.clientName,
    this.projectId,
    this.projectName,
    this.companyName,
    this.startDate,
    this.endDate,
    this.expiresAt,
    this.clientNotes,
    this.publicReviewUrl,
    this.comments = const [],
  });

  final String id;
  final String token;
  final String name;
  final ReviewStatus status;
  final String? clientId;
  final String? clientName;
  final String? projectId;
  final String? projectName;
  final String? companyName;
  final DateTime? startDate;
  final DateTime? endDate;
  final DateTime? expiresAt;
  final String? clientNotes;
  final String? publicReviewUrl;
  final List<ReviewComment> comments;

  bool get isExpired => expiresAt != null && expiresAt!.isBefore(DateTime.now());

  /// Absolute, shareable URL of the public review portal.
  String get shareUrl => AppConfig.absoluteWebUrl(publicReviewUrl ?? '/review/$token');

  factory ReviewSession.fromJson(Json j) {
    final client = jMapOrNull(j['client']);
    final project = jMapOrNull(j['project']);
    final company = jMapOrNull(j['company']);
    return ReviewSession(
      id: jStrOr(j['id'], ''),
      token: jStrOr(j['token'], ''),
      name: jStr(j['name']) ?? 'Review',
      status: ReviewStatus.parse(j['status']),
      clientId: jStr(j['clientId']),
      clientName: client == null ? null : jStr(client['name']),
      projectId: jStr(j['projectId']),
      projectName: project == null ? null : jStr(project['name']),
      companyName: company == null ? null : jStr(company['name']),
      startDate: jDate(j['startDate']),
      endDate: jDate(j['endDate']),
      expiresAt: jDate(j['expiresAt']),
      clientNotes: jStr(j['clientNotes']),
      publicReviewUrl: jStr(j['publicReviewUrl']),
      comments: jList(j['comments'], ReviewComment.fromJson),
    );
  }
}

/// `GET /reviews/public/:token`.
class PublicReview {
  const PublicReview({required this.session, required this.posts});
  final ReviewSession session;
  final List<SocialPost> posts;

  factory PublicReview.fromJson(Json j) => PublicReview(
        session: ReviewSession.fromJson(jMap(j['session'])),
        posts: jList(j['posts'], SocialPost.fromJson),
      );
}
