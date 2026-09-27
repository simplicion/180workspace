class PitchGig {
  final String id;
  final String title;
  final String description;
  final String category;
  final double? budget;
  final String currency;
  final String location;
  final String status;
  final String userName;
  final String? userPhoto;
  final DateTime createdAt;

  PitchGig({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    this.budget,
    required this.currency,
    required this.location,
    required this.status,
    required this.userName,
    this.userPhoto,
    required this.createdAt,
  });

  factory PitchGig.fromJson(Map<String, dynamic> json) {
    return PitchGig(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      category: json['category'] ?? 'tech',
      budget: (json['budget'] as num?)?.toDouble(),
      currency: json['currency'] ?? 'USD',
      location: json['location'] ?? 'Remote',
      status: json['status'] ?? 'open',
      userName: json['user']?['name'] ?? 'Founder',
      userPhoto: json['user']?['photoUrl'],
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
    );
  }
}
