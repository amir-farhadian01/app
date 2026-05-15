import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/app_theme.dart';
import '../../core/widgets/skeleton_loader.dart';
import '../home/home_provider.dart';
import '../home/models/service_model.dart';

/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Explore Screen
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Full-screen search + grid of service categories.
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class ExploreScreen extends ConsumerStatefulWidget {
  const ExploreScreen({super.key});

  @override
  ConsumerState<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends ConsumerState<ExploreScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    if (value == _searchQuery) return;
    _searchQuery = value;
    // Debounce 500ms
    Future.delayed(const Duration(milliseconds: 500), () {
      if (_searchQuery == value) {
        ref.read(searchProvider.notifier).search(value);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: NeighborlyColors.bgPrimary,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: NeighborlySpacing.s16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: NeighborlySpacing.s12),

              // ── Top Bar ──────────────────────────────────────────
              Row(
                children: [
                  Text(
                    'Explore',
                    style: theme.textTheme.titleLarge?.copyWith(
                      color: NeighborlyColors.textPrimary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: NeighborlySpacing.s12),

              // ── Search input ─────────────────────────────────────
              TextField(
                controller: _searchController,
                autofocus: true,
                onChanged: _onSearchChanged,
                decoration: InputDecoration(
                  hintText: 'Search services, providers...',
                  prefixIcon: Icon(
                    Icons.search,
                    color: NeighborlyColors.accent,
                  ),
                  filled: true,
                  fillColor: NeighborlyColors.bgCard,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(NeighborlyRadius.xl),
                    borderSide: BorderSide.none,
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(NeighborlyRadius.xl),
                    borderSide: BorderSide.none,
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(NeighborlyRadius.xl),
                    borderSide: const BorderSide(
                      color: NeighborlyColors.accent,
                      width: 1.5,
                    ),
                  ),
                ),
              ),

              // Show search results or original content
              if (_searchQuery.isNotEmpty)
                _buildSearchResults()
              else
                _buildOriginalContent(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSearchResults() {
    final searchAsync = ref.watch(searchProvider);

    return searchAsync.when(
      data: (results) {
        if (results.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const SizedBox(height: NeighborlySpacing.s48),
                const Icon(
                  Icons.search_off,
                  size: 48,
                  color: NeighborlyColors.textSecondary,
                ),
                const SizedBox(height: NeighborlySpacing.s12),
                Text(
                  'No results found',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: NeighborlyColors.textSecondary,
                  ),
                ),
              ],
            ),
          );
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: NeighborlySpacing.s16),
            Text(
              "Results for '$_searchQuery'",
              style: theme.textTheme.titleSmall?.copyWith(
                color: NeighborlyColors.textPrimary,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: NeighborlySpacing.s12),
            ...results.take(3).map(
              (service) => Padding(
                padding: const EdgeInsets.only(bottom: NeighborlySpacing.s12),
                child: _CompactServiceCard(service: service),
              ),
            ),
          ],
        );
      },
      loading: () => Column(
        children: List.generate(3, (_) => Padding(
          padding: const EdgeInsets.only(bottom: NeighborlySpacing.s12),
          child: _SearchResultSkeleton(),
        )),
      ),
      error: (e, __) => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const SizedBox(height: NeighborlySpacing.s48),
            const Icon(Icons.error_outline, color: NeighborlyColors.error, size: 40),
            const SizedBox(height: 8),
            Text(
              'Search failed. Try again.',
              style: TextStyle(color: NeighborlyColors.textFaint),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOriginalContent() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: NeighborlySpacing.s20),

        // ── Browse Categories ─────────────────────────────────────
        Text(
          'Browse Categories',
          style: theme.textTheme.titleMedium?.copyWith(
            color: NeighborlyColors.textPrimary,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: NeighborlySpacing.s12),
        _buildCategoryGrid(),

        const SizedBox(height: NeighborlySpacing.s24),

        // ── Top Rated ─────────────────────────────────────────────
        Text(
          'Top Rated',
          style: theme.textTheme.titleMedium?.copyWith(
            color: NeighborlyColors.textPrimary,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: NeighborlySpacing.s12),
        _buildTopRatedServices(),
      ],
    );
  }

  Widget _buildCategoryGrid() {
    final categoriesAsync = ref.watch(categoriesProvider);

    return categoriesAsync.when(
      data: (categories) {
        // Use static 6 categories as fallback if API returns empty
        final displayNames = categories.isNotEmpty
            ? categories.take(6).map((c) => c.name).toList()
            : _defaultCategories;

        return GridView.builder(
          physics: const NeverScrollableScrollPhysics(),
          shrinkWrap: true,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.6,
          ),
          itemCount: displayNames.length,
          itemBuilder: (context, index) {
            final catName = displayNames[index];
            return GestureDetector(
              onTap: () {
                ref.read(searchProvider.notifier).search('category:${catName.toLowerCase()}');
              },
              child: Container(
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [NeighborlyColors.accent, NeighborlyColors.accentTeal],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(NeighborlyRadius.sm),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      _iconForCategory(catName),
                      size: 28,
                      color: Colors.white,
                    ),
                    const SizedBox(height: NeighborlySpacing.s8),
                    Text(
                      catName,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
      loading: () => GridView.builder(
        physics: const NeverScrollableScrollPhysics(),
        shrinkWrap: true,
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.6,
        ),
        itemCount: 6,
        itemBuilder: (_, __) => const SkeletonBox(
          width: double.infinity,
          height: 60,
          borderRadius: 12,
        ),
      ),
      error: (_, __) => const SizedBox.shrink(),
    );
  }

  Widget _buildTopRatedServices() {
    final servicesAsync = ref.watch(nearbyServicesProvider);

    return servicesAsync.when(
      data: (services) {
        final top = services.take(4).toList();
        if (top.isEmpty) {
          // Show static placeholder cards
          return Column(
            children: List.generate(4, (index) => Padding(
              padding: const EdgeInsets.only(bottom: NeighborlySpacing.s12),
              child: _CompactServiceCard(
                service: ServiceModel(
                  id: 'placeholder_$index',
                  title: _placeholderServices[index]['title']!,
                  providerName: _placeholderServices[index]['provider']!,
                  price: 30.0,
                  rating: 4.9,
                ),
              ),
            )),
          );
        }
        return Column(
          children: top.map((service) => Padding(
            padding: const EdgeInsets.only(bottom: NeighborlySpacing.s12),
            child: _CompactServiceCard(service: service),
          )).toList(),
        );
      },
      loading: () => Column(
        children: List.generate(4, (_) => Padding(
          padding: const EdgeInsets.only(bottom: NeighborlySpacing.s12),
          child: _TopRatedSkeleton(),
        )),
      ),
      error: (_, __) => const SizedBox.shrink(),
    );
  }

  ThemeData get theme => Theme.of(context);

  IconData _iconForCategory(String name) {
    switch (name.toLowerCase()) {
      case 'cleaning':
      case 'home':
        return Icons.cleaning_services;
      case 'plumbing':
        return Icons.plumbing;
      case 'electrical':
        return Icons.electrical_services;
      case 'gardening':
      case 'yard':
        return Icons.yard;
      case 'moving':
      case 'local_shipping':
        return Icons.local_shipping;
      case 'painting':
      case 'format_paint':
        return Icons.format_paint;
      case 'carpentry':
      case 'handyman':
        return Icons.handyman;
      case 'beauty':
        return Icons.spa;
      case 'auto':
        return Icons.directions_car;
      case 'food':
        return Icons.restaurant;
      case 'events':
        return Icons.celebration;
      case 'health':
        return Icons.favorite;
      case 'education':
        return Icons.school;
      case 'tech':
        return Icons.computer;
      default:
        return Icons.miscellaneous_services;
    }
  }

  /// Default category names when API returns empty.
  static const List<String> _defaultCategories = [
    'Cleaning',
    'Plumbing',
    'Electrical',
    'Gardening',
    'Moving',
    'Carpentry',
  ];

  /// Placeholder services when API returns empty.
  static const List<Map<String, String>> _placeholderServices = [
    {'title': 'Professional Cleaning', 'provider': 'CleanPro Inc.'},
    {'title': 'Expert Plumbing', 'provider': 'PipeMaster Co.'},
    {'title': 'Electrical Repair', 'provider': 'VoltFix Ltd.'},
    {'title': 'Garden Design', 'provider': 'GreenScape'},
  ];
}

/// Compact service card used in search results and top rated list.
class _CompactServiceCard extends StatelessWidget {
  final ServiceModel service;

  const _CompactServiceCard({required this.service});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(NeighborlySpacing.s12),
      decoration: BoxDecoration(
        color: NeighborlyColors.bgCard,
        borderRadius: BorderRadius.circular(NeighborlyRadius.sm),
      ),
      child: Row(
        children: [
          // Image 80x80
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(NeighborlyRadius.xs),
              gradient: const LinearGradient(
                colors: [NeighborlyColors.accent, NeighborlyColors.accentTeal],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: service.imageUrl != null
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(NeighborlyRadius.xs),
                    child: Image.network(
                      service.imageUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const Center(
                        child: Icon(
                          Icons.cleaning_services,
                          color: Colors.white38,
                          size: 30,
                        ),
                      ),
                    ),
                  )
                : const Center(
                    child: Icon(
                      Icons.cleaning_services,
                      color: Colors.white38,
                      size: 30,
                    ),
                  ),
          ),
          const SizedBox(width: NeighborlySpacing.s12),
          // Content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  service.title,
                  style: theme.textTheme.bodyLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: NeighborlyColors.textPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  service.providerName,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: NeighborlyColors.textSecondary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.star, size: 12, color: Colors.amber),
                    const SizedBox(width: 2),
                    Text(
                      service.rating.toStringAsFixed(1),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: NeighborlyColors.textSecondary,
                      ),
                    ),
                    const SizedBox(width: NeighborlySpacing.s8),
                    const Icon(Icons.location_on, size: 12, color: NeighborlyColors.textSecondary),
                    const SizedBox(width: 2),
                    Text(
                      '0.5 km',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: NeighborlyColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: NeighborlySpacing.s8),
          // Price
          Text(
            service.formattedPrice,
            style: theme.textTheme.bodyLarge?.copyWith(
              fontWeight: FontWeight.bold,
              color: NeighborlyColors.accent,
            ),
          ),
        ],
      ),
    );
  }
}

