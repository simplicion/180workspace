class CompanyTeamMember {
  final String id;
  final String name;
  final String role;
  final String avatarUrl;
  final String? linkedinUrl;

  const CompanyTeamMember({
    required this.id,
    required this.name,
    required this.role,
    required this.avatarUrl,
    this.linkedinUrl,
  });
}

class CompanyProduct {
  final String id;
  final String name;
  final String description;
  final String? metric;
  final String? productUrl;

  const CompanyProduct({
    required this.id,
    required this.name,
    required this.description,
    this.metric,
    this.productUrl,
  });
}

class CompanyPageModel {
  final String id;
  final String name;
  final String tagline;
  final String logoUrl;
  final String bannerUrl;
  final String stage; // 'Seed', 'Series A', 'Pre-Seed', 'Bootstrapped'
  final String location;
  final String foundedYear;
  final String teamSize;
  final String websiteUrl;
  final String pitchTitle;
  final String pitchThumbnail;
  final double pitchDuration;
  final String vision;
  final String problem;
  final String solution;
  final List<CompanyProduct> products;
  final List<CompanyTeamMember> team;
  final int followersCount;
  bool isFollowing;

  CompanyPageModel({
    required this.id,
    required this.name,
    required this.tagline,
    required this.logoUrl,
    required this.bannerUrl,
    required this.stage,
    required this.location,
    required this.foundedYear,
    required this.teamSize,
    required this.websiteUrl,
    required this.pitchTitle,
    required this.pitchThumbnail,
    required this.pitchDuration,
    required this.vision,
    required this.problem,
    required this.solution,
    required this.products,
    required this.team,
    required this.followersCount,
    this.isFollowing = false,
  });

  static CompanyPageModel simplicion() {
    return CompanyPageModel(
      id: 'comp_simplicion_180',
      name: 'Simplicion & 180 Workspace',
      tagline: 'The Enterprise Sovereign Work Graph & Unified Identity Architecture.',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&auto=format&fit=crop&q=80',
      stage: 'Series Seed',
      location: 'San Francisco, CA & London, UK',
      foundedYear: '2024',
      teamSize: '15-25 Founders & Core Engineers',
      websiteUrl: 'https://180workspace.com',
      pitchTitle: 'Simplicion Work Graph: The Universal Work Mesh',
      pitchThumbnail: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&auto=format&fit=crop&q=80',
      pitchDuration: 178.0,
      vision:
          'To replace fragmented enterprise SaaS silos with a unified, sovereign Work Graph that guarantees multi-tenant security, end-to-end identity federation, and instant real-time synchronization.',
      problem:
          'Modern enterprises juggle 30+ disparate tools (auth, notes, vaults, publishing, analytics) resulting in context switching, data leaks, and fractured developer identity.',
      solution:
          '180 Workspace provides a single identity provider (180 Identity), private data vaults, and interconnected productivity domains operating over a unified cryptographic graph.',
      products: const [
        CompanyProduct(
          id: 'prod_1',
          name: '180 Workspace Platform',
          description: 'Unified enterprise SaaS workspace with sovereign work graph synchronization.',
          metric: '100K+ DAU',
          productUrl: 'https://180workspace.com',
        ),
        CompanyProduct(
          id: 'prod_2',
          name: 'Pitch in 180 Network',
          description: '180-second vertical elevator pitch mobile network connecting founders with tier-1 VCs.',
          metric: 'Strict 180s Limit',
          productUrl: 'https://app.180workspace.com/pitch',
        ),
        CompanyProduct(
          id: 'prod_3',
          name: '180 Identity Provider',
          description: 'Decoupled OIDC & OAuth 2.0 PKCE authentication server with WhatsApp OTP and developer portal.',
          metric: 'Universal SSO',
          productUrl: 'https://auth.180workspace.com',
        ),
      ],
      team: const [
        CompanyTeamMember(
          id: 'tm_1',
          name: 'Alex Rivers',
          role: 'Founder & CEO',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
          linkedinUrl: 'https://linkedin.com',
        ),
        CompanyTeamMember(
          id: 'tm_2',
          name: 'Sarah Chen',
          role: 'Founding Advisor & AI Lead',
          avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
          linkedinUrl: 'https://linkedin.com',
        ),
        CompanyTeamMember(
          id: 'tm_3',
          name: 'David Kumar',
          role: 'Staff Infrastructure Engineer',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
          linkedinUrl: 'https://linkedin.com',
        ),
      ],
      followersCount: 1420,
      isFollowing: true,
    );
  }
}
