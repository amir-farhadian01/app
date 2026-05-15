import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/theme/app_theme.dart';
import '../core/services/business_service.dart';

/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Business Dashboard Screen — AutoFix Vaughan
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class BusinessDashboardScreen extends StatefulWidget {
  const BusinessDashboardScreen({super.key});

  @override
  State<BusinessDashboardScreen> createState() =>
      _BusinessDashboardScreenState();
}

class _DrawerMenuItem {
  const _DrawerMenuItem(this.label, this.icon);
  final String label;
  final IconData icon;
}

class _BusinessDashboardScreenState extends State<BusinessDashboardScreen> {
  String _selectedMenu = 'My Business';
  final BusinessService _businessService = BusinessService();

  bool _isLoading = true;
  Map<String, dynamic> _stats = {};
  List<Map<String, dynamic>> _appointments = [];

  final List<_DrawerMenuItem> _menuItems = const [
    _DrawerMenuItem('My Business', Icons.business),
    _DrawerMenuItem('Users & Roles', Icons.people_outline),
    _DrawerMenuItem('Services', Icons.build_outlined),
    _DrawerMenuItem('Calendar & Appointments', Icons.calendar_today),
    _DrawerMenuItem('Page, Blog & Inventory', Icons.description_outlined),
    _DrawerMenuItem('My Clients', Icons.group_outlined),
    _DrawerMenuItem('Offers, Orders & Jobs', Icons.receipt_long_outlined),
    _DrawerMenuItem('Payment Settings', Icons.payment_outlined),
    _DrawerMenuItem('Invoices', Icons.receipt_outlined),
  ];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    // Read businessId from route arguments
    final args = ModalRoute.of(context)?.settings.arguments;
    final businessId =
        (args is Map) ? (args['businessId'] as String?) ?? 'demo' : 'demo';

