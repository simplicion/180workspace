class PitchEvent {
  final String id;
  final String title;
  final String description;
  final DateTime eventDate;
  final String location;
  final String? meetingUrl;
  final String category; // 'demo_day', 'investor_ama', 'pitch_battle', 'workshop'
  final String hostName;
  final String? hostAvatar;
  final String? speakerRole;
  final List<String> agenda;
  final bool isLiveNow;
  int rsvpsCount;
  bool isRsvpd;

  PitchEvent({
    required this.id,
    required this.title,
    required this.description,
    required this.eventDate,
    required this.location,
    this.meetingUrl,
    required this.category,
    required this.hostName,
    this.hostAvatar,
    this.speakerRole,
    this.agenda = const [],
    this.isLiveNow = false,
    required this.rsvpsCount,
    this.isRsvpd = false,
  });

  factory PitchEvent.fromJson(Map<String, dynamic> json) {
    return PitchEvent(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? 'Untitled Event',
      description: json['description'] as String? ?? '',
      eventDate: json['eventDate'] != null
          ? DateTime.tryParse(json['eventDate'].toString()) ?? DateTime.now()
          : DateTime.now(),
      location: json['location'] as String? ?? 'Virtual Stage (Live)',
      meetingUrl: json['meetingUrl'] as String?,
      category: json['category'] as String? ?? 'demo_day',
      hostName: json['hostName'] as String? ??
          (json['user']?['name'] as String? ?? '180 Host'),
      hostAvatar: json['hostAvatar'] as String? ?? json['user']?['photoUrl'],
      speakerRole: json['speakerRole'] as String?,
      agenda: (json['agenda'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
      isLiveNow: json['isLiveNow'] as bool? ?? false,
      rsvpsCount: (json['rsvpsCount'] as num?)?.toInt() ?? 0,
      isRsvpd: json['isRsvpd'] as bool? ?? false,
    );
  }
}
