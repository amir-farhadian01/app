import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../models/user_model.dart';
import '../screens/neighborly_safety_hub_screen.dart';
import '../screens/customer_support_screen.dart';
import '../screens/neighborly_settings_screen.dart';
import '../screens/finance_screen.dart';
import '../screens/kyc_screen.dart';
import '../screens/notifications_screen.dart';
import '../services/neighborly_api_service.dart';
import '../theme/account_hub_style.dart';
import '../theme/account_hub_typography.dart';

/// Customer profile home: account hub layout (quick actions, promo-style cards,
/// settings list). Copy is Neighborly-specific; structure follows common mobile
/// account patterns.
class CustomerProfileHubBody extends StatelessWidget {
  const CustomerProfileHubBody({
    super.key,
    required this.user,
    required this.onEditPersonal,
    required this.onBecomeProvider,
  });

  final UserModel user;
  final VoidCallback onEditPersonal;
  final VoidCallback onBecomeProvider;

  String get _displayName {
    final n = user.displayName.trim();
    if (n.isNotEmpty) return n;
    final fn = user.firstName?.trim() ?? '';
    final ln = user.lastName?.trim() ?? '';
    final combined = '$fn $ln'.trim();
    if (combined.isNotEmpty) return combined;
    return user.email.split('@').first;
  }

  String _ratingLabel() {
    final r = user.stats?.rating ?? 0;
    if (r <= 0) return 'New';
    return r.toStringAsFixed(2);
  }

