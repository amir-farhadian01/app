import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../routing/app_navigator.dart';
import '../services/neighborly_api_service.dart';
import '../widgets/home/service_card.dart';
import '../widgets/home/provider_card.dart';

/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// CustomerHomeScreen — redesigned customer home tab
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Sections: SliverAppBar, Search, Categories, Featured, Nearby Providers.
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class CustomerHomeScreen extends StatefulWidget {
  const CustomerHomeScreen({super.key});

  @override
  State<CustomerHomeScreen> createState() => _CustomerHomeScreenState();
}

class _CustomerHomeScreenState extends State<CustomerHomeScreen> {
  int _selectedCategoryIndex = 0;

  // ── MOCK: Hardcoded categories ─────────────────────────────────
  static const List<_CategoryData> _categories = [
    _CategoryData(name: 'Cleaning', icon: Icons.cleaning_services),
    _CategoryData(name: 'Plumbing', icon: Icons.plumbing),
    _CategoryData(name: 'Electrical', icon: Icons.electrical_services),
    _CategoryData(name: 'Painting', icon: Icons.format_paint),
    _CategoryData(name: 'Moving', icon: Icons.local_shipping),
    _CategoryData(name: 'HVAC', icon: Icons.ac_unit),
    _CategoryData(name: 'Gardening', icon: Icons.yard),
    _CategoryData(name: 'More', icon: Icons.more_horiz),
  ];

  // ── MOCK: Featured services ────────────────────────────────────
  static const List<_FeaturedService> _featuredServices = [
    _FeaturedService(
      title: 'Deep Cleaning',
      providerName: 'CleanPro Inc.',
      rating: 4.8,
      reviewCount: 124,
      price: 49,
      icon: Icons.cleaning_services,
    ),
    _FeaturedService(
      title: 'Pipe Repair',
      providerName: 'PipeMaster Co.',
      rating: 4.9,
      reviewCount: 89,
      price: 65,
      icon: Icons.plumbing,
    ),
    _FeaturedService(
      title: 'Wiring Installation',
      providerName: 'VoltFix Ltd.',
      rating: 4.7,
      reviewCount: 203,
      price: 55,
      icon: Icons.electrical_services,
    ),
  ];

