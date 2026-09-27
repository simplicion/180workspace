class PitchResource {
  final String id;
  final String title;
  final String description;
  final String url;
  final String category;
  final List<String> tags;
  final String pricing; // 'Free', 'Freemium', 'Open Source', 'Paid'
  final String submittedBy;
  int upvotes;
  bool isUpvoted;

  PitchResource({
    required this.id,
    required this.title,
    required this.description,
    required this.url,
    required this.category,
    required this.tags,
    this.pricing = 'Free',
    this.submittedBy = '180 Network',
    required this.upvotes,
    this.isUpvoted = false,
  });

  factory PitchResource.fromJson(Map<String, dynamic> json) {
    return PitchResource(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? 'Untitled Resource',
      description: json['description'] as String? ?? '',
      url: json['url'] as String? ?? '',
      category: json['category'] as String? ?? 'dev_tools',
      tags: (json['tags'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
      pricing: json['pricing'] as String? ?? 'Free',
      submittedBy: json['submittedBy'] as String? ?? '180 Network',
      upvotes: (json['upvotes'] as num?)?.toInt() ?? 0,
      isUpvoted: json['isUpvoted'] as bool? ?? false,
    );
  }
}
