import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/app_theme.dart';
import '../core/models/post_model.dart';
import '../core/services/feed_service.dart';
import '../widgets/business_avatar_chip.dart';
import '../widgets/post_card.dart';

/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Social Explorer Screen — Feed with business posts
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class SocialScreen extends StatefulWidget {
  const SocialScreen({super.key});

  @override
  State<SocialScreen> createState() => _SocialScreenState();
}

class _SocialScreenState extends State<SocialScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  final FeedService _feedService = FeedService();

  // Business avatars
  List<Map<String, dynamic>> _businesses = [];
  bool _businessesLoading = true;

  // Posts
  List<PostModel> _posts = [];
  bool _postsLoading = true;
  String? _postsError;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    await Future.wait([_loadBusinesses(), _loadPosts()]);
  }

  Future<void> _loadBusinesses() async {
    try {
      final data = await _feedService.getBusinesses();
      if (!mounted) return;
      setState(() {
        _businesses = data;
        _businessesLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _businessesLoading = false);
    }
  }

  Future<void> _loadPosts() async {
    setState(() {
      _postsLoading = true;
      _postsError = null;
    });
    try {
      final data = await _feedService.getPosts();
      if (!mounted) return;
      setState(() {
        _posts = data.map((json) => PostModel.fromJson(json)).toList();
        _postsLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _postsLoading = false;
        _postsError = e.toString();
      });
    }
  }

  Future<void> _onRefresh() async {
    await _loadData();
  }

  void _onLike(int index) {
    final post = _posts[index];
    final newIsLiked = !post.isLiked;
    final newLikes = post.likes + (newIsLiked ? 1 : -1);

    // Optimistic update
    setState(() {
      _posts[index] = post.copyWith(isLiked: newIsLiked, likes: newLikes);
    });

    // Fire-and-forget API call
    _feedService.likePost(post.id).catchError((_) {
      // Revert on error
      if (mounted) {
        setState(() {
          _posts[index] = post;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: NeighborlyColors.bgPrimary,
      body: SafeArea(
        child: Column(
          children: [
            // Tab bar
            Container(
              color: NeighborlyColors.bgPrimary,
              child: TabBar(
                controller: _tabController,
                indicatorColor: NeighborlyColors.accent,
                indicatorWeight: 3,
                indicatorSize: TabBarIndicatorSize.tab,
                labelColor: NeighborlyColors.accent,
                unselectedLabelColor: NeighborlyColors.textSecondary,
                labelStyle: GoogleFonts.plusJakartaSans(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
                unselectedLabelStyle: GoogleFonts.plusJakartaSans(
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                ),
                tabs: const [
                  Tab(text: 'Explorer'),
                  Tab(text: 'Business Hub'),
                ],
              ),
            ),
            // Content
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildExplorerTab(),
                  _buildBusinessHubTab(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Explorer Tab ─────────────────────────────────────────────────

  Widget _buildExplorerTab() {
    return RefreshIndicator(
      onRefresh: _onRefresh,
      color: NeighborlyColors.accent,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
        children: [
          _buildBusinessAvatarsRow(),
          const SizedBox(height: NeighborlySpacing.s24),
          _buildFeedSection(),
        ],
      ),
    );
  }

  // ── Business Hub Tab ──────────────────────────────────────────────

  Widget _buildBusinessHubTab() {
    return RefreshIndicator(
      onRefresh: _onRefresh,
      color: NeighborlyColors.accent,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
        children: [
          // Section header
          Padding(
            padding: const EdgeInsets.only(bottom: NeighborlySpacing.s16),
            child: Text(
              'Business Hub',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: NeighborlyColors.textPrimary,
              ),
            ),
          ),
          _buildFeedSection(),
        ],
      ),
    );
  }

  // ── Business Avatars Row ─────────────────────────────────────────

  Widget _buildBusinessAvatarsRow() {
    if (_businessesLoading) {
      return const SizedBox(
        height: 100,
        child: Center(
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
      );
    }

    if (_businesses.isEmpty) {
      return const SizedBox.shrink();
    }

    return SizedBox(
      height: 100,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: _businesses.length,
        separatorBuilder: (_, __) => const SizedBox(width: 16),
        itemBuilder: (context, index) {
          final biz = _businesses[index];
          final name = biz['name'] as String? ?? 'Business';
          final avatarUrl = biz['avatarUrl'] as String?;
          return BusinessAvatarChip(
            name: name,
            avatarUrl: avatarUrl,
            isFollowing: index < 2, // first 2 are following
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('$name tapped'),
                  duration: const Duration(seconds: 1),
                ),
              );
            },
          );
        },
      ),
    );
  }

  // ── Feed Section ─────────────────────────────────────────────────

  Widget _buildFeedSection() {
    if (_postsLoading) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.symmetric(vertical: 48),
          child: CircularProgressIndicator(strokeWidth: 3),
        ),
      );
    }

    if (_postsError != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 48),
          child: Column(
            children: [
              const Icon(
                Icons.error_outline,
                size: 48,
                color: NeighborlyColors.error,
              ),
              const SizedBox(height: 12),
              Text(
                'Failed to load posts',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  color: NeighborlyColors.textSecondary,
                ),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: _loadPosts,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (_posts.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 48),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.feed_outlined,
                size: 64,
                color: NeighborlyColors.textFaint,
              ),
              const SizedBox(height: 16),
              Text(
                'No posts yet',
                style: GoogleFonts.inter(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  color: NeighborlyColors.textSecondary,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Check back later for updates',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  color: NeighborlyColors.textFaint,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: _posts.length,
      separatorBuilder: (_, __) => const SizedBox(height: 16),
      itemBuilder: (context, index) {
        return PostCard(
          post: _posts[index],
          onLike: () => _onLike(index),
        );
      },
    );
  }
}