  Future<void> _openHelp(BuildContext context) async {
    final api = context.read<NeighborlyApiService>();
    try {
      final tickets = await api.fetchAdminTickets();
      if (!context.mounted) return;
      await Navigator.of(context).push<void>(
        MaterialPageRoute<void>(
          builder: (_) => CustomerSupportScreen(
            initialTickets: List<Map<String, dynamic>>.from(tickets),
            reloadTickets: () => api.fetchAdminTickets(),
          ),
        ),
      );
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Could not open help.',
            style: AccountHubTypography.snackBar(AccountHubStyle.primaryText(context)),
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final api = context.watch<NeighborlyApiService>();
    final unread = api.unreadNotificationsCount;
    final hubDark = AccountHubStyle.isHubDark(context);
    final bg = AccountHubStyle.pageBackground(context);
    final card = AccountHubStyle.cardBackground(context);
    final onPrimary = AccountHubStyle.primaryText(context);
    final secondary = AccountHubStyle.secondaryText(context);
    final blue = AccountHubStyle.accentBlue(context);

    return ColoredBox(
      color: bg,
      child: RefreshIndicator(
        color: blue,
        onRefresh: () => api.refreshUserStats(),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _displayName,
                        style: AccountHubTypography.profileDisplayName(onPrimary),
                      ),
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: hubDark ? const Color(0xFF2A2A2A) : const Color(0xFFE8E8E8),
                          borderRadius: BorderRadius.circular(100),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(LucideIcons.star, size: 14, color: onPrimary),
                            const SizedBox(width: 6),
                            Text(
                              _ratingLabel(),
                              style: AccountHubTypography.ratingChip(onPrimary),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Material(
                  color: hubDark ? const Color(0xFF2A2A2A) : const Color(0xFFE8E8E8),
                  shape: const CircleBorder(),
                  clipBehavior: Clip.antiAlias,
                  child: InkWell(
                    onTap: onEditPersonal,
                    child: SizedBox(
                      width: 56,
                      height: 56,
                      child: user.photoURL != null && user.photoURL!.isNotEmpty
                          ? Image.network(
                              user.photoURL!,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => _avatarFallback(onPrimary, secondary),
                            )
                          : _avatarFallback(onPrimary, secondary),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            _QuickGrid(
              cardColor: card,
              onPrimary: onPrimary,
              secondary: secondary,
              blue: blue,
              unreadInbox: unread,
              onHelp: () => _openHelp(context),
              onWallet: () {
                Navigator.of(context).push<void>(
                  MaterialPageRoute<void>(builder: (_) => const FinanceScreen()),
                );
              },
              onSafety: () {
                Navigator.of(context).push<void>(
                  MaterialPageRoute<void>(builder: (_) => const NeighborlySafetyHubScreen()),
                );
              },
              onInbox: () {
                Navigator.of(context).push<void>(
                  MaterialPageRoute<void>(builder: (_) => const NotificationsScreen()),
                );
              },
            ),
            const SizedBox(height: 20),
            _PromoCard(
              background: card,
              title: 'Neighborly Plus',
              subtitle: 'Members earn credits on eligible bookings. Try it free for 30 days.',
              onPrimary: onPrimary,
              secondary: secondary,
              trailing: Icon(LucideIcons.sparkles, size: 40, color: blue.withValues(alpha: 0.85)),
            ),
            const SizedBox(height: 12),
            _PromoCard(
              background: card,
              title: 'Safety checkup',
              subtitle: 'Review in-app safety tools and booking tips.',
              onPrimary: onPrimary,
              secondary: secondary,
              trailing: _RingProgress(current: 1, total: 7, color: blue),
            ),
            const SizedBox(height: 12),
            _EcoRow(
              background: card,
              onPrimary: onPrimary,
              secondary: secondary,
              grams: 825,
            ),
            const SizedBox(height: 12),
            _PromoCard(
              background: card,
              title: 'Invite neighbors',
              subtitle: 'Share Neighborly and get rewards when friends book.',
              onPrimary: onPrimary,
              secondary: secondary,
              trailing: Icon(LucideIcons.users, size: 42, color: secondary.withValues(alpha: 0.9)),
            ),
            const SizedBox(height: 28),
            _SettingsRow(
              icon: LucideIcons.users,
              title: 'Household',
              subtitle: 'Manage linked adult accounts (coming soon)',
              onPrimary: onPrimary,
              secondary: secondary,
              onTap: () => _soon(context, 'Household'),
            ),
            _divider(secondary),
            _SettingsRow(
              icon: LucideIcons.settings,
              title: 'Settings',
              subtitle: null,
              onPrimary: onPrimary,
              secondary: secondary,
              onTap: () {
                Navigator.of(context).push<void>(
                  MaterialPageRoute<void>(builder: (_) => const NeighborlySettingsScreen()),
                );
              },
            ),
            _divider(secondary),
            _SettingsRow(
              icon: LucideIcons.smartphone,
              title: 'Simple mode',
              subtitle: 'A simplified layout for easier reading',
              onPrimary: onPrimary,
              secondary: secondary,
              trailingBadge: _NewBadge(blue: blue),
              onTap: () => _soon(context, 'Simple mode'),
            ),
            _divider(secondary),
            _SettingsRow(
              icon: LucideIcons.gift,
              title: 'Gift cards',
              subtitle: null,
              onPrimary: onPrimary,
              secondary: secondary,
              onTap: () => _soon(context, 'Gift cards'),
            ),
            _divider(secondary),
            _SettingsRow(
              icon: LucideIcons.dollarSign,
              title: 'Earn by providing services',
              subtitle: 'Switch to provider tools when you are ready',
              onPrimary: onPrimary,
              secondary: secondary,
              onTap: onBecomeProvider,
            ),
            _divider(secondary),
            _SettingsRow(
              icon: LucideIcons.shieldCheck,
              title: 'Identity & verification',
              subtitle: 'KYC status and documents',
              onPrimary: onPrimary,
              secondary: secondary,
              onTap: () {
                Navigator.of(context).push<void>(
                  MaterialPageRoute<void>(builder: (_) => const KycScreen()),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _avatarFallback(Color onPrimary, Color secondary) {
    final letter = _displayName.isNotEmpty ? _displayName[0].toUpperCase() : '?';
    return Center(
      child: Text(
        letter,
        style: AccountHubTypography.avatarLetter(onPrimary),
      ),
    );
  }

  void _soon(BuildContext context, String feature) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          '$feature is coming soon.',
          style: AccountHubTypography.snackBar(AccountHubStyle.primaryText(context)),
        ),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}

class _QuickGrid extends StatelessWidget {
  const _QuickGrid({
    required this.cardColor,
    required this.onPrimary,
    required this.secondary,
    required this.blue,
    required this.unreadInbox,
    required this.onHelp,
    required this.onWallet,
    required this.onSafety,
    required this.onInbox,
  });

  final Color cardColor;
  final Color onPrimary;
  final Color secondary;
  final Color blue;
  final int unreadInbox;
  final VoidCallback onHelp;
  final VoidCallback onWallet;
  final VoidCallback onSafety;
  final VoidCallback onInbox;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(child: _QuickTile(icon: LucideIcons.lifeBuoy, label: 'Help', onTap: onHelp, cardColor: cardColor, onPrimary: onPrimary, secondary: secondary)),
            const SizedBox(width: 12),
            Expanded(child: _QuickTile(icon: LucideIcons.wallet, label: 'Wallet', onTap: onWallet, cardColor: cardColor, onPrimary: onPrimary, secondary: secondary)),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(child: _QuickTile(icon: LucideIcons.shield, label: 'Safety', onTap: onSafety, cardColor: cardColor, onPrimary: onPrimary, secondary: secondary)),
            const SizedBox(width: 12),
            Expanded(
              child: _QuickTile(
                icon: LucideIcons.inbox,
                label: 'Inbox',
                onTap: onInbox,
                cardColor: cardColor,
                onPrimary: onPrimary,
                secondary: secondary,
                showDot: unreadInbox > 0,
                dotColor: blue,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _QuickTile extends StatelessWidget {
  const _QuickTile({
    required this.icon,
    required this.label,
    required this.onTap,
    required this.cardColor,
    required this.onPrimary,
    required this.secondary,
    this.showDot = false,
    this.dotColor,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color cardColor;
  final Color onPrimary;
  final Color secondary;
  final bool showDot;
  final Color? dotColor;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: cardColor,
      borderRadius: BorderRadius.circular(14),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: SizedBox(
          height: 88,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Stack(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(icon, size: 22, color: onPrimary),
                    const Spacer(),
                    Text(
                      label,
                      style: AccountHubTypography.quickGridLabel(onPrimary),
                    ),
                  ],
                ),
                if (showDot && dotColor != null)
                  Positioned(
                    right: 0,
                    top: 0,
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(color: dotColor, shape: BoxShape.circle),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _PromoCard extends StatelessWidget {
  const _PromoCard({
    required this.background,
    required this.title,
    required this.subtitle,
    required this.onPrimary,
    required this.secondary,
    required this.trailing,
  });

  final Color background;
  final String title;
  final String subtitle;
  final Color onPrimary;
  final Color secondary;
  final Widget trailing;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 12, 16),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: AccountHubTypography.cardTitle(onPrimary)),
                const SizedBox(height: 6),
                Text(
                  subtitle,
                  style: AccountHubTypography.cardSubtitle(secondary),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          trailing,
        ],
      ),
    );
  }
}

class _EcoRow extends StatelessWidget {
  const _EcoRow({
    required this.background,
    required this.onPrimary,
    required this.secondary,
    required this.grams,
  });

  final Color background;
  final Color onPrimary;
  final Color secondary;
  final int grams;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              'Estimated CO₂ saved',
              style: AccountHubTypography.ecoLabel(onPrimary),
            ),
          ),
          Text(
            '$grams g',
            style: AccountHubTypography.ecoValue(onPrimary),
          ),
          const SizedBox(width: 8),
          const Icon(LucideIcons.leaf, color: Color(0xFF05944F), size: 22),
        ],
      ),
    );
  }
}

class _RingProgress extends StatelessWidget {
  const _RingProgress({required this.current, required this.total, required this.color});

  final int current;
  final int total;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 48,
      height: 48,
      child: Stack(
        alignment: Alignment.center,
        children: [
          SizedBox(
            width: 46,
            height: 46,
            child: CircularProgressIndicator(
              value: current / total,
              strokeWidth: 4,
              backgroundColor: color.withValues(alpha: 0.18),
              color: color,
            ),
          ),
          Text(
            '$current/$total',
            style: AccountHubTypography.ringFraction(AccountHubStyle.primaryText(context)),
          ),
        ],
      ),
    );
  }
}

class _NewBadge extends StatelessWidget {
  const _NewBadge({required this.blue});

  final Color blue;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: blue.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        'NEW',
        style: AccountHubTypography.newBadge(blue),
      ),
    );
  }
}

class _SettingsRow extends StatelessWidget {
  const _SettingsRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onPrimary,
    required this.secondary,
    required this.onTap,
    this.trailingBadge,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final Color onPrimary;
  final Color secondary;
  final VoidCallback onTap;
  final Widget? trailingBadge;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, size: 22, color: onPrimary),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: AccountHubTypography.settingsRowTitle(onPrimary)),
                    if (subtitle != null) ...[
                      const SizedBox(height: 4),
                      Text(subtitle!, style: AccountHubTypography.settingsRowSubtitle(secondary)),
                    ],
                  ],
                ),
              ),
              if (trailingBadge != null) trailingBadge!,
              const SizedBox(width: 4),
              Icon(LucideIcons.chevronRight, size: 18, color: secondary),
            ],
          ),
        ),
      ),
    );
  }
}

Widget _divider(Color secondary) {
  return Divider(height: 1, thickness: 1, color: secondary.withValues(alpha: 0.2));
}
