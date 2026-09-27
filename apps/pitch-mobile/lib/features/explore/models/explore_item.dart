class FounderSpotlight {
  final String id;
  final String name;
  final String username;
  final String avatarUrl;
  final String startupName;
  final String startupTagline;
  final String pitchTitle;
  final String pitchThumbnail;
  final double pitchDuration;
  final int upvotes;
  final bool isVerified;
  final String category;

  const FounderSpotlight({
    required this.id,
    required this.name,
    required this.username,
    required this.avatarUrl,
    required this.startupName,
    required this.startupTagline,
    required this.pitchTitle,
    required this.pitchThumbnail,
    required this.pitchDuration,
    required this.upvotes,
    required this.isVerified,
    required this.category,
  });
}

class ExplorePitchItem {
  final String id;
  final String title;
  final String description;
  final String thumbnailUrl;
  final String videoUrl;
  final double durationSeconds;
  final int viewsCount;
  final int upvotesCount;
  final String authorName;
  final String authorUsername;
  final String authorAvatar;
  final String category;
  final List<String> tags;
  final DateTime createdAt;

  const ExplorePitchItem({
    required this.id,
    required this.title,
    required this.description,
    required this.thumbnailUrl,
    required this.videoUrl,
    required this.durationSeconds,
    required this.viewsCount,
    required this.upvotesCount,
    required this.authorName,
    required this.authorUsername,
    required this.authorAvatar,
    required this.category,
    required this.tags,
    required this.createdAt,
  });

  factory ExplorePitchItem.fromJson(Map<String, dynamic> json) {
    return ExplorePitchItem(
      id: json['id'] as String,
      title: json['title'] as String? ?? 'Untitled Pitch',
      description: json['description'] as String? ?? '',
      thumbnailUrl: json['thumbnailUrl'] as String? ?? '',
      videoUrl: json['videoUrl'] as String? ?? '',
      durationSeconds: (json['durationSeconds'] as num?)?.toDouble() ?? 180.0,
      viewsCount: (json['viewsCount'] as num?)?.toInt() ?? 0,
      upvotesCount: (json['upvotesCount'] as num?)?.toInt() ?? 0,
      authorName: json['authorName'] as String? ?? 'Founder',
      authorUsername: json['authorUsername'] as String? ?? 'founder',
      authorAvatar: json['authorAvatar'] as String? ?? '',
      category: json['category'] as String? ?? 'startups',
      tags: (json['tags'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
