import 'package:flutter/material.dart';
import '../../../core/theme/pitch_theme.dart';

class SearchHeader extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final VoidCallback onClear;
  final String hintText;

  const SearchHeader({
    super.key,
    required this.controller,
    required this.onChanged,
    required this.onClear,
    this.hintText = 'Search pitches, founders, #tags, or gigs...',
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: PitchTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: PitchTheme.primary.withValues(alpha: 0.25),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: TextField(
        controller: controller,
        onChanged: onChanged,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 14,
          fontWeight: FontWeight.w500,
        ),
        decoration: InputDecoration(
          hintText: hintText,
          hintStyle: TextStyle(
            color: PitchTheme.textSecondary.withValues(alpha: 0.8),
            fontSize: 13,
          ),
          prefixIcon: const Icon(
            Icons.search_rounded,
            color: PitchTheme.primary,
            size: 22,
          ),
          suffixIcon: controller.text.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.close_rounded,
                      color: PitchTheme.textSecondary, size: 18),
                  onPressed: onClear,
                )
              : null,
          border: InputBorder.none,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
      ),
    );
  }
}
