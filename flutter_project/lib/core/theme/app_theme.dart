import 'package:flutter/material.dart';

/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Neighborly Design System — v2
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Color palette, typography, spacing, border radius, and shadows.
/// Use these constants everywhere in the app for visual consistency.
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

abstract final class AppColors {
  // ── Core palette ──────────────────────────────────────────────
  static const primary        = Color(0xFF1A1A2E); // deep navy
  static const secondary      = Color(0xFF16213E); // dark blue
  static const accent         = Color(0xFF0F3460); // medium blue
  static const cta            = Color(0xFFE94560); // coral red — buttons only
  static const background     = Color(0xFFF5F5F5); // light grey
  static const surface        = Color(0xFFFFFFFF); // white cards
  static const textPrimary    = Color(0xFF1A1A1A);
  static const textMuted      = Color(0xFF6B7280);
  static const divider        = Color(0xFFE5E7EB);

  // ── Dark palette ───────────────────────────────────────────────
  static const darkBg         = Color(0xFF1A1A2E);
  static const darkSurface    = Color(0xFF16213E);
  static const darkText       = Color(0xFFE5E7EB);
}

abstract final class AppTextStyles {
  static const String fontFamily = 'sans-serif';

  static TextStyle display = const TextStyle(
    fontSize: 28,
    fontWeight: FontWeight.bold,
    fontFamily: fontFamily,
  );

  static TextStyle title = const TextStyle(
    fontSize: 20,
    fontWeight: FontWeight.w600,
    fontFamily: fontFamily,
  );

  static TextStyle body = const TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    fontFamily: fontFamily,
  );

  static TextStyle caption = const TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    fontFamily: fontFamily,
    color: AppColors.textMuted,
  );
}

abstract final class AppSpacing {
  static const double s8  = 8;
  static const double s16 = 16;
  static const double s24 = 24;
  static const double s32 = 32;
  static const double s48 = 48;
}

abstract final class AppRadius {
  static const double card   = 12;
  static const double button = 24;
  static const double chip   = 8;
}

abstract final class AppShadows {
  static List<BoxShadow> card = const [
    BoxShadow(
      color: Color(0x1A000000),
      blurRadius: 4,
      offset: Offset(0, 2),
    ),
  ];

  static List<BoxShadow> bottomNav = const [
    BoxShadow(
      color: Color(0x1A000000),
      blurRadius: 8,
      offset: Offset(0, -2),
    ),
  ];
}

/// Builds the full [ThemeData] for light mode.
abstract final class AppTheme {
  static ThemeData light() {
    const colorScheme = ColorScheme.light(
      primary: AppColors.primary,
      onPrimary: Colors.white,
      secondary: AppColors.accent,
      onSecondary: Colors.white,
      surface: AppColors.surface,
      onSurface: AppColors.textPrimary,
      error: AppColors.cta,
      onError: Colors.white,
      outline: AppColors.divider,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.background,
      fontFamily: AppTextStyles.fontFamily,
      dividerColor: AppColors.divider,
      textTheme: TextTheme(
        displayLarge: AppTextStyles.display,
        headlineLarge: AppTextStyles.title,
        titleLarge: AppTextStyles.title,
        bodyLarge: AppTextStyles.body,
        bodySmall: AppTextStyles.caption,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: AppTextStyles.title,
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.card),
        ),
        shadowColor: const Color(0x1A000000),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.cta,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.s24,
            vertical: AppSpacing.s16,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.button),
          ),
          textStyle: AppTextStyles.body.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.primary,
          textStyle: AppTextStyles.body.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: AppColors.surface,
        selectedItemColor: AppColors.cta,
        unselectedItemColor: AppColors.textMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
        selectedLabelStyle: AppTextStyles.caption.copyWith(
          fontWeight: FontWeight.w600,
          color: AppColors.cta,
        ),
        unselectedLabelStyle: AppTextStyles.caption,
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.divider,
        thickness: 1,
        space: 0,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: Colors.transparent,
        selectedColor: AppColors.primary,
        labelStyle: AppTextStyles.body.copyWith(
          color: AppColors.textPrimary,
          fontWeight: FontWeight.w500,
        ),
        side: const BorderSide(color: AppColors.primary),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.chip),
        ),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.s16,
          vertical: AppSpacing.s8,
        ),
      ),
    );
  }

  static ThemeData dark() {
    final colorScheme = ColorScheme.dark(
      primary: AppColors.primary,
      onPrimary: Colors.white,
      secondary: AppColors.accent,
      onSecondary: Colors.white,
      surface: AppColors.darkSurface,
      onSurface: AppColors.darkText,
      error: AppColors.cta,
      onError: Colors.white,
      outline: AppColors.divider.withValues(alpha: 0.2),
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.darkBg,
      fontFamily: AppTextStyles.fontFamily,
      dividerColor: AppColors.divider.withValues(alpha: 0.2),
      textTheme: TextTheme(
        displayLarge: AppTextStyles.display.copyWith(color: AppColors.darkText),
        headlineLarge: AppTextStyles.title.copyWith(color: AppColors.darkText),
        titleLarge: AppTextStyles.title.copyWith(color: AppColors.darkText),
        bodyLarge: AppTextStyles.body.copyWith(color: AppColors.darkText),
        bodySmall: AppTextStyles.caption.copyWith(color: AppColors.darkText),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.darkSurface,
        foregroundColor: AppColors.darkText,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: AppTextStyles.title.copyWith(color: AppColors.darkText),
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
          backgroundColor: AppColors.cta,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.s24,
            vertical: AppSpacing.s16,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.button),
          ),
          textStyle: AppTextStyles.body.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.primary,
          textStyle: AppTextStyles.body.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: AppColors.darkSurface,
        selectedItemColor: AppColors.cta,
        unselectedItemColor: AppColors.textMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
        selectedLabelStyle: AppTextStyles.caption.copyWith(
          fontWeight: FontWeight.w600,
          color: AppColors.cta,
        ),
        unselectedLabelStyle: AppTextStyles.caption,
      ),
      dividerTheme: DividerThemeData(
        color: AppColors.divider.withValues(alpha: 0.2),
        thickness: 1,
        space: 0,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: Colors.transparent,
        selectedColor: AppColors.primary,
        labelStyle: AppTextStyles.body.copyWith(
          color: AppColors.darkText,
          fontWeight: FontWeight.w500,
        ),
        side: const BorderSide(color: AppColors.primary),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.chip),
        ),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.s16,
          vertical: AppSpacing.s8,
        ),
      ),
    );
  }
}
