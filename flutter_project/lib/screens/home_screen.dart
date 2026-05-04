import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../models/order_models.dart';
import '../models/service_model.dart';
import '../routing/app_navigator.dart';
import '../services/neighborly_api_service.dart';

void _navigateToNewOrderHomeCategory(String categorySlug) {
  neighborlyNavigatorKey.currentState?.pushNamed(
    '/orders/new?entryPoint=direct&homeCategory=${Uri.encodeComponent(categorySlug)}',
  );
}

/// Marketing slug for `homeCategory` (root name from search breadcrumb when present).
String? _homeCategorySlugFromSearchHit(CategorySearchHit hit) {
  if (hit.breadcrumb.isNotEmpty) {
    return _HomeScreenState._slugifyCategory(hit.breadcrumb.first);
  }
  if (hit.name.trim().isNotEmpty) return _HomeScreenState._slugifyCategory(hit.name);
  return null;
}

/// Home search submit: resolve category via public search, then open wizard (ADR-0054).
Future<void> _navigateToOrderFromSearch(BuildContext context, String query) async {
  final q = query.trim();
  if (q.isEmpty) {
    neighborlyNavigatorKey.currentState?.pushNamed('/orders/new?entryPoint=direct');
    return;
  }
  try {
    final api = context.read<NeighborlyApiService>();
    final list = await api.searchCategories(q.length > 120 ? q.substring(0, 120) : q, limit: 12);
    if (!context.mounted) return;
    if (list.isEmpty) {
      neighborlyNavigatorKey.currentState?.pushNamed('/orders/new?entryPoint=direct');
      return;
    }
    final slug = _homeCategorySlugFromSearchHit(list.first);
    if (slug == null || slug.isEmpty || slug == 'services') {
      neighborlyNavigatorKey.currentState?.pushNamed('/orders/new?entryPoint=direct');
      return;
    }
    _navigateToNewOrderHomeCategory(slug);
  } catch (_) {
    if (!context.mounted) return;
    neighborlyNavigatorKey.currentState?.pushNamed('/orders/new?entryPoint=direct');
  }
}

/// Customer home: hero banner, category shortcuts, popular services, top providers.
/// Explorer feed lives on [ExplorerScreen] at `/home`.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeCategory {
  const _HomeCategory({required this.icon, required this.name, required this.slug});

  final IconData icon;
  final String name;
  final String slug;
}

const _kCategories = <_HomeCategory>[
  _HomeCategory(icon: LucideIcons.droplets, name: 'Plumbing', slug: 'plumbing'),
  _HomeCategory(icon: LucideIcons.zap, name: 'Electrical', slug: 'electrical'),
  _HomeCategory(icon: LucideIcons.sparkles, name: 'Cleaning', slug: 'cleaning'),
  _HomeCategory(icon: LucideIcons.thermometer, name: 'HVAC', slug: 'hvac'),
  _HomeCategory(icon: LucideIcons.flower2, name: 'Landscaping', slug: 'landscaping'),
  _HomeCategory(icon: LucideIcons.hammer, name: 'Handyman', slug: 'handyman'),
  _HomeCategory(icon: LucideIcons.paintbrush, name: 'Painting', slug: 'painting'),
  _HomeCategory(icon: LucideIcons.truck, name: 'Moving', slug: 'moving'),
];

class _BannerSlide {
  const _BannerSlide({
    required this.title,
    required this.subtitle,
    required this.ctaLabel,
    required this.gradient,
    required this.onCta,
  });

  final String title;
  final String subtitle;
  final String ctaLabel;
  final List<Color> gradient;
  final VoidCallback onCta;
}

class _HomeScreenState extends State<HomeScreen> {
  List<ServiceModel> _services = [];
  bool _loading = true;
  late final PageController _bannerController;
  int _bannerIndex = 0;

  final TextEditingController _homeSearchController = TextEditingController();
  Timer? _homeSearchDebounce;
  List<CategorySearchHit> _homeSearchHits = const [];
  bool _homeSearchLoading = false;

