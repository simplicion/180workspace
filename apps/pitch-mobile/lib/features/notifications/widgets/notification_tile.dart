import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/pitch_theme.dart';
import '../models/notification_item.dart';

class NotificationTile extends StatelessWidget {
  final NotificationItem item;
  final VoidCallback onTap;

  const NotificationTile({
    super.key,
    required this.item,
    required this.onTap,
  });

  IconData _getTypeIcon() {
    switch (item.type) {
      case NotificationType.upvote:
        return Icons.local_fire_department_rounded;
      case NotificationType.comment:
        return Icons.chat_bubble_rounded;
      case NotificationType.connection:
        return Icons.person_add_rounded;
      case NotificationType.gigApplication:
        return Icons.work_rounded;
      case NotificationType.eventReminder:
        return Icons.event_available_rounded;
      case NotificationType.pitchTranscoded:
        return Icons.video_camera_back_rounded;
    }
  }

  Color _getTypeColor() {
    switch (item.type) {
      case NotificationType.upvote:
        return PitchTheme.accentPink;
      case NotificationType.comment:
        return PitchTheme.primary;
      case NotificationType.connection:
        return PitchTheme.accentEmerald;
      case NotificationType.gigApplication:
        return PitchTheme.accentAmber;
      case NotificationType.eventReminder:
        return PitchTheme.accentPink;
      case NotificationType.pitchTranscoded:
        return PitchTheme.primary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final timeStr = DateFormat('MMM d • h:mm a').format(item.timestamp);
    final color = _getTypeColor();

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: item.isRead
              ? PitchTheme.surface
              : color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: item.isRead
                ? const Color(0x15FFFFFF)
                : color.withValues(alpha: 0.35),
            width: 1,
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Avatar or Icon Badge
            Stack(
              clipBehavior: Clip.none,
              children: [
                CircleAvatar(
                  radius: 20,
                  backgroundImage: item.avatarUrl != null
                      ? NetworkImage(item.avatarUrl!)
                      : null,
                  backgroundColor: color.withValues(alpha: 0.2),
                  child: item.avatarUrl == null
                      ? Icon(_getTypeIcon(), color: color, size: 20)
                      : null,
                ),
                Positioned(
                  bottom: -2,
                  right: -2,
                  child: Container(
                    padding: const EdgeInsets.all(3),
                    decoration: BoxDecoration(
                      color: PitchTheme.surface,
                      shape: BoxShape.circle,
                      border: Border.all(color: PitchTheme.surface, width: 1.5),
                    ),
                    child: Icon(_getTypeIcon(), color: color, size: 12),
                  ),
                ),
              ],
            ),
            const SizedBox(width: 12),

            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Flexible(
                        child: Text(
                          item.title,
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 13.5,
                            fontWeight: item.isRead
                                ? FontWeight.w600
                                : FontWeight.w800,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Text(
                        timeStr,
                        style: TextStyle(
                          color: PitchTheme.textSecondary,
                          fontSize: 10.5,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    item.body,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.8),
                      fontSize: 12,
                      height: 1.3,
                    ),
                  ),
                ],
              ),
            ),

            if (!item.isRead) ...[
              const SizedBox(width: 8),
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: color,
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
