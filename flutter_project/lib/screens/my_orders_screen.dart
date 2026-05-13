import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../models/order_models.dart';
import '../routing/app_navigator.dart';
import '../services/neighborly_api_service.dart';
import '../services/orders_service.dart';
import '../widgets/order_card.dart';

const _kTabs = ['offers', 'active', 'completed', 'cancelled'];
const _kTabLabels = ['Offers', 'Active', 'Completed', 'Cancelled'];
const _kPageSize = 10;

class MyOrdersScreen extends StatefulWidget {
  const MyOrdersScreen({super.key});

  @override
  State<MyOrdersScreen> createState() => _MyOrdersScreenState();
}

class _MyOrdersScreenState extends State<MyOrdersScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _kTabs.length, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('My Orders', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          tabs: _kTabLabels.map((l) => Tab(text: l)).toList(),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: _kTabs.map((phase) => _OrderTabView(phase: phase)).toList(),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => neighborlyNavigatorKey.currentState?.pushNamed('/orders/new?entryPoint=direct'),
        label: Text('New Order', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
        icon: const Icon(LucideIcons.plus),
      ),
    );
  }
}

class _OrderTabView extends StatefulWidget {
  const _OrderTabView({required this.phase});

  final String phase;

  @override
  State<_OrderTabView> createState() => _OrderTabViewState();
}

class _OrderTabViewState extends State<_OrderTabView> with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  List<OrderSummary> _items = const [];
  int _page = 1;
  int _total = 0;
  bool _loading = true;
  bool _loadingMore = false;
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
      _page = 1;
    });
    try {
      final svc = OrdersService(context.read<NeighborlyApiService>());
      final res = await svc.getMyOrders(widget.phase, page: 1, pageSize: _kPageSize);
      if (!mounted) return;
      setState(() {
        _items = res.items;
        _total = res.total;
        _page = 1;
        _loading = false;
      });
    } on NeighborlyApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
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

  Future<void> _loadMore() async {
    if (_loadingMore) return;
    setState(() => _loadingMore = true);
    try {
      final svc = OrdersService(context.read<NeighborlyApiService>());
      final nextPage = _page + 1;
      final res = await svc.getMyOrders(widget.phase, page: nextPage, pageSize: _kPageSize);
      if (!mounted) return;
      setState(() {
        _items = [..._items, ...res.items];
        _total = res.total;
        _page = nextPage;
        _loadingMore = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loadingMore = false);
    }
  }

  bool get _hasMore => _items.length < _total;

  @override
  Widget build(BuildContext context) {
    super.build(context);
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              FilledButton(onPressed: _load, child: const Text('Retry')),
            ],
          ),
        ),
      );
    }
    if (_items.isEmpty) return _EmptyState(phase: widget.phase);

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
        itemCount: _items.length + (_hasMore ? 1 : 0),
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, i) {
          if (i == _items.length) {
            return Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Center(
                child: _loadingMore
                    ? const CircularProgressIndicator()
                    : ElevatedButton(
                        onPressed: _loadMore,
                        child: Text('Load more', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
                      ),
              ),
            );
          }
          final o = _items[i];
          return OrderCard(
            order: o,
            onTap: () => neighborlyNavigatorKey.currentState?.pushNamed('/orders/${o.id}'),
          );
        },
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.phase});

  final String phase;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final msg = switch (phase) {
      'offers' => 'No offers yet. Book a service to get started.',
      'active' => 'No active orders right now.',
      'completed' => 'No completed orders yet.',
      'cancelled' => 'No cancelled orders.',
      _ => 'Nothing here yet.',
    };
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(LucideIcons.inbox, size: 48, color: cs.secondary),
            const SizedBox(height: 16),
            Text(msg, textAlign: TextAlign.center, style: GoogleFonts.inter(fontSize: 15, color: cs.secondary, height: 1.4)),
          ],
        ),
      ),
    );
  }
}
