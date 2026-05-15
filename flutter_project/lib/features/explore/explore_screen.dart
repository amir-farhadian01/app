import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Explore Screen (Redesigned)
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Sticky search bar, filter bottom sheet, 2-column results grid.
/// All data is hardcoded mock.
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class ExploreScreen extends StatefulWidget {
  const ExploreScreen({super.key});

  @override
  State<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends State<ExploreScreen> {
  // ── Filter state ─────────────────────────────────────────────────
  final Set<String> _selectedCategories = {'Plumbing'};
  double _distanceRange = 10;
  int _minRating = 0;

  // ── Mock results ─────────────────────────────────────────────────
  static const List<_ServiceResult> _allResults = [
    _ServiceResult(name: 'Pipe Repair', provider: 'Mike D.', category: 'Plumbing', price: '\$40/hr', rating: 4.8, icon: Icons.plumbing),
    _ServiceResult(name: 'Drain Cleaning', provider: 'Sara J.', category: 'Plumbing', price: '\$35/hr', rating: 4.6, icon: Icons.plumbing),
    _ServiceResult(name: 'Outlet Installation', provider: 'Reza M.', category: 'Electrical', price: '\$50/hr', rating: 4.9, icon: Icons.electrical_services),
    _ServiceResult(name: 'Wiring Repair', provider: 'Tom K.', category: 'Electrical', price: '\$45/hr', rating: 4.7, icon: Icons.electrical_services),
    _ServiceResult(name: 'Deep Cleaning', provider: 'Layla K.', category: 'Cleaning', price: '\$25/hr', rating: 4.9, icon: Icons.cleaning_services),
    _ServiceResult(name: 'Carpet Cleaning', provider: 'Nadia R.', category: 'Cleaning', price: '\$30/hr', rating: 4.5, icon: Icons.cleaning_services),
    _ServiceResult(name: 'Interior Painting', provider: 'Layla K.', category: 'Painting', price: '\$35/hr', rating: 4.8, icon: Icons.format_paint),
    _ServiceResult(name: 'Exterior Painting', provider: 'Omar S.', category: 'Painting', price: '\$45/hr', rating: 4.6, icon: Icons.format_paint),
  ];

  List<_ServiceResult> get _filteredResults {
    return _allResults.where((r) {
      if (_selectedCategories.isNotEmpty && !_selectedCategories.contains(r.category)) return false;
      if (_minRating > 0 && r.rating < _minRating) return false;
      return true;
    }).toList();
  }

  void _showFilterSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _FilterSheet(
        selectedCategories: Set.from(_selectedCategories),
        distanceRange: _distanceRange,
        minRating: _minRating,
        onApply: (cats, dist, rating) {
          setState(() {
            _selectedCategories
              ..clear()
              ..addAll(cats);
            _distanceRange = dist;
            _minRating = rating;
          });
          Navigator.pop(ctx);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final results = _filteredResults;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // ── Sticky Search Bar ──────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.lg, AppSpacing.md, AppSpacing.lg, AppSpacing.sm,
              ),
              child: SearchBar(
                hintText: 'Search services in Vaughan...',
                leading: const Icon(Icons.search, color: AppColors.textMuted),
                trailing: [
                  IconButton(
                    icon: const Icon(Icons.tune, color: AppColors.primary),
                    onPressed: _showFilterSheet,
                  ),
                ],
                backgroundColor: WidgetStateProperty.all(AppColors.surface),
                elevation: WidgetStateProperty.all(0),
                side: WidgetStateProperty.all(
                  const BorderSide(color: AppColors.border),
                ),
                shape: WidgetStateProperty.all(
                  RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppRadius.pill),
                  ),
                ),
                padding: WidgetStateProperty.all(
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                ),
                textStyle: WidgetStateProperty.all(
                  const TextStyle(color: AppColors.textPrimary),
                ),
                hintStyle: WidgetStateProperty.all(
                  const TextStyle(color: AppColors.textMuted),
                ),
              ),
            ),

            // ── Results count ──────────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
              child: Row(
                children: [
                  Text(
                    '${results.length} services found',
                    style: AppTextStyles.bodySmall(color: AppColors.textMuted),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.sm),

            // ── Results Grid ───────────────────────────────────────
            Expanded(
              child: results.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.search_off, size: 64, color: AppColors.textFaint),
                          const SizedBox(height: AppSpacing.md),
                          Text(
                            'No services found',
                            style: AppTextStyles.titleMedium(color: AppColors.textMuted),
                          ),
                          const SizedBox(height: AppSpacing.sm),
                          Text(
                            'Try adjusting your filters',
                            style: AppTextStyles.bodySmall(color: AppColors.textMuted),
                          ),
                        ],
                      ),
                    )
                  : GridView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                      itemCount: results.length,
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        mainAxisSpacing: AppSpacing.md,
                        crossAxisSpacing: AppSpacing.md,
                        childAspectRatio: 0.85,
                      ),
                      itemBuilder: (context, index) {
                        final item = results[index];
                        return _ResultCard(item: item);
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

/// ── Service Result Model ─────────────────────────────────────────────
class _ServiceResult {
  final String name;
  final String provider;
  final String category;
  final String price;
  final double rating;
  final IconData icon;

  const _ServiceResult({
    required this.name,
    required this.provider,
    required this.category,
    required this.price,
    required this.rating,
    required this.icon,
  });
}

/// ── Result Card Widget ───────────────────────────────────────────────
class _ResultCard extends StatelessWidget {
  final _ServiceResult item;

  const _ResultCard({required this.item});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Image placeholder ────────────────────────────────────
          Container(
            height: 90,
            width: double.infinity,
            color: AppColors.primaryLight,
            child: Icon(item.icon, size: 36, color: AppColors.primary),
          ),
          // ── Info ─────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.name,
                  style: AppTextStyles.titleMedium(color: AppColors.textPrimary),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  item.provider,
                  style: AppTextStyles.caption(color: AppColors.textMuted),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.star, size: 12, color: AppColors.star),
                    const SizedBox(width: 2),
                    Text(
                      item.rating.toString(),
                      style: AppTextStyles.caption(color: AppColors.textSecondary),
                    ),
                    const Spacer(),
                    Text(
                      item.price,
                      style: AppTextStyles.bodySmall(color: AppColors.primary),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// ── Filter Bottom Sheet ──────────────────────────────────────────────
class _FilterSheet extends StatefulWidget {
  final Set<String> selectedCategories;
  final double distanceRange;
  final int minRating;
  final void Function(Set<String> categories, double distance, int rating) onApply;

  const _FilterSheet({
    required this.selectedCategories,
    required this.distanceRange,
    required this.minRating,
    required this.onApply,
  });

  @override
  State<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<_FilterSheet> {
  late Set<String> _selectedCategories;
  late double _distanceRange;
  late int _minRating;

  static const List<String> _allCategories = [
    'Plumbing', 'Electrical', 'Cleaning', 'Painting', 'Moving', 'Garden',
  ];

  @override
  void initState() {
    super.initState();
    _selectedCategories = Set.from(widget.selectedCategories);
    _distanceRange = widget.distanceRange;
    _minRating = widget.minRating;
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: AppSpacing.lg,
        right: AppSpacing.lg,
        top: AppSpacing.lg,
        bottom: MediaQuery.of(context).viewInsets.bottom + AppSpacing.xxl,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Handle ───────────────────────────────────────────────
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          Text(
            'Filters',
            style: AppTextStyles.headingSmall(color: AppColors.textPrimary),
          ),
          const SizedBox(height: AppSpacing.lg),

          // ── Category ─────────────────────────────────────────────
          Text(
            'Category',
            style: AppTextStyles.titleMedium(color: AppColors.textPrimary),
          ),
          const SizedBox(height: AppSpacing.sm),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _allCategories.map((cat) {
              final selected = _selectedCategories.contains(cat);
              return FilterChip(
                label: Text(cat),
                selected: selected,
                onSelected: (val) {
                  setState(() {
                    if (val) {
                      _selectedCategories.add(cat);
                    } else {
                      _selectedCategories.remove(cat);
                    }
                  });
                },
                selectedColor: AppColors.primary,
                checkmarkColor: Colors.white,
                labelStyle: TextStyle(
                  color: selected ? Colors.white : AppColors.textPrimary,
                  fontWeight: FontWeight.w500,
                  fontSize: 13,
                ),
                side: BorderSide.none,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppRadius.chip),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: AppSpacing.xl),

          // ── Distance ─────────────────────────────────────────────
          Text(
            'Distance: ${_distanceRange.toInt()} km',
            style: AppTextStyles.titleMedium(color: AppColors.textPrimary),
          ),
          Slider(
            value: _distanceRange,
            min: 0,
            max: 20,
            divisions: 20,
            activeColor: AppColors.primary,
            inactiveColor: AppColors.border,
            label: '${_distanceRange.toInt()} km',
            onChanged: (val) => setState(() => _distanceRange = val),
          ),
          const SizedBox(height: AppSpacing.sm),

          // ── Min Rating ───────────────────────────────────────────
          Text(
            'Minimum Rating',
            style: AppTextStyles.titleMedium(color: AppColors.textPrimary),
          ),
          const SizedBox(height: AppSpacing.sm),
          Wrap(
            spacing: 8,
            children: [0, 3, 4, 5].map((rating) {
              final selected = _minRating == rating;
              String label;
              if (rating == 0) {
                label = 'Any';
              } else {
                label = '$rating★';
              }
              return ChoiceChip(
                label: Text(label),
                selected: selected,
                onSelected: (val) {
                  if (val) setState(() => _minRating = rating);
                },
                selectedColor: AppColors.primary,
                labelStyle: TextStyle(
                  color: selected ? Colors.white : AppColors.textPrimary,
                  fontWeight: FontWeight.w500,
                  fontSize: 13,
                ),
                side: BorderSide.none,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppRadius.chip),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: AppSpacing.xxl),

          // ── Apply Button ─────────────────────────────────────────
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () => widget.onApply(
                _selectedCategories,
                _distanceRange,
                _minRating,
              ),
              child: const Text('Apply Filters'),
            ),
          ),
        ],
      ),
    );
  }
}
