import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../models/user_model.dart';
import '../services/neighborly_api_service.dart';
import '../services/neighborly_theme_notifier.dart';
import '../theme/account_hub_style.dart';
import '../theme/account_hub_typography.dart';
import 'neighborly_account_screen.dart';
import 'neighborly_safety_features_screen.dart';
import 'neighborly_trusted_contacts_screen.dart';
import 'notifications_screen.dart';

/// Customer settings list (saved places, privacy, accessibility, communication,
/// appearance, safety). Neighborly-specific copy.
class NeighborlySettingsScreen extends StatelessWidget {
  const NeighborlySettingsScreen({super.key});

  static String _displayName(UserModel u) {
    final n = u.displayName.trim();
    if (n.isNotEmpty) return n;
    final fn = u.firstName?.trim() ?? '';
    final ln = u.lastName?.trim() ?? '';
    final c = '$fn $ln'.trim();
    if (c.isNotEmpty) return c;
    return u.email.split('@').first;
  }

  static String _phoneDisplay(UserModel u) {
    final p = u.phone?.trim() ?? '';
    if (p.isEmpty) return 'No phone on file';
    final digits = p.replaceAll(RegExp(r'\D'), '');
    if (digits.length == 11 && digits.startsWith('1')) {
      final r = digits.substring(1);
      return '(${r.substring(0, 3)}) ${r.substring(3, 6)}-${r.substring(6)}';
    }
    if (digits.length == 10) {
      return '(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}';
    }
    return p;
  }

  @override
  Widget build(BuildContext context) {
    final u = context.watch<NeighborlyApiService>().user;
    if (u == null) {
      return const Scaffold(body: Center(child: Text('Sign in required')));
    }

    final bg = AccountHubStyle.pageBackground(context);
    final text = AccountHubStyle.primaryText(context);
    final sub = AccountHubStyle.secondaryText(context);
    final div = AccountHubStyle.dividerLine(context);
    final avatarBg = AccountHubStyle.isHubDark(context) ? const Color(0xFF2A2A2A) : const Color(0xFFE8E8E8);

    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(8, 8, 8, 32),
          children: [
            Align(
              alignment: Alignment.centerLeft,
              child: IconButton(
                icon: Icon(LucideIcons.x, color: text, size: 26),
                onPressed: () => Navigator.of(context).pop(),
                tooltip: 'Close',
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
              child: Text(
                'Settings',
                style: AccountHubTypography.settingsPageTitle(text),
              ),
            ),
            const SizedBox(height: 8),
            _ProfileSummaryCard(
              user: u,
              bg: bg,
              text: text,
              sub: sub,
              avatarBg: avatarBg,
              onTap: () {
                Navigator.of(context).push<void>(
                  MaterialPageRoute<void>(
                    fullscreenDialog: true,
                    builder: (_) => const NeighborlyAccountScreen(initialTab: 1),
                  ),
                );
              },
            ),
            const SizedBox(height: 24),
            _SettingsTile(
              bg: bg,
              text: text,
              sub: sub,
              icon: LucideIcons.home,
              title: 'Add home',
              subtitle: null,
              onTap: () => _soon(context, 'Saved home address'),
            ),
            _divider(div),
            _SettingsTile(
              bg: bg,
              text: text,
              sub: sub,
              icon: LucideIcons.briefcase,
              title: 'Add work',
              subtitle: null,
              onTap: () => _soon(context, 'Saved work address'),
            ),
            _divider(div),
            _SettingsTile(
              bg: bg,
              text: text,
              sub: sub,
              icon: LucideIcons.mapPin,
              title: 'Shortcuts',
              subtitle: 'Manage saved locations',
              onTap: () => _soon(context, 'Shortcuts'),
            ),
            _divider(div),
            _SettingsTile(
              bg: bg,
              text: text,
              sub: sub,
              icon: LucideIcons.lock,
              title: 'Privacy',
              subtitle: 'Manage the data you share with us',
              onTap: () {
                Navigator.of(context).push<void>(
                  MaterialPageRoute<void>(
                    fullscreenDialog: true,
                    builder: (_) => const NeighborlyAccountScreen(initialTab: 0),
                  ),
                );
              },
            ),
            _divider(div),
            _SettingsTile(
              bg: bg,
              text: text,
              sub: sub,
              icon: LucideIcons.user,
              title: 'Accessibility',
              subtitle: 'Manage your accessibility settings',
              onTap: () => _soon(context, 'Accessibility'),
            ),
            _divider(div),
            _SettingsTile(
              bg: bg,
              text: text,
              sub: sub,
              icon: LucideIcons.smartphone,
              title: 'Communication',
              subtitle: 'Choose contact methods and notification settings',
              onTap: () {
                Navigator.of(context).push<void>(
                  MaterialPageRoute<void>(builder: (_) => const NotificationsScreen()),
                );
              },
            ),
            _divider(div),
            Consumer<NeighborlyThemeNotifier>(
              builder: (context, theme, _) {
                final dark = theme.isDark;
                return _SettingsTile(
                  bg: bg,
                  text: text,
                  sub: sub,
                  icon: LucideIcons.sun,
                  title: 'Appearance',
                  subtitle: dark ? 'Dark mode' : 'Light mode',
                  onTap: () async {
                    await theme.toggleTheme();
                  },
                );
              },
            ),
            const SizedBox(height: 28),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
              child: Text(
                'Safety',
                style: AccountHubTypography.settingsSection22(text),
              ),
            ),
            _SettingsTile(
              bg: bg,
              text: text,
              sub: sub,
              icon: LucideIcons.shield,
              title: 'Safety preferences',
              subtitle: 'Choose and schedule your favourite safety tools',
              onTap: () {
                Navigator.of(context).push<void>(
                  MaterialPageRoute<void>(builder: (_) => const NeighborlySafetyFeaturesScreen()),
                );
              },
            ),
            _divider(div),
            _SettingsTile(
              bg: bg,
              text: text,
              sub: sub,
              icon: LucideIcons.users,
              title: 'Manage trusted contacts',
              subtitle: 'Share booking status with family and friends in one tap',
              onTap: () {
                Navigator.of(context).push<void>(
                  MaterialPageRoute<void>(builder: (_) => const NeighborlyTrustedContactsScreen()),
                );
              },
            ),
            _divider(div),
            _SettingsTile(
              bg: bg,
              text: text,
              sub: sub,
              icon: LucideIcons.layoutGrid,
              title: 'Verify your visit',
              subtitle: 'Confirm details before you start a visit',
              onTap: () => _soon(context, 'Verify your visit'),
            ),
          ],
        ),
      ),
    );
  }

  static void _soon(BuildContext context, String label) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$label — coming soon.', style: AccountHubTypography.snackBar(AccountHubStyle.primaryText(context)))),
    );
  }
}

