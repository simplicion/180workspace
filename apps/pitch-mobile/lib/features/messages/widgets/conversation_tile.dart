import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/pitch_theme.dart';
import '../models/chat_message.dart';

class ConversationTile extends StatelessWidget {
  final Conversation conversation;
  final VoidCallback onTap;

  const ConversationTile({
    super.key,
    required this.conversation,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final timeStr = DateFormat('h:mm a').format(conversation.lastMessageTime);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        decoration: BoxDecoration(
          color: conversation.unreadCount > 0
              ? PitchTheme.primary.withValues(alpha: 0.08)
              : PitchTheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: conversation.unreadCount > 0
                ? PitchTheme.primary.withValues(alpha: 0.35)
                : const Color(0x15FFFFFF),
            width: 1,
          ),
        ),
        child: Row(
          children: [
            // Avatar with Online dot
            Stack(
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundImage: NetworkImage(conversation.otherUserAvatar),
                  onBackgroundImageError: (_, __) {},
                ),
                if (conversation.isOnline)
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                        color: PitchTheme.accentEmerald,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: PitchTheme.surface,
                          width: 2,
                        ),
                      ),
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
                          conversation.otherUserName,
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 14.5,
                            fontWeight: conversation.unreadCount > 0
                                ? FontWeight.w800
                                : FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Text(
                        timeStr,
                        style: TextStyle(
                          color: conversation.unreadCount > 0
                              ? PitchTheme.primary
                              : PitchTheme.textSecondary,
                          fontSize: 11,
                          fontWeight: conversation.unreadCount > 0
                              ? FontWeight.w700
                              : FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    conversation.otherUserHeadline,
                    style: TextStyle(
                      color: PitchTheme.textSecondary,
                      fontSize: 11,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          conversation.lastMessage,
                          style: TextStyle(
                            color: conversation.unreadCount > 0
                                ? Colors.white
                                : Colors.white.withValues(alpha: 0.65),
                            fontSize: 12.5,
                            fontWeight: conversation.unreadCount > 0
                                ? FontWeight.w700
                                : FontWeight.w400,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (conversation.unreadCount > 0)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            gradient: PitchTheme.primaryGradient,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '${conversation.unreadCount}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
