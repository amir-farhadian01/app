import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Home Screen
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Sections: Header, Search, Category chips, Featured Services, Recent Requests.
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  static const List<String> _categories = [
    'All',
    'Cleaning',
    'Plumbing',
    'Electrical',
    'Gardening',
    'Moving',
    'Painting',
    'Carpentry',
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBg : AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: AppSpacing.s8),

              // ── SECTION A: Header ──────────────────────────────
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Hello, Neighbor 👋',
                    style: AppTextStyles.body.copyWith(
                      color: AppColors.textMuted,
                    ),
                  ),
                  Stack(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.notifications_outlined),
                        color: isDark ? AppColors.darkText : AppColors.textPrimary,
                        onPressed: () {},
                      ),
                      Positioned(
                        top: 8,
                        right: 8,
                        child: Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: AppColors.cta,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.s16),

              // ── SECTION B: Search bar ──────────────────────────
              TextField(
                enabled: false,
                decoration: InputDecoration(
                  hintText: 'What service do you need?',
                  prefixIcon: const Icon(Icons.search),
                  filled: true,
                  fillColor: isDark ? AppColors.darkSurface : AppColors.surface,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppRadius.button),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.s16),

              // ── SECTION C: Category chips ──────────────────────
              SizedBox(
                height: 36,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _categories.length,
                  separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.s8),
                  itemBuilder: (context, index) {
                    final isFirst = index == 0;
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      decoration: BoxDecoration(
                        color: isFirst
                            ? AppColors.primary
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(AppRadius.chip),
                        border: Border.all(
                          color: isFirst
                              ? AppColors.primary
                              : AppColors.primary.withValues(alpha: 0.5),
                        ),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        _categories[index],
                        style: AppTextStyles.body.copyWith(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: isFirst
                              ? Colors.white
                              : AppColors.primary,
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: AppSpacing.s24),

              // ── SECTION D: Featured Services ───────────────────
              Text(
                'Featured Services',
                style: AppTextStyles.title.copyWith(
                  color: isDark ? AppColors.darkText : AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: AppSpacing.s8),
              SizedBox(
                height: 220,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: 4,
                  separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.s8),
                  itemBuilder: (context, index) {
                    return _ServiceCard(index: index);
                  },
                ),
              ),
              const SizedBox(height: AppSpacing.s24),

              // ── SECTION E: Recent Requests ─────────────────────
              Text(
                'Recent Requests',
                style: AppTextStyles.title.copyWith(
                  color: isDark ? AppColors.darkText : AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: AppSpacing.s8),
              ...List.generate(3, (index) {
                return _RequestItem(index: index);
              }),
              const SizedBox(height: AppSpacing.s48),
            ],
          ),
        ),
      ),
    );
  }
}

/// Mock service card for Featured Services section.
class _ServiceCard extends StatelessWidget {
  const _ServiceCard({required this.index});

  final int index;

  static const _titles = [
    'Deep Cleaning',
    'Pipe Repair',
    'Garden Design',
    'Electrical Fix',
  ];

  static const _providers = [
    'CleanPro',
    'PipeMaster',
    'GreenThumb',
    'SparkElec',
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      width: 180,
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.card),
        boxShadow: AppShadows.card,
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Color block top
          Container(
            height: 80,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppColors.primary,
                  AppColors.primary.withValues(alpha: 0.7),
                ],
              ),
            ),
            alignment: Alignment.center,
            child: Icon(
              Icons.cleaning_services,
              size: 36,
              color: Colors.white.withValues(alpha: 0.8),
            ),
          ),
          // Content
          Padding(
            padding: const EdgeInsets.all(AppSpacing.s16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _titles[index],
                  style: AppTextStyles.title.copyWith(
                    fontSize: 15,
                    color: isDark ? AppColors.darkText : AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  _providers[index],
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.textMuted,
                  ),
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    const Icon(Icons.star, size: 14, color: Colors.amber),
                    const SizedBox(width: 2),
                    Text(
                      '4.8',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'From \$25',
                  style: AppTextStyles.body.copyWith(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Mock request item for Recent Requests section.
class _RequestItem extends StatelessWidget {
  const _RequestItem({required this.index});

  final int index;

  static const _titles = [
    'Fix leaking faucet',
    'Clean 2-bedroom apartment',
    'Paint living room',
  ];

  static const _subtitles = [
    'Plumbing • Kitchen',
    'Cleaning • Downtown',
    'Painting • 3 rooms',
  ];

  static const _dates = [
    'Today, 2:00 PM',
    'Tomorrow, 10:00 AM',
    'Jun 5, 9:00 AM',
  ];

  Color _statusColor(int i) {
    if (i == 0) return AppColors.accent; // pending
    if (i == 1) return AppColors.primary; // active
    return AppColors.cta; // done
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.s8),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.s16),
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurface : AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadius.card),
          boxShadow: AppShadows.card,
        ),
        child: Row(
          children: [
            Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(
                color: _statusColor(index),
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: AppSpacing.s16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _titles[index],
                    style: AppTextStyles.body.copyWith(
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.darkText : AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _subtitles[index],
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.textMuted,
                    ),
                  ),
                ],
              ),
            ),
            Text(
              _dates[index],
              style: AppTextStyles.caption.copyWith(
                color: AppColors.textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
