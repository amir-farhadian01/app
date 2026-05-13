import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../models/order_models.dart';
import '../routing/app_navigator.dart';
import '../services/neighborly_api_service.dart';
import '../services/orders_service.dart';
import '../widgets/order_summary_card.dart';

/// Customer-facing home tab: greeting, quick actions, active orders preview.
class CustomerHomeScreen extends StatefulWidget {
  const CustomerHomeScreen({super.key});

  @override
  State<CustomerHomeScreen> createState() => _CustomerHomeScreenState();
}

class _CustomerHomeScreenState extends State<CustomerHomeScreen> {
  List<OrderSummary> _activeOrders = const [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) setState(() => _loading = true);
    try {
      final api = context.read<NeighborlyApiService>();
      final svc = OrdersService(api);
      final res = await svc.getMyOrders('active', page: 1, pageSize: 3);
      if (!mounted) return;
      setState(() {
        _activeOrders = res.items;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final api = context.watch<NeighborlyApiService>();
    final user = api.user;
    final firstName = () {
      final fn = user?.firstName?.trim();
      if (fn != null && fn.isNotEmpty) return fn;
      final dn = (user?.displayName ?? '').trim();
      if (dn.isEmpty) return 'there';
      return dn.split(' ').first;
    }();
    final initials = () {
      final n = (user?.displayName ?? '').trim();
      if (n.isEmpty) return '?';
      final parts = n.split(RegExp(r'\s+')).where((e) => e.isNotEmpty).toList();
      if (parts.length >= 2) return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
      return n.length >= 2 ? n.substring(0, 2).toUpperCase() : n[0].toUpperCase();
    }();
    final avatarUrl = user?.photoURL;
    final cs = Theme.of(context).colorScheme;

    return RefreshIndicator(
      onRefresh: () => _load(silent: true),
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverToBoxAdapter(child: _greeting(cs, firstName, initials, avatarUrl)),
          SliverToBoxAdapter(child: _quickActions(cs)),
          SliverToBoxAdapter(child: _activeOrdersSection(cs)),
          const SliverToBoxAdapter(child: SizedBox(height: 96)),
        ],
      ),
    );
  }

  Widget _greeting(ColorScheme cs, String firstName, String initials, String? avatarUrl) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
      child: Row(
        children: [
          CircleAvatar(
            radius: 26,
            backgroundColor: cs.primaryContainer,
            backgroundImage: (avatarUrl != null && avatarUrl.isNotEmpty) ? NetworkImage(avatarUrl) : null,
            child: (avatarUrl == null || avatarUrl.isEmpty)
                ? Text(initials, style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800, color: cs.onPrimaryContainer))
                : null,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Hello, $firstName',
              style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w700, color: cs.onSurface),
            ),
          ),
        ],
      ),
    );
  }

  Widget _quickActions(ColorScheme cs) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Quick actions', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: cs.onSurface)),
          const SizedBox(height: 12),
          SizedBox(
            height: 80,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                _QuickActionChip(
                  icon: LucideIcons.plus,
                  label: 'Book a Service',
                  onTap: () => neighborlyNavigatorKey.currentState?.pushNamed('/orders/new?entryPoint=direct'),
                ),
                const SizedBox(width: 10),
                _QuickActionChip(
                  icon: LucideIcons.clipboardList,
                  label: 'My Orders',
                  onTap: () => neighborlyNavigatorKey.currentState?.pushNamed('/my-orders'),
                ),
                const SizedBox(width: 10),
                _QuickActionChip(
                  icon: LucideIcons.messageCircle,
                  label: 'Messages',
                  onTap: () => neighborlyNavigatorKey.currentState?.pushNamed('/my-orders'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _activeOrdersSection(ColorScheme cs) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text('Active orders', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: cs.onSurface)),
              const Spacer(),
              TextButton(
                onPressed: () => neighborlyNavigatorKey.currentState?.pushNamed('/my-orders'),
                child: Text('See all', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: cs.primary)),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (_loading)
            const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator()))
          else if (_activeOrders.isEmpty)
            _emptyState(cs)
          else
            Column(
              children: [
                for (final o in _activeOrders) ...[
                  OrderSummaryCard(
                    order: o,
                    onTap: () => neighborlyNavigatorKey.currentState?.pushNamed('/orders/${o.id}'),
                  ),
                  const SizedBox(height: 10),
                ],
              ],
            ),
        ],
      ),
    );
  }

  Widget _emptyState(ColorScheme cs) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: cs.outline.withValues(alpha: 0.3)),
      ),
      child: Column(
        children: [
          Icon(LucideIcons.inbox, size: 48, color: cs.secondary),
          const SizedBox(height: 16),
          Text('No active orders', style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w700, color: cs.onSurface)),
          const SizedBox(height: 8),
          Text(
            'Book your first service to get started.',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(fontSize: 14, color: cs.secondary, height: 1.4),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: () => neighborlyNavigatorKey.currentState?.pushNamed('/orders/new?entryPoint=direct'),
            child: Text('Book your first service', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }
}

class _QuickActionChip extends StatelessWidget {
  const _QuickActionChip({required this.icon, required this.label, required this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Semantics(
      label: label,
      button: true,
      child: Material(
        color: cs.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(14),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 18, color: cs.onSurface),
                const SizedBox(width: 8),
                Text(label, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: cs.onSurface)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
