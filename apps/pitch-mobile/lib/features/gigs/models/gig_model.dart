class PitchGig {
  final String id;
  final String title;
  final String description;
  final String category;
  final String opportunityType; // 'gig' (freelance/bounty) or 'job' (full-time)
  final String companyName;
  final String? companyLogo;
  final double? budget;
  final double? salaryMin;
  final double? salaryMax;
  final String? equity;
  final String? seniority;
  final String currency;
  final String location;
  final bool isRemote;
  final String status;
  final String userName;
  final String? userPhoto;
  final List<String> tags;
  final int applicantsCount;
  bool isApplied;
  final DateTime createdAt;

  PitchGig({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    this.opportunityType = 'gig',
    required this.companyName,
    this.companyLogo,
    this.budget,
    this.salaryMin,
    this.salaryMax,
    this.equity,
    this.seniority,
    this.currency = 'USD',
    required this.location,
    this.isRemote = true,
    this.status = 'open',
    required this.userName,
    this.userPhoto,
    this.tags = const [],
    this.applicantsCount = 0,
    this.isApplied = false,
    required this.createdAt,
  });

  factory PitchGig.fromJson(Map<String, dynamic> json) {
    return PitchGig(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? 'Untitled Opportunity',
      description: json['description'] as String? ?? '',
      category: json['category'] as String? ?? 'tech',
      opportunityType: json['opportunityType'] as String? ?? 'gig',
      companyName: json['companyName'] as String? ??
          (json['user']?['name'] as String? ?? 'Stealth Startup'),
      companyLogo: json['companyLogo'] as String? ?? json['user']?['photoUrl'],
      budget: (json['budget'] as num?)?.toDouble(),
      salaryMin: (json['salaryMin'] as num?)?.toDouble(),
      salaryMax: (json['salaryMax'] as num?)?.toDouble(),
      equity: json['equity'] as String?,
      seniority: json['seniority'] as String?,
      currency: json['currency'] as String? ?? 'USD',
      location: json['location'] as String? ?? 'Remote',
      isRemote: json['isRemote'] as bool? ?? true,
      status: json['status'] as String? ?? 'open',
      userName: json['user']?['name'] as String? ?? 'Founder',
      userPhoto: json['user']?['photoUrl'] as String?,
      tags: (json['tags'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
      applicantsCount: (json['applicantsCount'] as num?)?.toInt() ?? 0,
      isApplied: json['isApplied'] as bool? ?? false,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