  // ── MOCK: Nearby providers ─────────────────────────────────────
  static const List<_NearbyProvider> _nearbyProviders = [
    _NearbyProvider(
      name: 'Sarah Johnson',
      serviceType: 'Professional Cleaning',
      rating: 4.9,
      reviewCount: 312,
      initials: 'SJ',
    ),
    _NearbyProvider(
      name: 'Mike Rodriguez',
      serviceType: 'Plumbing Services',
      rating: 4.8,
      reviewCount: 178,
      initials: 'MR',
    ),
    _NearbyProvider(
      name: 'Emily Chen',
      serviceType: 'Electrical Repairs',
      rating: 4.7,
      reviewCount: 95,
      initials: 'EC',
    ),
    _NearbyProvider(
      name: 'David Kim',
      serviceType: 'Painting & Decorating',
      rating: 4.9,
      reviewCount: 256,
      initials: 'DK',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final api = context.watch<NeighborlyApiService>();
    final user = api.user;
    final firstName = () {
      final fn = user?.firstName?.trim();
      if (fn != null && fn.isNotEmpty) return fn;
      final dn = (user?.displayName ?? '').trim();
      if (dn.isEmpty) return 'there';
      return dn.split(' ').first;
    }();
    final initials = () {
      final n = (user?.displayName ?? '').trim();
      if (n.isEmpty) return '?';
      final parts = n.split(RegExp(r'\s+')).where((e) => e.isNotEmpty).toList();
      if (parts.length >= 2) return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
      return n.length >= 2 ? n.substring(0, 2).toUpperCase() : n[0].toUpperCase();
    }();
    final avatarUrl = user?.photoURL;

    return CustomScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      slivers: [
        // ── 1. SliverAppBar ──────────────────────────────────────
        SliverAppBar(
          pinned: false,
          floating: true,
          backgroundColor: const Color(0xFFF8F7F4),
          surfaceTintColor: Colors.transparent,
          elevation: 0,
          scrolledUnderElevation: 0,
          titleSpacing: 0,
          title: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                // Avatar
                CircleAvatar(
                  radius: 18,
                  backgroundColor: const Color(0xFF007C85),
                  backgroundImage: (avatarUrl != null && avatarUrl.isNotEmpty)
                      ? NetworkImage(avatarUrl)
                      : null,
                  child: (avatarUrl == null || avatarUrl.isEmpty)
                      ? Text(
                          initials,
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        )
                      : null,
                ),
                const SizedBox(width: 10),
                // Greeting
                Text(
                  'Good morning, $firstName 👋',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF1A1A1A),
                  ),
                ),
                const Spacer(),
                // Notification bell
                Stack(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.notifications_outlined),
                      color: const Color(0xFF1A1A1A),
                      onPressed: () {},
                    ),
                    // MOCK: badge
                    Positioned(
                      right: 6,
                      top: 6,
                      child: Container(
                        width: 18,
                        height: 18,
                        decoration: const BoxDecoration(
                          color: Color(0xFF007C85),
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: Text(
                            '3',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),

        // ── 2. Search Bar ────────────────────────────────────────
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: GestureDetector(
              onTap: () => neighborlyNavigatorKey.currentState
                  ?.pushNamed('/explore'),
              child: Container(
                height: 48,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE5E7EB)),
                ),
                child: Row(
                  children: [
                    const SizedBox(width: 14),
                    const Icon(
                      Icons.search,
                      size: 20,
                      color: Color(0xFF6B7280),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      'Search services near you...',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 14,
                        color: const Color(0xFFB0B7C3),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),

        // ── 3. Categories Row ────────────────────────────────────
        SliverToBoxAdapter(
          child: SizedBox(
            height: 100,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _categories.length,
              itemBuilder: (context, index) {
                final cat = _categories[index];
                final selected = _selectedCategoryIndex == index;
                return Padding(
                  padding: const EdgeInsets.only(right: 12),
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedCategoryIndex = index),
                    child: Container(
                      width: 72,
                      height: 80,
                      decoration: BoxDecoration(
                        color: selected
                            ? const Color(0xFFE0F4F5)
                            : Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: selected
                              ? const Color(0xFF007C85)
                              : const Color(0xFFE5E7EB),
                          width: selected ? 1.5 : 1,
                        ),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            cat.icon,
                            size: 24,
                            color: selected
                                ? const Color(0xFF007C85)
                                : const Color(0xFF6B7280),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            cat.name,
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                              color: selected
                                  ? const Color(0xFF007C85)
                                  : const Color(0xFF6B7280),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ),

        // ── 4. Featured Services ─────────────────────────────────
        SliverToBoxAdapter(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Section header
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Featured',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF1A1A1A),
                      ),
                    ),
                    TextButton(
                      onPressed: () => neighborlyNavigatorKey.currentState
                          ?.pushNamed('/explore'),
                      style: TextButton.styleFrom(
                        padding: EdgeInsets.zero,
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      child: Text(
                        'See all',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF007C85),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              // Horizontal scroll
              SizedBox(
                height: 220,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: _featuredServices.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 12),
                  itemBuilder: (context, index) {
                    final s = _featuredServices[index];
                    return ServiceCard(
                      title: s.title,
                      providerName: s.providerName,
                      rating: s.rating,
                      reviewCount: s.reviewCount,
                      price: s.price,
                      icon: s.icon,
                      onTap: () => neighborlyNavigatorKey.currentState
                          ?.pushNamed('/orders/new?entryPoint=direct'),
                    );
                  },
                ),
              ),
            ],
          ),
        ),

        // ── 5. Nearby Providers ──────────────────────────────────
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Near You',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF1A1A1A),
                  ),
                ),
                TextButton(
                  onPressed: () => neighborlyNavigatorKey.currentState
                      ?.pushNamed('/explore'),
                  style: TextButton.styleFrom(
                    padding: EdgeInsets.zero,
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: Text(
                    'See all',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF007C85),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),

        // Provider list
        SliverList(
          delegate: SliverChildBuilderDelegate(
            (context, index) {
              final p = _nearbyProviders[index];
              return Padding(
                padding: EdgeInsets.fromLTRB(
                  16,
                  index == 0 ? 8 : 0,
                  16,
                  0,
                ),
                child: ProviderCard(
                  name: p.name,
                  serviceType: p.serviceType,
                  rating: p.rating,
                  reviewCount: p.reviewCount,
                  initials: p.initials,
                  onTap: () => neighborlyNavigatorKey.currentState
                      ?.pushNamed('/orders/new?entryPoint=direct'),
                ),
              );
            },
            childCount: _nearbyProviders.length,
          ),
        ),

        // ── 6. Bottom spacing ────────────────────────────────────
        const SliverToBoxAdapter(child: SizedBox(height: 80)),
      ],
    );
  }
}

// ── MOCK: Data classes ─────────────────────────────────────────────
class _CategoryData {
  final String name;
  final IconData icon;
  const _CategoryData({required this.name, required this.icon});
}

class _FeaturedService {
  final String title;
  final String providerName;
  final double rating;
  final int reviewCount;
  final double price;
  final IconData icon;
  const _FeaturedService({
    required this.title,
    required this.providerName,
    required this.rating,
    required this.reviewCount,
    required this.price,
    required this.icon,
  });
}

class _NearbyProvider {
  final String name;
  final String serviceType;
  final double rating;
  final int reviewCount;
  final String initials;
  const _NearbyProvider({
    required this.name,
    required this.serviceType,
    required this.rating,
    required this.reviewCount,
    required this.initials,
  });
}
