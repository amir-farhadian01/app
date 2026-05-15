import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Profile Screen (Redesigned)
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Hero section, stats row, menu sections with ListTiles.
/// All data is hardcoded mock.
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            children: [
              const SizedBox(height: AppSpacing.md),

              // ── Hero Section ─────────────────────────────────────
              Container(
                margin: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                padding: const EdgeInsets.all(AppSpacing.xxl),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(AppRadius.card),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    // Avatar
                    CircleAvatar(
                      radius: 36,
                      backgroundColor: AppColors.primary,
                      child: Text(
                        'A.F.',
                        style: AppTextStyles.headingLarge(color: Colors.white),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),

                    // Name
                    Text(
                      'Amir F.',
                      style: AppTextStyles.headingSmall(color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: AppSpacing.sm),

                    // Role badge
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.primaryLight,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        'Customer',
                        style: AppTextStyles.caption(color: AppColors.primary),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xxl),

                    // Stats row
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                      decoration: BoxDecoration(
                        color: AppColors.background,
                        borderRadius: BorderRadius.circular(AppRadius.card),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          _StatItem(value: '12', label: 'Orders'),
                          Container(
                            width: 1,
                            height: 32,
                            color: AppColors.divider,
                          ),
                          _StatItem(value: '3', label: 'Reviews'),
                          Container(
                            width: 1,
                            height: 32,
                            color: AppColors.divider,
                          ),
                          _StatItem(value: '2024', label: 'Member since'),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    // Edit Profile button
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: () {},
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AppColors.primary),
                          foregroundColor: AppColors.primary,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AppRadius.button),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                        ),
                        child: const Text('Edit Profile'),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.xxl),

              // ── Account Section ──────────────────────────────────
              _SectionHeader(title: 'Account'),
              _MenuTile(
                icon: Icons.location_on_outlined,
                title: 'My Addresses',
                onTap: () {},
              ),
              _MenuTile(
                icon: Icons.credit_card_outlined,
                title: 'Payment Methods',
                onTap: () {},
              ),
              const Divider(height: 1, indent: AppSpacing.lg, color: AppColors.divider),

              // ── Preferences Section ──────────────────────────────
              _SectionHeader(title: 'Preferences'),
              _MenuTile(
                icon: Icons.notifications_outlined,
                title: 'Notifications',
                trailing: _ToggleChip(value: true),
                onTap: () {},
              ),
              _MenuTile(
                icon: Icons.language_outlined,
                title: 'Language',
                trailing: Text(
                  'English',
                  style: AppTextStyles.bodySmall(color: AppColors.textMuted),
                ),
                onTap: () {},
              ),
              _MenuTile(
                icon: Icons.dark_mode_outlined,
                title: 'Theme',
                trailing: _ToggleChip(value: false),
                onTap: () {},
              ),
              const Divider(height: 1, indent: AppSpacing.lg, color: AppColors.divider),

              // ── Support Section ──────────────────────────────────
              _SectionHeader(title: 'Support'),
              _MenuTile(
                icon: Icons.help_outline,
                title: 'Help Center',
                onTap: () {},
              ),
              _MenuTile(
                icon: Icons.star_outline,
                title: 'Rate the App',
                onTap: () {},
              ),
              const Divider(height: 1, indent: AppSpacing.lg, color: AppColors.divider),

              // ── Logout ───────────────────────────────────────────
              _MenuTile(
                icon: Icons.logout,
                title: 'Logout',
                isDestructive: true,
                onTap: () {},
              ),
              const SizedBox(height: AppSpacing.xxxl),
            ],
          ),
        ),
      ),
    );
  }
}

/// ── Stat Item ───────────────────────────────────────────────────────
class _StatItem extends StatelessWidget {
  final String value;
  final String label;

  const _StatItem({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: AppTextStyles.headingSmall(color: AppColors.textPrimary),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: AppTextStyles.caption(color: AppColors.textMuted),
        ),
      ],
    );
  }
}

/// ── Section Header ──────────────────────────────────────────────────
class _SectionHeader extends StatelessWidget {
  final String title;

  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.lg + AppSpacing.lg, AppSpacing.lg, AppSpacing.lg, AppSpacing.sm,
      ),
      child: Text(
        title,
        style: AppTextStyles.label(color: AppColors.textMuted),
      ),
    );
  }
}

/// ── Menu Tile ───────────────────────────────────────────────────────
class _MenuTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final Widget? trailing;
  final bool isDestructive;
  final VoidCallback onTap;

  const _MenuTile({
    required this.icon,
    required this.title,
    this.trailing,
    this.isDestructive = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg + AppSpacing.lg,
          vertical: AppSpacing.lg,
        ),
        child: Row(
          children: [
            Icon(
              icon,
              size: 22,
              color: isDestructive
                  ? AppColors.error
                  : AppColors.textMuted,
            ),
            const SizedBox(width: AppSpacing.lg),
            Expanded(
              child: Text(
                title,
                style: AppTextStyles.body(
                  color: isDestructive
                      ? AppColors.error
                      : AppColors.textPrimary,
                ),
              ),
            ),
            if (trailing != null) trailing!,
            if (trailing == null && !isDestructive)
              const Icon(
                Icons.chevron_right,
                size: 20,
                color: AppColors.textFaint,
              ),
          ],
        ),
      ),
    );
  }
}

/// ── Toggle Chip (for boolean preferences) ────────────────────────────
class _ToggleChip extends StatelessWidget {
  final bool value;

  const _ToggleChip({required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: value ? AppColors.primaryLight : AppColors.border.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        value ? 'On' : 'Off',
        style: AppTextStyles.caption(
          color: value ? AppColors.primary : AppColors.textMuted,
        ),
      ),
    );
  }
}
