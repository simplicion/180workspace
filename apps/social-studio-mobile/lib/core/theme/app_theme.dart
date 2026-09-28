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
  static Color get background => _isLight ? const Color(0xFFF8FAFC) : const Color(0xFF0F172A);
  static Color get surface => _isLight ? const Color(0xFFFFFFFF) : const Color(0xFF1E293B);
  static Color get surfaceElevated => _isLight ? const Color(0xFFF1F5F9) : const Color(0xFF334155);
  static Color get border => _isLight ? const Color(0xFFE2E8F0) : const Color(0xFF334155);
  static Color get borderSubtle => _isLight ? const Color(0xFFF1F5F9) : const Color(0xFF1E293B);

  static Color get textPrimary => _isLight ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC);
  static Color get textSecondary => _isLight ? const Color(0xFF475569) : const Color(0xFF94A3B8);
  static Color get textMuted => _isLight ? const Color(0xFF94A3B8) : const Color(0xFF475569);

  static Color get primary => const Color(0xFF3B82F6);
  static Color get accent => const Color(0xFF8B5CF6);
  static Color get accentBlue => const Color(0xFF0EA5E9);
  
  static Color get success => const Color(0xFF10B981);
  static Color get warning => const Color(0xFFF59E0B);
  static Color get error => const Color(0xFFEF4444);

  static BoxDecoration glassCardDecoration({Color? color}) => BoxDecoration(
    color: color ?? surface,
    borderRadius: BorderRadius.circular(16),
    border: Border.all(color: borderSubtle),
  );

  static ThemeData get lightTheme => ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    scaffoldBackgroundColor: const Color(0xFFF8FAFC),
    colorScheme: const ColorScheme.light(
      primary: Color(0xFF3B82F6),
      surface: Color(0xFFFFFFFF),
      error: Color(0xFFEF4444),
      onPrimary: Colors.white,
      onSurface: Color(0xFF0F172A),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Color(0xFFFFFFFF),
      surfaceTintColor: Colors.transparent,
      foregroundColor: Color(0xFF0F172A),
      elevation: 0,
      centerTitle: true,
    ),
    dividerTheme: const DividerThemeData(
      color: Color(0xFFE2E8F0),
      thickness: 1,
      space: 1,
    ),
  );

  static ThemeData get darkTheme => ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: const Color(0xFF0F172A),
    colorScheme: const ColorScheme.dark(
      primary: Color(0xFF3B82F6),
      surface: Color(0xFF1E293B),
      error: Color(0xFFEF4444),
      onPrimary: Colors.white,
      onSurface: Color(0xFFF8FAFC),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Color(0xFF1E293B),
      surfaceTintColor: Colors.transparent,
      foregroundColor: Color(0xFFF8FAFC),
      elevation: 0,
      centerTitle: true,
    ),
    dividerTheme: const DividerThemeData(
      color: Color(0xFF334155),
      thickness: 1,
      space: 1,
    ),
  );
}