class PitchEvent {
  final String id;
  final String title;
  final String description;
  final DateTime eventDate;
  final String location;
  final String? meetingUrl;
  final String category;
  int rsvpsCount;
  bool isRsvpd;
  final String hostName;

  PitchEvent({
    required this.id,
    required this.title,
    required this.description,
    required this.eventDate,
    required this.location,
    this.meetingUrl,
    required this.category,
    required this.rsvpsCount,
    this.isRsvpd = false,
    required this.hostName,
  });

  factory PitchEvent.fromJson(Map<String, dynamic> json) {
    return PitchEvent(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      eventDate: DateTime.tryParse(json['eventDate'] ?? '') ?? DateTime.now(),
      location: json['location'] ?? 'Virtual',
      meetingUrl: json['meetingUrl'],
      category: json['category'] ?? 'pitch_day',
      rsvpsCount: json['rsvpsCount'] ?? 0,
      hostName: json['user']?['name'] ?? '180 Host',
    );
  }
}