Widget _divider(Color color) => Divider(height: 1, thickness: 1, color: color, indent: 12, endIndent: 12);

class _ProfileSummaryCard extends StatelessWidget {
  const _ProfileSummaryCard({
    required this.user,
    required this.onTap,
    required this.bg,
    required this.text,
    required this.sub,
    required this.avatarBg,
  });

  final UserModel user;
  final VoidCallback onTap;
  final Color bg;
  final Color text;
  final Color sub;
  final Color avatarBg;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: Material(
        color: bg,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Row(
              children: [
                _MiniAvatar(url: user.photoURL, sub: sub, avatarBg: avatarBg),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        NeighborlySettingsScreen._displayName(user),
                        style: AccountHubTypography.profileSummaryName(text),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        NeighborlySettingsScreen._phoneDisplay(user),
                        style: AccountHubTypography.profileSummaryMeta(sub),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        user.email,
                        style: AccountHubTypography.profileSummaryEmail(sub),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                Icon(LucideIcons.chevronRight, color: sub, size: 22),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MiniAvatar extends StatelessWidget {
  const _MiniAvatar({required this.url, required this.sub, required this.avatarBg});

  final String? url;
  final Color sub;
  final Color avatarBg;

  @override
  Widget build(BuildContext context) {
    const size = 56.0;
    final t = url?.trim();
    if (t == null || t.isEmpty) {
      return CircleAvatar(
        radius: 28,
        backgroundColor: avatarBg,
        child: Icon(LucideIcons.user, size: 28, color: sub),
      );
    }
    return ClipOval(
      child: SizedBox(
        width: size,
        height: size,
        child: Image.network(
          t,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => ColoredBox(
            color: avatarBg,
            child: Icon(LucideIcons.user, size: 28, color: sub),
          ),
        ),
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  const _SettingsTile({
    required this.bg,
    required this.text,
    required this.sub,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final Color bg;
  final Color text;
  final Color sub;
  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: bg,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 14, 8, 14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, size: 22, color: text),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: AccountHubTypography.settingsRowTitle(text)),
                    if (subtitle != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        subtitle!,
                        style: AccountHubTypography.settingsRowSubtitle(sub),
                      ),
                    ],
                  ],
                ),
              ),
              Icon(LucideIcons.chevronRight, size: 20, color: sub),
            ],
          ),
        ),
      ),
    );
  }
}