/// Skeleton for search results.
class _SearchResultSkeleton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(NeighborlySpacing.s12),
      decoration: BoxDecoration(
        color: NeighborlyColors.bgCard,
        borderRadius: BorderRadius.circular(NeighborlyRadius.sm),
      ),
      child: Row(
        children: [
          const SkeletonBox(width: 80, height: 80, borderRadius: 12),
          const SizedBox(width: NeighborlySpacing.s12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SkeletonBox(width: 140, height: 12, borderRadius: 4),
                const SizedBox(height: 4),
                const SkeletonBox(width: 90, height: 10, borderRadius: 4),
                const SizedBox(height: 4),
                const SkeletonBox(width: 110, height: 10, borderRadius: 4),
              ],
            ),
          ),
          const SkeletonBox(width: 50, height: 14, borderRadius: 4),
        ],
      ),
    );
  }
}

/// Skeleton for top rated items.
class _TopRatedSkeleton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(NeighborlySpacing.s12),
      decoration: BoxDecoration(
        color: NeighborlyColors.bgCard,
        borderRadius: BorderRadius.circular(NeighborlyRadius.sm),
      ),
      child: Row(
        children: [
          const SkeletonBox(width: 80, height: 80, borderRadius: 12),
          const SizedBox(width: NeighborlySpacing.s12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SkeletonBox(width: 140, height: 12, borderRadius: 4),
                const SizedBox(height: 4),
                const SkeletonBox(width: 90, height: 10, borderRadius: 4),
                const SizedBox(height: 4),
                const SkeletonBox(width: 110, height: 10, borderRadius: 4),
              ],
            ),
          ),
          const SkeletonBox(width: 50, height: 14, borderRadius: 4),
        ],
      ),
    );
  }
}
