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
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.background : AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
          child: Column(
            children: [
              const SizedBox(height: AppSpacing.xl),

              // Avatar
              CircleAvatar(
                radius: 40,
                backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                child: const Icon(
                  Icons.person,
                  size: 40,
                ),
              ),
              const SizedBox(height: AppSpacing.md),

              // Name
              Text(
                'Ali Neighbor',
                style: theme.textTheme.titleMedium?.copyWith(
                  color: isDark ? AppColors.textPrimary : AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),

              // Email
              Text(
                'ali@neighborly.app',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),

              // Divider
              Divider(color: isDark ? AppColors.border.withValues(alpha: 0.2) : AppColors.border),
              const SizedBox(height: AppSpacing.sm),

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
              const SizedBox(height: AppSpacing.sm),
              Divider(color: isDark ? AppColors.border.withValues(alpha: 0.2) : AppColors.border),
              const SizedBox(height: AppSpacing.sm),

              // Sign Out
              _SettingsTile(
                icon: Icons.logout,
                title: 'Sign Out',
                isDark: isDark,
                isDestructive: true,
                onTap: () {},
              ),
              const SizedBox(height: AppSpacing.xxl),
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
    final theme = Theme.of(context);

    return ListTile(
      leading: Icon(
        icon,
        color: isDestructive ? AppColors.primary : AppColors.primary,
      ),
      title: Text(
        title,
        style: theme.textTheme.bodyMedium?.copyWith(
          color: isDestructive
              ? AppColors.primary
              : (isDark ? AppColors.textPrimary : AppColors.textPrimary),
        ),
      ),
      trailing: const Icon(
        Icons.chevron_right,
        color: AppColors.textSecondary,
      ),
      onTap: onTap,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.full),
      ),
    );
  }
}
