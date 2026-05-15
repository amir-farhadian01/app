import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// My Jobs Screen
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// TabBar with "Posted" | "Received" tabs, each showing empty state.
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class JobsScreen extends StatelessWidget {
  const JobsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: isDark ? AppColors.darkBg : AppColors.background,
        appBar: AppBar(
          title: Text(
            'My Jobs',
            style: AppTextStyles.title.copyWith(
              color: isDark ? AppColors.darkText : AppColors.textPrimary,
            ),
          ),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Posted'),
              Tab(text: 'Received'),
            ],
            labelColor: AppColors.primary,
            unselectedLabelColor: AppColors.textMuted,
            indicatorColor: AppColors.primary,
          ),
        ),
        body: TabBarView(
          children: [
            _EmptyJobsTab(isDark: isDark),
            _EmptyJobsTab(isDark: isDark),
          ],
        ),
      ),
    );
  }
}

class _EmptyJobsTab extends StatelessWidget {
  const _EmptyJobsTab({required this.isDark});

  final bool isDark;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.s32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.work_outline,
              size: 64,
              color: AppColors.textMuted,
            ),
            const SizedBox(height: AppSpacing.s16),
            Text(
              'No jobs yet',
              style: AppTextStyles.title.copyWith(
                color: isDark ? AppColors.darkText : AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: AppSpacing.s8),
            Text(
              'Post your first job to get started',
              style: AppTextStyles.body.copyWith(
                color: AppColors.textMuted,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.s24),
            FilledButton(
              onPressed: () {},
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.cta,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppRadius.card),
                ),
              ),
              child: const Text('Post your first job'),
            ),
          ],
        ),
      ),
    );
  }
}
