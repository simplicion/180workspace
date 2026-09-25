import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Strictly aligned with 180workspace Design System and Media Studio Pro NLE guidelines:
/// - .agents/rules/design-system.md
/// - .agents/rules/media-studio-design-system.md
/// - .agents/rules/ux-best-practices.md
class AppTheme {
  // 180 Obsidian True Black & Mixed Grey Shades Dark Theme Tokens
  static const Color background = Color(0xFF000000); // Pure deep black (OLED foundation)
  static const Color backgroundSubtle = Color(0xFF070709); // Blackish base foundation
  static const Color surface = Color(0xFF101012); // Deep blackish-grey surface (cards/panels)
  static const Color surfaceSubtle = Color(0xFF161619); // Muted blackish-grey (toolbars/inputs)
  static const Color surfaceElevated = Color(0xFF1F1F24); // Elevated grey (modals/drawers/hover)
  static const Color border = Color(0xFF27272A); // Neutral dark grey border (zinc-800 equivalent)
  static const Color borderActive = Color(0xFF3F3F46); // Active lighter grey border (zinc-700)
  static const Color borderSubtle = Color(0xFF1A1A1E); // Subtle divider border


  // Semantic Accents
  static const Color primary = Color(0xFF4F46E5); // accent-primary (Indigo)
  static const Color primaryHover = Color(0xFF4338CA);
  static const Color accent = Color(0xFF8B5CF6); // Violet
  static const Color accentBlue = Color(0xFF3B82F6); // selection/video
  static const Color success = Color(0xFF10B981); // accent-teal (audio/approved)
  static const Color warning = Color(0xFFF59E0B); // accent-amber (caution/draft)
  static const Color accentCyan = Color(0xFF06B6D4); // accent-cyan (captions)
  static const Color error = Color(0xFFEF4444); // Red

  // High-Contrast Neutral Zinc Typography
  static const Color textPrimary = Color(0xFFF4F4F5); // zinc-100 crisp white
  static const Color textSecondary = Color(0xFFA1A1AA); // zinc-400 balanced neutral grey
  static const Color textMuted = Color(0xFF71717A); // zinc-500 muted dark grey

  // Light Theme Tokens
  static const Color lightBackground = Color(0xFFF8FAFC);
  static const Color lightBackgroundSubtle = Color(0xFFF1F5F9);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightSurfaceSubtle = Color(0xFFF1F5F9);
  static const Color lightSurfaceElevated = Color(0xFFFFFFFF);
  static const Color lightBorder = Color(0xFFE2E8F0);
  static const Color lightBorderActive = Color(0xFFCBD5E1);
  static const Color lightBorderSubtle = Color(0xFFF1F5F9);

  static const Color lightTextPrimary = Color(0xFF0F172A);
  static const Color lightTextSecondary = Color(0xFF475569);
  static const Color lightTextMuted = Color(0xFF94A3B8);

  /// Frosted glassmorphism decoration: backdrop-blur-md bg-black/80 border border-zinc-800
  static BoxDecoration glassCardDecoration({
    BorderRadius? borderRadius,
    Color? borderColor,
  }) {
    return BoxDecoration(
      color: const Color(0xFF101012).withValues(alpha: 0.85),
      borderRadius: borderRadius ?? BorderRadius.circular(20),
      border: Border.all(
        color: borderColor ?? const Color(0xFF27272A),
        width: 1,
      ),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.50),
          blurRadius: 24,
          offset: const Offset(0, 8),
        ),
      ],
    );
  }

  static ThemeData get darkTheme {
    final baseTextTheme = GoogleFonts.interTextTheme(ThemeData.dark().textTheme);

    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: background,
      primaryColor: primary,
      cardColor: surface,
      dividerColor: border,
      colorScheme: const ColorScheme.dark(
        primary: primary,
        secondary: accent,
        surface: surface,
        error: error,
      ),
      textTheme: baseTextTheme.copyWith(
        headlineMedium: baseTextTheme.headlineMedium?.copyWith(
          color: textPrimary,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.6,
        ),
        titleLarge: baseTextTheme.titleLarge?.copyWith(
          color: textPrimary,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.4,
        ),
        bodyLarge: baseTextTheme.bodyLarge?.copyWith(
          color: textPrimary,
          fontSize: 15,
        ),
        bodyMedium: baseTextTheme.bodyMedium?.copyWith(
          color: textSecondary,
          fontSize: 13,
          height: 1.5,
        ),
        labelSmall: GoogleFonts.jetBrainsMono(
          color: textMuted,
          fontSize: 11,
          letterSpacing: 0.2,
        ),
      ),
      // UX Best Practice: Minimum 44x44px touch targets on mobile
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          minimumSize: const Size(44, 44),
          backgroundColor: primary,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          elevation: 0,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(44, 44),
          side: const BorderSide(color: border),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(
          minimumSize: const Size(44, 44),
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: background.withValues(alpha: 0.90),
        elevation: 0,
        centerTitle: false,
        titleTextStyle: GoogleFonts.inter(
          color: textPrimary,
          fontSize: 18,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.4,
        ),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: surfaceElevated,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: border),
        ),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: surfaceElevated,
        modalBackgroundColor: surfaceElevated,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          side: BorderSide(color: border),
        ),
      ),
    );
  }

  static ThemeData get lightTheme {
    final baseTextTheme = GoogleFonts.interTextTheme(ThemeData.light().textTheme);

    return ThemeData(
      brightness: Brightness.light,
      scaffoldBackgroundColor: lightBackground,
      primaryColor: primary,
      cardColor: lightSurface,
      dividerColor: lightBorder,
      colorScheme: const ColorScheme.light(
        primary: primary,
        secondary: accent,
        surface: lightSurface,
        error: error,
      ),
      textTheme: baseTextTheme.copyWith(
        headlineMedium: baseTextTheme.headlineMedium?.copyWith(
          color: lightTextPrimary,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.6,
        ),
        titleLarge: baseTextTheme.titleLarge?.copyWith(
          color: lightTextPrimary,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.4,
        ),
        bodyLarge: baseTextTheme.bodyLarge?.copyWith(
          color: lightTextPrimary,
          fontSize: 15,
        ),
        bodyMedium: baseTextTheme.bodyMedium?.copyWith(
          color: lightTextSecondary,
          fontSize: 13,
          height: 1.5,
        ),
        labelSmall: GoogleFonts.jetBrainsMono(
          color: lightTextMuted,
          fontSize: 11,
          letterSpacing: 0.2,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          minimumSize: const Size(44, 44),
          backgroundColor: primary,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          elevation: 0,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(44, 44),
          side: const BorderSide(color: lightBorder),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(
          minimumSize: const Size(44, 44),
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: lightBackground.withValues(alpha: 0.95),
        elevation: 0,
        centerTitle: false,
        titleTextStyle: GoogleFonts.inter(
          color: lightTextPrimary,
          fontSize: 18,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.4,
        ),
        iconTheme: const IconThemeData(color: lightTextPrimary),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: lightSurfaceElevated,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: lightBorder),
        ),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: lightSurfaceElevated,
        modalBackgroundColor: lightSurfaceElevated,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          side: BorderSide(color: lightBorder),
        ),
      ),
    );
  }
}
