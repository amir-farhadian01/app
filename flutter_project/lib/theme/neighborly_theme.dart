import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Semantic colors — values mirror repo root [template.txt].
abstract final class NeighborlyColors {
  static const lightBg = Color(0xFFF8FAFC);
  static const lightSurface = Color(0xFFD9EAFD);
  static const lightBorder = Color(0xFFBCCCDC);
  static const lightMuted = Color(0xFF9AA6B2);

  static const darkBg = Color(0xFF1B3C53);
  static const darkSurface = Color(0xFF234C6A);
  static const darkBorder = Color(0xFF456882);
  static const darkAccent = Color(0xFFD2C1B6);
}

abstract final class NeighborlyTheme {
  static ThemeData light() {
    const scheme = ColorScheme.light(
      surface: NeighborlyColors.lightSurface,
      onSurface: Color(0xFF1B3C53),
      primary: Color(0xFF1B3C53),
      onPrimary: Color(0xFFF8FAFC),
      secondary: NeighborlyColors.lightMuted,
      onSecondary: Color(0xFFF8FAFC),
      outline: NeighborlyColors.lightBorder,
      surfaceContainerHighest: Color(0xFFE8EEF5),
    );
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: scheme,
      scaffoldBackgroundColor: NeighborlyColors.lightBg,
      textTheme: GoogleFonts.dmSansTextTheme().apply(
        bodyColor: const Color(0xFF1B3C53),
        displayColor: const Color(0xFF1B3C53),
      ),
      fontFamily: GoogleFonts.dmSans().fontFamily,
      dividerColor: NeighborlyColors.lightBorder,
      splashColor: scheme.primary.withValues(alpha: 0.12),
      highlightColor: scheme.primary.withValues(alpha: 0.06),
      cardTheme: CardThemeData(
        elevation: 0,
        color: NeighborlyColors.lightSurface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: const BorderSide(color: NeighborlyColors.lightBorder),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFFE8EEF5),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: scheme.primary,
          foregroundColor: scheme.onPrimary,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: scheme.onSurface,
          side: BorderSide(color: scheme.outline),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      ),
    );
  }

  static ThemeData dark() {
    const scheme = ColorScheme.dark(
      surface: Color(0xFF1E2235),
      onSurface: Color(0xFFF0F2FF),
      primary: Color(0xFF2B6EFF),
      onPrimary: Colors.white,
      secondary: Color(0xFF0FC98A),
      onSecondary: Color(0xFF0D0F1A),
      outline: Color(0xFF2A2F4A),
      surfaceContainerHighest: Color(0xFF242840),
    );
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: scheme,
      scaffoldBackgroundColor: const Color(0xFF0D0F1A),
      textTheme: GoogleFonts.dmSansTextTheme(ThemeData(brightness: Brightness.dark).textTheme).apply(
        bodyColor: const Color(0xFFF0F2FF),
        displayColor: const Color(0xFFF0F2FF),
      ),
      fontFamily: GoogleFonts.dmSans().fontFamily,
      dividerColor: const Color(0xFF2A2F4A),
      splashColor: scheme.primary.withValues(alpha: 0.18),
      highlightColor: scheme.primary.withValues(alpha: 0.10),
      cardTheme: CardThemeData(
        elevation: 0,
        color: const Color(0xFF1E2235),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: const BorderSide(color: Color(0xFF2A2F4A)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFF1A1D2E),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: scheme.primary,
          foregroundColor: scheme.onPrimary,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: scheme.onSurface,
          side: BorderSide(color: scheme.outline),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      ),
    );
  }
}
