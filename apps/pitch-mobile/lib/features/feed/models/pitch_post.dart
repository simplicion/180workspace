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
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      username: json['username'] ?? '',
      headline: json['headline'],
      photoUrl: json['photoUrl'],
      city: json['city'],
      country: json['country'],
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
  final int commentsCount;
  final DateTime createdAt;

  PitchPost({
    required this.id,
    required this.title,
    required this.description,
    required this.videoUrl,
    this.hlsMasterUrl,
    this.thumbnailUrl,
    required this.duration,
    required this.category,
    required this.tags,
    required this.views,
    required this.upvotesCount,
    this.isUpvoted = false,
    required this.user,
    required this.commentsCount,
    required this.createdAt,
  });

  factory PitchPost.fromJson(Map<String, dynamic> json) {
    return PitchPost(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      videoUrl: json['videoUrl'] ?? '',
      hlsMasterUrl: json['hlsMasterUrl'],
      thumbnailUrl: json['thumbnailUrl'],
      duration: (json['duration'] as num?)?.toDouble() ?? 180.0,
      category: json['category'] ?? 'startups',
      tags: (json['tags'] as List?)?.map((e) => e.toString()).toList() ?? [],
      views: json['views'] ?? 0,
      upvotesCount: json['upvotesCount'] ?? 0,
      isUpvoted: json['isUpvotedByMe'] ?? false,
      user: PitchAuthor.fromJson(json['user'] ?? {}),
      commentsCount: json['_count']?['comments'] ?? 0,
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
    );
  }
}