    try {
      final stats =
          await _businessService.getBusinessDashboardStats(businessId);
      final appointments =
          await _businessService.getAppointments(businessId);
      if (!mounted) return;
      setState(() {
        _stats = stats;
        _appointments = appointments;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      debugPrint('Error loading dashboard data: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth > 800;
        if (isWide) {
          return _buildDesktopLayout();
        }
        return _buildMobileLayout();
      },
    );
  }

  // ── Desktop Layout (with NavigationRail) ─────────────────────────

  Widget _buildDesktopLayout() {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Row(
          children: [
            // Side drawer
            NavigationRail(
              backgroundColor: AppColors.surface,
              selectedIndex: _menuItems
                  .indexWhere((item) => item.label == _selectedMenu),
              onDestinationSelected: (index) {
                setState(() => _selectedMenu = _menuItems[index].label);
              },
              labelType: NavigationRailLabelType.all,
              selectedIconTheme: const IconThemeData(
                color: AppColors.primary,
              ),
              unselectedIconTheme: const IconThemeData(
                color: AppColors.textSecondary,
              ),
              selectedLabelTextStyle: GoogleFonts.plusJakartaSans(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: AppColors.primary,
              ),
              unselectedLabelTextStyle: GoogleFonts.plusJakartaSans(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: AppColors.textSecondary,
              ),
              minWidth: 56,
              destinations: _menuItems
                  .map((item) => NavigationRailDestination(
                        icon: Icon(item.icon),
                        selectedIcon: Icon(item.icon),
                        label: Text(item.label),
                      ))
                  .toList(),
            ),
            const VerticalDivider(width: 1, color: AppColors.border),
            // Content
            Expanded(child: _buildDashboardContent()),
          ],
        ),
      ),
    );
  }

  // ── Mobile Layout (with bottom sheet menu) ───────────────────────

  Widget _buildMobileLayout() {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        title: Text(
          _selectedMenu,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.menu, color: AppColors.textPrimary),
          onPressed: () => _showMenuSheet(context),
        ),
        elevation: 0,
      ),
      body: _buildDashboardContent(),
    );
  }

  void _showMenuSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.lg)),
      ),
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 8),
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.textFaint,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 16),
              ..._menuItems.map((item) => ListTile(
                    leading: Icon(item.icon,
                        color: _selectedMenu == item.label
                            ? AppColors.primary
                            : AppColors.textSecondary),
                    title: Text(
                      item.label,
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: _selectedMenu == item.label
                            ? FontWeight.w600
                            : FontWeight.w400,
                        color: _selectedMenu == item.label
                            ? AppColors.primary
                            : AppColors.textPrimary,
                      ),
                    ),
                    onTap: () {
                      setState(() => _selectedMenu = item.label);
                      Navigator.pop(context);
                    },
                  )),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }

  // ── Dashboard Content ────────────────────────────────────────────

  Widget _buildDashboardContent() {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildBusinessHeader(),
          const SizedBox(height: 20),
          _buildKpiCards(),
          const SizedBox(height: 24),
          _buildTodayAppointments(),
          const SizedBox(height: 24),
          _buildRecentOffers(),
        ],
      ),
    );
  }

  // ── Business Header ──────────────────────────────────────────────

  Widget _buildBusinessHeader() {
    return Row(
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [AppColors.primary, AppColors.primaryLight],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(AppRadius.md),
          ),
          child: Center(
            child: Text(
              'A',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'AutoFix Vaughan',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
              Text(
                '@autofix_vaughan',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w400,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
        // Live indicator
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: AppColors.success.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(AppRadius.full),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(
                  color: AppColors.success,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 4),
              Text(
                'Live',
                style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: AppColors.success,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ── KPI Cards (2x2 grid) ─────────────────────────────────────────

  Widget _buildKpiCards() {
    if (_isLoading) {
      return const SizedBox(
        height: 200,
        child: Center(child: CircularProgressIndicator()),
      );
    }

    final pendingOrders = _stats['pendingOrders'] ?? 0;
    final completedOrders = _stats['completedOrders'] ?? 0;
    final activeClients = _stats['activeClients'] ?? 0;
    final totalRevenue = _stats['totalRevenue'] ?? 0;

    final kpis = [
      ('$_pendingAppointments', "Today's Appointments", '↑ +2 vs yesterday'),
      ('$pendingOrders', 'Pending Requests', 'Awaiting your reply'),
      ('\$$totalRevenue', 'Revenue This Week', '↑ 18% vs last week'),
      ('$completedOrders ⭐', 'Completed Orders', '$activeClients active clients'),
    ];
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 1.5,
      ),
      itemCount: kpis.length,
      itemBuilder: (context, index) {
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            boxShadow: AppColors.cardShadow,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                kpis[index].$1,
                style: GoogleFonts.jetBrainsMono(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                kpis[index].$2,
                style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textSecondary,
                ),
              ),
              const Spacer(),
              Text(
                kpis[index].$3,
                style: GoogleFonts.inter(
                  fontSize: 10,
                  fontWeight: FontWeight.w400,
                  color: AppColors.success,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  int get _pendingAppointments {
    return _appointments.where((a) => a['status'] == 'Pending' || a['status'] == 'Confirmed').length;
  }

  // ── Today's Appointments ─────────────────────────────────────────

  Color _statusColor(String status) {
    switch (status.toUpperCase()) {
      case 'CONFIRMED':
        return AppColors.success;
      case 'PENDING':
        return AppColors.warning;
      case 'DONE':
      case 'COMPLETED':
        return AppColors.textFaint;
      default:
        return AppColors.textSecondary;
    }
  }

  Widget _buildTodayAppointments() {
    final displayAppointments = _appointments.isEmpty
        ? [
            {'time': '9:00 AM', 'clientName': 'John M.', 'service': 'Standard Oil Change', 'price': '\$69', 'status': 'Confirmed'},
            {'time': '10:30 AM', 'clientName': 'Sarah K.', 'service': 'Full Vehicle Service', 'price': '\$149', 'status': 'Pending'},
            {'time': '8:00 AM', 'clientName': 'Mike L.', 'service': 'Tire Rotation', 'price': '\$40', 'status': 'Done'},
          ]
        : _appointments;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          "Today's Appointments",
          style: GoogleFonts.plusJakartaSans(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 12),
        ...displayAppointments.map((a) {
          final status = a['status'] as String? ?? 'Pending';
          final statusColor = _statusColor(status);
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(AppRadius.md),
              boxShadow: AppColors.cardShadow,
            ),
            child: Row(
              children: [
                // Time
                SizedBox(
                  width: 60,
                  child: Text(
                    a['time'] as String? ?? '',
                    style: GoogleFonts.jetBrainsMono(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // Details
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${a['clientName'] ?? ''} · ${a['service'] ?? ''}',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Text(
                        a['price'] as String? ?? '',
                        style: GoogleFonts.jetBrainsMono(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.success,
                        ),
                      ),
                    ],
                  ),
                ),
                // Status chip
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                  ),
                  child: Text(
                    status,
                    style: GoogleFonts.inter(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: statusColor,
                    ),
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  // ── Recent Offers & Orders ───────────────────────────────────────

  Widget _buildRecentOffers() {
    final offers = [
      (
        'Oil Change',
        'Custom Package (Mobil 1 Synthetic + K&N Filter)',
        '\$89',
        'New offer'
      ),
      (
        'Winter Prep Package',
        'Scheduled for May 12',
        '\$199',
        'Confirmed'
      ),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Recent Offers & Orders',
          style: GoogleFonts.plusJakartaSans(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 12),
        ...offers.map((o) => Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(AppRadius.md),
                boxShadow: AppColors.cardShadow,
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          o.$1,
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          o.$2,
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w400,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    o.$3,
                    style: GoogleFonts.jetBrainsMono(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.success,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: o.$4 == 'New offer'
                          ? AppColors.primary.withValues(alpha: 0.15)
                          : AppColors.success.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                    ),
                    child: Text(
                      o.$4,
                      style: GoogleFonts.inter(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: o.$4 == 'New offer'
                            ? AppColors.primary
                            : AppColors.success,
                      ),
                    ),
                  ),
                ],
              ),
            )),
      ],
    );
  }
}
