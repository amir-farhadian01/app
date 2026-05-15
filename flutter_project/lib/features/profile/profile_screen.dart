import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Profile Screen
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Avatar, mock user info, settings list tiles.
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBg : AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s16),
          child: Column(
            children: [
              const SizedBox(height: AppSpacing.s32),

              // Avatar
              CircleAvatar(
                radius: 40,
                backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                child: const Icon(
                  Icons.person,
                  size: 40,
                ),
              ),
              const SizedBox(height: AppSpacing.s16),

              // Name
              Text(
                'Ali Neighbor',
                style: AppTextStyles.title.copyWith(
                  color: isDark ? AppColors.darkText : AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: AppSpacing.s8),

              // Email
              Text(
                'ali@neighborly.app',
                style: AppTextStyles.body.copyWith(
                  color: AppColors.textMuted,
                ),
              ),
              const SizedBox(height: AppSpacing.s24),

              // Divider
              Divider(color: isDark ? AppColors.divider.withValues(alpha: 0.2) : AppColors.divider),
              const SizedBox(height: AppSpacing.s8),

              // Settings tiles
              _SettingsTile(
                icon: Icons.edit_outlined,
                title: 'Edit Profile',
                isDark: isDark,
                onTap: () {},
              ),
              _SettingsTile(
                icon: Icons.notifications_outlined,
                title: 'Notifications',
                isDark: isDark,
                onTap: () {},
              ),
              _SettingsTile(
                icon: Icons.lock_outlined,
                title: 'Privacy',
                isDark: isDark,
                onTap: () {},
              ),
              _SettingsTile(
                icon: Icons.help_outline,
                title: 'Help & Support',
                isDark: isDark,
                onTap: () {},
              ),
              const SizedBox(height: AppSpacing.s8),
              Divider(color: isDark ? AppColors.divider.withValues(alpha: 0.2) : AppColors.divider),
              const SizedBox(height: AppSpacing.s8),

              // Sign Out
              _SettingsTile(
                icon: Icons.logout,
                title: 'Sign Out',
                isDark: isDark,
                isDestructive: true,
                onTap: () {},
              ),
              const SizedBox(height: AppSpacing.s48),
            ],
          ),
        ),
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final bool isDark;
  final bool isDestructive;
  final VoidCallback onTap;

  const _SettingsTile({
    required this.icon,
    required this.title,
    required this.isDark,
    this.isDestructive = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(
        icon,
        color: isDestructive ? AppColors.cta : AppColors.primary,
      ),
      title: Text(
        title,
        style: AppTextStyles.body.copyWith(
          color: isDestructive
              ? AppColors.cta
              : (isDark ? AppColors.darkText : AppColors.textPrimary),
        ),
      ),
      trailing: const Icon(
        Icons.chevron_right,
        color: AppColors.textMuted,
      ),
      onTap: onTap,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.chip),
      ),
    );
  }
}
