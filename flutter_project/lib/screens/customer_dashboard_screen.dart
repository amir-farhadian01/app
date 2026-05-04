import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../routing/app_navigator.dart';
import '../services/auth_provider.dart';
import '../services/neighborly_api_service.dart';
import 'customer_finance_screen.dart';
import 'orders_list_screen.dart';
import 'customer_requests_screen.dart';
import 'customer_support_screen.dart';
import 'kyc_screen.dart';

String _formatDate(dynamic raw) {
  if (raw == null) return '—';
  if (raw is String) {
    final d = DateTime.tryParse(raw);
    return d != null ? d.toLocal().toString().split(' ').first : raw;
  }
  return raw.toString();
}

DateTime _parseDate(dynamic raw) {
  if (raw is String) {
    final d = DateTime.tryParse(raw);
    if (d != null) return d.toLocal();
  }
  return DateTime.fromMillisecondsSinceEpoch(0);
}

int _kycLevel(Map<String, dynamic>? kyc) {
  if (kyc == null) return 0;
  final l = kyc['level'];
  if (l is int) return l;
  if (l is num) return l.toInt();
  if (kyc['identityVerified'] == true) return 2;
  if (kyc['type']?.toString() == 'personal' && kyc['status']?.toString() == 'verified') return 1;
  return 0;
}

String _roleLabel(String role) {
  if (role.isEmpty) return 'Customer';
  return '${role[0].toUpperCase()}${role.length > 1 ? role.substring(1) : ''}';
}

IconData _categoryIcon(String? cat) {
  switch (cat?.toLowerCase()) {
    case 'cleaning':
      return LucideIcons.sparkles;
    case 'plumbing':
      return LucideIcons.droplet;
    case 'gardening':
      return LucideIcons.flower2;
    case 'repairs':
      return LucideIcons.wrench;
    default:
      return LucideIcons.briefcase;
  }
}

/// Customer home: vertical sections; activity, spending, and support open as full screens.
class CustomerDashboardScreen extends StatefulWidget {
  const CustomerDashboardScreen({super.key, required this.user});

  final AppUser user;

  @override
  State<CustomerDashboardScreen> createState() => _CustomerDashboardScreenState();
}

class _CustomerDashboardScreenState extends State<CustomerDashboardScreen> {
  List<Map<String, dynamic>> _requests = [];
  // ignore: unused_field — kept so `/api/services` fetch in `_pull` stays identical to the web app.
  List<Map<String, dynamic>> _services = [];
  List<Map<String, dynamic>> _transactions = [];
  List<Map<String, dynamic>> _tickets = [];
  // ignore: unused_field — kept so `/api/contracts` fetch in `_pull` stays identical to the web app.
  List<Map<String, dynamic>> _contracts = [];
  Map<String, dynamic>? _kyc;
  bool _loading = true;
  bool _showBecomeProvider = false;
  bool _kycVerifiedBannerVisible = false;
  bool _kycVerifiedBannerScheduled = false;

  Timer? _poll;

  @override
  void initState() {
    super.initState();
    _pull();
    _poll = Timer.periodic(const Duration(seconds: 6), (_) {
      if (!mounted) return;
      _pull(silent: true);
    });
  }

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  List<Map<String, dynamic>> _normalizeRequests(List<Map<String, dynamic>> raw) {
    return raw.map((r) {
      final m = Map<String, dynamic>.from(r);
      final p = m['provider'];
      final s = m['service'];
      if (p is Map) m['providerName'] = p['displayName'];
      if (s is Map) m['category'] = s['category'];
      return m;
    }).toList();
  }

