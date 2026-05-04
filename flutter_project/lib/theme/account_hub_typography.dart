import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Typography for customer account hub, safety flows, and pill nav.
/// Uses tight negative letter-spacing on headlines (common mobility-app rhythm).
/// Font: Plus Jakarta Sans (freely available; Uber Move is not bundled).
abstract final class AccountHubTypography {
  static TextStyle _pjs({
    required double fontSize,
    required FontWeight fontWeight,
    required Color color,
    double height = 1.0,
    double letterSpacing = 0,
  }) {
    return GoogleFonts.plusJakartaSans(
      fontSize: fontSize,
      fontWeight: fontWeight,
      height: height,
      letterSpacing: letterSpacing,
      color: color,
    );
  }

  // --- Profile hub ---
  static TextStyle profileDisplayName(Color c) => _pjs(
        fontSize: 28,
        fontWeight: FontWeight.w800,
        color: c,
        height: 1.08,
        letterSpacing: -0.95,
      );

  static TextStyle ratingChip(Color c) => _pjs(fontSize: 13, fontWeight: FontWeight.w700, color: c, letterSpacing: -0.12);

  static TextStyle quickGridLabel(Color c) =>
      _pjs(fontSize: 15, fontWeight: FontWeight.w700, color: c, letterSpacing: -0.22, height: 1.15);

  static TextStyle cardTitle(Color c) =>
      _pjs(fontSize: 17, fontWeight: FontWeight.w800, color: c, letterSpacing: -0.4, height: 1.22);

  static TextStyle cardSubtitle(Color c) =>
      _pjs(fontSize: 13, fontWeight: FontWeight.w500, color: c, letterSpacing: -0.06, height: 1.38);

  static TextStyle settingsRowTitle(Color c) =>
      _pjs(fontSize: 16, fontWeight: FontWeight.w700, color: c, letterSpacing: -0.28, height: 1.2);

  static TextStyle settingsRowSubtitle(Color c) =>
      _pjs(fontSize: 13, fontWeight: FontWeight.w500, color: c, letterSpacing: -0.05, height: 1.38);

  static TextStyle avatarLetter(Color c) =>
      _pjs(fontSize: 22, fontWeight: FontWeight.w800, color: c, letterSpacing: -0.55);

  static TextStyle ecoLabel(Color c) =>
      _pjs(fontSize: 14, fontWeight: FontWeight.w600, color: c, letterSpacing: -0.18);

  static TextStyle ecoValue(Color c) =>
      _pjs(fontSize: 15, fontWeight: FontWeight.w800, color: c, letterSpacing: -0.35);

  static TextStyle ringFraction(Color c) =>
      _pjs(fontSize: 10, fontWeight: FontWeight.w800, color: c, letterSpacing: 0.02);

  static TextStyle newBadge(Color blue) =>
      _pjs(fontSize: 10, fontWeight: FontWeight.w900, color: blue, letterSpacing: 0.8);

  // --- Full-screen account / safety modals ---
  static TextStyle screenHero34(Color c) =>
      _pjs(fontSize: 34, fontWeight: FontWeight.w800, color: c, height: 1.05, letterSpacing: -1.2);

  static TextStyle screenHero32(Color c) =>
      _pjs(fontSize: 32, fontWeight: FontWeight.w800, color: c, height: 1.06, letterSpacing: -1.05);

  static TextStyle settingsPageTitle(Color c) =>
      _pjs(fontSize: 34, fontWeight: FontWeight.w800, color: c, height: 1.02, letterSpacing: -1.1);

  static TextStyle safetySectionHeader(Color c) =>
      _pjs(fontSize: 18, fontWeight: FontWeight.w800, color: c, letterSpacing: -0.42, height: 1.2);

  static TextStyle safetyFeaturesIntro(Color c) =>
      _pjs(fontSize: 15, fontWeight: FontWeight.w500, color: c, letterSpacing: -0.1, height: 1.38);

  static TextStyle scheduleSection(Color c) =>
      _pjs(fontSize: 18, fontWeight: FontWeight.w800, color: c, letterSpacing: -0.4);

  static TextStyle scheduleHint(Color c) =>
      _pjs(fontSize: 14, fontWeight: FontWeight.w500, color: c, letterSpacing: -0.06, height: 1.38);

  static TextStyle scheduleCardTitle(Color c) =>
      _pjs(fontSize: 16, fontWeight: FontWeight.w800, color: c, letterSpacing: -0.3);

  static TextStyle featureBlockTitle(Color c) =>
      _pjs(fontSize: 17, fontWeight: FontWeight.w800, color: c, letterSpacing: -0.35, height: 1.2);

  static TextStyle featureBlockBody(Color c) =>
      _pjs(fontSize: 15, fontWeight: FontWeight.w500, color: c, letterSpacing: -0.08, height: 1.45);

