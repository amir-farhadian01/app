import 'package:flutter/material.dart';

/// Visual tokens for the customer "account hub" layout (floating bottom bar +
/// high-contrast account surface). Generic naming avoids third-party branding.
abstract final class AccountHubStyle {
  static bool isHubDark(BuildContext context) =>
      Theme.of(context).brightness == Brightness.dark;

  static Color pageBackground(BuildContext context) =>
      isHubDark(context) ? const Color(0xFF0D0F1A) : const Color(0xFFFFFFFF);

  static Color cardBackground(BuildContext context) =>
      isHubDark(context) ? const Color(0xFF1E2235) : const Color(0xFFF3F3F3);

  static Color primaryText(BuildContext context) =>
      isHubDark(context) ? const Color(0xFFF0F2FF) : const Color(0xFF000000);

  static Color secondaryText(BuildContext context) =>
      isHubDark(context) ? const Color(0xFF8B90B0) : const Color(0xFF545454);

  static Color accentBlue(BuildContext context) => const Color(0xFF2B6EFF);

  static Color bottomBarFill(BuildContext context) =>
      isHubDark(context) ? const Color(0xFF0D0F1A) : const Color(0xFFFFFFFF);

  static Color bottomBarActivePill(BuildContext context) =>
      isHubDark(context) ? const Color(0x22FFFFFF) : const Color(0xFFEBEBEB);

  static Color bottomBarShadow(BuildContext context) =>
      isHubDark(context) ? Colors.black.withValues(alpha: 0.45) : Colors.black.withValues(alpha: 0.12);

  static Color gridTileBackground(BuildContext context) =>
      isHubDark(context) ? const Color(0xFF1E2235) : const Color(0xFFF3F3F3);

  static Color dividerLine(BuildContext context) =>
      isHubDark(context) ? const Color(0xFF2A2F4A) : const Color(0xFFEEEEEE);

  /// Primary full-width CTA (inverted in dark mode for contrast).
  static Color ctaBackground(BuildContext context) =>
      isHubDark(context) ? const Color(0xFF2B6EFF) : const Color(0xFF000000);

  static Color ctaForeground(BuildContext context) =>
      isHubDark(context) ? const Color(0xFFFFFFFF) : const Color(0xFFFFFFFF);
}
