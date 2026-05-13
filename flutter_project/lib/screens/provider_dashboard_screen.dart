import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../models/inbox_models.dart';
import '../models/order_models.dart';
import '../routing/app_navigator.dart';
import '../services/neighborly_api_service.dart';
import '../services/provider_inbox_service.dart';
import '../widgets/offer_card.dart';
import '../widgets/offer_detail_bottom_sheet.dart';

// ─── Dashboard shell ──────────────────────────────────────────────────────────

class ProviderDashboardScreen extends StatefulWidget {
  const ProviderDashboardScreen({super.key});

  @override
  State<ProviderDashboardScreen> createState() =>
      _ProviderDashboardScreenState();
}

class _ProviderDashboardScreenState extends State<ProviderDashboardScreen> {
  int _tab = 0;

  /// Workspace ID resolved once from /api/workspaces/me.
  String? _workspaceId;
  bool _wsLoading = true;
  String? _wsError;

  @override
  void initState() {
    super.initState();
    _resolveWorkspace();
  }

  Future<void> _resolveWorkspace() async {
    setState(() {
      _wsLoading = true;
      _wsError = null;
    });
    try {
      final api = context.read<NeighborlyApiService>();
      // Prefer companyId on the user object (set after workspace creation).
      var wid = api.user?.companyId?.trim();
      if (wid == null || wid.isEmpty) {
        final workspaces = await api.fetchMyWorkspaces();
        wid = workspaces.isNotEmpty
            ? workspaces.first['id']?.toString()
            : null;
      }
      if (!mounted) return;
      if (wid == null || wid.isEmpty) {
        setState(() {
          _wsError = 'No provider workspace found. Complete onboarding first.';
          _wsLoading = false;
        });
        return;
      }
      setState(() {
        _workspaceId = wid;
        _wsLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _wsError = e.toString();
        _wsLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    if (_wsLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_wsError != null) {
      return Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(_wsError!, textAlign: TextAlign.center),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _resolveWorkspace,
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final wid = _workspaceId!;
    final pages = [
      _OverviewTab(workspaceId: wid),
      _InboxTab(workspaceId: wid),
      _ScheduleTab(workspaceId: wid),
    ];

    return Scaffold(
      body: pages[_tab],
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          border: Border(top: BorderSide(color: cs.outline.withValues(alpha: 0.3))),
        ),
        child: NavigationBar(
          selectedIndex: _tab,
          onDestinationSelected: (i) => setState(() => _tab = i),
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.dashboard_outlined),
              selectedIcon: Icon(Icons.dashboard_rounded),
              label: 'Overview',
            ),
            NavigationDestination(
              icon: Icon(Icons.inbox_outlined),
              selectedIcon: Icon(Icons.inbox_rounded),
              label: 'Inbox',
            ),
            NavigationDestination(
              icon: Icon(Icons.calendar_today_outlined),
              selectedIcon: Icon(Icons.calendar_today_rounded),
              label: 'Schedule',
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

class _OverviewTab extends StatelessWidget {
  const _OverviewTab({required this.workspaceId});

  final String workspaceId;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final user = context.watch<NeighborlyApiService>().user;
    final name = user?.firstName?.trim().isNotEmpty == true
        ? user!.firstName!
        : (user?.displayName.split(' ').first ?? 'Provider');

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Hello, $name',
                  style: GoogleFonts.inter(
                    fontSize: 26,
                    fontWeight: FontWeight.w700,
                    color: cs.onSurface,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Workspace: $workspaceId',
                  style: GoogleFonts.inter(fontSize: 12, color: cs.secondary),
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: _QuickTile(
                        icon: LucideIcons.inbox,
                        label: 'Inbox',
                        onTap: () {},
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _QuickTile(
                        icon: LucideIcons.calendar,
                        label: 'Schedule',
                        onTap: () {},
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _QuickTile(
                        icon: LucideIcons.building2,
                        label: 'Workspace',
                        onTap: () => neighborlyNavigatorKey.currentState
                            ?.pushNamed('/workspace/company'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 88),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _QuickTile extends StatelessWidget {
  const _QuickTile({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Material(
      color: cs.surfaceContainerHighest,
      borderRadius: BorderRadius.circular(14),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            children: [
              Icon(icon, size: 22, color: cs.onSurface),
              const SizedBox(height: 6),
              Text(
                label,
                style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: cs.onSurface),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Inbox tab ────────────────────────────────────────────────────────────────

class _InboxTab extends StatefulWidget {
  const _InboxTab({required this.workspaceId});

  final String workspaceId;

  @override
  State<_InboxTab> createState() => _InboxTabState();
}

class _InboxTabState extends State<_InboxTab>
    with SingleTickerProviderStateMixin {
  late final TabController _segmentCtrl;

  @override
  void initState() {
    super.initState();
    _segmentCtrl =
        TabController(length: InboxSegment.values.length, vsync: this);
  }

  @override
  void dispose() {
    _segmentCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: Text('Inbox',
            style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
        bottom: TabBar(
          controller: _segmentCtrl,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          tabs: InboxSegment.values
              .map((s) => Tab(text: s.label))
              .toList(),
        ),
      ),
      body: TabBarView(
        controller: _segmentCtrl,
        children: InboxSegment.values
            .map((s) => _InboxSegmentView(
                  workspaceId: widget.workspaceId,
                  segment: s,
                ))
            .toList(),
      ),
    );
  }
}

class _InboxSegmentView extends StatefulWidget {
  const _InboxSegmentView({
    required this.workspaceId,
    required this.segment,
  });

  final String workspaceId;
  final InboxSegment segment;

  @override
  State<_InboxSegmentView> createState() => _InboxSegmentViewState();
}

class _InboxSegmentViewState extends State<_InboxSegmentView>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  List<InboxAttempt> _items = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final svc =
          ProviderInboxService(context.read<NeighborlyApiService>());
      final items =
          await svc.fetchSegment(widget.workspaceId, widget.segment);
      if (!mounted) return;
      setState(() {
        _items = items;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(_error!, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            FilledButton(onPressed: _load, child: const Text('Retry')),
          ],
        ),
      );
    }
    if (_items.isEmpty) {
      return _EmptyState(
          message: 'No ${widget.segment.label.toLowerCase()} offers.');
    }

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 88),
        itemCount: _items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) {
          final attempt = _items[i];
          return OfferCard(
            attempt: attempt,
            onTap: () => showOfferDetailBottomSheet(
              context: context,
              attempt: attempt,
              workspaceId: widget.workspaceId,
              onActioned: _load,
            ),
          );
        },
      ),
    );
  }
}

// ─── Schedule tab ─────────────────────────────────────────────────────────────

class _ScheduleTab extends StatefulWidget {
  const _ScheduleTab({required this.workspaceId});

  final String workspaceId;

  @override
  State<_ScheduleTab> createState() => _ScheduleTabState();
}

class _ScheduleTabState extends State<_ScheduleTab> {
  List<OrderSummary> _items = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = context.read<NeighborlyApiService>();
      final res = await api.fetchProviderMyOrders(
        statuses: ['matched', 'contracted', 'paid', 'in_progress'],
        pageSize: 50,
      );
      if (!mounted) return;
      setState(() {
        _items = res.items;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: Text('Schedule',
            style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(_error!, textAlign: TextAlign.center),
                      const SizedBox(height: 12),
                      FilledButton(
                          onPressed: _load, child: const Text('Retry')),
                    ],
                  ),
                )
              : _items.isEmpty
                  ? const _EmptyState(message: 'No upcoming jobs.')
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.separated(
                        padding:
                            const EdgeInsets.fromLTRB(16, 12, 16, 88),
                        itemCount: _items.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(height: 10),
                        itemBuilder: (_, i) =>
                            _ScheduleCard(order: _items[i]),
                      ),
                    ),
    );
  }
}

class _ScheduleCard extends StatelessWidget {
  const _ScheduleCard({required this.order});

  final OrderSummary order;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final dt = DateTime.tryParse(order.createdAt)?.toLocal();
    final dateLabel = dt != null
        ? '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}'
        : order.createdAt;

    return Semantics(
      label: '${order.serviceName}, ${order.status}',
      button: true,
      child: Material(
        color: Theme.of(context).cardColor,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: cs.outline.withValues(alpha: 0.28)),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => neighborlyNavigatorKey.currentState
              ?.pushNamed('/provider/orders/${order.id}'),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: cs.primaryContainer.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(LucideIcons.briefcase,
                      size: 20, color: cs.onPrimaryContainer),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        order.serviceName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                            color: cs.onSurface),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        dateLabel,
                        style: GoogleFonts.inter(
                            fontSize: 12, color: cs.secondary),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                _StatusChip(status: order.status),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final (Color fg, Color bg) = switch (status) {
      'completed' => (cs.onTertiaryContainer, cs.tertiaryContainer),
      'cancelled' => (cs.onErrorContainer, cs.errorContainer),
      'matched' || 'contracted' || 'paid' || 'in_progress' =>
        (cs.onPrimaryContainer, cs.primaryContainer),
      _ => (cs.onSecondaryContainer, cs.secondaryContainer),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
      decoration:
          BoxDecoration(color: bg, borderRadius: BorderRadius.circular(100)),
      child: Text(
        status,
        style: GoogleFonts.inter(
            fontSize: 11, fontWeight: FontWeight.w700, color: fg),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(LucideIcons.inbox, size: 48, color: cs.secondary),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                  fontSize: 15, color: cs.secondary, height: 1.4),
            ),
          ],
        ),
      ),
    );
  }
}