  @override
  void initState() {
    super.initState();
    _bannerController = PageController();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _loadServices();
    });
  }

  @override
  void dispose() {
    _homeSearchDebounce?.cancel();
    _homeSearchController.dispose();
    _bannerController.dispose();
    super.dispose();
  }

  void _onHomeSearchChanged(String text) {
    _homeSearchDebounce?.cancel();
    final t = text.trim();
    if (t.length < 2) {
      setState(() {
        _homeSearchHits = const [];
        _homeSearchLoading = false;
      });
      return;
    }
    _homeSearchDebounce = Timer(const Duration(milliseconds: 300), () {
      if (!mounted) return;
      Future<void> run() async {
        setState(() => _homeSearchLoading = true);
        try {
          final api = context.read<NeighborlyApiService>();
          final list = await api.searchCategories(t.length > 120 ? t.substring(0, 120) : t, limit: 12);
          if (!mounted) return;
          setState(() {
            _homeSearchHits = list.take(6).toList();
            _homeSearchLoading = false;
          });
        } catch (_) {
          if (!mounted) return;
          setState(() {
            _homeSearchHits = const [];
            _homeSearchLoading = false;
          });
        }
      }

      unawaited(run());
    });
  }

  Future<void> _loadServices() async {
    if (!mounted) return;
    setState(() => _loading = true);
    try {
      final list = await context.read<NeighborlyApiService>().fetchServices();
      if (!mounted) return;
      setState(() {
        _services = list;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _services = [];
        _loading = false;
      });
    }
  }

  static String _slugifyCategory(String raw) {
    final t = raw.trim().toLowerCase().replaceAll(RegExp(r'\s+'), '-');
    final s = t.replaceAll(RegExp(r'[^a-z0-9-]'), '');
    return s.isEmpty ? 'services' : s;
  }

  void _goOrderFromService(ServiceModel s) {
    final q = <String, String>{'entryPoint': 'direct'};
    final sc = s.serviceCatalogId ?? '';
    if (sc.isNotEmpty) q['serviceCatalogId'] = sc;
    q['homeCategory'] = _slugifyCategory(s.category);
    if (s.providerId.isNotEmpty) q['prefillProviderId'] = s.providerId;
    neighborlyNavigatorKey.currentState?.pushNamed('/orders/new?${Uri(queryParameters: q).query}');
  }

  Widget _homeHeaderRow(ColorScheme cs) {
    return Consumer<NeighborlyApiService>(
      builder: (context, api, _) {
        final u = api.user;
        final avatar = u?.photoURL;
        final initials = () {
          final n = (u?.displayName ?? '').trim();
          if (n.isEmpty) return '';
          final parts = n.split(RegExp(r'\s+')).where((e) => e.isNotEmpty).toList();
          if (parts.length >= 2) {
            return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
          }
          return n.length >= 2 ? n.substring(0, 2).toUpperCase() : n[0].toUpperCase();
        }();
        return Row(
          children: [
            Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () => neighborlyNavigatorKey.currentState?.pushNamed(u != null ? '/profile' : '/auth'),
                borderRadius: BorderRadius.circular(22),
                child: SizedBox(
                  width: 44,
                  height: 44,
                  child: CircleAvatar(
                    radius: 22,
                    backgroundColor: cs.surfaceContainerHighest,
                    backgroundImage: (avatar != null && avatar.isNotEmpty) ? NetworkImage(avatar) : null,
                    child: (avatar != null && avatar.isNotEmpty)
                        ? null
                        : u != null
                            ? Text(
                                initials.isNotEmpty ? initials : '?',
                                style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 14, color: cs.onSurface),
                              )
                            : Icon(
                                Icons.person_outline,
                                size: 26,
                                color: cs.onSurface.withValues(alpha: 0.5),
                              ),
                  ),
                ),
              ),
            ),
            const Spacer(),
            Tooltip(
              message: 'New offer',
              child: Material(
                color: cs.surface,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(22),
                  side: BorderSide(color: cs.outline.withValues(alpha: 0.28)),
                ),
                child: InkWell(
                  onTap: neighborlyPushNewOfferWizard,
                  borderRadius: BorderRadius.circular(22),
                  child: const SizedBox(
                    width: 44,
                    height: 44,
                    child: Icon(LucideIcons.plus, size: 28),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  List<_ProviderHighlight> _topProviders() {
    final byPid = <String, List<ServiceModel>>{};
    for (final s in _services) {
      if (s.providerId.isEmpty) continue;
      byPid.putIfAbsent(s.providerId, () => []).add(s);
    }
    final out = <_ProviderHighlight>[];
    for (final e in byPid.entries) {
      final list = e.value;
      if (list.isEmpty) continue;
      final best = list.reduce((a, b) => a.rating >= b.rating ? a : b);
      final p = best.provider;
      final name = p?.displayName ?? 'Provider';
      final avatar = p?.avatarUrl;
      out.add(_ProviderHighlight(
        providerId: e.key,
        displayName: name,
        avatarUrl: avatar,
        serviceCount: list.length,
        topRating: best.rating,
        sampleServiceId: best.id,
      ));
    }
    out.sort((a, b) => b.score.compareTo(a.score));
    return out.take(12).toList();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final topProviders = _topProviders();
    ServiceModel? featuredForBanner;
    if (topProviders.isNotEmpty && _services.isNotEmpty) {
      try {
        featuredForBanner = _services.firstWhere((x) => x.providerId == topProviders.first.providerId);
      } catch (_) {
        featuredForBanner = null;
      }
    }

    void bannerOrderWithFeaturedOrDefault() {
      final feat = featuredForBanner;
      if (feat != null) {
        _goOrderFromService(feat);
        return;
      }
      neighborlyNavigatorKey.currentState?.pushNamed(
        '/orders/new?entryPoint=direct&homeCategory=${Uri.encodeComponent('handyman')}',
      );
    }

    final slides = <_BannerSlide>[
      _BannerSlide(
        title: 'Trusted help nearby',
        subtitle: 'Book vetted local pros for repairs, cleaning, and more.',
        ctaLabel: 'Start a booking',
        gradient: isDark
            ? [const Color(0xFF1E3A5F), const Color(0xFF0D2137)]
            : [const Color(0xFF2563EB), const Color(0xFF1D4ED8)],
        onCta: bannerOrderWithFeaturedOrDefault,
      ),
      _BannerSlide(
        title: 'Featured provider context',
        subtitle: 'Open create order with category + provider hints from our top listing when available.',
        ctaLabel: 'Start with banner context',
        gradient: isDark
            ? [const Color(0xFF3D2A5C), const Color(0xFF1A1028)]
            : [const Color(0xFF7C3AED), const Color(0xFF5B21B6)],
        onCta: bannerOrderWithFeaturedOrDefault,
      ),
      _BannerSlide(
        title: 'Not sure where to start?',
        subtitle: 'Ask the assistant for service ideas and booking tips.',
        ctaLabel: 'Open AI',
        gradient: isDark
            ? [const Color(0xFF134E4A), const Color(0xFF042F2E)]
            : [const Color(0xFF0D9488), const Color(0xFF0F766E)],
        onCta: () => neighborlyNavigatorKey.currentState?.pushNamed('/ai'),
      ),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final cs = Theme.of(context).colorScheme;
        final maxW = constraints.maxWidth > 720 ? 640.0 : constraints.maxWidth;
        return RefreshIndicator(
          onRefresh: _loadServices,
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(
                child: Center(
                  child: ConstrainedBox(
                    constraints: BoxConstraints(maxWidth: maxW),
                      child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _homeHeaderRow(cs),
                          const SizedBox(height: 12),
                          _searchRow(context, cs),
                          const SizedBox(height: 16),
                          _bannerCarousel(context, cs, slides),
                          const SizedBox(height: 20),
                          Text(
                            'Browse by category',
                            style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800, color: cs.onSurface),
                          ),
                          const SizedBox(height: 12),
                          SizedBox(
                            height: 96,
                            child: ListView.separated(
                              scrollDirection: Axis.horizontal,
                              itemCount: _kCategories.length,
                              separatorBuilder: (_, __) => const SizedBox(width: 12),
                              itemBuilder: (_, i) {
                                final c = _kCategories[i];
                                return _CategoryChip(
                                  key: ValueKey<String>(c.slug),
                                  icon: c.icon,
                                  label: c.name,
                                  categorySlug: c.slug,
                                );
                              },
                            ),
                          ),
                          const SizedBox(height: 24),
                          Text(
                            'Popular services',
                            style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800, color: cs.onSurface),
                          ),
                          const SizedBox(height: 10),
                          SizedBox(
                            height: 168,
                            child: _loading
                                ? const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator()))
                                : _services.isEmpty
                                    ? Text(
                                        'No public listings yet. Check back soon.',
                                        style: GoogleFonts.inter(color: cs.secondary, fontWeight: FontWeight.w600),
                                      )
                                    : ListView.separated(
                                        scrollDirection: Axis.horizontal,
                                        itemCount: _services.length.clamp(0, 20),
                                        separatorBuilder: (_, __) => const SizedBox(width: 12),
                                        itemBuilder: (_, i) {
                                          final s = _services[i];
                                          return _ServiceThumbCard(service: s, onTap: () => _goOrderFromService(s));
                                        },
                                      ),
                          ),
                          const SizedBox(height: 24),
                          Text(
                            'Top providers',
                            style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800, color: cs.onSurface),
                          ),
                          const SizedBox(height: 10),
                          SizedBox(
                            height: 132,
                            child: _loading
                                ? const SizedBox.shrink()
                                : topProviders.isEmpty
                                    ? Text(
                                        'Provider highlights will appear when services are listed.',
                                        style: GoogleFonts.inter(color: cs.secondary, fontWeight: FontWeight.w600),
                                      )
                                    : ListView.separated(
                                        scrollDirection: Axis.horizontal,
                                        itemCount: topProviders.length,
                                        separatorBuilder: (_, __) => const SizedBox(width: 12),
                                        itemBuilder: (_, i) {
                                          final p = topProviders[i];
                                          return _ProviderCard(
                                            highlight: p,
                                            onTap: () {
                                              try {
                                                final s = _services.firstWhere((x) => x.id == p.sampleServiceId);
                                                _goOrderFromService(s);
                                              } catch (_) {}
                                            },
                                          );
                                        },
                                      ),
                          ),
                          const SizedBox(height: 88),
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

  Widget _searchRow(BuildContext context, ColorScheme cs) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          height: 48,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: cs.surface,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: cs.outline.withValues(alpha: 0.25)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isDarkMode(context) ? 0.2 : 0.06),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              Icon(LucideIcons.search, color: cs.primary, size: 22),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: _homeSearchController,
                  textInputAction: TextInputAction.search,
                  style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: cs.onSurface),
                  decoration: InputDecoration(
                    isDense: true,
                    border: InputBorder.none,
                    hintText: 'Try "deck repair" or "deep clean"',
                    hintStyle: GoogleFonts.inter(fontSize: 14, color: cs.secondary, fontWeight: FontWeight.w500),
                  ),
                  onChanged: _onHomeSearchChanged,
                  onSubmitted: (value) {
                    _homeSearchDebounce?.cancel();
                    unawaited(_navigateToOrderFromSearch(context, value));
                  },
                ),
              ),
            ],
          ),
        ),
        if (_homeSearchLoading)
          Padding(
            padding: const EdgeInsets.only(top: 10),
            child: Center(
              child: SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(strokeWidth: 2, color: cs.primary),
              ),
            ),
          )
        else if (_homeSearchHits.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 10),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _homeSearchHits
                  .map(
                    (h) => FilterChip(
                      label: Text(h.name, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600)),
                      onSelected: (_) {
                        final slug = _homeCategorySlugFromSearchHit(h);
                        if (slug != null && slug.isNotEmpty && slug != 'services') {
                          _navigateToNewOrderHomeCategory(slug);
                        } else {
                          neighborlyNavigatorKey.currentState?.pushNamed('/orders/new?entryPoint=direct');
                        }
                      },
                    ),
                  )
                  .toList(),
            ),
          ),
      ],
    );
  }

  bool isDarkMode(BuildContext context) => Theme.of(context).brightness == Brightness.dark;

  Widget _bannerCarousel(BuildContext context, ColorScheme cs, List<_BannerSlide> slides) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: AspectRatio(
            aspectRatio: 16 / 9,
            child: PageView.builder(
              controller: _bannerController,
              itemCount: slides.length,
              onPageChanged: (i) => setState(() => _bannerIndex = i),
              itemBuilder: (_, i) {
                final s = slides[i];
                return DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: s.gradient,
                    ),
                  ),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      Positioned(
                        left: 20,
                        right: 20,
                        bottom: 28,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              s.title,
                              style: GoogleFonts.inter(
                                fontSize: 20,
                                fontWeight: FontWeight.w800,
                                color: Colors.white,
                                height: 1.15,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              s.subtitle,
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                                color: Colors.white.withValues(alpha: 0.92),
                                height: 1.35,
                              ),
                            ),
                            const SizedBox(height: 12),
                            FilledButton(
                              style: FilledButton.styleFrom(
                                backgroundColor: Colors.white,
                                foregroundColor: s.gradient.last,
                                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                              ),
                              onPressed: s.onCta,
                              child: Text(s.ctaLabel, style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 13)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ),
        const SizedBox(height: 10),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(slides.length, (i) {
            final active = i == _bannerIndex;
            return AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.symmetric(horizontal: 3),
              width: active ? 18 : 6,
              height: 6,
              decoration: BoxDecoration(
                color: active ? cs.primary : cs.outline.withValues(alpha: 0.45),
                borderRadius: BorderRadius.circular(100),
              ),
            );
          }),
        ),
      ],
    );
  }
}

