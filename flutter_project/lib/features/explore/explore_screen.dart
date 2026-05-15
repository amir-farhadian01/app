import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Explore Screen
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Full-screen search + grid of service categories.
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class ExploreScreen extends StatelessWidget {
  const ExploreScreen({super.key});

  static const List<_CategoryItem> _categories = [
    _CategoryItem(icon: Icons.cleaning_services, label: 'Cleaning'),
    _CategoryItem(icon: Icons.plumbing, label: 'Plumbing'),
    _CategoryItem(icon: Icons.electrical_services, label: 'Electrical'),
    _CategoryItem(icon: Icons.yard, label: 'Gardening'),
    _CategoryItem(icon: Icons.local_shipping, label: 'Moving'),
    _CategoryItem(icon: Icons.format_paint, label: 'Painting'),
    _CategoryItem(icon: Icons.handyman, label: 'Carpentry'),
    _CategoryItem(icon: Icons.miscellaneous_services, label: 'Other'),
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBg : AppColors.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s16),
          child: Column(
            children: [
              const SizedBox(height: AppSpacing.s8),

              // Search input (auto-focused)
              TextField(
                autofocus: true,
                decoration: InputDecoration(
                  hintText: 'Search services...',
                  prefixIcon: const Icon(Icons.search),
                  filled: true,
                  fillColor: isDark ? AppColors.darkSurface : AppColors.surface,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppRadius.button),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.s24),

              // Category grid
              Expanded(
                child: GridView.builder(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 2.5,
                  ),
                  itemCount: _categories.length,
                  itemBuilder: (context, index) {
                    final cat = _categories[index];
                    return Container(
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.darkSurface : AppColors.surface,
                        borderRadius: BorderRadius.circular(AppRadius.card),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            cat.icon,
                            size: 22,
                            color: AppColors.primary,
                          ),
                          const SizedBox(width: AppSpacing.s8),
                          Text(
                            cat.label,
                            style: AppTextStyles.body.copyWith(
                              fontWeight: FontWeight.w500,
                              color: isDark ? AppColors.darkText : AppColors.textPrimary,
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CategoryItem {
  final IconData icon;
  final String label;

  const _CategoryItem({required this.icon, required this.label});
}
