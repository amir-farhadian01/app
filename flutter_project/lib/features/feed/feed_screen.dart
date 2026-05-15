import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../services/api_service.dart';
import '../../widgets/home/provider_card.dart';
import '../../widgets/home/service_card.dart';

/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Feed Screen — Home Tab (Redesigned)
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Location chip, greeting, hero cards, categories, providers, services.
/// Providers and categories loaded from API; hero cards and services are mock.
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class FeedScreen extends StatefulWidget {
  const FeedScreen({super.key});

  @override
  State<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends State<FeedScreen> {
  bool _isLoading = false;
  List<Map<String, dynamic>> _providers = [];
  List<Map<String, dynamic>> _categories = [];

  @override
  void initState() {
    super.initState();
    Future.microtask(() => _loadData());
  }

  Future<void> _loadData() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    try {
      final providers = await ApiService.getNearbyProviders(43.8, -79.5);
      final categories = await ApiService.getCategories();
      if (!mounted) return;
      setState(() {
        _providers = providers.cast<Map<String, dynamic>>();
        _categories = categories.cast<Map<String, dynamic>>();
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

  // ── Mock Hero Cards ──────────────────────────────────────────────
  static const List<_HeroCardData> _heroCards = [
    _HeroCardData(
      title: 'Professional Plumbing Services',
      category: 'Plumbing',
      emoji: '🔧',
      gradientStart: Color(0xFF01696F),
      gradientEnd: Color(0xFF014D52),
    ),
    _HeroCardData(
      title: 'Expert Home Cleaning at Your Doorstep',
      category: 'Cleaning',
      emoji: '🧹',
      gradientStart: Color(0xFF007C85),
      gradientEnd: Color(0xFF015A61),
    ),
  ];

  // ── Mock Categories (fallback) ───────────────────────────────────
  static const List<_CategoryData> _mockCategories = [
    _CategoryData(name: 'Plumbing', emoji: '🔧'),
    _CategoryData(name: 'Electrical', emoji: '⚡'),
    _CategoryData(name: 'Cleaning', emoji: '🧹'),
    _CategoryData(name: 'Painting', emoji: '🎨'),
    _CategoryData(name: 'Moving', emoji: '📦'),
    _CategoryData(name: 'Garden', emoji: '🌿'),
  ];

  // ── Mock Recent Services ─────────────────────────────────────────
  // TODO: implement endpoint GET /api/services/recent
  static const List<_ServiceData> _services = [
    _ServiceData(name: 'Pipe Repair', icon: Icons.plumbing, priceRange: '\$40–\$80', status: 'Available', statusColor: Color(0xFF437A22)),
    _ServiceData(name: 'Outlet Installation', icon: Icons.electrical_services, priceRange: '\$35–\$60', status: 'Busy', statusColor: Color(0xFFF59E0B)),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            // ── Header: Location + Greeting + Avatar ──────────────
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.lg, AppSpacing.md, AppSpacing.lg, AppSpacing.sm,
                ),
                child: Row(
                  children: [
                    // Location chip
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.md,
                        vertical: AppSpacing.sm,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.primaryLight,
                        borderRadius: BorderRadius.circular(AppRadius.chip),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.location_on, size: 16, color: AppColors.primary),
                          const SizedBox(width: 4),
                          Text(
                            'Vaughan, ON',
                            style: AppTextStyles.bodySmall(color: AppColors.primary),
                          ),
                        ],
                      ),
                    ),
                    const Spacer(),
                    // Greeting + Avatar column
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          'Good morning, Amir 👋',
                          style: AppTextStyles.bodySmall(color: AppColors.textMuted),
                        ),
                        const SizedBox(height: 4),
                        CircleAvatar(
                          radius: 20,
                          backgroundColor: AppColors.primary,
                          child: Text(
                            'A.F.',
                            style: AppTextStyles.bodySmall(color: Colors.white),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // ── Hero Cards (Horizontal Scroll) ────────────────────
            SliverToBoxAdapter(
              child: SizedBox(
                height: 160,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                  itemCount: _heroCards.length,
                  separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.md),
                  itemBuilder: (context, index) {
                    final card = _heroCards[index];
                    return _HeroCard(data: card);
                  },
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            // ── Category Row ──────────────────────────────────────
            SliverToBoxAdapter(
              child: SizedBox(
                height: 44,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                  itemCount: _categories.isNotEmpty ? _categories.length : _mockCategories.length,
                  separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.sm),
                  itemBuilder: (context, index) {
                    String label;
                    if (_categories.isNotEmpty) {
                      final cat = _categories[index];
                      label = cat['name'] ?? 'Category';
                    } else {
                      label = '${_mockCategories[index].emoji} ${_mockCategories[index].name}';
                    }
                    return FilterChip(
                      label: Text(label),
                      selected: index == 0,
                      onSelected: (_) {},
                      selectedColor: AppColors.primary,
                      checkmarkColor: Colors.white,
                      labelStyle: TextStyle(
                        color: index == 0 ? Colors.white : AppColors.textPrimary,
                        fontWeight: FontWeight.w500,
                        fontSize: 13,
                      ),
                      side: BorderSide.none,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AppRadius.chip),
                      ),
                    );
                  },
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.xxl),

            // ── Nearby Providers Section ───────────────────────────
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Nearby Providers',
                      style: AppTextStyles.headingSmall(color: AppColors.textPrimary),
                    ),
                    TextButton(
                      onPressed: () {},
                      child: const Text('See all'),
                    ),
                  ],
                ),
              ),
            ),
            if (_isLoading)
              const SliverToBoxAdapter(
                child: Center(
                  child: Padding(
                    padding: EdgeInsets.all(AppSpacing.xxl),
                    child: CircularProgressIndicator(),
                  ),
                ),
              )
            else if (_providers.isEmpty)
              const SliverToBoxAdapter(
                child: Center(
                  child: Padding(
                    padding: EdgeInsets.all(AppSpacing.xxl),
                    child: Text('No providers nearby'),
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                sliver: SliverList.separated(
                  itemCount: _providers.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 0),
                  itemBuilder: (context, index) {
                    final p = _providers[index];
                    return ProviderCard(
                      name: p['displayName'] ?? p['name'] ?? 'Provider',
                      serviceType: p['category'] ?? '',
                      rating: (p['rating'] ?? 0.0).toDouble(),
                      reviewCount: 42,
                      initials: p['initials'] ?? '?',
                      onTap: () {},
                    );
                  },
                ),
              ),
            const SizedBox(height: AppSpacing.lg),

            // ── Recent Services Section ────────────────────────────
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                child: Text(
                  'Recent Services',
                  style: AppTextStyles.headingSmall(color: AppColors.textPrimary),
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.lg, AppSpacing.md, AppSpacing.lg, AppSpacing.xxxl,
              ),
              sliver: SliverList.separated(
                itemCount: _services.length,
                separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
                itemBuilder: (context, index) {
                  final s = _services[index];
                  return _ServiceStatusCard(data: s);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// ── Hero Card Data Model ─────────────────────────────────────────────
class _HeroCardData {
  final String title;
  final String category;
  final String emoji;
  final Color gradientStart;
  final Color gradientEnd;

  const _HeroCardData({
    required this.title,
    required this.category,
    required this.emoji,
    required this.gradientStart,
    required this.gradientEnd,
  });
}

/// ── Category Data Model ──────────────────────────────────────────────
class _CategoryData {
  final String name;
  final String emoji;

  const _CategoryData({required this.name, required this.emoji});
}

/// ── Service Data Model ───────────────────────────────────────────────
class _ServiceData {
  final String name;
  final IconData icon;
  final String priceRange;
  final String status;
  final Color statusColor;

  const _ServiceData({
    required this.name,
    required this.icon,
    required this.priceRange,
    required this.status,
    required this.statusColor,
  });
}

/// ── Hero Card Widget ─────────────────────────────────────────────────
class _HeroCard extends StatelessWidget {
  final _HeroCardData data;

  const _HeroCard({required this.data});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 280,
      height: 160,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [data.gradientStart, data.gradientEnd],
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          // Decorative circles
          Positioned(
            right: -20,
            top: -20,
            child: Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.08),
              ),
            ),
          ),
          Positioned(
            left: -10,
            bottom: -10,
            child: Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.06),
              ),
            ),
          ),
          // Content
          Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Category badge
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${data.emoji} ${data.category}',
                    style: AppTextStyles.caption(color: Colors.white),
                  ),
                ),
                const Spacer(),
                Text(
                  data.title,
                  style: AppTextStyles.titleMedium(color: Colors.white),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// ── Service Status Card Widget ────────────────────────────────────────
class _ServiceStatusCard extends StatelessWidget {
  final _ServiceData data;

  const _ServiceStatusCard({required this.data});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
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
      child: Row(
        children: [
          // Icon
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              borderRadius: BorderRadius.circular(AppRadius.card),
            ),
            child: Icon(data.icon, color: AppColors.primary, size: 24),
          ),
          const SizedBox(width: AppSpacing.md),
          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  data.name,
                  style: AppTextStyles.titleMedium(color: AppColors.textPrimary),
                ),
                const SizedBox(height: 2),
                Text(
                  data.priceRange,
                  style: AppTextStyles.bodySmall(color: AppColors.textMuted),
                ),
              ],
            ),
          ),
          // Status badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: data.statusColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              data.status,
              style: AppTextStyles.caption(color: data.statusColor),
            ),
          ),
        ],
      ),
    );
  }
}
