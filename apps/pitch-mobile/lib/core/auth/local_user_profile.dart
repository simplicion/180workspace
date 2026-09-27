import 'package:flutter_riverpod/flutter_riverpod.dart';

class PortfolioProject {
  final String id;
  final String title;
  final String description;
  final String? projectUrl;
  final String? metric;
  final List<String> techStack;

  const PortfolioProject({
    required this.id,
    required this.title,
    required this.description,
    this.projectUrl,
    this.metric,
    this.techStack = const [],
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'projectUrl': projectUrl,
        'metric': metric,
        'techStack': techStack,
      };

  factory PortfolioProject.fromJson(Map<String, dynamic> json) =>
      PortfolioProject(
        id: json['id'] as String,
        title: json['title'] as String,
        description: json['description'] as String,
        projectUrl: json['projectUrl'] as String?,
        metric: json['metric'] as String?,
        techStack: (json['techStack'] as List<dynamic>?)
                ?.map((e) => e.toString())
                .toList() ??
            const [],
      );
}

class LocalUserProfile {
  final String id;
  final String name;
  final String username;
  final String email;
  final String avatarUrl;
  final String headline;
  final String bio;
  final String location;
  final String badge;
  final bool isVerified;
  final String pitchVideoUrl;
  final String pitchVideoThumbnail;
  final String websiteUrl;
  final String githubUrl;
  final String twitterUrl;
  final String linkedinUrl;
  final List<String> skills;
  final List<PortfolioProject> portfolioProjects;
  final Set<String> upvotedPitchIds;
  final Set<String> bookmarkedPitchIds;
  final Set<String> appliedGigIds;
  final Set<String> rsvpdEventIds;
  final Set<String> followingUserIds;

  const LocalUserProfile({
    required this.id,
    required this.name,
    required this.username,
    required this.email,
    required this.avatarUrl,
    required this.headline,
    required this.bio,
    required this.location,
    required this.badge,
    required this.isVerified,
    required this.pitchVideoUrl,
    required this.pitchVideoThumbnail,
    required this.websiteUrl,
    required this.githubUrl,
    required this.twitterUrl,
    required this.linkedinUrl,
    required this.skills,
    required this.portfolioProjects,
    required this.upvotedPitchIds,
    required this.bookmarkedPitchIds,
    required this.appliedGigIds,
    required this.rsvpdEventIds,
    required this.followingUserIds,
  });

  LocalUserProfile copyWith({
    String? id,
    String? name,
    String? username,
    String? email,
    String? avatarUrl,
    String? headline,
    String? bio,
    String? location,
    String? badge,
    bool? isVerified,
    String? pitchVideoUrl,
    String? pitchVideoThumbnail,
    String? websiteUrl,
    String? githubUrl,
    String? twitterUrl,
    String? linkedinUrl,
    List<String>? skills,
    List<PortfolioProject>? portfolioProjects,
    Set<String>? upvotedPitchIds,
    Set<String>? bookmarkedPitchIds,
    Set<String>? appliedGigIds,
    Set<String>? rsvpdEventIds,
    Set<String>? followingUserIds,
  }) {
    return LocalUserProfile(
      id: id ?? this.id,
      name: name ?? this.name,
      username: username ?? this.username,
      email: email ?? this.email,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      headline: headline ?? this.headline,
      bio: bio ?? this.bio,
      location: location ?? this.location,
      badge: badge ?? this.badge,
      isVerified: isVerified ?? this.isVerified,
      pitchVideoUrl: pitchVideoUrl ?? this.pitchVideoUrl,
      pitchVideoThumbnail: pitchVideoThumbnail ?? this.pitchVideoThumbnail,
      websiteUrl: websiteUrl ?? this.websiteUrl,
      githubUrl: githubUrl ?? this.githubUrl,
      twitterUrl: twitterUrl ?? this.twitterUrl,
      linkedinUrl: linkedinUrl ?? this.linkedinUrl,
      skills: skills ?? this.skills,
      portfolioProjects: portfolioProjects ?? this.portfolioProjects,
      upvotedPitchIds: upvotedPitchIds ?? this.upvotedPitchIds,
      bookmarkedPitchIds: bookmarkedPitchIds ?? this.bookmarkedPitchIds,
      appliedGigIds: appliedGigIds ?? this.appliedGigIds,
      rsvpdEventIds: rsvpdEventIds ?? this.rsvpdEventIds,
      followingUserIds: followingUserIds ?? this.followingUserIds,
    );
  }

