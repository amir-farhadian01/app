import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/app_theme.dart';
import '../core/models/business_model.dart';
import '../core/models/service_model.dart';
import '../core/services/business_service.dart';

/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Business Profile Screen — AutoFix Vaughan
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class BusinessProfileScreen extends StatefulWidget {
  const BusinessProfileScreen({super.key});

  @override
  State<BusinessProfileScreen> createState() => _BusinessProfileScreenState();
}

class _BusinessProfileScreenState extends State<BusinessProfileScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final BusinessService _businessService = BusinessService();

  bool _isLoading = true;
  BusinessModel? _business;
  List<ServiceModel> _services = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    // Read businessId from route arguments
    final args = ModalRoute.of(context)?.settings.arguments;
    final businessId =
        (args is Map) ? (args['businessId'] as String?) ?? 'demo' : 'demo';

    try {
      final business =
          await _businessService.getBusinessProfile(businessId);
      final services =
          await _businessService.getBusinessServices(businessId);
      if (!mounted) return;
      setState(() {
        _business = business;
        _services = services;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      debugPrint('Error loading business profile: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: NeighborlyColors.bgPrimary,
      body: SafeArea(
        child: NestedScrollView(
          headerSliverBuilder: (context, innerBoxIsScrolled) => [
            SliverToBoxAdapter(child: _buildHeader()),
            SliverPersistentHeader(
              pinned: true,
              delegate: _TabBarDelegate(
                TabBar(
                  controller: _tabController,
                  indicatorColor: NeighborlyColors.accent,
                  indicatorWeight: 3,
                  indicatorSize: TabBarIndicatorSize.tab,
                  labelColor: NeighborlyColors.accent,
                  unselectedLabelColor: NeighborlyColors.textSecondary,
                  labelStyle:
                      GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w600),
                  unselectedLabelStyle:
                      GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w500),
                  tabs: const [
                    Tab(text: 'Packages'),
                    Tab(text: 'Inventory'),
                    Tab(text: 'Reviews'),
                    Tab(text: 'About'),
                  ],
                ),
              ),
            ),
          ],
          body: TabBarView(
            controller: _tabController,
            children: [
              _buildPackagesTab(),
              _buildPlaceholderTab('Inventory'),
              _buildPlaceholderTab('Reviews'),
              _buildPlaceholderTab('About'),
            ],
          ),
        ),
      ),
    );
  }

  // ── Header ───────────────────────────────────────────────────────

  Widget _buildHeader() {
    if (_isLoading) {
      return const SizedBox(
        height: 200,
        child: Center(child: CircularProgressIndicator()),
      );
    }

    final business = _business ?? BusinessModel.mock();
    final initial = business.name.isNotEmpty ? business.name[0] : '?';

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 20),
      child: Column(
        children: [
          // Avatar with primary gradient border
          Container(
            width: 88,
            height: 88,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: const LinearGradient(
                colors: [NeighborlyColors.accent, NeighborlyColors.accent],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              border: Border.all(color: NeighborlyColors.accent, width: 3),
            ),
            padding: const EdgeInsets.all(3),
            child: CircleAvatar(
              backgroundColor: NeighborlyColors.bgCard,
              child: Text(
                initial,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 34,
                  fontWeight: FontWeight.w700,
                  color: NeighborlyColors.accent,
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          // Verified badge
          if (business.isVerified)
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: NeighborlyColors.success.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(NeighborlyRadius.xl),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.verified, color: NeighborlyColors.success, size: 14),
                      const SizedBox(width: 4),
                      Text(
                        'Verified',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          color: NeighborlyColors.success,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          const SizedBox(height: 8),
          // Business name
          Text(
            business.name,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: NeighborlyColors.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            business.category != null ? '@${business.name.toLowerCase().replaceAll(' ', '_')} · ${business.category}' : '',
            style: GoogleFonts.inter(
              fontSize: 13,
              fontWeight: FontWeight.w400,
              color: NeighborlyColors.textSecondary,
            ),
          ),
          const SizedBox(height: 16),
          // Stats row
          Wrap(
            spacing: 12,
            runSpacing: 8,
            alignment: WrapAlignment.center,
            children: [
              _statChip('⭐', '${business.rating.toStringAsFixed(1)} (${business.reviewCount})'),
              _statChip('👥', '${business.followerCount} followers'),
              _statChip('📝', '${business.postCount} posts'),
              if (business.bio != null && business.bio!.length > 30)
                _statChip('ℹ️', business.bio!.substring(0, 30)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _statChip(String emoji, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: NeighborlyColors.bgCard,
        borderRadius: BorderRadius.circular(NeighborlyRadius.md),
        border: Border.all(color: NeighborlyColors.textFaint),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(emoji, style: const TextStyle(fontSize: 12)),
          const SizedBox(width: 4),
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: NeighborlyColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }

  // ── Packages Tab ─────────────────────────────────────────────────

  Widget _buildPackagesTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
      child: Column(
        children: [
          ..._services.map((svc) => _buildServiceCard(svc)),
          const SizedBox(height: 16),
          // Build Custom Package
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: NeighborlyColors.bgCard,
              borderRadius: BorderRadius.circular(NeighborlyRadius.lg),
              border: Border.all(
                color: NeighborlyColors.textFaint,
                width: 1.5,
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.add_circle_outline,
                    color: NeighborlyColors.accent, size: 24),
                const SizedBox(width: 12),
                Text(
                  'Build Custom Package',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
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

  Widget _buildServiceCard(ServiceModel service) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: NeighborlyColors.bgCard,
        borderRadius: BorderRadius.circular(NeighborlyRadius.lg),
        boxShadow: [
          BoxShadow(
            color: NeighborlyColors.textFaint.withValues(alpha: 0.15),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Booking mode badge
          Container(
            width: 100,
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: NeighborlyColors.accent.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(NeighborlyRadius.sm),
            ),
            child: Text(
              service.bookingMode,
              style: GoogleFonts.inter(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: NeighborlyColors.accent,
              ),
            ),
          ),
          const SizedBox(height: 10),
          // Name + Price
          Row(
            children: [
              Expanded(
                child: Text(
                  service.name,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: NeighborlyColors.textPrimary,
                  ),
                ),
              ),
              Text(
                service.formattedPrice,
                style: GoogleFonts.jetBrainsMono(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: NeighborlyColors.accent,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            service.description,
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w400,
              color: NeighborlyColors.textSecondary,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 12),
          // Book Now
          SizedBox(
            height: 38,
            child: FilledButton(
              onPressed: () {
                Navigator.pushNamed(context, '/booking', arguments: {
                  'serviceId': service.id,
                  'serviceName': service.name,
                  'priceInCents': service.priceInCents,
                  'bookingMode': service.bookingMode,
                });
              },
              style: FilledButton.styleFrom(
                backgroundColor: NeighborlyColors.accent,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(NeighborlyRadius.md),
                ),
              ),
              child: Text(
                'Book Now',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPlaceholderTab(String name) {
    return Center(
      child: Text(
        '$name tab coming soon',
        style: GoogleFonts.inter(
          fontSize: 14,
          color: NeighborlyColors.textSecondary,
        ),
      ),
    );
  }
}

// ── SliverPersistentHeader Delegate ─────────────────────────────────

class _TabBarDelegate extends SliverPersistentHeaderDelegate {
  _TabBarDelegate(this._tabBar);

  final TabBar _tabBar;

  @override
  double get minExtent => 48;
  @override
  double get maxExtent => 48;

  @override
  Widget build(
      BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: NeighborlyColors.bgPrimary,
      child: _tabBar,
    );
  }

  @override
  bool shouldRebuild(_TabBarDelegate oldDelegate) => false;
}
