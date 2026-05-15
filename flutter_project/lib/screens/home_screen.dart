import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/theme/app_theme.dart';
import '../core/widgets/responsive_scaffold.dart';
import '../core/widgets/service_card.dart';
import '../core/widgets/section_header.dart';
import '../core/widgets/app_avatar.dart';
import '../mock/mock_data.dart';

/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Home Screen — social feed + service discovery
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ResponsiveScaffold(
      currentIndex: 0,
      child: _HomeContent(),
    );
  }
}

class _HomeContent extends StatefulWidget {
  @override
  State<_HomeContent> createState() => _HomeContentState();
}

class _HomeContentState extends State<_HomeContent> {
  int _selectedCategory = 0;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        children: [
          // ── Custom Top Bar ──────────────────────────────────────
          _buildTopBar(context),
          // ── Search Bar ──────────────────────────────────────────
          _buildSearchBar(context),
          // ── Scrollable Content ──────────────────────────────────
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.only(bottom: 80),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Category Chips
                  _buildCategoryChips(),
                  const SizedBox(height: AppSpacing.lg),
                  // Featured Banner
                  _buildFeaturedBanner(context),
                  const SizedBox(height: AppSpacing.xxl),
                  // Nearby Services
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                    child: SectionHeader(
                      title: 'Nearby Services',
                      onSeeAll: () => context.push('/explore'),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  _buildNearbyServices(context),
                  const SizedBox(height: AppSpacing.xxl),
                  // Social Feed Header
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                    child: SectionHeader(
                      title: 'Community Feed',
                      onSeeAll: () {},
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  // Social Feed Posts
                  ...mockPosts.map((post) => _buildFeedPost(context, post)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTopBar(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.sm, AppSpacing.lg, 0),
      child: Row(
        children: [
          AppAvatar(
            imageUrl: mockUsers[0].avatar,
            radius: 20,
          ),
          const SizedBox(width: AppSpacing.md),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Good morning,',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 12,
                  color: AppColors.textMuted,
                ),
              ),
              Text(
                mockUsers[0].name,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const Spacer(),
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            color: AppColors.textPrimary,
            onPressed: () {},
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.md, AppSpacing.lg, 0),
      child: GestureDetector(
        onTap: () => context.push('/explore'),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: 14),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppRadius.button),
            border: Border.all(color: AppColors.divider),
          ),
          child: Row(
            children: [
              Icon(Icons.search, color: AppColors.textMuted, size: 20),
              const SizedBox(width: AppSpacing.sm),
              Text(
                'Search services...',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 14,
                  color: AppColors.textMuted,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryChips() {
    return SizedBox(
      height: 40,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
        itemCount: mockCategories.length,
        separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.sm),
        itemBuilder: (context, index) {
          final cat = mockCategories[index];
          final selected = _selectedCategory == index;
          return GestureDetector(
            onTap: () => setState(() => _selectedCategory = index),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
              decoration: BoxDecoration(
                color: selected ? AppColors.primary : AppColors.surface,
                borderRadius: BorderRadius.circular(AppRadius.chip),
                border: Border.all(
                  color: selected ? AppColors.primary : AppColors.divider,
                ),
              ),
              alignment: Alignment.center,
              child: Text(
                cat.name,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 13,
                  fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                  color: selected ? Colors.white : AppColors.textPrimary,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildFeaturedBanner(BuildContext context) {
    final banner = mockBanners[0];
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(AppRadius.card),
        child: SizedBox(
          height: 160,
          width: double.infinity,
          child: Stack(
            children: [
              CachedNetworkImage(
                imageUrl: banner.imageUrl,
                fit: BoxFit.cover,
                width: double.infinity,
                height: 160,
              ),
              Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      banner.backgroundColor.withValues(alpha: 0.85),
                      Colors.transparent,
                    ],
                    begin: Alignment.centerLeft,
                    end: Alignment.centerRight,
                  ),
                ),
              ),
              Positioned(
                left: AppSpacing.xl,
                top: 0,
                bottom: 0,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      banner.title,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      banner.subtitle,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 14,
                        color: Colors.white.withValues(alpha: 0.9),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.lg,
                        vertical: AppSpacing.sm,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(AppRadius.button),
                      ),
                      child: Text(
                        'Book Now',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNearbyServices(BuildContext context) {
    return SizedBox(
      height: 220,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
        itemCount: mockServices.length,
        separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.md),
        itemBuilder: (context, index) {
          final service = mockServices[index];
          return SizedBox(
            width: 200,
            child: ServiceCard(service: service),
          );
        },
      ),
    );
  }

  Widget _buildFeedPost(BuildContext context, MockPost post) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Post header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
            child: Row(
              children: [
                AppAvatar(imageUrl: post.authorAvatar, radius: 18),
                const SizedBox(width: AppSpacing.sm),
                Text(
                  post.authorName,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          // Post image
          ClipRRect(
            borderRadius: BorderRadius.circular(AppRadius.card),
            child: CachedNetworkImage(
              imageUrl: post.imageUrl,
              width: double.infinity,
              height: 200,
              fit: BoxFit.cover,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          // Post actions
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
            child: Row(
              children: [
                Icon(Icons.favorite_border, size: 20, color: AppColors.textPrimary),
                const SizedBox(width: AppSpacing.xs),
                Text('${post.likes}', style: GoogleFonts.plusJakartaSans(fontSize: 12, color: AppColors.textMuted)),
                const SizedBox(width: AppSpacing.lg),
                Icon(Icons.chat_bubble_outline, size: 20, color: AppColors.textPrimary),
                const SizedBox(width: AppSpacing.xs),
                Text('${post.comments}', style: GoogleFonts.plusJakartaSans(fontSize: 12, color: AppColors.textMuted)),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          // Post caption
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
            child: Text(
              post.caption,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 13,
                color: AppColors.textPrimary,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
