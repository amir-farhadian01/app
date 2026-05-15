import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// NeighborHub Design System — v3 (Dark Theme)
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Design language:
///   - Dark theme (primary background: #0D0D0D or near-black)
///   - Accent color: Indigo/Electric Blue (#5B5FEF)
///   - Secondary accent: Teal/Cyan (#00C9B1)
///   - Cards: Dark elevated surfaces (#1A1A2E or #16213E)
///   - Text: White primary, grey-400 secondary
///   - Border radius: 16px on cards, 12px on buttons, 24px on chips
///   - Typography: Bold display headings, regular body — Google Fonts "Inter"
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

abstract final class NeighborlyColors {
  // ── Core palette ──────────────────────────────────────────────
  static const Color bgPrimary    = Color(0xFF0D0D0D);
  static const Color bgCard       = Color(0xFF1A1A2E);
  static const Color bgCardLight  = Color(0xFF16213E);
  static const Color accent       = Color(0xFF5B5FEF); // electric indigo
  static const Color accentTeal   = Color(0xFF00C9B1); // teal highlight
  static const Color textPrimary  = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFF9CA3AF); // grey-400
  static const Color textFaint    = Color(0xFF4B5563);  // grey-600
  static const Color success      = Color(0xFF22C55E);
  static const Color warning      = Color(0xFFF59E0B);
  static const Color error        = Color(0xFFEF4444);
}

abstract final class NeighborlyTextStyles {
  static TextStyle displayLarge(BuildContext context) =>
      GoogleFonts.inter(fontSize: 28, fontWeight: FontWeight.bold, color: NeighborlyColors.textPrimary);

  static TextStyle titleLarge(BuildContext context) =>
      GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w600, color: NeighborlyColors.textPrimary);

  static TextStyle titleMedium(BuildContext context) =>
      GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: NeighborlyColors.textPrimary);

  static TextStyle bodyLarge(BuildContext context) =>
      GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w400, color: NeighborlyColors.textPrimary);

  static TextStyle bodySmall(BuildContext context) =>
      GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w400, color: NeighborlyColors.textSecondary);

  static TextStyle labelSmall(BuildContext context) =>
      GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w500, color: NeighborlyColors.textSecondary, letterSpacing: 1.2);
}

abstract final class NeighborlySpacing {
  static const double s4  = 4;
  static const double s8  = 8;
  static const double s12 = 12;
  static const double s16 = 16;
  static const double s20 = 20;
  static const double s24 = 24;
  static const double s32 = 32;
  static const double s48 = 48;
}

abstract final class NeighborlyRadius {
  static const double xs = 8;
  static const double sm = 12;
  static const double md = 16;
  static const double lg = 24;
  static const double xl = 32;
}

/// Builds the full [ThemeData] for the NeighborHub dark theme.
abstract final class AppTheme {
  static ThemeData dark() {
    const colorScheme = ColorScheme.dark(
      primary: NeighborlyColors.accent,
      onPrimary: Colors.white,
      secondary: NeighborlyColors.accentTeal,
      onSecondary: Colors.white,
      surface: NeighborlyColors.bgCard,
      onSurface: NeighborlyColors.textPrimary,
      error: NeighborlyColors.error,
      onError: Colors.white,
      outline: NeighborlyColors.textFaint,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: NeighborlyColors.bgPrimary,
      fontFamily: GoogleFonts.inter().fontFamily,
      textTheme: TextTheme(
        displayLarge: GoogleFonts.inter(fontSize: 28, fontWeight: FontWeight.bold, color: NeighborlyColors.textPrimary),
        titleLarge: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w600, color: NeighborlyColors.textPrimary),
        titleMedium: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: NeighborlyColors.textPrimary),
        bodyLarge: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w400, color: NeighborlyColors.textPrimary),
        bodySmall: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w400, color: NeighborlyColors.textSecondary),
        labelSmall: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w500, color: NeighborlyColors.textSecondary, letterSpacing: 1.2),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: NeighborlyColors.bgPrimary,
        foregroundColor: NeighborlyColors.textPrimary,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w600, color: NeighborlyColors.textPrimary),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: NeighborlyColors.bgCard,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(NeighborlyRadius.md),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: NeighborlyColors.accent,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(
            horizontal: NeighborlySpacing.s24,
            vertical: NeighborlySpacing.s16,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(NeighborlyRadius.sm),
          ),
          textStyle: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: NeighborlyColors.accent,
          textStyle: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600),
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: NeighborlyColors.bgCard,
        selectedItemColor: NeighborlyColors.accent,
        unselectedItemColor: NeighborlyColors.textSecondary,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
        selectedLabelStyle: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w500, color: NeighborlyColors.accent),
        unselectedLabelStyle: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w500, color: NeighborlyColors.textSecondary),
      ),
      dividerTheme: const DividerThemeData(
        color: NeighborlyColors.textFaint,
        thickness: 1,
        space: 0,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: NeighborlyColors.bgCardLight,
        selectedColor: NeighborlyColors.accent,
        labelStyle: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500, color: NeighborlyColors.textPrimary),
        side: const BorderSide(color: NeighborlyColors.textFaint),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(NeighborlyRadius.lg),
        ),
        padding: const EdgeInsets.symmetric(
          horizontal: NeighborlySpacing.s16,
          vertical: NeighborlySpacing.s8,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: NeighborlyColors.bgCard,
        hintStyle: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w400, color: NeighborlyColors.textFaint),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(NeighborlyRadius.sm),
          borderSide: const BorderSide(color: NeighborlyColors.textFaint),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(NeighborlyRadius.sm),
          borderSide: const BorderSide(color: NeighborlyColors.textFaint),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(NeighborlyRadius.sm),
          borderSide: const BorderSide(color: NeighborlyColors.accent, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      ),
    );
  }
}
