import 'package:flutter/material.dart';
import '../../../core/theme/pitch_theme.dart';
import '../models/chat_message.dart';

class ConnectionRequestCard extends StatelessWidget {
  final ConnectionRequest request;
  final VoidCallback onAccept;
  final VoidCallback onIgnore;

  const ConnectionRequestCard({
    super.key,
    required this.request,
    required this.onAccept,
    required this.onIgnore,
  });

  @override
  Widget build(BuildContext context) {
    if (request.status != 'pending') {
      return Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: PitchTheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0x15FFFFFF)),
        ),
        child: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundImage: NetworkImage(request.fromUserAvatar),
              onBackgroundImageError: (_, __) {},
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                request.status == 'accepted'
                    ? 'Connected with ${request.fromUserName}. Conversation started!'
                    : 'Connection request ignored.',
                style: TextStyle(
                  color: request.status == 'accepted'
                      ? PitchTheme.accentEmerald
                      : PitchTheme.textSecondary,
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: PitchTheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: PitchTheme.primary.withValues(alpha: 0.3),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.25),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Founder Row
          Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundImage: NetworkImage(request.fromUserAvatar),
                onBackgroundImageError: (_, __) {},
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      request.fromUserName,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 14.5,
                      ),
                    ),
                    Text(
                      request.fromUserHeadline,
                      style: TextStyle(
                        color: PitchTheme.textSecondary,
                        fontSize: 11,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                decoration: BoxDecoration(
                  color: PitchTheme.accentAmber.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text(
                  'REQUEST',
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w800,
                    color: PitchTheme.accentAmber,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Pinned 180s Pitch Video Attachment Box
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFF16182B),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0x226366F1)),
            ),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      Image.network(
                        request.pitchThumbnail,
                        width: 50,
                        height: 50,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          width: 50,
                          height: 50,
                          color: const Color(0xFF22253A),
                        ),
                      ),
                      const Icon(Icons.play_circle_fill_rounded,
                          color: Colors.white, size: 22),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        request.pitchTitle,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          const Icon(Icons.timer_outlined,
                              color: PitchTheme.accentAmber, size: 11),
                          const SizedBox(width: 3),
                          Text(
                            '${request.pitchDuration.toInt()}s Elevator Pitch Attached',
                            style: const TextStyle(
                              color: PitchTheme.accentAmber,
                              fontSize: 10.5,
                              fontWeight: FontWeight.w600,
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

          const SizedBox(height: 10),

          // Pitch Note
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: PitchTheme.surfaceElevated,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              '"${request.note}"',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.85),
                fontSize: 12,
                fontStyle: FontStyle.italic,
                height: 1.3,
              ),
            ),
          ),

          const SizedBox(height: 14),

          // Accept / Ignore Buttons
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0x33FFFFFF)),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                  onPressed: onIgnore,
                  child: Text(
                    'Ignore',
                    style: TextStyle(
                      color: PitchTheme.textSecondary,
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: PitchTheme.primary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                  onPressed: onAccept,
                  icon: const Icon(Icons.check_rounded,
                      size: 16, color: Colors.white),
                  label: const Text(
                    'Accept & Connect',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 12,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
