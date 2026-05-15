import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/app_theme.dart';
import '../core/services/api_client.dart';
import '../core/services/feed_service.dart';

/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Home Screen — NeighborHub main dashboard
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final FeedService _feedService = FeedService();

  List<Map<String, dynamic>> _posts = [];
  List<Map<String, dynamic>> _categories = [];
  Map<String, dynamic> _userStats = {};
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final results = await Future.wait([
        _feedService.getPosts(),
        _feedService.getCategories(),
        _feedService.getUserStats(),
      ]);
      if (mounted) {
        setState(() {
          _posts = results[0] as List<Map<String, dynamic>>;
          _categories = results[1] as List<Map<String, dynamic>>;
          _userStats = results[2] as Map<String, dynamic>;
          _isLoading = false;
        });
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message), behavior: SnackBarBehavior.floating),
        );
        setState(() => _isLoading = false);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: NeighborlyColors.bgPrimary,
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _loadData,
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _buildAppBar(),
                      const SizedBox(height: 16),
                      _buildHeroCard(),
                      const SizedBox(height: 20),
                      _buildGreeting(),
                      const SizedBox(height: 16),
                      _buildSearchBar(),
                      const SizedBox(height: 20),
                      _buildCategoryChips(),
                      const SizedBox(height: 24),
                      _buildFinanceSection(),
                      const SizedBox(height: 24),
                      _buildLocalNews(),
                      const SizedBox(height: 24),
                      _buildLocalEvents(),
                      const SizedBox(height: 24),
                      _buildInteractionScore(),
                    ],
                  ),
                ),
              ),
      ),
    );
  }

  // ── App Bar ──────────────────────────────────────────────────────

  Widget _buildAppBar() {
    return Row(
      children: [
        // Location pill
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: NeighborlyColors.bgCard,
            borderRadius: BorderRadius.circular(24),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('📍', style: TextStyle(fontSize: 14)),
              const SizedBox(width: 6),
              Text(
                'Vaughan, ON',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: NeighborlyColors.textPrimary,
                ),
              ),
            ],
          ),
        ),
        const Spacer(),
        // Bell icon with badge
        Stack(
          children: [
            IconButton(
              onPressed: () {},
              icon: const Icon(Icons.notifications_outlined, color: NeighborlyColors.textPrimary),
            ),
            Positioned(
              right: 8,
              top: 8,
              child: Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(
                  color: NeighborlyColors.error,
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ],
        ),
        // Avatar
        GestureDetector(
          onTap: () {},
          child: Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: NeighborlyColors.accent.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Center(
              child: Text(
                'A',
                style: GoogleFonts.inter(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: NeighborlyColors.accent,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  // ── Hero Card ────────────────────────────────────────────────────

  Widget _buildHeroCard() {
    return Container(
      height: 180,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: const LinearGradient(
          colors: [Color(0xFF1A1A3E), Color(0xFF0D2137)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
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
                color: NeighborlyColors.accent.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
            ),
          ),
          Positioned(
            left: -10,
            bottom: -10,
            child: Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: NeighborlyColors.accentTeal.withValues(alpha: 0.08),
                shape: BoxShape.circle,
              ),
            ),
          ),
          // Content
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Spacer(),
                Text(
                  'Central Park Vaughan',
                  style: GoogleFonts.inter(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    // Weather chip
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '13°C · Sunny',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    const Spacer(),
                    // Alert chip
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: NeighborlyColors.error.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '🚨 Police Alert',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: NeighborlyColors.error,
                        ),
                      ),
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

  // ── Greeting ─────────────────────────────────────────────────────

  Widget _buildGreeting() {
    return Text(
      'Good morning, Amir 👋',
      style: GoogleFonts.inter(
        fontSize: 28,
        fontWeight: FontWeight.bold,
        color: NeighborlyColors.textPrimary,
      ),
    );
  }

  // ── Search Bar ───────────────────────────────────────────────────

  Widget _buildSearchBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: NeighborlyColors.bgCard,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Row(
        children: [
          const Icon(Icons.search, color: NeighborlyColors.textSecondary, size: 20),
          const SizedBox(width: 12),
          Text(
            'Search services in your area...',
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w400,
              color: NeighborlyColors.textFaint,
            ),
          ),
        ],
      ),
    );
  }

  // ── Category Chips ───────────────────────────────────────────────

  Widget _buildCategoryChips() {
    final categories = [
      ('🏗️', 'Building'),
      ('🚗', 'Auto'),
      ('💅', 'Beauty'),
      ('🚌', 'Transport'),
      ('🏥', 'Health'),
    ];
    return SizedBox(
      height: 40,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: categories.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: NeighborlyColors.bgCard,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: NeighborlyColors.textFaint.withValues(alpha: 0.3)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(categories[index].$1, style: const TextStyle(fontSize: 16)),
                const SizedBox(width: 6),
                Text(
                  categories[index].$2,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: NeighborlyColors.textPrimary,
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  // ── Finance & Government ─────────────────────────────────────────

  Widget _buildFinanceSection() {
    final items = [
      ('🏦', 'TD Bank'),
      ('🏦', 'RBC'),
      ('📊', 'Credit Score'),
      ('🛡️', 'Insurance'),
      ('🏛️', 'ServiceOntario'),
      ('🏥', 'OHIP'),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Finance & Government',
          style: GoogleFonts.inter(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: NeighborlyColors.textPrimary,
          ),
        ),
        const SizedBox(height: 12),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 1.1,
          ),
          itemCount: items.length,
          itemBuilder: (context, index) {
            return Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: NeighborlyColors.bgCard,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(items[index].$1, style: const TextStyle(fontSize: 24)),
                  const SizedBox(height: 6),
                  Text(
                    items[index].$2,
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: NeighborlyColors.textPrimary,
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ],
    );
  }

  // ── Local News ───────────────────────────────────────────────────

  Widget _buildLocalNews() {
    final news = [
      ('Construction rates up 12% this week in Vaughan', '2h'),
      ('Police alert: Traffic delay on Major Mackenzie Dr', '45m'),
      ('Music Festival announced at Vaughan Mills — May 14', '5h'),
      ('Auto Expo: New dealerships joining Vaughan corridor', '1d'),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Local News',
          style: GoogleFonts.inter(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: NeighborlyColors.textPrimary,
          ),
        ),
        const SizedBox(height: 12),
        ...news.map((item) => Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: NeighborlyColors.bgCard,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      item.$1,
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: NeighborlyColors.textPrimary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: NeighborlyColors.bgCardLight,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      item.$2,
                      style: GoogleFonts.inter(
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                        color: NeighborlyColors.textSecondary,
                      ),
                    ),
                  ),
                ],
              ),
            )),
      ],
    );
  }

  // ── Local Events ─────────────────────────────────────────────────

  Widget _buildLocalEvents() {
    final events = [
      ('Craft Festival', 'May 10', 'Vaughan Mills'),
      ('Concert Night', 'May 14', 'Club district'),
      ('Auto Expo', 'May 18', 'Convention Ctr'),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Local Events',
          style: GoogleFonts.inter(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: NeighborlyColors.textPrimary,
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 140,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: events.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              return Container(
                width: 200,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: NeighborlyColors.bgCard,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      events[index].$1,
                      style: GoogleFonts.inter(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: NeighborlyColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      events[index].$2,
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: NeighborlyColors.accentTeal,
                      ),
                    ),
                    const Spacer(),
                    Text(
                      events[index].$3,
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w400,
                        color: NeighborlyColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  // ── Interaction Score ────────────────────────────────────────────

  Widget _buildInteractionScore() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: NeighborlyColors.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: NeighborlyColors.accent.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '2,840 pts',
                  style: GoogleFonts.inter(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: NeighborlyColors.accent,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '3.2 km · Your Reach',
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: NeighborlyColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Keep engaging to expand your neighborhood radius!',
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w400,
                    color: NeighborlyColors.textFaint,
                  ),
                ),
              ],
            ),
          ),
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: NeighborlyColors.accent.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Center(
              child: Icon(Icons.explore, color: NeighborlyColors.accent, size: 28),
            ),
          ),
        ],
      ),
    );
  }
}