class _ProviderHighlight {
  _ProviderHighlight({
    required this.providerId,
    required this.displayName,
    this.avatarUrl,
    required this.serviceCount,
    required this.topRating,
    required this.sampleServiceId,
  }) : score = topRating + serviceCount * 0.01;

  final String providerId;
  final String displayName;
  final String? avatarUrl;
  final int serviceCount;
  final double topRating;
  final String sampleServiceId;
  final double score;
}

class _CategoryChip extends StatelessWidget {
  const _CategoryChip({
    super.key,
    required this.icon,
    required this.label,
    required this.categorySlug,
  });

  final IconData icon;
  final String label;
  /// Slug for `/orders/new?homeCategory=` — stored on the widget so each list cell
  /// keeps the correct value (avoids stale closures if the list item is recycled).
  final String categorySlug;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return InkWell(
      onTap: () => _navigateToNewOrderHomeCategory(categorySlug),
      borderRadius: BorderRadius.circular(16),
      child: SizedBox(
        width: 76,
        child: Column(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: cs.primaryContainer.withValues(alpha: 0.55),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: cs.onPrimaryContainer, size: 26),
            ),
            const SizedBox(height: 6),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: cs.onSurface),
            ),
          ],
        ),
      ),
    );
  }
}

class _ServiceThumbCard extends StatelessWidget {
  const _ServiceThumbCard({required this.service, required this.onTap});

