import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Orders Screen (Redesigned)
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// TabBar: Active | Completed | Cancelled. All data is hardcoded mock.
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
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
                    orders: _activeOrders,
                    emptyIcon: Icons.pending_actions,
                    emptyMessage: 'No active orders',
                    emptySubtitle: 'Book a service to get started',
                  ),
                  _OrdersList(
                    orders: _completedOrders,
                    emptyIcon: Icons.check_circle_outline,
                    emptyMessage: 'No completed orders',
                    emptySubtitle: 'Your completed orders will appear here',
                  ),
                  _OrdersList(
                    orders: _cancelledOrders,
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

// ── Mock Data ─────────────────────────────────────────────────────────

const List<_OrderData> _activeOrders = [
  _OrderData(
    id: '#1042',
    service: 'Pipe Repair',
    provider: 'Mike D.',
    initials: 'M.D.',
    dateTime: 'Tomorrow, 10:00 AM',
    status: 'Confirmed',
    statusColor: Color(0xFF01696F),
  ),
  _OrderData(
    id: '#1045',
    service: 'Electrical Wiring',
    provider: 'Reza M.',
    initials: 'R.M.',
    dateTime: 'Fri, May 18, 2:00 PM',
    status: 'In Progress',
    statusColor: Color(0xFFF59E0B),
  ),
];

const List<_OrderData> _completedOrders = [
  _OrderData(
    id: '#1038',
    service: 'Home Cleaning',
    provider: 'Layla K.',
    initials: 'L.K.',
    dateTime: 'May 10, 2026',
    status: 'Completed',
    statusColor: Color(0xFF437A22),
  ),
  _OrderData(
    id: '#1035',
    service: 'Interior Painting',
    provider: 'Layla K.',
    initials: 'L.K.',
    dateTime: 'Apr 28, 2026',
    status: 'Completed',
    statusColor: Color(0xFF437A22),
  ),
  _OrderData(
    id: '#1030',
    service: 'Outlet Installation',
    provider: 'Reza M.',
    initials: 'R.M.',
    dateTime: 'Apr 15, 2026',
    status: 'Completed',
    statusColor: Color(0xFF437A22),
  ),
];

const List<_OrderData> _cancelledOrders = [
  _OrderData(
    id: '#1025',
    service: 'Garden Maintenance',
    provider: 'Omar S.',
    initials: 'O.S.',
    dateTime: 'Mar 20, 2026',
    status: 'Cancelled',
    statusColor: Color(0xFFA12C7B),
  ),
];

/// ── Order Data Model ─────────────────────────────────────────────────
class _OrderData {
  final String id;
  final String service;
  final String provider;
  final String initials;
  final String dateTime;
  final String status;
  final Color statusColor;

  const _OrderData({
    required this.id,
    required this.service,
    required this.provider,
    required this.initials,
    required this.dateTime,
    required this.status,
    required this.statusColor,
  });
}

/// ── Orders List Widget ───────────────────────────────────────────────
class _OrdersList extends StatelessWidget {
  final List<_OrderData> orders;
  final IconData emptyIcon;
  final String emptyMessage;
  final String emptySubtitle;

  const _OrdersList({
    required this.orders,
    required this.emptyIcon,
    required this.emptyMessage,
    required this.emptySubtitle,
  });

  @override
  Widget build(BuildContext context) {
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
  final _OrderData order;

  const _OrderCard({required this.order});

  @override
  Widget build(BuildContext context) {
    final isCancelled = order.status == 'Cancelled';
    final isCompleted = order.status == 'Completed';

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
                  order.initials,
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
                      order.service,
                      style: AppTextStyles.titleMedium(color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${order.provider} • ${order.id}',
                      style: AppTextStyles.caption(color: AppColors.textMuted),
                    ),
                  ],
                ),
              ),
              // Status chip
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: order.statusColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  order.status,
                  style: AppTextStyles.caption(color: order.statusColor),
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
                order.dateTime,
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
}
