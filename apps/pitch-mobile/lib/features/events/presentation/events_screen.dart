import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import 'package:intl/intl.dart';
import '../../../core/config/app_config.dart';
import '../../../core/theme/pitch_theme.dart';
import '../../../core/auth/auth_provider.dart';
import '../models/event_model.dart';

class EventsScreen extends ConsumerStatefulWidget {
  const EventsScreen({super.key});

  @override
  ConsumerState<EventsScreen> createState() => _EventsScreenState();
}

class _EventsScreenState extends ConsumerState<EventsScreen> {
  final List<PitchEvent> _events = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetchEvents();
  }

  Future<void> _fetchEvents() async {
    setState(() => _loading = true);
    try {
      final dio = Dio();
      final res = await dio.get('${AppConfig.apiBaseUrl}/api/v1/pitch/events');
      if (res.data['success'] == true) {
        final list = (res.data['events'] as List)
            .map((e) => PitchEvent.fromJson(e))
            .toList();
        if (mounted) {
          setState(() {
            _events.clear();
            _events.addAll(list);
            _loading = false;
          });
        }
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggleRsvp(PitchEvent event) async {
    final auth = ref.read(authStateProvider);
    if (auth is! Authenticated) {
      ref.read(authStateProvider.notifier).launchSso();
      return;
    }

    setState(() {
      if (event.isRsvpd) {
        event.isRsvpd = false;
        event.rsvpsCount = (event.rsvpsCount - 1).clamp(0, 999999);
      } else {
        event.isRsvpd = true;
        event.rsvpsCount++;
      }
    });

    try {
      final dio = Dio();
      await dio.post(
        '${AppConfig.apiBaseUrl}/api/v1/pitch/events/${event.id}/rsvp',
        options: Options(headers: {'Authorization': 'Bearer ${auth.accessToken}'}),
      );
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PitchTheme.background,
      appBar: AppBar(
        title: const Text('Pitch Days & Events', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: PitchTheme.primary))
          : _events.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.event_available_rounded, size: 54, color: PitchTheme.textSecondary),
                      const SizedBox(height: 12),
                      const Text('No upcoming virtual pitch sessions.', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 6),
                      Text('Check back soon for upcoming founder pitch days!', style: TextStyle(color: PitchTheme.textSecondary)),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _events.length,
                  itemBuilder: (ctx, i) {
                    final ev = _events[i];
                    final dateStr = DateFormat('EEE, MMM d • h:mm a').format(ev.eventDate);

                    return Card(
                      margin: const EdgeInsets.only(bottom: 16),
                      color: PitchTheme.surface,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(18),
                        side: const BorderSide(color: Color(0x1A6366F1)),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(18),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: PitchTheme.secondary.withValues(alpha: 0.2),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    '#${ev.category.toUpperCase()}',
                                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: PitchTheme.secondary),
                                  ),
                                ),
                                const Spacer(),
                                const Icon(Icons.people_outline_rounded, size: 16, color: PitchTheme.textSecondary),
                                const SizedBox(width: 4),
                                Text(
                                  '${ev.rsvpsCount} RSVP',
                                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: PitchTheme.textSecondary),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Text(ev.title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                            const SizedBox(height: 6),
                            Text(
                              ev.description,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(color: PitchTheme.textSecondary, fontSize: 13, height: 1.35),
                            ),
                            const SizedBox(height: 14),
                            Row(
                              children: [
                                const Icon(Icons.calendar_today_rounded, size: 14, color: PitchTheme.primary),
                                const SizedBox(width: 6),
                                Text(dateStr, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white)),
                              ],
                            ),
                            const SizedBox(height: 16),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton.icon(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: ev.isRsvpd ? PitchTheme.surfaceElevated : PitchTheme.primary,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  padding: const EdgeInsets.symmetric(vertical: 10),
                                ),
                                onPressed: () => _toggleRsvp(ev),
                                icon: Icon(ev.isRsvpd ? Icons.check_circle_rounded : Icons.add_circle_outline_rounded, size: 18),
                                label: Text(
                                  ev.isRsvpd ? 'Attending (1-Tap RSVP)' : 'RSVP to Pitch Day',
                                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