  final ServiceModel service;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: SizedBox(
        width: 140,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: Image.network(
                  'https://picsum.photos/seed/${service.id}/280/200',
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => ColoredBox(
                    color: cs.surfaceContainerHighest,
                    child: Icon(LucideIcons.image, color: cs.onSurface.withValues(alpha: 0.35)),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              service.title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, height: 1.2),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProviderCard extends StatelessWidget {
  const _ProviderCard({required this.highlight, required this.onTap});

  final _ProviderHighlight highlight;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final initial = highlight.displayName.isNotEmpty ? highlight.displayName[0].toUpperCase() : '?';
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        width: 148,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: cs.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: cs.outline.withValues(alpha: 0.22)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              radius: 22,
              backgroundColor: cs.surfaceContainerHighest,
              backgroundImage: (highlight.avatarUrl != null && highlight.avatarUrl!.isNotEmpty)
                  ? NetworkImage(highlight.avatarUrl!)
                  : null,
              child: (highlight.avatarUrl == null || highlight.avatarUrl!.isEmpty)
                  ? Text(initial, style: GoogleFonts.inter(fontWeight: FontWeight.w800))
                  : null,
            ),
            const SizedBox(height: 8),
            Text(
              highlight.displayName,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w800, height: 1.2),
            ),
            const Spacer(),
            Row(
              children: [
                Icon(LucideIcons.star, size: 14, color: Colors.amber.shade700),
                const SizedBox(width: 4),
                Text(
                  highlight.topRating.toStringAsFixed(1),
                  style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700),
                ),
                const Spacer(),
                Text(
                  '${highlight.serviceCount} svc',
                  style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w600, color: cs.secondary),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
