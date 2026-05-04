import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../theme/account_hub_style.dart';
import '../theme/account_hub_typography.dart';
import 'neighborly_device_safety_screen.dart';
import 'neighborly_safety_features_screen.dart';
import 'neighborly_trusted_contacts_screen.dart';

/// Account → Safety: hub listing safety tools and informational links.
class NeighborlySafetyHubScreen extends StatelessWidget {
  const NeighborlySafetyHubScreen({super.key});

  static void _soon(BuildContext context, String label) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          '$label — more soon.',
          style: AccountHubTypography.snackBar(AccountHubStyle.primaryText(context)),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bg = AccountHubStyle.pageBackground(context);
    final onPrimary = AccountHubStyle.primaryText(context);
    final secondary = AccountHubStyle.secondaryText(context);
    final div = AccountHubStyle.dividerLine(context);
    final blue = AccountHubStyle.accentBlue(context);
    final hubDark = AccountHubStyle.isHubDark(context);

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
                padding: const EdgeInsets.fromLTRB(8, 0, 8, 32),
                children: [
                  _SafetyHeader(blue: blue, hubDark: hubDark),
                  const SizedBox(height: 20),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Text(
                      'Safety hub',
                      style: AccountHubTypography.screenHero34(onPrimary),
                    ),
                  ),
                  const SizedBox(height: 28),
                  _sectionTitle('Safety tools', onPrimary),
                  _HubRow(
                    icon: LucideIcons.shield,
                    title: 'Safety preferences',
                    subtitle: 'Choose and schedule your favourite safety tools.',
                    onPrimary: onPrimary,
                    secondary: secondary,
                    divider: div,
                    onTap: () {
                      Navigator.of(context).push<void>(
                        MaterialPageRoute<void>(builder: (_) => const NeighborlySafetyFeaturesScreen()),
                      );
                    },
                  ),
                  _HubRow(
                    icon: LucideIcons.contact,
                    title: 'Manage trusted contacts',
                    subtitle: 'Share your booking status with family and friends in one tap.',
                    onPrimary: onPrimary,
                    secondary: secondary,
                    divider: div,
                    onTap: () {
                      Navigator.of(context).push<void>(
                        MaterialPageRoute<void>(builder: (_) => const NeighborlyTrustedContactsScreen()),
                      );
                    },
                  ),
                  _HubRow(
                    icon: LucideIcons.grid,
                    title: 'PIN verification',
                    subtitle: 'Use a PIN to make sure you meet the right provider.',
                    onPrimary: onPrimary,
                    secondary: secondary,
                    divider: div,
                    onTap: () {
                      Navigator.of(context).push<void>(
                        MaterialPageRoute<void>(builder: (_) => const NeighborlyDeviceSafetyScreen()),
                      );
                    },
                  ),
                  _HubRow(
                    icon: LucideIcons.car,
                    title: 'Visit check-in',
                    subtitle: 'Manage your safety check-in messages.',
                    onPrimary: onPrimary,
                    secondary: secondary,
                    divider: div,
                    onTap: () => _soon(context, 'Visit check-in'),
                  ),
                  const SizedBox(height: 28),
                  _sectionTitle('Know before your visit', onPrimary),
                  _HubRow(
                    icon: LucideIcons.shieldCheck,
                    title: 'Safety tips',
                    subtitle: 'Book with confidence using Neighborly safety tools and tips.',
                    onPrimary: onPrimary,
                    secondary: secondary,
                    divider: div,
                    onTap: () => _soon(context, 'Safety tips'),
                  ),
                  _HubRow(
                    icon: LucideIcons.users,
                    title: 'Teen safety',
                    subtitle: 'Household profiles can include built-in safety tools for younger members.',
                    onPrimary: onPrimary,
                    secondary: secondary,
                    divider: div,
                    onTap: () => _soon(context, 'Teen safety'),
                  ),
                  _HubRow(
                    icon: LucideIcons.heartHandshake,
                    title: 'Safety at Neighborly',
                    subtitle: 'Understand how Neighborly approaches your safety.',
                    onPrimary: onPrimary,
                    secondary: secondary,
                    divider: div,
                    showDividerBelow: false,
                    onTap: () => _soon(context, 'Safety at Neighborly'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  static Widget _sectionTitle(String t, Color onPrimary) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
      child: Text(
        t,
        style: AccountHubTypography.safetySectionHeader(onPrimary),
      ),
    );
  }
}

class _SafetyHeader extends StatelessWidget {
  const _SafetyHeader({required this.blue, required this.hubDark});

  final Color blue;
  final bool hubDark;

  @override
  Widget build(BuildContext context) {
    const h = 168.0;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: SizedBox(
          height: h,
          child: Stack(
            fit: StackFit.expand,
            children: [
              DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: hubDark
                        ? const [Color(0xFF0A1628), Color(0xFF1A3A6E), Color(0xFF0D2137)]
                        : const [Color(0xFFD6E8FF), Color(0xFF9EC5FF), Color(0xFFE8F2FF)],
                  ),
                ),
              ),
              ...List<Widget>.generate(4, (i) {
                final r = 40.0 + i * 36;
                return Positioned(
                  right: -20 + i * 12.0,
                  top: h * 0.15 - i * 8,
                  child: IgnorePointer(
                    child: Container(
                      width: r * 2,
                      height: r * 2,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: blue.withValues(alpha: hubDark ? 0.22 : 0.35),
                          width: 2,
                        ),
                      ),
                    ),
                  ),
                );
              }),
              Center(
                child: Icon(
                  LucideIcons.shield,
                  size: 56,
                  color: blue,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HubRow extends StatelessWidget {
  const _HubRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onPrimary,
    required this.secondary,
    required this.divider,
    required this.onTap,
    this.showDividerBelow = true,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Color onPrimary;
  final Color secondary;
  final Color divider;
  final VoidCallback onTap;
  final bool showDividerBelow;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 14, 8, 14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(icon, size: 22, color: onPrimary),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: AccountHubTypography.hubListTitle(onPrimary),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          subtitle,
                          style: AccountHubTypography.hubListSubtitle(secondary),
                        ),
                      ],
                    ),
                  ),
                  Icon(LucideIcons.chevronRight, size: 20, color: secondary),
                ],
              ),
            ),
          ),
        ),
        if (showDividerBelow)
          Divider(height: 1, thickness: 1, color: divider, indent: 12, endIndent: 12),
      ],
    );
  }
}
