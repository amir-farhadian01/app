import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/theme/app_theme.dart';
import '../core/widgets/responsive_scaffold.dart';
import '../core/widgets/app_avatar.dart';
import '../mock/mock_data.dart';

/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Profile Screen — user profile with stats and settings
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ResponsiveScaffold(
      currentIndex: 3,
      child: _ProfileContent(),
    );
  }
}

class _ProfileContent extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final user = mockUsers[0]; // Current user

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.only(bottom: 80),
        child: Column(
          children: [
            // ── Cover Area ───────────────────────────────────────
            Container(
              height: 120,
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppColors.primary,
                    AppColors.primaryLight,
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
            ),
            // ── Avatar (centered over cover) ─────────────────────
            Transform.translate(
              offset: const Offset(0, -40),
              child: Column(
                children: [
                  AppAvatar(
                    imageUrl: user.avatar,
                    radius: 36,
                    isActive: true,
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    user.name,
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    user.role.name.replaceAllMapped(
                      RegExp(r'[A-Z]'),
                      (m) => ' ${m.group(0)}',
                    ).trim(),
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 13,
                      color: AppColors.textMuted,
                    ),
                  ),
                ],
              ),
            ),
            // ── Stats Row ────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xxl),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildStat('Orders', '12'),
                  _buildStat('Reviews', '8'),
                  _buildStat('Rating', '4.8'),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xxl),
            Divider(color: isDark ? AppColors.darkDivider : AppColors.divider),
            // ── Settings List ────────────────────────────────────
            _buildSettingItem(
              context,
              icon: Icons.person_outline,
              title: 'Edit Profile',
              onTap: () {},
            ),
            _buildSettingItem(
              context,
              icon: Icons.notifications_outlined,
              title: 'Notifications',
              onTap: () {},
            ),
            _buildSettingItem(
              context,
              icon: Icons.payment_outlined,
              title: 'Payment Methods',
              onTap: () {},
            ),
            _buildSettingItem(
              context,
              icon: Icons.favorite_outline,
              title: 'Favorites',
              onTap: () {},
            ),
            _buildSettingItem(
              context,
              icon: Icons.support_outlined,
              title: 'Support',
              onTap: () {},
            ),
            _buildSettingItem(
              context,
              icon: Icons.info_outline,
              title: 'About',
              onTap: () {},
            ),
            Divider(color: isDark ? AppColors.darkDivider : AppColors.divider),
            // ── Logout ───────────────────────────────────────────
            _buildSettingItem(
              context,
              icon: Icons.logout,
              title: 'Sign Out',
              textColor: AppColors.error,
              onTap: () => context.go('/login'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStat(String label, String value) {
    return Column(
      children: [
        Text(
          value,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          label,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 12,
            color: AppColors.textMuted,
          ),
        ),
      ],
    );
  }

  Widget _buildSettingItem(
    BuildContext context, {
    required IconData icon,
    required String title,
    required VoidCallback onTap,
    Color? textColor,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return ListTile(
      leading: Icon(icon, color: textColor ?? (isDark ? AppColors.darkTextPrimary : AppColors.textPrimary)),
      title: Text(
        title,
        style: GoogleFonts.plusJakartaSans(
          fontSize: 15,
          fontWeight: FontWeight.w400,
          color: textColor ?? (isDark ? AppColors.darkTextPrimary : AppColors.textPrimary),
        ),
      ),
      trailing: Icon(
        Icons.chevron_right,
        color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
      ),
      onTap: onTap,
    );
  }
}
