import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../routing/app_navigator.dart';
import '../routing/auth_route_args.dart';
import '../services/neighborly_api_service.dart';
import '../widgets/explorer_feed_post_card.dart';

/// Explorer: compact search + Instagram-style feed (category filter via search sheet).
class ExplorerScreen extends StatefulWidget {
  const ExplorerScreen({super.key, this.initialCategorySlug});

  /// When opening Explorer from Home (category chip), pre-filter the feed.
  final String? initialCategorySlug;

  @override
  State<ExplorerScreen> createState() => _ExplorerScreenState();
}

class _ExplorerCategory {
  const _ExplorerCategory({required this.icon, required this.name, required this.slug});

  final IconData icon;
  final String name;
  final String slug;
}

const _kCategories = <_ExplorerCategory>[
  _ExplorerCategory(icon: LucideIcons.droplets, name: 'Plumbing', slug: 'plumbing'),
  _ExplorerCategory(icon: LucideIcons.zap, name: 'Electrical', slug: 'electrical'),
  _ExplorerCategory(icon: LucideIcons.sparkles, name: 'Cleaning', slug: 'cleaning'),
  _ExplorerCategory(icon: LucideIcons.thermometer, name: 'HVAC', slug: 'hvac'),
  _ExplorerCategory(icon: LucideIcons.flower2, name: 'Landscaping', slug: 'landscaping'),
  _ExplorerCategory(icon: LucideIcons.hammer, name: 'Handyman', slug: 'handyman'),
  _ExplorerCategory(icon: LucideIcons.paintbrush, name: 'Painting', slug: 'painting'),
  _ExplorerCategory(icon: LucideIcons.truck, name: 'Moving', slug: 'moving'),
];

const _kSavedPostsKey = 'explorer_saved_post_ids_v1';

class _ExplorerScreenState extends State<ExplorerScreen> {
  List<Map<String, dynamic>> _posts = [];
  bool _postsLoading = true;
  String? _categorySlugFilter;
  Set<String> _savedPostIds = {};
  bool _authRedirectInProgress = false;

