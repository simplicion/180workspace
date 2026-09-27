import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/pitch_theme.dart';
import '../../../core/auth/auth_provider.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);

    return Scaffold(
      backgroundColor: PitchTheme.background,
      appBar: AppBar(
        title: const Text('180 Profile', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
        actions: [
          if (auth is Authenticated)
            IconButton(
              icon: const Icon(Icons.logout_rounded, size: 20),
              onPressed: () => ref.read(authStateProvider.notifier).logout(),
            ),
        ],
      ),
      body: auth is Authenticated
          ? _buildUserProfile(context, auth.user, ref)
          : _buildUnauthenticatedPrompt(context, ref),
    );
  }

  Widget _buildUnauthenticatedPrompt(BuildContext context, WidgetRef ref) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: PitchTheme.primary.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.shield_rounded, size: 54, color: PitchTheme.primary),
            ),
            const SizedBox(height: 24),
            const Text(
              'Your Unified 180 Profile',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 10),
            Text(
              'Sign in once with 180 Identity to post 180s elevator pitches, apply to startup gigs, and connect with global investors.',
              textAlign: TextAlign.center,
              style: TextStyle(color: PitchTheme.textSecondary, fontSize: 14, height: 1.4),
            ),
            const SizedBox(height: 32),
            Container(
              width: double.infinity,
              height: 52,
              decoration: BoxDecoration(
                gradient: PitchTheme.primaryGradient,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: PitchTheme.primary.withValues(alpha: 0.35),
                    blurRadius: 16,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                onPressed: () => ref.read(authStateProvider.notifier).launchSso(),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text('180', style: TextStyle(color: PitchTheme.primary, fontWeight: FontWeight.w900, fontSize: 12)),
                    ),
                    const SizedBox(width: 10),
                    const Text('Get started with 180 Identity', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Colors.white)),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUserProfile(BuildContext context, Map<String, dynamic> user, WidgetRef ref) {
    final name = user['name'] ?? 'Founder';
    final username = user['username'] ?? 'founder';
    final photoUrl = user['picture'] ?? user['photoUrl'];
    final headline = user['headline'] ?? 'Building in public with 180 Workspace';
    final location = user['location']?['city'] != null
        ? '${user['location']['city']}, ${user['location']['country']}'
        : 'Global';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          CircleAvatar(
            radius: 46,
            backgroundColor: PitchTheme.primary.withValues(alpha: 0.2),
            backgroundImage: photoUrl != null ? NetworkImage(photoUrl) : null,
            child: photoUrl == null
                ? Text(name.isNotEmpty ? name[0] : 'U', style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: Colors.white))
                : null,
          ),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
              const SizedBox(width: 6),
              const Icon(Icons.verified_rounded, size: 18, color: PitchTheme.verifiedBlue),
            ],
          ),
          const SizedBox(height: 4),
          Text('@$username', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: PitchTheme.primary)),
          const SizedBox(height: 8),
          Text(headline, textAlign: TextAlign.center, style: TextStyle(color: PitchTheme.textSecondary, fontSize: 13)),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.location_on_rounded, size: 14, color: PitchTheme.textSecondary),
              const SizedBox(width: 4),
              Text(location, style: TextStyle(color: PitchTheme.textSecondary, fontSize: 12)),
            ],
          ),
          const SizedBox(height: 24),

          // Pinned 180s Elevator Pitch Showcase
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: PitchTheme.surface,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0x336366F1)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.push_pin_rounded, color: PitchTheme.primary, size: 18),
                    SizedBox(width: 8),
                    Text('Pinned 180s Elevator Pitch', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                  ],
                ),
                const SizedBox(height: 12),
                Container(
                  height: 140,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: PitchTheme.surfaceElevated,
                    borderRadius: BorderRadius.circular(14),
                    gradient: const LinearGradient(
                      colors: [Color(0x226366F1), Color(0x22A855F7)],
                    ),
                  ),
                  child: const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.play_circle_outline_rounded, size: 40, color: PitchTheme.primary),
                        SizedBox(height: 6),
                        Text('Watch 180s Pitch Video', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Stats Row
          Row(
            children: [
              _buildStatCard('Pitches', '1'),
              const SizedBox(width: 12),
              _buildStatCard('Upvotes', '24'),
              const SizedBox(width: 12),
              _buildStatCard('Gigs Applied', '3'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String label, String value) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: PitchTheme.surface,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          children: [
            Text(value, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: Colors.white)),
            const SizedBox(height: 4),
            Text(label, style: const TextStyle(fontSize: 11, color: PitchTheme.textSecondary, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}