  static TextStyle linkUnderline(Color blue) => GoogleFonts.plusJakartaSans(
        fontSize: 15,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.08,
        height: 1.45,
        color: blue,
        decoration: TextDecoration.underline,
      );

  static TextStyle hubListTitle(Color c) =>
      _pjs(fontSize: 16, fontWeight: FontWeight.w700, color: c, letterSpacing: -0.25, height: 1.28);

  static TextStyle hubListSubtitle(Color c) =>
      _pjs(fontSize: 14, fontWeight: FontWeight.w500, color: c, letterSpacing: -0.06, height: 1.38);

  static TextStyle snackBar(Color c) => _pjs(fontSize: 14, fontWeight: FontWeight.w600, color: c, letterSpacing: -0.08);

  static TextStyle dialogTitle(Color c) =>
      _pjs(fontSize: 17, fontWeight: FontWeight.w800, color: c, letterSpacing: -0.35);

  static TextStyle dialogBody(Color c) =>
      _pjs(fontSize: 15, fontWeight: FontWeight.w500, color: c, letterSpacing: -0.05, height: 1.42);

  static TextStyle dialogButton(Color c) => _pjs(fontSize: 15, fontWeight: FontWeight.w700, color: c, letterSpacing: -0.12);

  static TextStyle appBarPageTitle(Color c) =>
      _pjs(fontSize: 18, fontWeight: FontWeight.w800, color: c, letterSpacing: -0.38);

  static TextStyle primaryButton(Color c) =>
      _pjs(fontSize: 16, fontWeight: FontWeight.w700, color: c, letterSpacing: -0.22);

  static TextStyle featureRowTitle(Color c) =>
      _pjs(fontSize: 16, fontWeight: FontWeight.w700, color: c, letterSpacing: -0.28);

  static TextStyle featureRowBody(Color c) =>
      _pjs(fontSize: 14, fontWeight: FontWeight.w500, color: c, letterSpacing: -0.06, height: 1.36);

  static TextStyle settingsSection22(Color c) =>
      _pjs(fontSize: 22, fontWeight: FontWeight.w800, color: c, letterSpacing: -0.55);

  static TextStyle profileSummaryName(Color c) =>
      _pjs(fontSize: 17, fontWeight: FontWeight.w800, color: c, letterSpacing: -0.35);

  static TextStyle profileSummaryMeta(Color c) =>
      _pjs(fontSize: 15, fontWeight: FontWeight.w500, color: c, letterSpacing: -0.08);

  static TextStyle profileSummaryEmail(Color c) =>
      _pjs(fontSize: 14, fontWeight: FontWeight.w500, color: c, letterSpacing: -0.05, height: 1.35);

  // --- Bottom pill nav ---
  static TextStyle navPillLabel(Color c, {required bool active}) => _pjs(
        fontSize: 11,
        fontWeight: active ? FontWeight.w800 : FontWeight.w600,
        color: c,
        letterSpacing: -0.18,
        height: 1.1,
      );

  // --- Device PIN / shared dense UI ---
  static TextStyle pinIntro(Color c) =>
      _pjs(fontSize: 13, fontWeight: FontWeight.w500, color: c, letterSpacing: -0.04, height: 1.42);

  static TextStyle pinListTitle(Color c) =>
      _pjs(fontSize: 16, fontWeight: FontWeight.w700, color: c, letterSpacing: -0.25);

  static TextStyle pinListSubtitle(Color c) =>
      _pjs(fontSize: 12, fontWeight: FontWeight.w500, color: c, letterSpacing: -0.04, height: 1.32);

  static TextStyle pinSectionLabel(Color c) =>
      _pjs(fontSize: 11, fontWeight: FontWeight.w800, color: c, letterSpacing: 0.55);

  static TextStyle pinBackupBody(Color c) =>
      _pjs(fontSize: 12, fontWeight: FontWeight.w500, color: c, letterSpacing: -0.04, height: 1.34);

  static TextStyle pinError(Color c) => _pjs(fontSize: 12, fontWeight: FontWeight.w600, color: c, letterSpacing: -0.05);

  static TextStyle pinCtaLabel(Color onCtaForeground) =>
      _pjs(fontSize: 15, fontWeight: FontWeight.w800, color: onCtaForeground, letterSpacing: -0.15);

  static TextStyle pinSnackMessage(Color onSurface) =>
      _pjs(fontSize: 14, fontWeight: FontWeight.w500, color: onSurface, letterSpacing: -0.05, height: 1.35);

  static TextStyle formFloatingLabel(Color c) =>
      _pjs(fontSize: 14, fontWeight: FontWeight.w600, color: c, letterSpacing: -0.1);
}
