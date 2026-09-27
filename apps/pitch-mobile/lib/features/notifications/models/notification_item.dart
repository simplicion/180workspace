enum NotificationType {
  upvote,
  comment,
  connection,
  gigApplication,
  eventReminder,
  pitchTranscoded,
}

class NotificationItem {
  final String id;
  final NotificationType type;
  final String title;
  final String body;
  final String? avatarUrl;
  final String? targetId;
  final DateTime timestamp;
  bool isRead;

  NotificationItem({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    this.avatarUrl,
    this.targetId,
    required this.timestamp,
    this.isRead = false,
  });

  NotificationItem copyWith({
    String? id,
    NotificationType? type,
    String? title,
    String? body,
    String? avatarUrl,
    String? targetId,
    DateTime? timestamp,
    bool? isRead,
  }) {
    return NotificationItem(
      id: id ?? this.id,
      type: type ?? this.type,
      title: title ?? this.title,
      body: body ?? this.body,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      targetId: targetId ?? this.targetId,
      timestamp: timestamp ?? this.timestamp,
      isRead: isRead ?? this.isRead,
    );
  }
}
