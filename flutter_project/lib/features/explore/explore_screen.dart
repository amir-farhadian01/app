import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../services/api_service.dart';

/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Explore Screen (Redesigned — Wired to Real API)
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Sticky search bar, category chips from API, filter bottom sheet,
/// 2-column results grid from real backend data.
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class ExploreScreen extends StatefulWidget {
  const ExploreScreen({super.key});

  @override
  State<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends State<ExploreScreen> {
  // ── API state ────────────────────────────────────────────────────
  bool _isLoading = false;
  List<Map<String, dynamic>> _categories = [];
  List<Map<String, dynamic>> _services = [];

  // ── Filter state ─────────────────────────────────────────────────
  String? _selectedCategory; // null = All
  double _distanceRange = 10;
  int _minRating = 0;

  // ── Search ───────────────────────────────────────────────────────
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadCategories();
    _loadServices();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  // ── Data loading ─────────────────────────────────────────────────
  Future<void> _loadCategories() async {
    try {
      final result = await ApiService.getCategories();
      if (!mounted) return;
      setState(() => _categories = result.cast<Map<String, dynamic>>());
    } catch (_) {
      // categories load silently — UI falls back gracefully
    }
  }

  Future<void> _loadServices({String? category, String? search}) async {
    setState(() => _isLoading = true);
    try {
      final result = await ApiService.getServices(
        category: category,
        search: search,
      );
      if (!mounted) return;
      setState(() {
        _services = result.cast<Map<String, dynamic>>();
        _isLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Connection error')),
      );
    }
  }

  // ── Filter sheet ─────────────────────────────────────────────────
  void _showFilterSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _FilterSheet(
        categories: _categories,
        selectedCategory: _selectedCategory,
        distanceRange: _distanceRange,
        minRating: _minRating,
        onApply: (cat, dist, rating) {
          setState(() {
            _selectedCategory = cat;
            _distanceRange = dist;
            _minRating = rating;
          });
          _loadServices(
            category: cat,
            search: _searchController.text.trim(),
          );
          Navigator.pop(ctx);
        },
      ),
    );
  }

  // ── Build ────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
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
                controller: _searchController,
                hintText: 'Search services in Vaughan...',
                leading: const Icon(Icons.search, color: AppColors.textMuted),
                trailing: [
                  if (_searchController.text.isNotEmpty)
                    IconButton(
                      icon: const Icon(Icons.close, color: AppColors.textMuted),
                      onPressed: () {
                        _searchController.clear();
                        _loadServices(category: _selectedCategory);
                      },
                    ),
                  IconButton(
                    icon: const Icon(Icons.tune, color: AppColors.primary),
                    onPressed: _showFilterSheet,
                  ),
                ],
                onSubmitted: (val) => _loadServices(
                  category: _selectedCategory,
                  search: val,
                ),
                onChanged: (_) => setState(() {}), // rebuild trailing clear btn
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

            // ── Category Chips ─────────────────────────────────────
            SizedBox(
              height: 40,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                children: [
                  // "All" chip
                  _CategoryChip(
                    label: 'All',
                    selected: _selectedCategory == null,
                    onTap: () {
                      setState(() => _selectedCategory = null);
                      _loadServices(search: _searchController.text.trim());
                    },
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  // Real categories from API
                  ..._categories.map((cat) {
                    final name = cat['name'] as String;
                    return Padding(
                      padding: const EdgeInsets.only(right: AppSpacing.sm),
                      child: _CategoryChip(
                        label: name,
                        selected: _selectedCategory == name,
                        onTap: () {
                          setState(() => _selectedCategory = name);
                          _loadServices(
                            category: name,
                            search: _searchController.text.trim(),
                          );
                        },
                      ),
                    );
                  }),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.sm),

            // ── Results count ──────────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
              child: Row(
                children: [
                  Text(
                    '${_services.length} services found',
                    style: AppTextStyles.bodySmall(color: AppColors.textMuted),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.sm),

            // ── Results Grid ───────────────────────────────────────
            Expanded(
              child: _buildResults(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResults() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    if (_services.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.search_off, size: 64, color: AppColors.textFaint),
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
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
      itemCount: _services.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: AppSpacing.md,
        crossAxisSpacing: AppSpacing.md,
        childAspectRatio: 0.85,
      ),
      itemBuilder: (context, index) {
        final s = _services[index];
        return _ResultCard(service: s);
      },
    );
  }
}

/// ── Category Chip Widget ─────────────────────────────────────────────
class _CategoryChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _CategoryChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.sm),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadius.chip),
          border: Border.all(
            color: selected ? AppColors.primary : AppColors.border,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.white : AppColors.textPrimary,
            fontWeight: FontWeight.w500,
            fontSize: 13,
          ),
        ),
      ),
    );
  }
}

/// ── Result Card Widget ───────────────────────────────────────────────
class _ResultCard extends StatelessWidget {
  final Map<String, dynamic> service;

  const _ResultCard({required this.service});

  @override
  Widget build(BuildContext context) {
    final title = service['title'] ?? service['name'] ?? 'Service';
    final provider = service['provider']?['displayName'] ?? '';
    final category = service['category'] ?? '';
    final price = service['basePrice'] != null
        ? '\$${service['basePrice']}'
        : (service['price']?.toString() ?? '');
    final rating = service['rating']?.toString() ?? '—';

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
            child: const Icon(Icons.build_circle, size: 36, color: AppColors.primary),
          ),
          // ── Info ─────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: AppTextStyles.titleMedium(color: AppColors.textPrimary),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  provider,
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
                      rating,
                      style: AppTextStyles.caption(color: AppColors.textSecondary),
                    ),
                    const Spacer(),
                    Text(
                      price,
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
  final List<Map<String, dynamic>> categories;
  final String? selectedCategory;
  final double distanceRange;
  final int minRating;
  final void Function(String? category, double distance, int rating) onApply;

  const _FilterSheet({
    required this.categories,
    required this.selectedCategory,
    required this.distanceRange,
    required this.minRating,
    required this.onApply,
  });

  @override
  State<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<_FilterSheet> {
  String? _selectedCategory;
  late double _distanceRange;
  late int _minRating;

  @override
  void initState() {
    super.initState();
    _selectedCategory = widget.selectedCategory;
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
            children: [
              // "All" option
              _buildCategoryChip(null, 'All'),
              // Real categories from API
              ...widget.categories.map((cat) {
                final name = cat['name'] as String;
                return _buildCategoryChip(name, name);
              }),
            ],
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
                _selectedCategory,
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

  Widget _buildCategoryChip(String? value, String label) {
    final selected = _selectedCategory == value;
    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: (val) {
        setState(() {
          _selectedCategory = val ? value : null;
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
  }
}
