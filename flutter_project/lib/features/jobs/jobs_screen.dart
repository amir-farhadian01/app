import 'package:flutter/material.dart';

import '../../core/app_theme.dart';

/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// My Jobs Screen
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// TabBar with "Posted" | "Received" tabs, each showing empty state.
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class JobsScreen extends StatelessWidget {
  const JobsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: isDark ? NeighborlyColors.bgPrimary : NeighborlyColors.bgPrimary,
        appBar: AppBar(
          title: Text(
            'My Jobs',
            style: theme.textTheme.titleMedium?.copyWith(
              color: isDark ? NeighborlyColors.textPrimary : NeighborlyColors.textPrimary,
            ),
          ),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Posted'),
              Tab(text: 'Received'),
            ],
            labelColor: NeighborlyColors.accent,
            unselectedLabelColor: NeighborlyColors.textSecondary,
            indicatorColor: NeighborlyColors.accent,
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
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(NeighborlySpacing.s32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.work_outline,
              size: 64,
              color: NeighborlyColors.textSecondary,
            ),
            const SizedBox(height: NeighborlySpacing.s16),
            Text(
              'No jobs yet',
              style: theme.textTheme.titleMedium?.copyWith(
                color: isDark ? NeighborlyColors.textPrimary : NeighborlyColors.textPrimary,
              ),
            ),
            const SizedBox(height: NeighborlySpacing.s8),
            Text(
              'Post your first job to get started',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: NeighborlyColors.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: NeighborlySpacing.s24),
            FilledButton(
              onPressed: () {},
              style: FilledButton.styleFrom(
                backgroundColor: NeighborlyColors.accent,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(NeighborlyRadius.lg),
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
