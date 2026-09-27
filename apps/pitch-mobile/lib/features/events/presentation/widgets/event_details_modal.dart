import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/theme/pitch_theme.dart';
import '../../models/event_model.dart';

class EventDetailsModal extends StatelessWidget {
  final PitchEvent event;
  final VoidCallback onToggleRsvp;

  const EventDetailsModal({
    super.key,
    required this.event,
    required this.onToggleRsvp,
  });

  static void show(
    BuildContext context, {
    required PitchEvent event,
    required VoidCallback onToggleRsvp,
  }) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => EventDetailsModal(
        event: event,
        onToggleRsvp: onToggleRsvp,
      ),
    );
  }

  Future<void> _joinMeeting(BuildContext context) async {
    final url = event.meetingUrl ?? 'https://meet.180workspace.com/${event.id}';
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Opening live stream: $url'),
            backgroundColor: PitchTheme.surfaceElevated,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('EEEE, MMM d, y • h:mm a');

    return Container(
      height: MediaQuery.of(context).size.height * 0.82,
      padding: const EdgeInsets.only(left: 20, right: 20, top: 16, bottom: 24),
      decoration: const BoxDecoration(
        color: PitchTheme.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: event.isLiveNow
                      ? PitchTheme.accentPink.withValues(alpha: 0.2)
                      : PitchTheme.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: event.isLiveNow
                        ? PitchTheme.accentPink
                        : PitchTheme.primary.withValues(alpha: 0.4),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (event.isLiveNow) ...[
                      const Icon(Icons.fiber_manual_record,
                          size: 10, color: PitchTheme.accentPink),
                      const SizedBox(width: 4),
                    ],
                    Text(
                      event.isLiveNow
                          ? 'HAPPENING LIVE NOW'
                          : event.category.replaceAll('_', ' ').toUpperCase(),
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.5,
                        color: event.isLiveNow
                            ? PitchTheme.accentPink
                            : PitchTheme.primary,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded,
                    color: PitchTheme.textSecondary, size: 20),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),

          const SizedBox(height: 12),

          Text(
            event.title,
            style: const TextStyle(
              fontSize: 19,
              fontWeight: FontWeight.w900,
              color: Colors.white,
              height: 1.25,
            ),
          ),
          const SizedBox(height: 8),

          Row(
            children: [
              const Icon(Icons.calendar_today_rounded,
                  color: PitchTheme.accentAmber, size: 14),
              const SizedBox(width: 6),
              Text(
                dateFormat.format(event.eventDate),
                style: const TextStyle(
                  color: PitchTheme.accentAmber,
                  fontWeight: FontWeight.w600,
                  fontSize: 12,
                ),
              ),
            ],
          ),

          const SizedBox(height: 6),
          Row(
            children: [
              const Icon(Icons.location_on_rounded,
                  color: PitchTheme.textSecondary, size: 14),
              const SizedBox(width: 6),
              Text(
                event.location,
                style: TextStyle(
                  color: PitchTheme.textSecondary,
                  fontSize: 12,
                ),
              ),
              const SizedBox(width: 12),
              const Icon(Icons.people_outline_rounded,
                  color: PitchTheme.textSecondary, size: 14),
              const SizedBox(width: 6),
              Text(
                '${event.rsvpsCount} Founders Attending',
                style: TextStyle(
                  color: PitchTheme.textSecondary,
                  fontSize: 12,
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),
          const Divider(height: 1, color: Color(0x1AFFFFFF)),
          const SizedBox(height: 14),

          Expanded(
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Speaker Card
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: PitchTheme.surfaceElevated,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: PitchTheme.primary.withValues(alpha: 0.25),
                      ),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 22,
                          backgroundImage: event.hostAvatar != null
                              ? NetworkImage(event.hostAvatar!)
                              : null,
                          child: event.hostAvatar == null
                              ? const Icon(Icons.person, color: Colors.white)
                              : null,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    event.hostName,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w800,
                                      fontSize: 14,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  const Icon(Icons.verified_rounded,
                                      color: PitchTheme.primary, size: 14),
                                ],
                              ),
                              if (event.speakerRole != null)
                                Text(
                                  event.speakerRole!,
                                  style: TextStyle(
                                    color: PitchTheme.textSecondary,
                                    fontSize: 11.5,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  const Text(
                    'About this Session',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    event.description,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.8),
                      fontSize: 13,
                      height: 1.4,
                    ),
                  ),

                  if (event.agenda.isNotEmpty) ...[
                    const SizedBox(height: 18),
                    const Text(
                      'Session Agenda',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ...event.agenda.map((item) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              margin: const EdgeInsets.only(top: 4),
                              width: 6,
                              height: 6,
                              decoration: const BoxDecoration(
                                color: PitchTheme.primary,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                item,
                                style: const TextStyle(
                                  color: Colors.white70,
                                  fontSize: 12.5,
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                  ],
                ],
              ),
            ),
          ),

          const SizedBox(height: 12),

          // Action Buttons: RSVP & Join Meeting
          Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: 48,
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(
                        color: event.isRsvpd
                            ? PitchTheme.accentEmerald
                            : PitchTheme.primary,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    onPressed: onToggleRsvp,
                    icon: Icon(
                      event.isRsvpd
                          ? Icons.check_circle_rounded
                          : Icons.bookmark_add_outlined,
                      size: 18,
                      color: event.isRsvpd
                          ? PitchTheme.accentEmerald
                          : PitchTheme.primary,
                    ),
                    label: Text(
                      event.isRsvpd ? 'RSVP Confirmed' : '1-Tap RSVP',
                      style: TextStyle(
                        color: event.isRsvpd
                            ? PitchTheme.accentEmerald
                            : Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: SizedBox(
                  height: 48,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: PitchTheme.primary,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    onPressed: () => _joinMeeting(context),
                    icon: const Icon(Icons.video_camera_front_rounded,
                        size: 18, color: Colors.white),
                    label: const Text(
                      'Join Stage',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 13,
                      ),
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
