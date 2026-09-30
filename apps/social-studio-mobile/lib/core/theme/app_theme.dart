import 'package:flutter/material.dart';

class AppTheme {
  // Global flag to track the current active mode.
  // Updated by ThemeModeNotifier.
  static ThemeMode currentThemeMode = ThemeMode.system;

  static bool get _isLight {
    if (currentThemeMode == ThemeMode.light) return true;
    if (currentThemeMode == ThemeMode.dark) return false;
    // system
    return WidgetsBinding.instance.platformDispatcher.platformBrightness == Brightness.light;
  }

  // Tokens
  static Color get background => _isLight ? const Color(0xFFF8FAFC) : const Color(0xFF09090B);
  static Color get surface => _isLight ? const Color(0xFFFFFFFF) : const Color(0xFF121214);
  static Color get surfaceElevated => _isLight ? const Color(0xFFF4F4F5) : const Color(0xFF18181B);
  static Color get border => _isLight ? const Color(0xFFE4E4E7) : const Color(0xFF27272A);
  static Color get borderSubtle => _isLight ? const Color(0xFFF4F4F5) : const Color(0xFF1F1F23);

  static Color get textPrimary => _isLight ? const Color(0xFF09090B) : const Color(0xFFFAFAFA);
  static Color get textSecondary => _isLight ? const Color(0xFF52525B) : const Color(0xFFA1A1AA);
  static Color get textMuted => _isLight ? const Color(0xFFA1A1AA) : const Color(0xFF71717A);

  static Color get primary => const Color(0xFF0066FF);
  static Color get accent => _isLight ? const Color(0xFF0066FF) : const Color(0xFF3B82F6);
  static Color get accentBlue => const Color(0xFF0066FF);
  
  static Color get success => const Color(0xFF10B981);
  static Color get warning => const Color(0xFFF59E0B);
  static Color get error => const Color(0xFFEF4444);

  static BoxDecoration glassCardDecoration({Color? color}) => BoxDecoration(
    color: color ?? surface,
    borderRadius: BorderRadius.circular(16),
    border: Border.all(color: border),
  );

  static ThemeData get lightTheme => ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    scaffoldBackgroundColor: const Color(0xFFF8FAFC),
    cardColor: const Color(0xFFFFFFFF),
    colorScheme: const ColorScheme.light(
      primary: Color(0xFF0066FF),
      surface: Color(0xFFFFFFFF),
      error: Color(0xFFEF4444),
      onPrimary: Colors.white,
      onSurface: Color(0xFF09090B),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Color(0xFFFFFFFF),
      surfaceTintColor: Colors.transparent,
      foregroundColor: Color(0xFF09090B),
      elevation: 0,
      centerTitle: true,
    ),
    dividerTheme: const DividerThemeData(
      color: Color(0xFFE4E4E7),
      thickness: 1,
      space: 1,
    ),
  );

  static ThemeData get darkTheme => ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: const Color(0xFF09090B),
    cardColor: const Color(0xFF121214),
    colorScheme: const ColorScheme.dark(
      primary: Color(0xFF0066FF),
      surface: Color(0xFF121214),
      error: Color(0xFFEF4444),
      onPrimary: Colors.white,
      onSurface: Color(0xFFFAFAFA),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Color(0xFF09090B),
      surfaceTintColor: Colors.transparent,
      foregroundColor: Color(0xFFFAFAFA),
      elevation: 0,
      centerTitle: true,
    ),
    dividerTheme: const DividerThemeData(
      color: Color(0xFF27272A),
      thickness: 1,
      space: 1,
    ),
  );
}