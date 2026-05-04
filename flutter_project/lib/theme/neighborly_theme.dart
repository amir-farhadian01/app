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
      textTheme: GoogleFonts.interTextTheme().apply(
        bodyColor: const Color(0xFF1B3C53),
        displayColor: const Color(0xFF1B3C53),
      ),
      fontFamily: GoogleFonts.inter().fontFamily,
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
    final scheme = ColorScheme.dark(
      surface: NeighborlyColors.darkSurface,
      onSurface: Color(0xFFF8FAFC),
      primary: NeighborlyColors.darkAccent,
      onPrimary: NeighborlyColors.darkBg,
      secondary: const Color(0xFFBEB0A2),
      onSecondary: NeighborlyColors.darkBg,
      outline: NeighborlyColors.darkBorder,
      surfaceContainerHighest: Color(0xFF2A5A7A),
    );
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: scheme,
      scaffoldBackgroundColor: NeighborlyColors.darkBg,
      textTheme: GoogleFonts.interTextTheme(ThemeData(brightness: Brightness.dark).textTheme).apply(
        bodyColor: const Color(0xFFF8FAFC),
        displayColor: const Color(0xFFF8FAFC),
      ),
      fontFamily: GoogleFonts.inter().fontFamily,
      dividerColor: NeighborlyColors.darkBorder,
      splashColor: scheme.primary.withValues(alpha: 0.18),
      highlightColor: scheme.primary.withValues(alpha: 0.10),
      cardTheme: CardThemeData(
        elevation: 0,
        color: NeighborlyColors.darkSurface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: const BorderSide(color: NeighborlyColors.darkBorder),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFF2A5A7A),
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
