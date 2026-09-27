import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/pitch_theme.dart';
import '../../../core/auth/local_user_profile.dart';

class EditProfileSheet extends ConsumerStatefulWidget {
  const EditProfileSheet({super.key});

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const EditProfileSheet(),
    );
  }

  @override
  ConsumerState<EditProfileSheet> createState() => _EditProfileSheetState();
}

class _EditProfileSheetState extends ConsumerState<EditProfileSheet> {
  late final TextEditingController _nameController;
  late final TextEditingController _usernameController;
  late final TextEditingController _headlineController;
  late final TextEditingController _bioController;
  late final TextEditingController _locationController;
  late final TextEditingController _websiteController;
  late final TextEditingController _githubController;
  late final TextEditingController _twitterController;
  late final TextEditingController _linkedinController;
  late final TextEditingController _skillsController;

  @override
  void initState() {
    super.initState();
    final profile = ref.read(localUserProfileProvider);
    _nameController = TextEditingController(text: profile.name);
    _usernameController = TextEditingController(text: profile.username);
    _headlineController = TextEditingController(text: profile.headline);
    _bioController = TextEditingController(text: profile.bio);
    _locationController = TextEditingController(text: profile.location);
    _websiteController = TextEditingController(text: profile.websiteUrl);
    _githubController = TextEditingController(text: profile.githubUrl);
    _twitterController = TextEditingController(text: profile.twitterUrl);
    _linkedinController = TextEditingController(text: profile.linkedinUrl);
    _skillsController = TextEditingController(text: profile.skills.join(', '));
  }

  @override
  void dispose() {
    _nameController.dispose();
    _usernameController.dispose();
    _headlineController.dispose();
    _bioController.dispose();
    _locationController.dispose();
    _websiteController.dispose();
    _githubController.dispose();
    _twitterController.dispose();
    _linkedinController.dispose();
    _skillsController.dispose();
    super.dispose();
  }

  void _saveProfile() {
    final rawSkills = _skillsController.text
        .split(',')
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty)
        .toList();

    ref.read(localUserProfileProvider.notifier).updateProfile(
          name: _nameController.text.trim(),
          username: _usernameController.text.trim(),
          headline: _headlineController.text.trim(),
          bio: _bioController.text.trim(),
          location: _locationController.text.trim(),
          websiteUrl: _websiteController.text.trim(),
          githubUrl: _githubController.text.trim(),
          twitterUrl: _twitterController.text.trim(),
          linkedinUrl: _linkedinController.text.trim(),
          skills: rawSkills.isNotEmpty ? rawSkills : null,
        );

    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Founder profile updated successfully!'),
        backgroundColor: PitchTheme.surfaceElevated,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.88,
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      decoration: const BoxDecoration(
        color: PitchTheme.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Edit Founder Profile',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded,
                    color: PitchTheme.textSecondary, size: 20),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const Divider(height: 1, color: Color(0x1AFFFFFF)),
          const SizedBox(height: 12),
          Expanded(
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: _buildField(
                          controller: _nameController,
                          label: 'Full Name',
                          hint: 'Alex Rivers',
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildField(
                          controller: _usernameController,
                          label: 'Username',
                          hint: 'alexrivers',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  _buildField(
                    controller: _headlineController,
                    label: 'Professional Headline',
                    hint: 'Founder & CEO @ Simplicion | Building 180 Workspace',
                  ),
                  const SizedBox(height: 12),

                  _buildField(
                    controller: _bioController,
                    label: 'Founder Bio',
                    hint: 'Your background, vision, and entrepreneurial milestones...',
                    maxLines: 3,
                  ),
                  const SizedBox(height: 12),

                  _buildField(
                    controller: _locationController,
                    label: 'Location / Headquarters',
                    hint: 'San Francisco, CA & London, UK',
                  ),
                  const SizedBox(height: 12),

                  _buildField(
                    controller: _skillsController,
                    label: 'Core Skills & Superpowers (comma separated)',
                    hint: 'Flutter, Go, Distributed Systems, Pitching',
                  ),
                  const SizedBox(height: 14),

                  const Text(
                    'Social & Web Links',
                    style: TextStyle(
                      color: PitchTheme.accentAmber,
                      fontSize: 12.5,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 8),

                  _buildField(
                    controller: _websiteController,
                    label: 'Personal or Startup Website',
                    hint: 'https://180workspace.com',
                    keyboardType: TextInputType.url,
                  ),
                  const SizedBox(height: 8),

                  _buildField(
                    controller: _githubController,
                    label: 'GitHub Profile',
                    hint: 'https://github.com/simplicion',
                    keyboardType: TextInputType.url,
                  ),
                  const SizedBox(height: 8),

                  _buildField(
                    controller: _twitterController,
                    label: 'X / Twitter Profile',
                    hint: 'https://twitter.com/180workspace',
                    keyboardType: TextInputType.url,
                  ),
                  const SizedBox(height: 8),

                  _buildField(
                    controller: _linkedinController,
                    label: 'LinkedIn Profile',
                    hint: 'https://linkedin.com/company/simplicion',
                    keyboardType: TextInputType.url,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: PitchTheme.primary,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              onPressed: _saveProfile,
              child: const Text(
                'Save Profile Changes',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: 15,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildField({
    required TextEditingController controller,
    required String label,
    required String hint,
    int maxLines = 1,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w700)),
        const SizedBox(height: 5),
        TextField(
          controller: controller,
          maxLines: maxLines,
          keyboardType: keyboardType,
          style: const TextStyle(color: Colors.white, fontSize: 13),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(
                color: Colors.white.withValues(alpha: 0.35), fontSize: 12),
            filled: true,
            fillColor: PitchTheme.surfaceElevated,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
          ),
        ),
      ],
    );
  }
}
