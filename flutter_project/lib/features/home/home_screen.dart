import 'package:flutter/material.dart';

import '../../core/app_theme.dart';

/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Home Screen
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Sections: Top Bar, Search, Category Chips, Nearby Services, Community Feed.
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedCategoryIndex = 0;

  final List<String> _categories = [
    'All',
    'Cleaning',
    'Plumbing',
    'Electrical',
    'Gardening',
    'Moving',
  ];

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

              // ── SECTION A: Top Bar ──────────────────────────────
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Left: avatar + greeting
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 19,
                        backgroundColor: NeighborlyColors.bgCardLight,
                        child: Container(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: NeighborlyColors.accentTeal,
                              width: 2,
                            ),
                          ),
                          child: CircleAvatar(
                            radius: 17,
                            backgroundColor: NeighborlyColors.bgCardLight,
                            child: Text(
                              'U',
                              style: theme.textTheme.titleMedium?.copyWith(
                                color: NeighborlyColors.accentTeal,
                                fontSize: 16,
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: NeighborlySpacing.s12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Good morning,',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: NeighborlyColors.textSecondary,
                            ),
                          ),
                          Text(
                            'Neighbor',
                            style: theme.textTheme.titleMedium?.copyWith(
                              color: NeighborlyColors.textPrimary,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  // Right: notification + search icons
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.notifications_outlined),
                        color: NeighborlyColors.textPrimary,
                        onPressed: () {},
                      ),
                      IconButton(
                        icon: const Icon(Icons.search),
                        color: NeighborlyColors.textPrimary,
                        onPressed: () {},
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: NeighborlySpacing.s16),

              // ── SECTION B: Search bar ──────────────────────────
              TextField(
                decoration: InputDecoration(
                  hintText: 'Search services, providers...',
                  prefixIcon: const Icon(
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
              const SizedBox(height: NeighborlySpacing.s12),

              // ── SECTION C: Category chips ──────────────────────
              SizedBox(
                height: 40,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: _categories.length,
                  itemBuilder: (context, index) {
                    final isSelected = index == _selectedCategoryIndex;
                    return Padding(
                      padding: const EdgeInsets.only(right: NeighborlySpacing.s12),
                      child: InkWell(
                        onTap: () => setState(() => _selectedCategoryIndex = index),
                        borderRadius: BorderRadius.circular(NeighborlyRadius.lg),
                        child: Container(
                          height: 40,
                          padding: const EdgeInsets.symmetric(
                            horizontal: NeighborlySpacing.s16,
                          ),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? NeighborlyColors.accent
                                : NeighborlyColors.bgCard,
                            borderRadius: BorderRadius.circular(NeighborlyRadius.lg),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            _categories[index],
                            style: theme.textTheme.bodySmall?.copyWith(
                              fontSize: 13,
                              fontWeight:
                                  isSelected ? FontWeight.bold : FontWeight.w500,
                              color: isSelected
                                  ? Colors.white
                                  : NeighborlyColors.textSecondary,
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: NeighborlySpacing.s24),

              // ── SECTION D: Nearby Services ─────────────────────
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Nearby Services',
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: NeighborlyColors.textPrimary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  TextButton(
                    onPressed: () {},
                    child: Text(
                      'See all',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: NeighborlyColors.accent,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: NeighborlySpacing.s8),

              // Service cards horizontal list
              SizedBox(
                height: 230,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: 4,
                  itemBuilder: (context, index) {
                    return _buildServiceCard(index);
                  },
                ),
              ),
              const SizedBox(height: NeighborlySpacing.s24),

              // ── SECTION E: Community Feed ──────────────────────
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Community Feed',
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: NeighborlyColors.textPrimary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  TextButton(
                    onPressed: () {},
                    child: Text(
                      'See all',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: NeighborlyColors.accent,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: NeighborlySpacing.s8),

              // Feed placeholder items
              ...List.generate(3, (index) => _buildFeedItem(index)),
              const SizedBox(height: 80),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildServiceCard(int index) {
    final theme = Theme.of(context);
    final serviceNames = [
      'Professional Cleaning',
      'Expert Plumbing',
      'Electrical Repair',
      'Garden Design',
    ];
    final providerNames = [
      'CleanPro Inc.',
      'PipeMaster Co.',
      'VoltFix Ltd.',
      'GreenScape',
    ];

    return Container(
      width: 180,
      margin: const EdgeInsets.only(right: NeighborlySpacing.s12),
      decoration: BoxDecoration(
        color: NeighborlyColors.bgCard,
        borderRadius: BorderRadius.circular(NeighborlyRadius.md),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top 60% — gradient area
          Container(
            height: 138,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [NeighborlyColors.accent, NeighborlyColors.accentTeal],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: const Center(
              child: Icon(
                Icons.cleaning_services,
                size: 40,
                color: Colors.white38,
              ),
            ),
          ),
          // Bottom 40% — content
          Padding(
            padding: const EdgeInsets.all(NeighborlySpacing.s12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  serviceNames[index],
                  style: theme.textTheme.bodyLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: NeighborlyColors.textPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  providerNames[index],
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: NeighborlyColors.textSecondary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.star, size: 14, color: Colors.amber),
                    const SizedBox(width: 2),
                    Text(
                      '4.8',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: NeighborlyColors.textSecondary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  'From \$25',
                  style: theme.textTheme.bodyLarge?.copyWith(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: NeighborlyColors.accent,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFeedItem(int index) {
    final theme = Theme.of(context);
    final feedUsers = [
      'Sarah J.',
      'Mike R.',
      'Emma L.',
    ];
    const feedCategories = [
      'Plumbing',
      'Moving',
      'Electrical',
    ];

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: NeighborlySpacing.s12),
      padding: const EdgeInsets.all(NeighborlySpacing.s12),
      decoration: BoxDecoration(
        color: NeighborlyColors.bgCard,
        borderRadius: BorderRadius.circular(NeighborlyRadius.sm),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: NeighborlyColors.accent.withValues(alpha: 0.15),
            child: const Icon(
              Icons.person,
              size: 20,
              color: NeighborlyColors.accent,
            ),
          ),
          const SizedBox(width: NeighborlySpacing.s8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${feedUsers[index]} posted a request',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: NeighborlyColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${feedCategories[index]} · 2 min ago',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: NeighborlyColors.textSecondary,
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
