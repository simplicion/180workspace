import 'package:flutter/material.dart';
import '../../../core/theme/pitch_theme.dart';
import '../models/notification_item.dart';
import '../widgets/notification_tile.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  String _selectedFilter = 'all';

  final List<NotificationItem> _notifications = [
    NotificationItem(
      id: 'notif_1',
      type: NotificationType.upvote,
      title: 'Sarah Chen upvoted your pitch',
      body: 'Your 180s pitch "Simplicion Work Graph" received a new flame burst!',
      avatarUrl:
          'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
      timestamp: DateTime.now().subtract(const Duration(minutes: 25)),
      isRead: false,
    ),
    NotificationItem(
      id: 'notif_2',
      type: NotificationType.comment,
      title: 'David Kumar commented',
      body: '"Are you presenting at the Global Demo Day on Thursday? Term sheet ready."',
      avatarUrl:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      timestamp: DateTime.now().subtract(const Duration(hours: 1)),
      isRead: false,
    ),
    NotificationItem(
      id: 'notif_3',
      type: NotificationType.pitchTranscoded,
      title: '180 HLS Transcoder Completed',
      body: 'Your elevator pitch was successfully encoded into 720p, 480p, and 360p multi-bitrate streams on Cloudflare R2.',
      timestamp: DateTime.now().subtract(const Duration(hours: 4)),
      isRead: true,
    ),
    NotificationItem(
      id: 'notif_4',
      type: NotificationType.gigApplication,
      title: 'New 180s Pitch Application',
      body: 'Marcus Vance applied to your gig "Build Flutter Audio Waveform Visualizer" with his pinned pitch.',
      avatarUrl:
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
      timestamp: DateTime.now().subtract(const Duration(hours: 8)),
      isRead: true,
    ),
    NotificationItem(
      id: 'notif_5',
      type: NotificationType.eventReminder,
      title: 'Demo Day Reminder',
      body: '"Global Demo Day: Top 10 Startups in 180 Seconds" is starting in 48 hours. Stage links are live.',
      timestamp: DateTime.now().subtract(const Duration(days: 1)),
      isRead: true,
    ),
  ];

  void _markAllAsRead() {
    setState(() {
      for (final n in _notifications) {
        n.isRead = true;
      }
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('All notifications marked as read'),
        backgroundColor: PitchTheme.surfaceElevated,
      ),
    );
  }

  List<NotificationItem> get _filteredList {
    if (_selectedFilter == 'all') return _notifications;
    return _notifications.where((n) {
      if (_selectedFilter == 'pitches') {
        return n.type == NotificationType.upvote ||
            n.type == NotificationType.comment ||
            n.type == NotificationType.pitchTranscoded;
      } else if (_selectedFilter == 'gigs') {
        return n.type == NotificationType.gigApplication;
      } else if (_selectedFilter == 'events') {
        return n.type == NotificationType.eventReminder;
      }
      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final list = _filteredList;
    final unreadCount = _notifications.where((n) => !n.isRead).length;

    return Scaffold(
      backgroundColor: PitchTheme.background,
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: PitchTheme.primary.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text(
                'ACTIVITY',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.0,
                  color: PitchTheme.primary,
                ),
              ),
            ),
            const SizedBox(width: 8),
            const Text(
              'Notifications',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
            ),
          ],
        ),
        actions: [
          if (unreadCount > 0)
            TextButton(
              onPressed: _markAllAsRead,
              child: const Text(
                'Mark read',
                style: TextStyle(
                  color: PitchTheme.primary,
                  fontWeight: FontWeight.w700,
                  fontSize: 12,
                ),
              ),
            ),
          const SizedBox(width: 4),
        ],
      ),
      body: Column(
        children: [
          // Filter Chips
          Container(
            height: 40,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                _buildFilterChip('All Activity', 'all'),
                const SizedBox(width: 8),
                _buildFilterChip('Pitches & Reels', 'pitches'),
                const SizedBox(width: 8),
                _buildFilterChip('Gigs & Applications', 'gigs'),
                const SizedBox(width: 8),
                _buildFilterChip('Virtual Events', 'events'),
              ],
            ),
          ),

          const SizedBox(height: 8),

          Expanded(
            child: list.isEmpty
                ? Center(
                    child: Text(
                      'No notifications in this category.',
                      style: TextStyle(color: PitchTheme.textSecondary),
                    ),
                  )
                : ListView.builder(
                    physics: const BouncingScrollPhysics(),
                    itemCount: list.length,
                    itemBuilder: (ctx, i) {
                      final item = list[i];
                      return NotificationTile(
                        item: item,
                        onTap: () {
                          setState(() => item.isRead = true);
                        },
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String key) {
    final isSelected = _selectedFilter == key;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      selectedColor: PitchTheme.primary,
      backgroundColor: PitchTheme.surface,
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : PitchTheme.textSecondary,
        fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
        fontSize: 11.5,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
        side: BorderSide(
          color: isSelected ? PitchTheme.primary : const Color(0x22FFFFFF),
        ),
      ),
      onSelected: (selected) {
        if (selected) setState(() => _selectedFilter = key);
      },
    );
  }
}
