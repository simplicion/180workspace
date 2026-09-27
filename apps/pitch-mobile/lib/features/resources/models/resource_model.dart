class PitchResource {
  final String id;
  final String title;
  final String description;
  final String url;
  final String category;
  final List<String> tags;
  int upvotes;

  PitchResource({
    required this.id,
    required this.title,
    required this.description,
    required this.url,
    required this.category,
    required this.tags,
    required this.upvotes,
  });

  factory PitchResource.fromJson(Map<String, dynamic> json) {
    return PitchResource(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      url: json['url'] ?? '',
      category: json['category'] ?? 'ai',
      tags: (json['tags'] as List?)?.map((e) => e.toString()).toList() ?? [],
      upvotes: json['upvotes'] ?? 0,
    );
  }
}