  static LocalUserProfile defaultPersona() {
    return const LocalUserProfile(
      id: 'usr_founder_001',
      name: 'Alex Rivers',
      username: 'alexrivers',
      email: 'alex@simplicion.com',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      headline: 'Founder & CEO @ Simplicion | Building 180 Workspace & Pitch in 180',
      bio: 'Serial entrepreneur & engineer building next-generation productivity infrastructure. Pioneering 180-second elevator pitches and enterprise sovereign work graphs.',
      location: 'San Francisco, CA & London, UK',
      badge: 'Verified 180 Founder',
      isVerified: true,
      pitchVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      pitchVideoThumbnail: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&auto=format&fit=crop&q=80',
      websiteUrl: 'https://180workspace.com',
      githubUrl: 'https://github.com/simplicion',
      twitterUrl: 'https://twitter.com/180workspace',
      linkedinUrl: 'https://linkedin.com/company/simplicion',
      skills: [
        'Founder & CEO',
        'Distributed Systems',
        'Flutter & Dart',
        'Go / Rust',
        'Enterprise SaaS',
        'Work Graph Architecture',
        'Pitch Crafting',
      ],
      portfolioProjects: [
        PortfolioProject(
          id: 'proj_1',
          title: '180 Workspace Sovereign Platform',
          description: 'Enterprise multi-app work graph platform with sovereign identity, private vault, and live workspace synchronization.',
          metric: '100K+ DAU',
          techStack: ['Flutter', 'Next.js', 'PostgreSQL', 'Redis', 'WebSockets'],
        ),
        PortfolioProject(
          id: 'proj_2',
          title: 'Pitch in 180 Network',
          description: '180-second elevator pitch mobile network connecting founders, engineers, and tier-1 investors.',
          metric: '180s Limit Enforced',
          techStack: ['Flutter', 'FFmpeg HLS', 'Cloudflare R2', 'BullMQ'],
        ),
      ],
      upvotedPitchIds: {'post_demo_1', 'post_demo_2'},
      bookmarkedPitchIds: {'post_demo_1'},
      appliedGigIds: {},
      rsvpdEventIds: {'evt_1'},
      followingUserIds: {'usr_sarah_chen', 'usr_david_k'},
    );
  }
}

class LocalUserProfileNotifier extends StateNotifier<LocalUserProfile> {
  LocalUserProfileNotifier() : super(LocalUserProfile.defaultPersona());

  void updateProfile({
    String? name,
    String? username,
    String? headline,
    String? bio,
    String? location,
    String? websiteUrl,
    String? githubUrl,
    String? twitterUrl,
    String? linkedinUrl,
    List<String>? skills,
  }) {
    state = state.copyWith(
      name: name,
      username: username,
      headline: headline,
      bio: bio,
      location: location,
      websiteUrl: websiteUrl,
      githubUrl: githubUrl,
      twitterUrl: twitterUrl,
      linkedinUrl: linkedinUrl,
      skills: skills,
    );
  }

  void toggleUpvote(String pitchId) {
    final updated = Set<String>.from(state.upvotedPitchIds);
    if (updated.contains(pitchId)) {
      updated.remove(pitchId);
    } else {
      updated.add(pitchId);
    }
    state = state.copyWith(upvotedPitchIds: updated);
  }

  void toggleBookmark(String pitchId) {
    final updated = Set<String>.from(state.bookmarkedPitchIds);
    if (updated.contains(pitchId)) {
      updated.remove(pitchId);
    } else {
      updated.add(pitchId);
    }
    state = state.copyWith(bookmarkedPitchIds: updated);
  }

  void recordGigApplication(String gigId) {
    final updated = Set<String>.from(state.appliedGigIds);
    updated.add(gigId);
    state = state.copyWith(appliedGigIds: updated);
  }

  void toggleRsvp(String eventId) {
    final updated = Set<String>.from(state.rsvpdEventIds);
    if (updated.contains(eventId)) {
      updated.remove(eventId);
    } else {
      updated.add(eventId);
    }
    state = state.copyWith(rsvpdEventIds: updated);
  }

  void toggleFollow(String userId) {
    final updated = Set<String>.from(state.followingUserIds);
    if (updated.contains(userId)) {
      updated.remove(userId);
    } else {
      updated.add(userId);
    }
    state = state.copyWith(followingUserIds: updated);
  }
}

final localUserProfileProvider =
    StateNotifierProvider<LocalUserProfileNotifier, LocalUserProfile>((ref) {
  return LocalUserProfileNotifier();
});
