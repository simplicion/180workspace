import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import 'package:intl/intl.dart';
import '../../../core/config/app_config.dart';
import '../../../core/theme/pitch_theme.dart';
import '../../../core/auth/local_user_profile.dart';
import '../models/event_model.dart';
import 'widgets/event_details_modal.dart';

class EventsScreen extends ConsumerStatefulWidget {
  const EventsScreen({super.key});

  @override
  ConsumerState<EventsScreen> createState() => _EventsScreenState();
}

class _EventsScreenState extends ConsumerState<EventsScreen> {
  final List<PitchEvent> _events = [];
  bool _loading = true;
  String _selectedCategory = 'all';

  final List<String> _categories = [
    'all',
    'demo_day',
    'investor_ama',
    'pitch_battle',
    'workshop',
  ];

  @override
  void initState() {
    super.initState();
    _fetchEvents();
  }

  List<PitchEvent> _getDefaultEvents() {
    final now = DateTime.now();
    return [
      PitchEvent(
        id: 'evt_1',
        title: 'Global Demo Day: Top 10 Startups in 180 Seconds',
        description:
            'Watch 10 vetted YC, Techstars, and 180 Network founders pitch live to 25+ top-tier VC partners. Strict 180-second countdown clock with 90 seconds of investor Q&A.',
        eventDate: now.add(const Duration(days: 2, hours: 4)),
        location: '180 Virtual Stage (Live Stream)',
        meetingUrl: 'https://meet.180workspace.com/demo-day-sept2026',
        category: 'demo_day',
        hostName: 'Alex Rivers',
        hostAvatar:
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
        speakerRole: 'Founder @ Simplicion & 180 Workspace',
        agenda: [
          'Opening Keynote: The Art of the 180-Second Pitch',
          'Batch 1: AI & Autonomous Agent Startups (5 pitches)',
          'Investor Panel Reaction & Term Sheet Discussions',
          'Batch 2: DevTools & Fintech Infrastructure (5 pitches)',
          'Audience Choice Award Voting',
        ],
        isLiveNow: true,
        rsvpsCount: 340,
        isRsvpd: true,
      ),
      PitchEvent(
        id: 'evt_2',
        title: 'AMA: Raising a \$3.5M Seed Round with 180s Pitch Video',
        description:
            'Deep dive with Sarah Chen on how Synthetix AI secured oversubscribed institutional checks by leading cold outreach with high-velocity 180s video reels.',
        eventDate: now.add(const Duration(days: 4, hours: 2)),
        location: 'Virtual Fireside Room',
        meetingUrl: 'https://meet.180workspace.com/sarah-ama',
        category: 'investor_ama',
        hostName: 'Sarah Chen',
        hostAvatar:
            'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
        speakerRole: 'Founder & CEO @ Synthetix AI (\$3.5M Seed)',
        agenda: [
          'Deconstructing the 180-second script structure',
          'Cold email conversion rates with embedded video',
          'Live pitch breakdown of 3 volunteer attendees',
          'Open Q&A for early-stage founders',
        ],
        isLiveNow: false,
        rsvpsCount: 215,
        isRsvpd: false,
      ),
      PitchEvent(
        id: 'evt_3',
        title: 'Pitch Battle: Zero-Knowledge & Fintech Infrastructure',
        description:
            'Six hardcore crypto & fintech protocols battle head-to-head. Judged by leading partners from Paradigm, a16z crypto, and Founders Fund.',
        eventDate: now.add(const Duration(days: 7, hours: 6)),
        location: 'Live Virtual Arena',
        meetingUrl: 'https://meet.180workspace.com/fintech-battle',
        category: 'pitch_battle',
        hostName: 'David Kumar',
        hostAvatar:
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
        speakerRole: 'Founder @ VaultZero',
        agenda: [
          'Round 1: 180s Pitch Presentation',
          'Round 2: Technical Architecture Deep Dive (3 min)',
          'Judge Deliberation & \$25k Non-Dilutive Grant Award',
        ],
        isLiveNow: false,
        rsvpsCount: 180,
        isRsvpd: false,
      ),
    ];
  }

