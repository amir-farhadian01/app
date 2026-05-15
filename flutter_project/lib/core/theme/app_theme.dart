import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Neighborly Design System — Visual Prototype
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Color palette, typography, spacing, border radius.
/// Use these constants everywhere in the app for visual consistency.
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

abstract final class AppColors {
  // ── Core palette ──────────────────────────────────────────────
  static const Color primary       = Color(0xFF01696F); // deep teal
  static const Color primaryLight  = Color(0xFFE0F4F5); // light teal bg
  static const Color primaryDark   = Color(0xFF014D52);
  static const Color accent        = Color(0xFF01696F); // CTA same as primary
  static const Color background    = Color(0xFFF7F6F2); // warm off-white
  static const Color surface       = Color(0xFFFFFFFF);
  static const Color textPrimary   = Color(0xFF28251D);
  static const Color textSecondary = Color(0xFF7A7974);
  static const Color textMuted     = Color(0xFF7A7974);
  static const Color textFaint     = Color(0xFFB0B7C3);
  static const Color border        = Color(0xFFE5E7EB);
  static const Color divider       = Color(0xFFDCD9D5);
  static const Color error         = Color(0xFFA12C7B);
  static const Color success       = Color(0xFF437A22);
  static const Color warning       = Color(0xFFF59E0B);
  static const Color star          = Color(0xFFFFB800);

  // ── Dark mode overrides ───────────────────────────────────────
  static const Color darkBackground   = Color(0xFF121212);
  static const Color darkSurface      = Color(0xFF1E1E1E);
  static const Color darkSurface2     = Color(0xFF2C2C2C);
  static const Color darkTextPrimary  = Color(0xFFF0F0F0);
  static const Color darkTextMuted    = Color(0xFF9E9E9E);
  static const Color darkDivider      = Color(0xFF3A3A3A);
}

abstract final class AppTextStyles {
  static TextStyle displayLarge({required Color color}) =>
      GoogleFonts.plusJakartaSans(fontSize: 26, fontWeight: FontWeight.w700, color: color, height: 1.1);

  static TextStyle headingLarge({required Color color}) =>
      GoogleFonts.plusJakartaSans(fontSize: 22, fontWeight: FontWeight.w700, color: color, height: 1.2);

  static TextStyle headingSmall({required Color color}) =>
      GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w600, color: color, height: 1.2);

  static TextStyle titleMedium({required Color color}) =>
      GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w600, color: color, height: 1.3);

  static TextStyle body({required Color color}) =>
      GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w400, color: color, height: 1.4);

  static TextStyle bodySmall({required Color color}) =>
      GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w400, color: color, height: 1.3);

  static TextStyle caption({required Color color}) =>
      GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w400, color: color, height: 1.2);

  static TextStyle label({required Color color}) =>
      GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w500, color: color, letterSpacing: 0.5);
}

abstract final class AppSpacing {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 20;
  static const double xxl = 24;
  static const double xxxl = 32;
  static const double huge = 48;
}

abstract final class AppRadius {
  static const double card = 12;
  static const double button = 8;
  static const double chip = 20;
  static const double pill = 9999;
}

