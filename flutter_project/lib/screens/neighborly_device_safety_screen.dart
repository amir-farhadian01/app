import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../theme/account_hub_style.dart';
import '../theme/account_hub_typography.dart';
import '../widgets/device_safety_pin_body.dart';

/// Account → Safety → PIN verification (device PIN / biometrics only, no Account & Security chrome).
class NeighborlyDeviceSafetyScreen extends StatelessWidget {
  const NeighborlyDeviceSafetyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final bg = AccountHubStyle.pageBackground(context);
    final onPrimary = AccountHubStyle.primaryText(context);
    final secondary = AccountHubStyle.secondaryText(context);
    final blue = AccountHubStyle.accentBlue(context);
    final dark = AccountHubStyle.isHubDark(context);

    final scheme = ColorScheme(
      brightness: dark ? Brightness.dark : Brightness.light,
      primary: blue,
      onPrimary: Colors.white,
      secondary: secondary,
      onSecondary: onPrimary,
      error: const Color(0xFFB00020),
      onError: Colors.white,
      surface: bg,
      onSurface: onPrimary,
      onSurfaceVariant: secondary,
    );

    return Theme(
      data: Theme.of(context).copyWith(
        colorScheme: scheme,
        scaffoldBackgroundColor: bg,
        inputDecorationTheme: InputDecorationTheme(
          labelStyle: AccountHubTypography.formFloatingLabel(secondary),
          floatingLabelStyle: AccountHubTypography.formFloatingLabel(secondary),
        ),
      ),
      child: Scaffold(
        backgroundColor: bg,
        appBar: AppBar(
          backgroundColor: bg,
          foregroundColor: onPrimary,
          elevation: 0,
          surfaceTintColor: Colors.transparent,
          leading: IconButton(
            icon: Icon(LucideIcons.x, color: onPrimary, size: 26),
            onPressed: () => Navigator.of(context).pop(),
            tooltip: 'Close',
          ),
          title: Text(
            'PIN verification',
            style: AccountHubTypography.appBarPageTitle(onPrimary),
          ),
          centerTitle: false,
        ),
        body: const DeviceSafetyPinBody(),
      ),
    );
  }
}