  Future<void> _pull({bool silent = false}) async {
    if (!silent) setState(() => _loading = true);
    final api = context.read<NeighborlyApiService>();
    try {
      final results = await Future.wait([
        api.fetchJsonList('/api/requests'),
        api.fetchJsonList('/api/services'),
        api.fetchJsonList('/api/transactions'),
        api.fetchJsonList('/api/tickets'),
        api.fetchJsonList('/api/contracts'),
        api.fetchKycMe(),
      ]);
      if (!mounted) return;
      setState(() {
        _requests = _normalizeRequests(List<Map<String, dynamic>>.from(results[0] as List));
        _services = List<Map<String, dynamic>>.from(results[1] as List);
        _transactions = List<Map<String, dynamic>>.from(results[2] as List);
        _tickets = List<Map<String, dynamic>>.from(results[3] as List);
        _contracts = List<Map<String, dynamic>>.from(results[4] as List);
        _kyc = results[5] as Map<String, dynamic>?;
        _loading = false;
      });
      _maybeScheduleVerifiedBanner();
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Future<void> _maybeScheduleVerifiedBanner() async {
    final level = _kycLevel(_kyc);
    if (!mounted) return;
    if (level < 2) {
      if (_kycVerifiedBannerVisible) setState(() => _kycVerifiedBannerVisible = false);
      return;
    }
    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;
    if (prefs.getBool('kyc_banner_dismissed') == true) return;
    if (_kycVerifiedBannerScheduled) return;
    _kycVerifiedBannerScheduled = true;
    setState(() => _kycVerifiedBannerVisible = true);
    await Future<void>.delayed(const Duration(seconds: 3));
    if (!mounted) return;
    setState(() => _kycVerifiedBannerVisible = false);
    await prefs.setBool('kyc_banner_dismissed', true);
  }

  int get _openTickets => _tickets.where((t) => t['status']?.toString() == 'open').length;

  int get _activeJobs => _requests.where((r) {
        final st = r['status']?.toString();
        return st != 'completed' && st != 'declined';
      }).length;

  void _toast(String msg, {bool error = false}) {
    final cs = Theme.of(context).colorScheme;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: error ? cs.error : cs.tertiary,
        content: Text(
          msg,
          style: GoogleFonts.inter(
            fontWeight: FontWeight.w600,
            fontSize: 15,
            color: error ? cs.onError : cs.onTertiary,
          ),
        ),
      ),
    );
  }

  Future<void> _becomeProvider() async {
    final personal = _kyc?['type']?.toString() == 'personal' ? _kyc : null;
    if (personal == null || personal['status']?.toString() != 'verified') {
      _toast('Complete Personal KYC (Level 1) on Profile before becoming a provider.', error: true);
      return;
    }
    try {
      await context.read<NeighborlyApiService>().becomeProvider();
      if (!mounted) return;
      _toast('You are now a provider. Complete Business KYC on Profile.');
      setState(() => _showBecomeProvider = false);
    } catch (e) {
      _toast(e.toString(), error: true);
    }
  }

  Future<List<Map<String, dynamic>>> _reloadTransactions() async {
    await _pull(silent: true);
    return List<Map<String, dynamic>>.from(_transactions);
  }

  Future<List<Map<String, dynamic>>> _reloadTickets() async {
    await _pull(silent: true);
    return List<Map<String, dynamic>>.from(_tickets);
  }

  List<Map<String, dynamic>> _recentThreeRequests() {
    final list = List<Map<String, dynamic>>.from(_requests);
    list.sort((a, b) {
      final ta = _parseDate(a['updatedAt'] ?? a['createdAt']);
      final tb = _parseDate(b['updatedAt'] ?? b['createdAt']);
      return tb.compareTo(ta);
    });
    return list.take(3).toList();
  }

