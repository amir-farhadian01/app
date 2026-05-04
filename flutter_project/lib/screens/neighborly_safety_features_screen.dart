import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../theme/account_hub_style.dart';
import '../theme/account_hub_typography.dart';

/// Account → Safety → Safety preferences: toggles and schedule (local UI state).
class NeighborlySafetyFeaturesScreen extends StatefulWidget {
  const NeighborlySafetyFeaturesScreen({super.key});

  @override
  State<NeighborlySafetyFeaturesScreen> createState() => _NeighborlySafetyFeaturesScreenState();
}

class _NeighborlySafetyFeaturesScreenState extends State<NeighborlySafetyFeaturesScreen> {
  bool _checkIns = false;
  bool _pinVerify = false;
  bool _recordAudio = false;
  bool _shareStatus = false;
  /// 0 = all visits, 1 = scheduled only (placeholder).
  int _scheduleMode = 0;

  void _info(String title, String message) {
    final onPrimary = AccountHubStyle.primaryText(context);
    final secondary = AccountHubStyle.secondaryText(context);
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title, style: AccountHubTypography.dialogTitle(onPrimary)),
        content: Text(message, style: AccountHubTypography.dialogBody(secondary)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('OK', style: AccountHubTypography.dialogButton(Theme.of(ctx).colorScheme.primary)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bg = AccountHubStyle.pageBackground(context);
    final onPrimary = AccountHubStyle.primaryText(context);
    final secondary = AccountHubStyle.secondaryText(context);
    final div = AccountHubStyle.dividerLine(context);
    final ctaBg = AccountHubStyle.ctaBackground(context);
    final ctaFg = AccountHubStyle.ctaForeground(context);
    final blue = AccountHubStyle.accentBlue(context);

    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Align(
              alignment: Alignment.centerLeft,
              child: IconButton(
                icon: Icon(LucideIcons.x, color: onPrimary, size: 26),
                onPressed: () => Navigator.of(context).pop(),
                tooltip: 'Close',
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                children: [
                  Text(
                    'Safety features',
                    style: AccountHubTypography.screenHero32(onPrimary),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'These features will turn on when you use your preferences.',
                    style: AccountHubTypography.safetyFeaturesIntro(secondary),
                  ),
                  const SizedBox(height: 24),
                  _FeatureRow(
                    icon: LucideIcons.car,
                    title: 'Get more safety check-ins',
                    description: 'We can check on you sooner if a visit goes off course or ends early.',
                    value: _checkIns,
                    onPrimary: onPrimary,
                    secondary: secondary,
                    blue: blue,
                    divider: div,
                    onInfo: () => _info(
                      'Safety check-ins',
                      'When enabled, Neighborly can prompt you sooner if something looks unusual about your booking.',
                    ),
                    onChanged: (v) => setState(() => _checkIns = v),
                  ),
                  _FeatureRow(
                    icon: LucideIcons.grid,
                    title: 'Use PIN verification',
                    description: 'Use a PIN to help make sure you meet the right provider.',
                    value: _pinVerify,
                    onPrimary: onPrimary,
                    secondary: secondary,
                    blue: blue,
                    divider: div,
                    onInfo: () => _info(
                      'PIN verification',
                      'Set a device PIN under Account → Safety hub → PIN verification. Share it only with your provider at the start of the visit.',
                    ),
                    onChanged: (v) => setState(() => _pinVerify = v),
                  ),
                  _FeatureRow(
                    icon: LucideIcons.mic,
                    title: 'Record audio',
                    description: 'You can send us a short recording if you report a safety issue.',
                    value: _recordAudio,
                    onPrimary: onPrimary,
                    secondary: secondary,
                    blue: blue,
                    divider: div,
                    onInfo: () => _info('Audio recording', 'Recordings are only for safety reports and are handled according to our policies.'),
                    onChanged: (v) => setState(() => _recordAudio = v),
                  ),
                  _FeatureRow(
                    icon: LucideIcons.radar,
                    title: 'Share visit status',
                    description: 'Share your live location and booking details with someone you trust.',
                    value: _shareStatus,
                    onPrimary: onPrimary,
                    secondary: secondary,
                    blue: blue,
                    divider: div,
                    showDividerBelow: false,
                    onInfo: () => _info('Share visit status', 'Trusted contacts can follow your visit from their own device when you choose to share.'),
                    onChanged: (v) => setState(() => _shareStatus = v),
                  ),
                  const SizedBox(height: 28),
                  Text(
                    'Schedule',
                    style: AccountHubTypography.scheduleSection(onPrimary),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'This is how and when your preferences will turn on.',
                    style: AccountHubTypography.scheduleHint(secondary),
                  ),
                  const SizedBox(height: 14),
                  InkWell(
                    onTap: () => setState(() => _scheduleMode = 0),
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: onPrimary, width: 1.5),
                      ),
                      child: Row(
                        children: [
                          Icon(LucideIcons.car, color: onPrimary, size: 22),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'All visits (recommended)',
                                  style: AccountHubTypography.scheduleCardTitle(onPrimary),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'On during every visit',
                                  style: AccountHubTypography.scheduleHint(secondary),
                                ),
                              ],
                            ),
                          ),
                          if (_scheduleMode == 0) Icon(LucideIcons.check, color: blue, size: 22),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: SizedBox(
                width: double.infinity,
                height: 52,
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: ctaBg,
                    foregroundColor: ctaFg,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          'Preferences saved on this device (sync to account coming soon).',
                          style: AccountHubTypography.snackBar(onPrimary),
                        ),
                      ),
                    );
                    Navigator.of(context).pop();
                  },
                  child: Text('Save', style: AccountHubTypography.primaryButton(ctaFg)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FeatureRow extends StatelessWidget {
  const _FeatureRow({
    required this.icon,
    required this.title,
    required this.description,
    required this.value,
    required this.onPrimary,
    required this.secondary,
    required this.blue,
    required this.divider,
    required this.onChanged,
    required this.onInfo,
    this.showDividerBelow = true,
  });

  final IconData icon;
  final String title;
  final String description;
  final bool value;
  final Color onPrimary;
  final Color secondary;
  final Color blue;
  final Color divider;
  final ValueChanged<bool> onChanged;
  final VoidCallback onInfo;
  final bool showDividerBelow;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, size: 22, color: onPrimary),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            title,
                            style: AccountHubTypography.featureRowTitle(onPrimary),
                          ),
                        ),
                        const SizedBox(width: 6),
                        InkWell(
                          onTap: onInfo,
                          borderRadius: BorderRadius.circular(12),
                          child: Padding(
                            padding: const EdgeInsets.all(4),
                            child: Icon(LucideIcons.info, size: 18, color: secondary),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      description,
                      style: AccountHubTypography.featureRowBody(secondary),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              SizedBox(
                width: 28,
                height: 28,
                child: Checkbox(
                  value: value,
                  onChanged: (v) => onChanged(v ?? false),
                  fillColor: WidgetStateProperty.resolveWith((states) {
                    if (states.contains(WidgetState.selected)) return blue;
                    return Colors.transparent;
                  }),
                  checkColor: AccountHubStyle.isHubDark(context) ? Colors.black : Colors.white,
                  side: BorderSide(color: secondary.withValues(alpha: 0.6), width: 1.5),
                ),
              ),
            ],
          ),
        ),
        if (showDividerBelow) Divider(height: 1, thickness: 1, color: divider),
      ],
    );
  }
}