  Future<void> _fetchEvents({String? category}) async {
    setState(() => _loading = true);
    try {
      final dio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 4),
        receiveTimeout: const Duration(seconds: 4),
      ));
      final q = <String, dynamic>{'limit': 20};
      if (category != null && category != 'all') {
        q['category'] = category;
      }

      final res = await dio.get(
        '${AppConfig.apiBaseUrl}/api/v1/pitch/events',
        queryParameters: q,
      );
      if (res.data['success'] == true) {
        final list = (res.data['events'] as List)
            .map((e) => PitchEvent.fromJson(e))
            .toList();
        if (mounted) {
          setState(() {
            _events.clear();
            if (list.isNotEmpty) {
              _events.addAll(list);
            } else {
              _events.addAll(_getDefaultEvents());
            }
            _loading = false;
          });
        }
      } else {
        if (mounted) {
          setState(() {
            _events.clear();
            _events.addAll(_getDefaultEvents());
            _loading = false;
          });
        }
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _events.clear();
          _events.addAll(_getDefaultEvents());
          _loading = false;
        });
      }
    }
  }

  void _toggleRsvp(PitchEvent event) {
    final notifier = ref.read(localUserProfileProvider.notifier);
    notifier.toggleRsvp(event.id);

    setState(() {
      if (event.isRsvpd) {
        event.isRsvpd = false;
        event.rsvpsCount = (event.rsvpsCount - 1).clamp(0, 999999);
      } else {
        event.isRsvpd = true;
        event.rsvpsCount++;
      }
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(event.isRsvpd
            ? 'RSVP confirmed for "${event.title}"'
            : 'RSVP cancelled'),
        backgroundColor: PitchTheme.surfaceElevated,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _openEventDetails(PitchEvent event) {
    EventDetailsModal.show(
      context,
      event: event,
      onToggleRsvp: () => _toggleRsvp(event),
    );
  }

  List<PitchEvent> get _filteredEvents {
    final userRsvpdIds = ref.watch(localUserProfileProvider).rsvpdEventIds;

    return _events.where((e) {
      if (userRsvpdIds.contains(e.id)) {
        e.isRsvpd = true;
      }
      if (_selectedCategory == 'all') return true;
      return e.category.toLowerCase() == _selectedCategory.toLowerCase();
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final list = _filteredEvents;
    final dateFormat = DateFormat('MMM d, y • h:mm a');

    return Scaffold(
      backgroundColor: PitchTheme.background,
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: PitchTheme.accentPink.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: PitchTheme.accentPink.withValues(alpha: 0.5),
                  width: 0.8,
                ),
              ),
              child: const Text(
                'LIVE SESSIONS',
                style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.0,
                  color: PitchTheme.accentPink,
                ),
              ),
            ),
            const SizedBox(width: 8),
            const Text(
              'Virtual Demo Days & AMAs',
              style: TextStyle(fontSize: 16.5, fontWeight: FontWeight.w800),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // Category selector chips
          SizedBox(
            height: 40,
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
              scrollDirection: Axis.horizontal,
              itemCount: _categories.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (ctx, i) {
                final cat = _categories[i];
                final isSelected = cat == _selectedCategory;
                return ChoiceChip(
                  label: Text(
                      cat == 'all' ? 'All Sessions' : cat.replaceAll('_', ' ').toUpperCase()),
                  selected: isSelected,
                  selectedColor: PitchTheme.primary,
                  backgroundColor: PitchTheme.surface,
                  labelStyle: TextStyle(
                    color: isSelected ? Colors.white : PitchTheme.textSecondary,
                    fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                    fontSize: 11,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                    side: BorderSide(
                      color: isSelected
                          ? PitchTheme.primary
                          : const Color(0x22FFFFFF),
                    ),
                  ),
                  onSelected: (selected) {
                    setState(() => _selectedCategory = selected ? cat : 'all');
                  },
                );
              },
            ),
          ),

          const SizedBox(height: 8),

          Expanded(
            child: _loading
                ? const Center(
                    child: CircularProgressIndicator(color: PitchTheme.primary),
                  )
                : list.isEmpty
                    ? Center(
                        child: Text(
                          'No upcoming sessions in this category.',
                          style: TextStyle(color: PitchTheme.textSecondary),
                        ),
                      )
                    : RefreshIndicator(
                        color: PitchTheme.primary,
                        onRefresh: () =>
                            _fetchEvents(category: _selectedCategory),
                        child: ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: list.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 14),
                          itemBuilder: (ctx, i) {
                            final event = list[i];
                            return GestureDetector(
                              onTap: () => _openEventDetails(event),
                              child: Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: PitchTheme.surface,
                                  borderRadius: BorderRadius.circular(18),
                                  border: Border.all(
                                    color: event.isLiveNow
                                        ? PitchTheme.accentPink
                                            .withValues(alpha: 0.5)
                                        : PitchTheme.primary
                                            .withValues(alpha: 0.2),
                                    width: 1.2,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: event.isLiveNow
                                          ? PitchTheme.accentPink
                                              .withValues(alpha: 0.1)
                                          : Colors.black.withValues(alpha: 0.2),
                                      blurRadius: 10,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                              horizontal: 8, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: event.isLiveNow
                                                ? PitchTheme.accentPink
                                                    .withValues(alpha: 0.2)
                                                : PitchTheme.primary
                                                    .withValues(alpha: 0.15),
                                            borderRadius:
                                                BorderRadius.circular(8),
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              if (event.isLiveNow) ...[
                                                const Icon(
                                                    Icons.fiber_manual_record,
                                                    size: 9,
                                                    color:
                                                        PitchTheme.accentPink),
                                                const SizedBox(width: 4),
                                              ],
                                              Text(
                                                event.isLiveNow
                                                    ? 'LIVE NOW'
                                                    : event.category
                                                        .replaceAll('_', ' ')
                                                        .toUpperCase(),
                                                style: TextStyle(
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.w800,
                                                  letterSpacing: 0.4,
                                                  color: event.isLiveNow
                                                      ? PitchTheme.accentPink
                                                      : PitchTheme.primary,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        Row(
                                          children: [
                                            const Icon(
                                                Icons.people_outline_rounded,
                                                size: 14,
                                                color:
                                                    PitchTheme.textSecondary),
                                            const SizedBox(width: 4),
                                            Text(
                                              '${event.rsvpsCount}',
                                              style: TextStyle(
                                                fontSize: 12,
                                                fontWeight: FontWeight.w700,
                                                color: PitchTheme.textSecondary,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 10),
                                    Text(
                                      event.title,
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w800,
                                        color: Colors.white,
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    Row(
                                      children: [
                                        const Icon(Icons.access_time_rounded,
                                            size: 13,
                                            color: PitchTheme.accentAmber),
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
                                    const SizedBox(height: 4),
                                    Row(
                                      children: [
                                        const Icon(Icons.location_on_outlined,
                                            size: 13,
                                            color: PitchTheme.textSecondary),
                                        const SizedBox(width: 6),
                                        Text(
                                          event.location,
                                          style: TextStyle(
                                            color: PitchTheme.textSecondary,
                                            fontSize: 11.5,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 12),
                                    const Divider(
                                        height: 1, color: Color(0x1AFFFFFF)),
                                    const SizedBox(height: 10),
                                    Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Row(
                                          children: [
                                            CircleAvatar(
                                              radius: 12,
                                              backgroundImage: event.hostAvatar !=
                                                      null
                                                  ? NetworkImage(
                                                      event.hostAvatar!)
                                                  : null,
                                              child: event.hostAvatar == null
                                                  ? const Icon(Icons.person,
                                                      size: 14)
                                                  : null,
                                            ),
                                            const SizedBox(width: 8),
                                            Text(
                                              'Host: ${event.hostName}',
                                              style: const TextStyle(
                                                color: Colors.white70,
                                                fontSize: 12,
                                                fontWeight: FontWeight.w500,
                                              ),
                                            ),
                                          ],
                                        ),
                                        GestureDetector(
                                          onTap: () => _toggleRsvp(event),
                                          child: Container(
                                            padding: const EdgeInsets.symmetric(
                                                horizontal: 10, vertical: 6),
                                            decoration: BoxDecoration(
                                              color: event.isRsvpd
                                                  ? PitchTheme.accentEmerald
                                                      .withValues(alpha: 0.15)
                                                  : PitchTheme.primary,
                                              borderRadius:
                                                  BorderRadius.circular(10),
                                              border: Border.all(
                                                color: event.isRsvpd
                                                    ? PitchTheme.accentEmerald
                                                    : Colors.transparent,
                                              ),
                                            ),
                                            child: Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Icon(
                                                  event.isRsvpd
                                                      ? Icons
                                                          .check_circle_rounded
                                                      : Icons
                                                          .bookmark_border_rounded,
                                                  size: 14,
                                                  color: event.isRsvpd
                                                      ? PitchTheme.accentEmerald
                                                      : Colors.white,
                                                ),
                                                const SizedBox(width: 4),
                                                Text(
                                                  event.isRsvpd
                                                      ? 'RSVP\'d'
                                                      : 'RSVP',
                                                  style: TextStyle(
                                                    color: event.isRsvpd
                                                        ? PitchTheme
                                                            .accentEmerald
                                                        : Colors.white,
                                                    fontWeight: FontWeight.w800,
                                                    fontSize: 11,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}
