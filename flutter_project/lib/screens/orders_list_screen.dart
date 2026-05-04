import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../models/order_models.dart';
import '../services/neighborly_api_service.dart';

bool _useProviderOrdersList(NeighborlyApiService api) => api.user?.role == 'provider';

class OrdersListScreen extends StatefulWidget {
  const OrdersListScreen({super.key});

  @override
  State<OrdersListScreen> createState() => _OrdersListScreenState();
}

class _OrdersListScreenState extends State<OrdersListScreen> {
  bool _loading = true;
  String? _error;
  List<OrderSummary> _items = const [];
  String _phase = 'offer';

  ({List<String> phases, List<String> statuses}) _segmentToQuery(String segment) {
    switch (segment) {
      case 'offer':
        return (phases: <String>['offer'], statuses: <String>['submitted']);
      case 'order':
        return (phases: <String>['order'], statuses: <String>['matching', 'matched']);
      case 'job':
        return (phases: <String>['job'], statuses: <String>['contracted', 'paid', 'in_progress', 'completed']);
      case 'cancelled':
        return (phases: const <String>[], statuses: <String>['cancelled']);
      default:
        return (phases: <String>['offer'], statuses: <String>['submitted']);
    }
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final api = context.read<NeighborlyApiService>();
      final query = _segmentToQuery(_phase);
      final res = _useProviderOrdersList(api)
          ? await api.fetchProviderMyOrders(phases: query.phases, statuses: query.statuses)
          : await api.fetchMyOrders(phases: query.phases, statuses: query.statuses);

      if (!mounted) return;
      setState(() {
        _items = res.items;
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

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final api = context.watch<NeighborlyApiService>();
    final providerList = _useProviderOrdersList(api);
    final tabs = <String>['offer', 'order', 'job', 'cancelled'];

    return Scaffold(
      appBar: AppBar(
        title: Text(providerList ? 'Workspace Orders' : 'My Orders', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    providerList
                        ? 'Track invited, matched and active workspace jobs.'
                        : 'Follow your orders from request to payment.',
                    style: GoogleFonts.inter(fontSize: 13, color: cs.onSurfaceVariant),
                  ),
                ),
              ],
            ),
          ),
          SizedBox(
            height: 48,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: tabs
                  .map(
                    (tab) => Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(tab.toUpperCase(), style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600)),
                        selected: _phase == tab,
                        showCheckmark: false,
                        onSelected: (_) {
                          setState(() => _phase = tab);
                          _load();
                        },
                      ),
                    ),
                  )
                  .toList(),
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _load,
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? ListView(
                          children: [
                            Padding(
                              padding: const EdgeInsets.all(24),
                              child: Text(_error!, textAlign: TextAlign.center, style: GoogleFonts.inter()),
                            ),
                          ],
                        )
                      : _items.isEmpty
                          ? ListView(
                              children: [
                                Padding(
                                  padding: const EdgeInsets.fromLTRB(24, 80, 24, 24),
                                  child: Column(
                                    children: [
                                      Icon(Icons.inbox_outlined, size: 42, color: cs.onSurfaceVariant),
                                      const SizedBox(height: 12),
                                      Text('No orders in this segment yet.', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
                                      const SizedBox(height: 6),
                                      Text(
                                        providerList
                                            ? 'Try another segment or wait for new inbox activity.'
                                            : 'Create an order to start matching with providers.',
                                        textAlign: TextAlign.center,
                                        style: GoogleFonts.inter(color: cs.onSurfaceVariant, fontSize: 13),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            )
                          : ListView.separated(
                              padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
                              itemCount: _items.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 10),
                              itemBuilder: (_, i) {
                                final o = _items[i];
                                return Card(
                                  margin: EdgeInsets.zero,
                                  child: InkWell(
                                    borderRadius: BorderRadius.circular(20),
                                    onTap: () => Navigator.of(context).pushNamed('/orders/${o.id}'),
                                    child: Padding(
                                      padding: const EdgeInsets.all(14),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            children: [
                                              Expanded(
                                                child: Text(
                                                  o.serviceName,
                                                  maxLines: 1,
                                                  overflow: TextOverflow.ellipsis,
                                                  style: GoogleFonts.inter(fontWeight: FontWeight.w700),
                                                ),
                                              ),
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                                decoration: BoxDecoration(
                                                  color: cs.surfaceContainerHighest,
                                                  borderRadius: BorderRadius.circular(999),
                                                ),
                                                child: Text(
                                                  o.status,
                                                  style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600),
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 8),
                                          Text(
                                            o.address,
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                            style: GoogleFonts.inter(color: cs.onSurfaceVariant, fontSize: 12.5),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                );
                              },
                            ),
            ),
          ),
        ],
      ),
      floatingActionButton: providerList
          ? null
          : FloatingActionButton.extended(
              onPressed: () => Navigator.of(context).pushNamed('/orders/new?entryPoint=explorer'),
              label: const Text('Create Order'),
              icon: const Icon(Icons.add),
            ),
    );
  }
}