/// Builds the full [ThemeData] for Neighborly.
abstract final class AppTheme {
  static ThemeData light() {
    const colorScheme = ColorScheme.light(
      primary: AppColors.primary,
      onPrimary: Colors.white,
      secondary: AppColors.accent,
      onSecondary: Colors.white,
      surface: AppColors.surface,
      onSurface: AppColors.textPrimary,
      error: AppColors.error,
      onError: Colors.white,
      outline: AppColors.divider,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.background,
      fontFamily: GoogleFonts.plusJakartaSans().fontFamily,
      dividerColor: AppColors.divider,
      textTheme: TextTheme(
        displayLarge: AppTextStyles.displayLarge(color: AppColors.textPrimary),
        headlineLarge: AppTextStyles.headingLarge(color: AppColors.textPrimary),
        headlineSmall: AppTextStyles.headingSmall(color: AppColors.textPrimary),
        titleMedium: AppTextStyles.titleMedium(color: AppColors.textPrimary),
        bodyLarge: AppTextStyles.body(color: AppColors.textPrimary),
        bodyMedium: AppTextStyles.body(color: AppColors.textPrimary),
        bodySmall: AppTextStyles.bodySmall(color: AppColors.textSecondary),
        labelSmall: AppTextStyles.label(color: AppColors.textMuted),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: GoogleFonts.plusJakartaSans(
          fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.textPrimary,
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.card),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.xxl,
            vertical: AppSpacing.md,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.button),
          ),
          textStyle: GoogleFonts.plusJakartaSans(
            fontSize: 15, fontWeight: FontWeight.w600,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.primary,
          textStyle: GoogleFonts.plusJakartaSans(
            fontSize: 15, fontWeight: FontWeight.w600,
          ),
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: AppColors.surface,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
        selectedLabelStyle: GoogleFonts.plusJakartaSans(
          fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.primary,
        ),
        unselectedLabelStyle: GoogleFonts.plusJakartaSans(
          fontSize: 11, fontWeight: FontWeight.w500, color: AppColors.textMuted,
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.divider,
        thickness: 1,
        space: 0,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: AppColors.surface,
        selectedColor: AppColors.primary,
        labelStyle: GoogleFonts.plusJakartaSans(
          fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textPrimary,
        ),
        side: const BorderSide(color: AppColors.border),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.chip),
        ),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg,
          vertical: AppSpacing.sm,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surface,
        hintStyle: GoogleFonts.plusJakartaSans(
          fontSize: 15, fontWeight: FontWeight.w400, color: AppColors.textMuted,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.pill),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.pill),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.pill),
          borderSide: const BorderSide(color: AppColors.primary, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      ),
    );
  }

  static ThemeData dark() {
    const colorScheme = ColorScheme.dark(
      primary: AppColors.primary,
      onPrimary: Colors.white,
      secondary: AppColors.accent,
      onSecondary: Colors.white,
      surface: AppColors.darkSurface,
      onSurface: AppColors.darkTextPrimary,
      error: AppColors.error,
      onError: Colors.white,
      outline: AppColors.darkDivider,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.darkBackground,
      fontFamily: GoogleFonts.plusJakartaSans().fontFamily,
      dividerColor: AppColors.darkDivider,
      textTheme: TextTheme(
        displayLarge: AppTextStyles.displayLarge(color: AppColors.darkTextPrimary),
        headlineLarge: AppTextStyles.headingLarge(color: AppColors.darkTextPrimary),
        headlineSmall: AppTextStyles.headingSmall(color: AppColors.darkTextPrimary),
        titleMedium: AppTextStyles.titleMedium(color: AppColors.darkTextPrimary),
        bodyLarge: AppTextStyles.body(color: AppColors.darkTextPrimary),
        bodyMedium: AppTextStyles.body(color: AppColors.darkTextPrimary),
        bodySmall: AppTextStyles.bodySmall(color: AppColors.darkTextMuted),
        labelSmall: AppTextStyles.label(color: AppColors.darkTextMuted),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.darkBackground,
        foregroundColor: AppColors.darkTextPrimary,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: GoogleFonts.plusJakartaSans(
          fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.darkTextPrimary,
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: AppColors.darkSurface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.card),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.xxl,
            vertical: AppSpacing.md,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.button),
          ),
          textStyle: GoogleFonts.plusJakartaSans(
            fontSize: 15, fontWeight: FontWeight.w600,
          ),
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: AppColors.darkSurface,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.darkTextMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
        selectedLabelStyle: GoogleFonts.plusJakartaSans(
          fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.primary,
        ),
        unselectedLabelStyle: GoogleFonts.plusJakartaSans(
          fontSize: 11, fontWeight: FontWeight.w500, color: AppColors.darkTextMuted,
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: AppColors.darkSurface,
        selectedColor: AppColors.primary,
        labelStyle: GoogleFonts.plusJakartaSans(
          fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.darkTextPrimary,
        ),
        side: const BorderSide(color: AppColors.darkDivider),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.chip),
        ),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg,
          vertical: AppSpacing.sm,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.darkSurface,
        hintStyle: GoogleFonts.plusJakartaSans(
          fontSize: 15, fontWeight: FontWeight.w400, color: AppColors.darkTextMuted,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.pill),
          borderSide: const BorderSide(color: AppColors.darkDivider),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.pill),
          borderSide: const BorderSide(color: AppColors.darkDivider),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.pill),
          borderSide: const BorderSide(color: AppColors.primary, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      ),
    );
  }
}