  @override
  void initState() {
    super.initState();
    final raw = widget.initialCategorySlug?.trim();
    if (raw != null && raw.isNotEmpty) {
      _categorySlugFilter = raw;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _loadPosts();
      _loadSavedIds();
    });
  }

  Future<void> _loadSavedIds() async {
    try {
      final p = await SharedPreferences.getInstance();
      final raw = p.getString(_kSavedPostsKey);
      if (raw == null || raw.isEmpty) return;
      final ids = raw.split(',').where((e) => e.isNotEmpty).toSet();
      if (!mounted) return;
      setState(() => _savedPostIds = ids);
    } catch (_) {}
  }

  Future<void> _persistSavedIds() async {
    try {
      final p = await SharedPreferences.getInstance();
      await p.setString(_kSavedPostsKey, _savedPostIds.join(','));
    } catch (_) {}
  }

  Future<void> _loadPosts() async {
    if (!mounted) return;
    setState(() => _postsLoading = true);
    try {
      final list = await context.read<NeighborlyApiService>().fetchExplorerPosts();
      if (!mounted) return;
      setState(() {
        _posts = list;
        _postsLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _posts = [];
        _postsLoading = false;
      });
    }
  }

  Future<void> _onRefresh() async {
    await _loadPosts();
  }

  void _setCategoryFilter(String? slug) {
    setState(() => _categorySlugFilter = slug);
  }

  List<Map<String, dynamic>> get _filteredPosts {
    if (_categorySlugFilter == null) return _posts;
    final slug = _categorySlugFilter!.toLowerCase();
    final cat = _kCategories.where((c) => c.slug == slug).toList();
    final name = cat.isNotEmpty ? cat.first.name.toLowerCase() : slug;
    return _posts.where((p) {
      final cap = '${p['caption'] ?? ''}'.toLowerCase();
      final prov = p['provider'];
      final pn = prov is Map ? '${prov['displayName'] ?? ''}'.toLowerCase() : '';
      return cap.contains(slug) || cap.contains(name) || pn.contains(name) || pn.contains(slug);
    }).toList();
  }

  Future<bool> _redirectToAuth({String? postId}) async {
    if (_authRedirectInProgress) return false;
    if (!mounted) return false;
    _authRedirectInProgress = true;
    final api = context.read<NeighborlyApiService>();
    try {
      final currentPath = neighborlyRoutePathNotifier.value;
      final nav = neighborlyNavigatorKey.currentState;
      if (nav == null) return false;
      await nav.pushNamed<bool>(
        '/auth',
        arguments: AuthRouteArgs(
          resumeAfterAuth: true,
          returnToPath: currentPath.isEmpty ? '/home' : currentPath,
          postId: postId,
        ),
      );
      return api.hasActiveSession;
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not open sign-in page.', style: GoogleFonts.inter(fontWeight: FontWeight.w600))),
        );
      }
      return false;
    } finally {
      _authRedirectInProgress = false;
    }
  }

  Future<bool> _ensureSignedIn({String? postId}) async {
    final api = context.read<NeighborlyApiService>();
    if (api.hasActiveSession) return true;
    return _redirectToAuth(postId: postId);
  }

  bool _isUnauthorizedError(Object e) {
    if (e is NeighborlyApiException) {
      if (e.statusCode == 401 || e.statusCode == 403) return true;
      final code = (e.code ?? '').toUpperCase();
      if (code.contains('AUTH') || code.contains('TOKEN') || code.contains('UNAUTHORIZED')) return true;
    }
    final msg = e.toString().toLowerCase();
    return msg.contains('401') || msg.contains('403') || msg.contains('unauthorized') || msg.contains('sign in') || msg.contains('forbidden');
  }

  Future<void> _recoverUnauthorizedAndGoAuth(Object e) async {
    if (!_isUnauthorizedError(e)) return;
    final api = context.read<NeighborlyApiService>();
    await api.logout();
    if (!mounted) return;
    await _redirectToAuth();
  }

  String _formatCount(int n) {
    if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)}M';
    if (n >= 10000) return '${(n / 1000).toStringAsFixed(1)}K';
    if (n >= 1000) {
      final v = (n / 1000);
      final s = v == v.floorToDouble() ? '${v.toInt()}K' : '${v.toStringAsFixed(1)}K';
      return s;
    }
    return '$n';
  }

  bool _isLiked(Map<String, dynamic> post) {
    final uid = context.read<NeighborlyApiService>().user?.uid;
    if (uid == null) return false;
    final likes = post['likes'];
    if (likes is! List) return false;
    return likes.map((e) => e.toString()).contains(uid);
  }

  Future<void> _toggleLike(Map<String, dynamic> post) async {
    final postId = post['id']?.toString();
    if (!await _ensureSignedIn(postId: postId)) return;
    if (!mounted) return;
    final api = context.read<NeighborlyApiService>();
    final id = post['id']?.toString();
    if (id == null) return;
    try {
      final updated = await api.likeExplorerPost(id);
      if (!mounted) return;
      setState(() {
        final idx = _posts.indexWhere((e) => e['id']?.toString() == id);
        if (idx >= 0) {
          final merged = Map<String, dynamic>.from(_posts[idx]);
          merged['likes'] = updated['likes'];
          final likesList = updated['likes'];
          merged['likeCount'] = likesList is List ? likesList.length : merged['likeCount'];
          _posts[idx] = merged;
        }
      });
    } catch (e) {
      if (_isUnauthorizedError(e)) {
        await _recoverUnauthorizedAndGoAuth(e);
        return;
      }
      await _recoverUnauthorizedAndGoAuth(e);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$e', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w600))),
      );
    }
  }

  Future<void> _toggleSave(String postId) async {
    if (!await _ensureSignedIn(postId: postId)) return;
    if (!mounted) return;
    setState(() {
      if (_savedPostIds.contains(postId)) {
        _savedPostIds.remove(postId);
      } else {
        _savedPostIds.add(postId);
      }
    });
    _persistSavedIds();
  }

  Future<void> _openOrderFromPost(Map<String, dynamic> post) async {
    final postId = post['id']?.toString();
    if (!await _ensureSignedIn(postId: postId)) return;
    if (!mounted) return;
    final api = context.read<NeighborlyApiService>();
    final prov = post['provider'];
    final pid = prov is Map ? prov['id']?.toString() : post['providerId']?.toString();
    if (pid == null || pid.isEmpty) {
      Navigator.of(context).pushNamed('/orders/new?entryPoint=explorer');
      return;
    }
    try {
      final services = await api.fetchServices(providerId: pid);
      if (!mounted) return;
      final withCatalog = services.where((s) => (s.serviceCatalogId ?? '').isNotEmpty).toList();
      if (withCatalog.isNotEmpty) {
        final cid = Uri.encodeComponent(withCatalog.first.serviceCatalogId!);
        Navigator.of(context).pushNamed('/orders/new?entryPoint=explorer&serviceCatalogId=$cid');
      } else {
        Navigator.of(context).pushNamed('/orders/new?entryPoint=explorer');
      }
    } catch (_) {
      if (!mounted) return;
      Navigator.of(context).pushNamed('/orders/new?entryPoint=explorer');
    }
  }

  String? _providerIdFromPost(Map<String, dynamic> post) {
    final p = post['provider'];
    final id = p is Map ? p['id']?.toString() : post['providerId']?.toString();
    if (id == null || id.isEmpty) return null;
    return id;
  }

  String _providerNameFromPost(Map<String, dynamic> post) {
    final p = post['provider'];
    if (p is Map && p['displayName'] != null) return p['displayName'].toString();
    return 'Provider';
  }

  void _openProviderExplorer(Map<String, dynamic> post) {
    final pid = _providerIdFromPost(post);
    if (pid == null) return;
    final providerPosts = _posts.where((p) => _providerIdFromPost(p) == pid).toList();
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => _ProviderExplorerPostsScreen(
          providerName: _providerNameFromPost(post),
          posts: providerPosts,
          isLiked: _isLiked,
          isSaved: (postId) => _savedPostIds.contains(postId),
          onLikeTap: _toggleLike,
          onCommentTap: _onCommentPressed,
          onOrderTap: _openOrderFromPost,
          onSaveTap: _toggleSave,
          onMoreTap: _openProviderBusiness,
          formatCount: _formatCount,
        ),
      ),
    );
  }

  Future<void> _openProviderBusiness(Map<String, dynamic> post) async {
    final p = post['provider'];
    final provider = p is Map<String, dynamic> ? p : <String, dynamic>{};
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => _ProviderBusinessScreen(
          providerName: _providerNameFromPost(post),
          provider: provider,
          onViewPosts: () => _openProviderExplorer(post),
        ),
      ),
    );
  }

  void _openCommentsSheet(Map<String, dynamic> post) {
    final id = post['id']?.toString() ?? '';
    final cs = Theme.of(context).colorScheme;
    final comments = (post['comments'] is List) ? List<Map<String, dynamic>>.from((post['comments'] as List).map((e) => Map<String, dynamic>.from(e as Map))) : <Map<String, dynamic>>[];
    final ctrl = TextEditingController();
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: cs.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(ctx).bottom),
          child: SafeArea(
            child: SizedBox(
              height: MediaQuery.sizeOf(ctx).height * 0.55,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 8, 8),
                    child: Row(
                      children: [
                        Expanded(child: Text('Comments', style: GoogleFonts.plusJakartaSans(fontSize: 17, fontWeight: FontWeight.w800))),
                        IconButton(icon: const Icon(LucideIcons.x), onPressed: () => Navigator.pop(ctx)),
                      ],
                    ),
                  ),
                  Expanded(
                    child: ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: comments.length,
                      itemBuilder: (_, i) {
                        final c = comments[i];
                        final who = c['userName']?.toString() ?? 'User';
                        final text = c['text']?.toString() ?? '';
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: RichText(
                            text: TextSpan(
                              style: GoogleFonts.plusJakartaSans(fontSize: 14, height: 1.35, color: cs.onSurface),
                              children: [
                                TextSpan(text: '$who ', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w800)),
                                TextSpan(text: text, style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w500)),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  if (context.read<NeighborlyApiService>().hasActiveSession)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                      child: Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: ctrl,
                              decoration: InputDecoration(
                                hintText: 'Add a comment…',
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          FilledButton(
                            onPressed: () async {
                              final t = ctrl.text.trim();
                              if (t.isEmpty) return;
                              try {
                                await context.read<NeighborlyApiService>().commentOnPost(id, t);
                                if (ctx.mounted) Navigator.pop(ctx);
                                await _loadPosts();
                              } catch (e) {
                                if (_isUnauthorizedError(e)) {
                                  await _recoverUnauthorizedAndGoAuth(e);
                                  return;
                                }
                                await _recoverUnauthorizedAndGoAuth(e);
                                if (ctx.mounted) {
                                  ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text('$e')));
                                }
                              }
                            },
                            child: const Text('Post'),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  void _openSearchSheet(BuildContext context, ColorScheme cs) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: cs.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        final queryHolder = <String>[''];
        return StatefulBuilder(
          builder: (context, setModalState) {
            final q = queryHolder[0];
            final filtered = q.trim().isEmpty
                ? _kCategories
                : _kCategories.where((e) => e.name.toLowerCase().contains(q.trim().toLowerCase())).toList();
            final h = MediaQuery.sizeOf(context).height * 0.6;
            return Padding(
              padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
              child: SizedBox(
                height: h,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text('Search services', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700)),
                          ),
                          if (_categorySlugFilter != null)
                            TextButton(
                              onPressed: () {
                                Navigator.pop(ctx);
                                _setCategoryFilter(null);
                              },
                              child: Text('Clear filter', style: GoogleFonts.inter(fontWeight: FontWeight.w800)),
                            ),
                        ],
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: TextField(
                        autofocus: true,
                        onChanged: (v) {
                          queryHolder[0] = v;
                          setModalState(() {});
                        },
                        style: GoogleFonts.inter(fontSize: 13, color: cs.onSurface),
                        decoration: InputDecoration(
                          hintText: 'Type a category…',
                          hintStyle: GoogleFonts.inter(fontSize: 13, color: cs.secondary),
                          prefixIcon: Icon(LucideIcons.search, color: cs.secondary, size: 20),
                          filled: true,
                          fillColor: cs.surfaceContainerHighest,
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Expanded(
                      child: ListView.builder(
                        padding: const EdgeInsets.fromLTRB(8, 0, 8, 16),
                        itemCount: filtered.length,
                        itemBuilder: (_, i) {
                          final c = filtered[i];
                          return ListTile(
                            leading: Icon(c.icon, color: cs.primary, size: 26),
                            title: Text(c.name, style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
                            onTap: () {
                              Navigator.pop(ctx);
                              _setCategoryFilter(c.slug);
                            },
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _explorerSearchOnly(BuildContext context, ColorScheme cs) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => _openSearchSheet(context, cs),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          height: 44,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: cs.surfaceContainerHighest.withValues(alpha: 0.65),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: cs.outline.withValues(alpha: 0.22)),
          ),
          child: Row(
            children: [
              Icon(LucideIcons.search, color: cs.secondary, size: 18),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Search',
                  style: GoogleFonts.inter(fontSize: 13, color: cs.secondary, fontWeight: FontWeight.w500, height: 1.2),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _onCommentPressed(Map<String, dynamic> post) async {
    final postId = post['id']?.toString();
    if (!await _ensureSignedIn(postId: postId)) return;
    if (!mounted) return;
    _openCommentsSheet(post);
  }

  Widget _feedSection(BuildContext context, ColorScheme cs) {
    if (_postsLoading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 40),
        child: Center(child: CircularProgressIndicator()),
      );
    }
    final list = _filteredPosts;
    if (list.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: Text(
          'No posts in this feed yet.',
          style: GoogleFonts.inter(color: cs.secondary, fontWeight: FontWeight.w600),
        ),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final post in list)
          ExplorerFeedPostCard(
            post: post,
            isSaved: _savedPostIds.contains(post['id']?.toString()),
            isLiked: _isLiked(post),
            onLikeTap: () => _toggleLike(post),
            onCommentTap: () => _onCommentPressed(post),
            onOrderTap: () => _openOrderFromPost(post),
            onSaveTap: () {
              final id = post['id']?.toString();
              if (id != null) {
                _toggleSave(id);
              }
            },
            onProviderTap: () => _openProviderExplorer(post),
            onMoreTap: () => _openProviderBusiness(post),
            formatCount: _formatCount,
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return LayoutBuilder(
      builder: (context, constraints) {
        final maxW = constraints.maxWidth > 560 ? 480.0 : constraints.maxWidth;
        return RefreshIndicator(
          onRefresh: _onRefresh,
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(
                child: Center(
                  child: ConstrainedBox(
                    constraints: BoxConstraints(maxWidth: maxW),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _explorerSearchOnly(context, cs),
                          const SizedBox(height: 12),
                          _feedSection(context, cs),
                          const SizedBox(height: 96),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _ProviderExplorerPostsScreen extends StatelessWidget {
  const _ProviderExplorerPostsScreen({
    required this.providerName,
    required this.posts,
    required this.isLiked,
    required this.isSaved,
    required this.onLikeTap,
    required this.onCommentTap,
    required this.onOrderTap,
    required this.onSaveTap,
    required this.onMoreTap,
    required this.formatCount,
  });

  final String providerName;
  final List<Map<String, dynamic>> posts;
  final bool Function(Map<String, dynamic>) isLiked;
  final bool Function(String postId) isSaved;
  final Future<void> Function(Map<String, dynamic>) onLikeTap;
  final Future<void> Function(Map<String, dynamic>) onCommentTap;
  final Future<void> Function(Map<String, dynamic>) onOrderTap;
  final Future<void> Function(String postId) onSaveTap;
  final Future<void> Function(Map<String, dynamic>) onMoreTap;
  final String Function(int n) formatCount;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        title: Text(providerName, style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
      ),
      body: posts.isEmpty
          ? Center(
              child: Text(
                'No posts for this provider yet.',
                style: GoogleFonts.inter(color: cs.secondary, fontWeight: FontWeight.w600),
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 32),
              itemCount: posts.length,
              itemBuilder: (_, i) {
                final post = posts[i];
                final id = post['id']?.toString() ?? '';
                return ExplorerFeedPostCard(
                  post: post,
                  isSaved: id.isNotEmpty && isSaved(id),
                  isLiked: isLiked(post),
                  onLikeTap: () => onLikeTap(post),
                  onCommentTap: () => onCommentTap(post),
                  onOrderTap: () => onOrderTap(post),
                  onSaveTap: () => id.isNotEmpty ? onSaveTap(id) : Future<void>.value(),
                  onProviderTap: () {},
                  onMoreTap: () => onMoreTap(post),
                  formatCount: formatCount,
                );
              },
            ),
    );
  }
}

class _ProviderBusinessScreen extends StatelessWidget {
  const _ProviderBusinessScreen({
    required this.providerName,
    required this.provider,
    required this.onViewPosts,
  });

  final String providerName;
  final Map<String, dynamic> provider;
  final VoidCallback onViewPosts;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final email = provider['email']?.toString() ?? '';
    final companyId = provider['companyId']?.toString() ?? '';
    final avatarUrl = provider['avatarUrl']?.toString();
    return Scaffold(
      appBar: AppBar(
        title: Text('Business', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              decoration: BoxDecoration(
                color: cs.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: cs.outline.withValues(alpha: 0.3)),
              ),
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 24,
                    backgroundColor: cs.surfaceContainerHighest,
                    backgroundImage: (avatarUrl != null && avatarUrl.isNotEmpty) ? NetworkImage(avatarUrl) : null,
                    child: (avatarUrl == null || avatarUrl.isEmpty)
                        ? Text(providerName.isNotEmpty ? providerName[0].toUpperCase() : 'P', style: GoogleFonts.inter(fontWeight: FontWeight.w800))
                        : null,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(providerName, style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800)),
                        if (email.isNotEmpty)
                          Text(email, maxLines: 1, overflow: TextOverflow.ellipsis, style: GoogleFonts.inter(fontSize: 12, color: cs.secondary)),
                        if (companyId.isNotEmpty)
                          Text('Business ID: $companyId', style: GoogleFonts.inter(fontSize: 11, color: cs.secondary)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () {
                Navigator.of(context).pop();
                onViewPosts();
              },
              child: const Text('View provider posts'),
            ),
          ],
        ),
      ),
    );
  }
}
