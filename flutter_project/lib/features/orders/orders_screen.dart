import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../services/api_service.dart';

/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Orders Screen (Redesigned)
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// TabBar: Active | Completed | Cancelled. Orders loaded from API.
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  bool _isLoading = false;
  List<Map<String, dynamic>> _orders = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(_onTabChanged);
    Future.microtask(() => _loadOrders('active'));
  }

  @override
  void dispose() {
    _tabController.removeListener(_onTabChanged);
    _tabController.dispose();
    super.dispose();
  }

  void _onTabChanged() {
    if (_tabController.indexIsChanging) return;
    const statuses = ['active', 'completed', 'cancelled'];
    _loadOrders(statuses[_tabController.index]);
  }

  Future<void> _loadOrders(String status) async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    try {
      final result = await ApiService.getOrdersByStatus(status);
      if (!mounted) return;
      setState(() {
        _orders = result.cast<Map<String, dynamic>>();
        _isLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Connection error')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Title ──────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.lg, AppSpacing.md, AppSpacing.lg, 0,
              ),
              child: Text(
                'Orders',
                style: AppTextStyles.displayLarge(color: AppColors.textPrimary),
              ),
            ),
            const SizedBox(height: AppSpacing.md),

            // ── TabBar ─────────────────────────────────────────────
            TabBar(
              controller: _tabController,
              labelColor: AppColors.primary,
              unselectedLabelColor: AppColors.textMuted,
              indicatorColor: AppColors.primary,
              indicatorSize: TabBarIndicatorSize.label,
              labelStyle: AppTextStyles.titleMedium(color: AppColors.primary),
              unselectedLabelStyle: AppTextStyles.bodySmall(color: AppColors.textMuted),
              dividerColor: AppColors.divider,
              tabs: const [
                Tab(text: 'Active'),
                Tab(text: 'Completed'),
                Tab(text: 'Cancelled'),
              ],
            ),

            // ── TabBarView ─────────────────────────────────────────
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _OrdersList(
                    orders: _orders,
                    isLoading: _isLoading,
                    emptyIcon: Icons.pending_actions,
                    emptyMessage: 'No active orders',
                    emptySubtitle: 'Book a service to get started',
                  ),
                  _OrdersList(
                    orders: _orders,
                    isLoading: _isLoading,
                    emptyIcon: Icons.check_circle_outline,
                    emptyMessage: 'No completed orders',
                    emptySubtitle: 'Your completed orders will appear here',
                  ),
                  _OrdersList(
                    orders: _orders,
                    isLoading: _isLoading,
                    emptyIcon: Icons.cancel_outlined,
                    emptyMessage: 'No cancelled orders',
                    emptySubtitle: 'You have no cancelled orders',
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// ── Orders List Widget ───────────────────────────────────────────────
class _OrdersList extends StatelessWidget {
  final List<Map<String, dynamic>> orders;
  final bool isLoading;
  final IconData emptyIcon;
  final String emptyMessage;
  final String emptySubtitle;

  const _OrdersList({
    required this.orders,
    required this.isLoading,
    required this.emptyIcon,
    required this.emptyMessage,
    required this.emptySubtitle,
  });

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (orders.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xxl),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(emptyIcon, size: 64, color: AppColors.textFaint),
              const SizedBox(height: AppSpacing.md),
              Text(
                emptyMessage,
                style: AppTextStyles.titleMedium(color: AppColors.textMuted),
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                emptySubtitle,
                style: AppTextStyles.bodySmall(color: AppColors.textMuted),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.xl),
              FilledButton(
                onPressed: () {},
                child: const Text('Browse Services'),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.lg),
      itemCount: orders.length,
      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
      itemBuilder: (context, index) {
        final order = orders[index];
        return _OrderCard(order: order);
      },
    );
  }
}

/// ── Order Card Widget ────────────────────────────────────────────────
class _OrderCard extends StatelessWidget {
  final Map<String, dynamic> order;

  const _OrderCard({required this.order});

  @override
  Widget build(BuildContext context) {
    final status = order['status'] as String? ?? '';
    final isCancelled = status == 'Cancelled' || status == 'cancelled';
    final isCompleted = status == 'Completed' || status == 'completed';

    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Header row ───────────────────────────────────────────
          Row(
            children: [
              // Avatar
              CircleAvatar(
                radius: 20,
                backgroundColor: AppColors.primaryLight,
                child: Text(
                  order['initials'] ?? '?',
                  style: AppTextStyles.bodySmall(color: AppColors.primary),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              // Service + Provider
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      order['service'] ?? order['id'] ?? 'Order',
                      style: AppTextStyles.titleMedium(color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${order['provider'] ?? ''} • ${order['id'] ?? ''}',
                      style: AppTextStyles.caption(color: AppColors.textMuted),
                    ),
                  ],
                ),
              ),
              // Status chip
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: _statusColor(status).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  status,
                  style: AppTextStyles.caption(color: _statusColor(status)),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),

          // ── Date/Time ────────────────────────────────────────────
          Row(
            children: [
              const Icon(Icons.schedule, size: 14, color: AppColors.textMuted),
              const SizedBox(width: 6),
              Text(
                order['createdAt'] ?? order['dateTime'] ?? '',
                style: AppTextStyles.bodySmall(color: AppColors.textSecondary),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),

          // ── Action button ────────────────────────────────────────
          if (isCompleted)
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () {},
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppColors.primary),
                  foregroundColor: AppColors.primary,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppRadius.button),
                  ),
                ),
                child: const Text('Leave a Review'),
              ),
            )
          else if (isCancelled)
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () {},
                child: const Text('Rebook'),
              ),
            )
          else
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: () {
                  // Stub: Navigator.push to order detail
                },
                child: const Text('View Details'),
              ),
            ),
        ],
      ),
    );
  }

  Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'active':
      case 'confirmed':
        return const Color(0xFF01696F);
      case 'in progress':
        return const Color(0xFFF59E0B);
      case 'completed':
        return const Color(0xFF437A22);
      case 'cancelled':
        return const Color(0xFFA12C7B);
      default:
        return AppColors.textMuted;
    }
  }
}
