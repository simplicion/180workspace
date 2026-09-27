import 'package:flutter/material.dart';
import '../../core/theme/pitch_theme.dart';
import '../feed/presentation/pitch_feed_screen.dart';
import '../gigs/presentation/gigs_screen.dart';
import '../creator/presentation/pitch_creator_studio.dart';
import '../resources/presentation/resources_screen.dart';
import '../profile/presentation/profile_screen.dart';

class MainNavShell extends StatefulWidget {
  const MainNavShell({super.key});

  @override
  State<MainNavShell> createState() => _MainNavShellState();
}

class _MainNavShellState extends State<MainNavShell> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    PitchFeedScreen(),
    GigsScreen(),
    SizedBox.shrink(), // placeholder for center action
    ResourcesScreen(),
    ProfileScreen(),
  ];

  void _onTabSelected(int index) {
    if (index == 2) {
      // Open Creator Studio modal / page
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const PitchCreatorStudio()),
      );
      return;
    }
    setState(() => _currentIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PitchTheme.background,
      body: IndexedStack(
        index: _currentIndex == 2 ? 0 : _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: PitchTheme.surface,
          border: Border(top: BorderSide(color: Color(0x1A6366F1), width: 1)),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: _onTabSelected,
          backgroundColor: Colors.transparent,
          elevation: 0,
          type: BottomNavigationBarType.fixed,
          selectedItemColor: PitchTheme.primary,
          unselectedItemColor: PitchTheme.textSecondary,
          selectedFontSize: 11,
          unselectedFontSize: 11,
          items: [
            const BottomNavigationBarItem(
              icon: Icon(Icons.play_circle_outline_rounded),
              activeIcon: Icon(Icons.play_circle_fill_rounded),
              label: 'Reels',
            ),
            const BottomNavigationBarItem(
              icon: Icon(Icons.work_outline_rounded),
              activeIcon: Icon(Icons.work_rounded),
              label: 'Gigs',
            ),
            BottomNavigationBarItem(
              icon: Container(
                width: 44,
                height: 32,
                decoration: BoxDecoration(
                  gradient: PitchTheme.primaryGradient,
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: [
                    BoxShadow(
                      color: PitchTheme.primary.withValues(alpha: 0.4),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: const Icon(Icons.add_rounded, color: Colors.white, size: 24),
              ),
              label: '',
            ),
            const BottomNavigationBarItem(
              icon: Icon(Icons.handyman_outlined),
              activeIcon: Icon(Icons.handyman_rounded),
              label: 'Vault',
            ),
            const BottomNavigationBarItem(
              icon: Icon(Icons.person_outline_rounded),
              activeIcon: Icon(Icons.person_rounded),
              label: '180 Profile',
            ),
          ],
        ),
      ),
    );
  }
}