  Widget _statusChip(ColorScheme cs, String? st) {
    final s = st ?? '—';
    Color fg = cs.onSurface;
    Color bg = cs.surfaceContainerHighest;
    if (s == 'completed') {
      fg = cs.onTertiaryContainer;
      bg = cs.tertiaryContainer;
    } else if (s == 'declined') {
      fg = cs.onErrorContainer;
      bg = cs.errorContainer;
    } else {
      fg = cs.onSecondaryContainer;
      bg = cs.secondaryContainer;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(100)),
      child: Text(s, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: fg)),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final shadow = BoxShadow(
      color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.07),
      blurRadius: 16,
      offset: const Offset(0, 4),
    );
    final first = widget.user.displayName.trim().split(' ').first;
    final kycLv = _kycLevel(_kyc);
    final screenW = MediaQuery.sizeOf(context).width;
    final gridCell = (screenW - 52) / 2;

    return Stack(
      children: [
        RefreshIndicator(
          onRefresh: () => _pull(silent: true),
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(child: _greetingHeader(cs, first, kycLv)),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
                sliver: SliverToBoxAdapter(
                  child: _quickActionsGrid(
                    cs: cs,
                    shadow: shadow,
                    cellSize: gridCell,
                  ),
                ),
              ),
              if (_kycVerifiedBannerVisible) SliverToBoxAdapter(child: _verifiedSlimBanner(cs)),
              if (kycLv < 2)
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
                  sliver: SliverToBoxAdapter(child: _kycBanner(cs)),
                ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
                sliver: SliverToBoxAdapter(child: _recentActivitySection(cs, shadow)),
              ),
              if (kycLv >= 1)
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
                  sliver: SliverToBoxAdapter(child: _becomeProviderCard(cs)),
                ),
              const SliverToBoxAdapter(child: SizedBox(height: 96)),
            ],
          ),
        ),
        if (_showBecomeProvider) _becomeProviderModal(),
      ],
    );
  }

  Widget _greetingHeader(ColorScheme cs, String first, int kycLv) {
    return Material(
      color: cs.surface,
      child: Container(
        decoration: BoxDecoration(
          color: cs.surface,
          border: Border(bottom: BorderSide(color: cs.outline)),
        ),
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 20),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Semantics(
              label: 'Open profile',
              button: true,
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () => Navigator.of(context).pushNamed('/profile'),
                  borderRadius: BorderRadius.circular(32),
                  child: SizedBox(
                    width: 64,
                    height: 64,
                    child: _avatar(),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
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
                    child: Icon(LucideIcons.plus, size: 26),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Hello, $first!',
                    style: GoogleFonts.inter(fontSize: 26, fontWeight: FontWeight.w700, color: cs.onSurface),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      if (kycLv >= 1)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: cs.tertiaryContainer,
                            borderRadius: BorderRadius.circular(100),
                          ),
                          child: Text(
                            'Verified ✓',
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: cs.onTertiaryContainer,
                            ),
                          ),
                        )
                      else
                        Semantics(
                          label: 'Verify identity',
                          button: true,
                          child: Material(
                            color: Colors.transparent,
                            child: InkWell(
                              onTap: () => Navigator.of(context).push(
                                MaterialPageRoute<void>(builder: (_) => const KycScreen()),
                              ),
                              borderRadius: BorderRadius.circular(100),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                decoration: BoxDecoration(
                                  color: cs.secondaryContainer,
                                  borderRadius: BorderRadius.circular(100),
                                ),
                                child: Text(
                                  'Verify Identity →',
                                  style: GoogleFonts.inter(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    color: cs.onSecondaryContainer,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: cs.surfaceContainerHighest,
                          borderRadius: BorderRadius.circular(100),
                        ),
                        child: Text(
                          _roleLabel(widget.user.role),
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: cs.onSurface,
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
      ),
    );
  }

  Widget _avatar() {
    final cs = Theme.of(context).colorScheme;
    final url = widget.user.avatarUrl;
    final initials = widget.user.displayName.trim().isEmpty
        ? '?'
        : widget.user.displayName.trim().split(' ').map((e) => e.isNotEmpty ? e[0] : '').take(2).join().toUpperCase();
    return CircleAvatar(
      radius: 32,
      backgroundColor: cs.primaryContainer,
      backgroundImage: url != null && url.isNotEmpty ? NetworkImage(url) : null,
      child: url == null || url.isEmpty
          ? Text(
              initials,
              style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w800, color: cs.onPrimaryContainer),
            )
          : null,
    );
  }

  Widget _verifiedSlimBanner(ColorScheme cs) {
    return Material(
      color: cs.tertiaryContainer,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Icon(LucideIcons.shieldCheck, color: cs.onTertiaryContainer, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'Identity Verified ✓',
                style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: cs.onTertiaryContainer),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _quickActionsGrid({
    required ColorScheme cs,
    required BoxShadow shadow,
    required double cellSize,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Quick actions',
          style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: cs.onSurface),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(child: _actionCard(
              cs: cs,
              shadow: shadow,
              height: cellSize,
              icon: LucideIcons.plus,
              title: 'Book a Service',
              subtitle: 'Find local help',
              onTap: () => Navigator.of(context).pushNamed('/home'),
            )),
            const SizedBox(width: 12),
            Expanded(child: _actionCard(
              cs: cs,
              shadow: shadow,
              height: cellSize,
              icon: LucideIcons.clipboardList,
              title: 'My Orders',
              subtitle: 'Track your order flow',
              badge: _activeJobs > 0 ? _activeJobs : null,
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(builder: (_) => const OrdersListScreen()),
                );
              },
            )),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(child: _actionCard(
              cs: cs,
              shadow: shadow,
              height: cellSize,
              icon: LucideIcons.creditCard,
              title: 'Spending',
              subtitle: 'Payments & history',
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => CustomerFinanceScreen(
                      initialTransactions: List<Map<String, dynamic>>.from(_transactions),
                      reloadTransactions: _reloadTransactions,
                    ),
                  ),
                );
              },
            )),
            const SizedBox(width: 12),
            Expanded(child: _actionCard(
              cs: cs,
              shadow: shadow,
              height: cellSize,
              icon: LucideIcons.headphones,
              title: 'Support',
              subtitle: 'Help & tickets',
              badge: _openTickets > 0 ? _openTickets : null,
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => CustomerSupportScreen(
                      initialTickets: List<Map<String, dynamic>>.from(_tickets),
                      reloadTickets: _reloadTickets,
                    ),
                  ),
                );
              },
            )),
          ],
        ),
      ],
    );
  }

  Widget _actionCard({
    required ColorScheme cs,
    required BoxShadow shadow,
    required double height,
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    int? badge,
  }) {
    return Semantics(
      label: title,
      button: true,
      child: Material(
        color: Theme.of(context).cardColor,
        elevation: 0,
        shadowColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: cs.outline.withValues(alpha: 0.35)),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Container(
            height: height,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              boxShadow: [shadow],
            ),
            child: Stack(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: cs.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(icon, size: 36, color: cs.onSurface),
                    ),
                    const Spacer(),
                    Text(
                      title,
                      style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w700, color: cs.onSurface),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: GoogleFonts.inter(fontSize: 14, color: cs.secondary, height: 1.25),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
                if (badge != null)
                  Positioned(
                    right: 28,
                    top: 0,
                    child: CircleAvatar(
                      radius: 12,
                      backgroundColor: cs.primary,
                      child: Text(
                        '$badge',
                        style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w800, color: cs.onPrimary),
                      ),
                    ),
                  ),
                Positioned(
                  right: 0,
                  bottom: 0,
                  child: Icon(LucideIcons.chevronRight, size: 16, color: cs.secondary),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _kycBanner(ColorScheme cs) {
    return Semantics(
      label: 'Verify your identity',
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: cs.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border(
            left: BorderSide(color: cs.tertiary, width: 4),
            top: BorderSide(color: cs.outline.withValues(alpha: 0.35)),
            right: BorderSide(color: cs.outline.withValues(alpha: 0.35)),
            bottom: BorderSide(color: cs.outline.withValues(alpha: 0.35)),
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: cs.tertiaryContainer,
                shape: BoxShape.circle,
              ),
              child: Icon(LucideIcons.shieldAlert, color: cs.onTertiaryContainer, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Verify your identity',
                    style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: cs.onSurface),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Verified users can book services, sign contracts, and access all features.',
                    style: GoogleFonts.inter(fontSize: 14, color: cs.secondary, height: 1.35),
                  ),
                  const SizedBox(height: 12),
                  Semantics(
                    label: 'Get verified',
                    button: true,
                    child: FilledButton(
                      onPressed: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(builder: (_) => const KycScreen()),
                      ),
                      child: Text(
                        'Get Verified →',
                        style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 15),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _recentActivitySection(ColorScheme cs, BoxShadow shadow) {
    final recent = _recentThreeRequests();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Text(
              'Recent Activity',
              style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: cs.onSurface),
            ),
            const Spacer(),
            Semantics(
              label: 'See all orders',
              button: true,
              child: TextButton(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                    builder: (_) => const OrdersListScreen(),
                    ),
                  );
                },
                child: Text(
                  'See all orders →',
                  style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: cs.primary),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (recent.isEmpty)
          _recentEmpty(cs)
        else
          Material(
            color: Theme.of(context).cardColor,
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: BorderSide(color: cs.outline.withValues(alpha: 0.35)),
            ),
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                for (var i = 0; i < recent.length; i++) ...[
                  if (i > 0) Divider(height: 1, color: cs.outline.withValues(alpha: 0.25)),
                  _recentRow(cs, recent[i], shadow),
                ],
              ],
            ),
          ),
      ],
    );
  }

  Widget _recentEmpty(ColorScheme cs) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: cs.outline.withValues(alpha: 0.35)),
      ),
      child: Column(
        children: [
          Icon(LucideIcons.inbox, size: 48, color: cs.secondary),
          const SizedBox(height: 16),
          Text(
            'No activity yet',
            style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: cs.onSurface),
          ),
          const SizedBox(height: 8),
          Text(
            'Your booked services will appear here.',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(fontSize: 15, color: cs.secondary, height: 1.35),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: () => Navigator.of(context).pushNamed('/home'),
            child: Text('Browse Services →', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 15)),
          ),
        ],
      ),
    );
  }

  Widget _recentRow(ColorScheme cs, Map<String, dynamic> req, BoxShadow shadow) {
    final st = req['status']?.toString();
    final cat = req['category']?.toString();
    final name = req['service'] is Map ? (req['service'] as Map)['title']?.toString() ?? 'Service' : 'Service';
    return Semantics(
      label: '$name, $st',
      button: true,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => showCustomerRequestDetailSheet(context, req),
          child: SizedBox(
            height: 68,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: cs.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [shadow],
                    ),
                    child: Icon(_categoryIcon(cat), size: 22, color: cs.onSurface),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: cs.onSurface),
                        ),
                        const SizedBox(height: 4),
                        _statusChip(cs, st),
                      ],
                    ),
                  ),
                  Text(
                    _formatDate(req['updatedAt'] ?? req['createdAt']),
                    style: GoogleFonts.inter(fontSize: 13, color: cs.secondary),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _becomeProviderCard(ColorScheme cs) {
    return Semantics(
      label: 'Become a provider',
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: cs.primary,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: Theme.of(context).brightness == Brightness.dark ? 0.3 : 0.07),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Earn by offering your skills',
              style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: cs.onPrimary),
            ),
            const SizedBox(height: 6),
            Text(
              'Join as a service provider and connect with neighbors.',
              style: GoogleFonts.inter(
                fontSize: 13,
                color: cs.onPrimary.withValues(alpha: 0.7),
                height: 1.35,
              ),
            ),
            const SizedBox(height: 16),
            Semantics(
              label: 'Become a Provider',
              button: true,
              child: OutlinedButton(
                onPressed: () => setState(() => _showBecomeProvider = true),
                style: OutlinedButton.styleFrom(
                  foregroundColor: cs.onPrimary,
                  side: BorderSide(color: cs.onPrimary.withValues(alpha: 0.85)),
                  minimumSize: const Size(double.infinity, 52),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                ),
                child: Text(
                  'Become a Provider',
                  style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 15),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _becomeProviderModal() {
    final cs = Theme.of(context).colorScheme;
    final card = Theme.of(context).cardColor;
    final muted = cs.secondary;
    return Positioned.fill(
      child: GestureDetector(
        onTap: () => setState(() => _showBecomeProvider = false),
        child: Material(
          color: cs.scrim.withValues(alpha: 0.5),
          child: Center(
            child: GestureDetector(
              onTap: () {},
              child: Container(
                margin: const EdgeInsets.all(24),
                padding: const EdgeInsets.all(28),
                decoration: BoxDecoration(color: card, borderRadius: BorderRadius.circular(32)),
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.work_rounded, size: 48, color: cs.onSurface),
                      const SizedBox(height: 12),
                      Text(
                        'START EARNING',
                        style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Transform your skills into a business.',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(color: muted),
                      ),
                      const SizedBox(height: 20),
                      FilledButton(onPressed: _becomeProvider, child: const Text('Apply now')),
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: () => setState(() => _showBecomeProvider = false),
                        child: const Text('Maybe later'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
