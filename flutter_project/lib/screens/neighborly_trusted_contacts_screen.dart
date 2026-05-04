import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../theme/account_hub_style.dart';
import '../theme/account_hub_typography.dart';

/// Account → Safety → Trusted contacts (onboarding-style screen).
class NeighborlyTrustedContactsScreen extends StatelessWidget {
  const NeighborlyTrustedContactsScreen({super.key});

  static void _learnMore(BuildContext context) {
    final onPrimary = AccountHubStyle.primaryText(context);
    final secondary = AccountHubStyle.secondaryText(context);
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Emergency contacts', style: AccountHubTypography.dialogTitle(onPrimary)),
        content: Text(
          'You can mark a trusted contact as an emergency contact. If we cannot reach you during a serious incident, we may try those contacts according to our policies and applicable law.',
          style: AccountHubTypography.dialogBody(secondary),
        ),
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
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                children: [
                  Text(
                    'Trusted contacts',
                    style: AccountHubTypography.screenHero34(onPrimary),
                  ),
                  const SizedBox(height: 36),
                  _FeatureBlock(
                    icon: LucideIcons.mapPin,
                    iconColor: blue,
                    title: 'Share your visit status',
                    body:
                        'Share your live location and booking details with one or more contacts while a Neighborly visit is in progress.',
                    onPrimary: onPrimary,
                    secondary: secondary,
                  ),
                  const SizedBox(height: 32),
                  _FeatureBlock(
                    icon: LucideIcons.shield,
                    iconColor: blue,
                    title: 'Set your emergency contacts',
                    onPrimary: onPrimary,
                    secondary: secondary,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'You can make a trusted contact an emergency contact too. Neighborly may try to reach them if we cannot reach you in an emergency.',
                          style: AccountHubTypography.featureBlockBody(secondary),
                        ),
                        const SizedBox(height: 6),
                        InkWell(
                          onTap: () => _learnMore(context),
                          child: Text(
                            'Learn more',
                            style: AccountHubTypography.linkUnderline(blue),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
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
                          'Trusted contacts — list and invites will connect to your account soon.',
                          style: AccountHubTypography.snackBar(onPrimary),
                        ),
                      ),
                    );
                  },
                  child: Text('Add trusted contact', style: AccountHubTypography.primaryButton(ctaFg)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FeatureBlock extends StatelessWidget {
  const _FeatureBlock({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.onPrimary,
    required this.secondary,
    this.body,
    this.child,
  }) : assert(body != null || child != null);

  final IconData icon;
  final Color iconColor;
  final String title;
  final Color onPrimary;
  final Color secondary;
  final String? body;
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 28, color: iconColor),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: AccountHubTypography.featureBlockTitle(onPrimary),
              ),
              const SizedBox(height: 8),
              if (body != null)
                Text(body!, style: AccountHubTypography.featureBlockBody(secondary))
              else
                child!,
            ],
          ),
        ),
      ],
    );
  }
}
