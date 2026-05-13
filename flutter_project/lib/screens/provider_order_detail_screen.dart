import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../models/order_models.dart';
import '../services/neighborly_api_service.dart';
import '../widgets/order_chat_widget.dart';

// TODO(F-3): Add contract drafting tab in a future sprint.

/// Simplified order detail screen for providers: Details + Chat only.
/// Navigated to from the Schedule tab via `/provider/orders/:id`.
class ProviderOrderDetailScreen extends StatefulWidget {
  const ProviderOrderDetailScreen({super.key, required this.orderId});

  final String orderId;

  @override
  State<ProviderOrderDetailScreen> createState() =>
      _ProviderOrderDetailScreenState();
}

class _ProviderOrderDetailScreenState extends State<ProviderOrderDetailScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  bool _loading = true;
  String? _error;
  OrderDetail? _order;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
    _tabs.addListener(() => setState(() {})); // rebuild to pass isActive
    _load();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final order = await context
          .read<NeighborlyApiService>()
          .fetchOrderById(widget.orderId);
      if (!mounted) return;
      setState(() {
        _order = order;
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
        title: Text(
          _order?.status != null ? 'Order · ${_order!.status}' : 'Order',
          style: GoogleFonts.inter(fontWeight: FontWeight.w700),
        ),
        bottom: const TabBar(
          tabs: [Tab(text: 'Details'), Tab(text: 'Chat')],
        ),
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
              : _order == null
                  ? const Center(child: Text('Order not found'))
                  : DefaultTabController(
                      length: 2,
                      child: TabBarView(
                        controller: _tabs,
                        children: [
                          _DetailsTab(order: _order!),
                          OrderChatWidget(
                            orderId: widget.orderId,
                            isActive: _tabs.index == 1,
                          ),
                        ],
                      ),
                    ),
    );
  }
}

class _DetailsTab extends StatelessWidget {
  const _DetailsTab({required this.order});

  final OrderDetail order;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return RefreshIndicator(
      onRefresh: () async {},
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _kv(context, 'Status', order.status),
          _kv(context, 'Phase', order.phase ?? '—'),
          _kv(context, 'Address', order.address),
          _kv(context, 'Schedule', order.scheduleFlexibility),
          if (order.description.isNotEmpty)
            _kv(context, 'Description', order.description),
          if (order.answers.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              'Customer answers',
              style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: cs.secondary),
            ),
            const SizedBox(height: 8),
            ...order.answers.entries
                .map((e) => _kv(context, e.key, '${e.value}')),
          ],
          // TODO(F-3): Contract drafting deferred to next sprint.
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: cs.secondaryContainer.withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              'Contract drafting is coming in a future update.',
              style: GoogleFonts.inter(
                  fontSize: 13, color: cs.onSecondaryContainer),
            ),
          ),
        ],
      ),
    );
  }

  static Widget _kv(BuildContext context, String k, String v) {
    final cs = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(k,
              style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: cs.secondary)),
          const SizedBox(height: 2),
          Text(v,
              style: GoogleFonts.inter(fontSize: 14, color: cs.onSurface)),
        ],
      ),
    );
  }
}
