class PitchAuthor {
  final String id;
  final String name;
  final String username;
  final String? headline;
  final String? photoUrl;
  final String? city;
  final String? country;

  PitchAuthor({
    required this.id,
    required this.name,
    required this.username,
    this.headline,
    this.photoUrl,
    this.city,
    this.country,
  });

  factory PitchAuthor.fromJson(Map<String, dynamic> json) {
    return PitchAuthor(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Founder',
      username: json['username'] as String? ?? 'founder',
      headline: json['headline'] as String?,
      photoUrl: json['photoUrl'] as String?,
      city: json['city'] as String?,
      country: json['country'] as String?,
    );
  }
}

class PitchPost {
  final String id;
  final String title;
  final String description;
  final String videoUrl;
  final String? hlsMasterUrl;
  final String? thumbnailUrl;
  final double duration; // in seconds (strictly <= 180.0)
  final String category;
  final List<String> tags;
  final int views;
  int upvotesCount;
  bool isUpvoted;
  final PitchAuthor user;
  int commentsCount;
  final DateTime createdAt;

  PitchPost({
    required this.id,
    required this.title,
    required this.description,
    required this.videoUrl,
    this.hlsMasterUrl,
    this.thumbnailUrl,
    double? duration,
    double? durationSeconds,
    required this.category,
    required this.tags,
    int? views,
    required this.upvotesCount,
    this.isUpvoted = false,
    PitchAuthor? user,
    String? authorName,
    String? authorUsername,
    String? authorAvatar,
    String? authorCompany,
    required this.commentsCount,
    required this.createdAt,
  })  : duration = durationSeconds ?? duration ?? 180.0,
        views = views ?? 0,
        user = user ??
            PitchAuthor(
              id: 'author_${authorUsername ?? "founder"}',
              name: authorName ?? 'Founder',
              username: authorUsername ?? 'founder',
              headline: authorCompany,
              photoUrl: authorAvatar,
            );

  double get durationSeconds => duration;
  String get authorName => user.name;
  String get authorUsername => user.username;
  String get authorAvatar => user.photoUrl ?? '';
  String? get authorCompany => user.headline;

  factory PitchPost.fromJson(Map<String, dynamic> json) {
    return PitchPost(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? 'Untitled Pitch',
      description: json['description'] as String? ?? '',
      videoUrl: json['videoUrl'] as String? ?? '',
      hlsMasterUrl: json['hlsMasterUrl'] as String?,
      thumbnailUrl: json['thumbnailUrl'] as String?,
      duration: (json['duration'] as num?)?.toDouble() ?? 180.0,
      category: json['category'] as String? ?? 'startups',
      tags: (json['tags'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
      views: (json['views'] as num?)?.toInt() ?? 0,
      upvotesCount: (json['upvotesCount'] as num?)?.toInt() ?? 0,
      isUpvoted: json['isUpvotedByMe'] as bool? ?? false,
      user: PitchAuthor.fromJson(
          json['user'] is Map<String, dynamic> ? json['user'] : {}),
      commentsCount: (json['_count']?['comments'] as num?)?.toInt() ??
          (json['commentsCount'] as num?)?.toInt() ??
          0,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
