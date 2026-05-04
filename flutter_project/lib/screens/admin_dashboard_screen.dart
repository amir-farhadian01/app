import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../models/service_model.dart';
import '../services/neighborly_api_service.dart';
import '../services/neighborly_theme_notifier.dart';
import '../theme/neighborly_theme.dart';
import 'admin/admin_cms_page.dart';
import 'admin/admin_kyc_page.dart';
import 'admin/admin_overview_page.dart';
import 'admin/admin_services_page.dart';
import 'admin/admin_teams_page.dart';
import 'admin/admin_users_page.dart';

/// Comprehensive Admin Dashboard with multiple pages
/// Mirrors the web admin panel design shown in screenshots
class AdminDashboardScreen extends StatefulWidget {
  final AdminPage initialPage;

  const AdminDashboardScreen({
    super.key,
    this.initialPage = AdminPage.overview,
  });

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

enum AdminPage {
  overview,
  users,
  kycReview,
  services,
  moderationQueue,
  contractsQueue,
  paymentsLedger,
  intelligence,
  financialLedger,
  teams,
  cms,
  monitoring,
  integrations,
  legal,
  settings,
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  late AdminPage _currentPage;
  List<Map<String, dynamic>> _users = [];
  Map<String, dynamic>? _stats;
  List<ServiceModel> _services = [];
  List<Map<String, dynamic>> _moderationItems = [];
  List<Map<String, dynamic>> _contractQueueItems = [];
  List<Map<String, dynamic>> _paymentLedgerItems = [];
  String? _error;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _currentPage = widget.initialPage;
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final api = context.read<NeighborlyApiService>();
      final users = await api.fetchAdminUsers();
      final stats = await api.fetchAdminStats();
      final services = await api.fetchServices();
      final moderation = await api.fetchAdminModerationQueue();
      final contracts = await api.fetchAdminContractsQueue();
      final payments = await api.fetchAdminPaymentsLedger();

      if (mounted) {
        setState(() {
          _users = users;
          _stats = stats;
          _services = services;
          _moderationItems = _toMapList(moderation['items']);
          _contractQueueItems = _toMapList(contracts['items']);
          _paymentLedgerItems = _toMapList(payments['items']);
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  String get _pageTitle {
    switch (_currentPage) {
      case AdminPage.overview:
        return 'Overview';
      case AdminPage.users:
        return 'User Directory';
      case AdminPage.kycReview:
        return 'KYC Review';
      case AdminPage.services:
        return 'Service Intelligence';
      case AdminPage.moderationQueue:
        return 'Moderation Queue';
      case AdminPage.contractsQueue:
        return 'Contracts Queue';
      case AdminPage.paymentsLedger:
        return 'Payments Ledger';
      case AdminPage.intelligence:
        return 'Intelligence';
      case AdminPage.financialLedger:
        return 'Financial Ledger';
      case AdminPage.teams:
        return 'Teams';
      case AdminPage.cms:
        return 'CMS';
      case AdminPage.monitoring:
        return 'Monitoring';
      case AdminPage.integrations:
        return 'Integrations';
      case AdminPage.legal:
        return 'Legal';
      case AdminPage.settings:
        return 'Settings';
    }
  }

  Widget get _currentPageWidget {
    switch (_currentPage) {
      case AdminPage.overview:
        return AdminOverviewPage(
          stats: _stats,
          recentActivity: _generateMockActivity(),
          onRefresh: _loadData,
        );
      case AdminPage.users:
        return AdminUsersPage(
          users: _users,
          onRefresh: _loadData,
        );
      case AdminPage.kycReview:
        return AdminKycPage(
          submissions: _users.where((u) => u['kycStatus'] != null).toList(),
          onRefresh: _loadData,
        );
      case AdminPage.services:
      case AdminPage.intelligence:
        return AdminServicesPage(
          services: _services,
          onRefresh: _loadData,
        );
      case AdminPage.moderationQueue:
        return _buildModerationQueuePage();
      case AdminPage.contractsQueue:
        return _buildContractsQueuePage();
      case AdminPage.paymentsLedger:
        return _buildPaymentsLedgerPage();
      case AdminPage.teams:
        return AdminTeamsPage(
          users: _users,
          onRefresh: _loadData,
        );
      case AdminPage.cms:
        return const AdminCmsPage();
      default:
        return _buildPlaceholderPage();
    }
  }

  List<Map<String, dynamic>> _generateMockActivity() {
    return [
      {
        'type': 'kyc',
        'title': 'Approved KYC for User',
        'subtitle': 'ID: OCR7FFYF',
        'time': '09:48 p.m.',
      },
      {
        'type': 'error',
        'title': 'Firestore Error: list on schedules',
        'subtitle': 'ID: 0d28fVU',
        'time': '08:18 p.m.',
      },
      {
        'type': 'kyc',
        'title': 'Approved KYC for User',
        'subtitle': 'ID: FQ58RJLQ',
        'time': '09:04 p.m.',
      },
    ];
  }

  List<Map<String, dynamic>> _toMapList(dynamic raw) {
    if (raw is! List) return <Map<String, dynamic>>[];
    return raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Widget _buildModerationQueuePage() {
    if (_moderationItems.isEmpty) {
      return const Center(child: Text('No moderation flags in queue.'));
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _moderationItems.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, i) {
        final row = _moderationItems[i];
        final thread = row['thread'] is Map ? Map<String, dynamic>.from(row['thread'] as Map) : const <String, dynamic>{};
        return Card(
          child: ListTile(
            title: Text(row['displayText']?.toString() ?? 'Message'),
            subtitle: Text('status=${row['moderationStatus'] ?? '-'} · order=${thread['orderId'] ?? '-'}'),
            trailing: Wrap(
              spacing: 8,
              children: [
                OutlinedButton(
                  onPressed: () => _moderationAction(row['id']?.toString(), escalate: false),
                  child: const Text('Review'),
                ),
                FilledButton.tonal(
                  onPressed: () => _moderationAction(row['id']?.toString(), escalate: true),
                  child: const Text('Escalate'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _moderationAction(String? messageId, {required bool escalate}) async {
    if (messageId == null || messageId.isEmpty) return;
    final api = context.read<NeighborlyApiService>();
    try {
      if (escalate) {
        await api.escalateAdminModerationFlag(messageId, internalNote: 'Escalated from Flutter admin queue');
      } else {
        await api.reviewAdminModerationFlag(messageId, internalNote: 'Reviewed from Flutter admin queue');
      }
      await _loadData();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Widget _buildContractsQueuePage() {
    if (_contractQueueItems.isEmpty) {
      return const Center(child: Text('No contracts in queue.'));
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _contractQueueItems.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, i) {
        final row = _contractQueueItems[i];
        final currentVersion = row['currentVersion'] is Map ? Map<String, dynamic>.from(row['currentVersion'] as Map) : const <String, dynamic>{};
        return Card(
          child: ListTile(
            title: Text('Order ${row['orderId'] ?? '-'}'),
            subtitle: Text('v${currentVersion['versionNumber'] ?? '-'} · ${currentVersion['status'] ?? '-'}'),
            trailing: Wrap(
              spacing: 8,
              children: [
                OutlinedButton(
                  onPressed: () => _openContractDetail(row['id']?.toString()),
                  child: const Text('Detail'),
                ),
                FilledButton(
                  onPressed: () => _markContractReviewed(row['id']?.toString()),
                  child: const Text('Mark reviewed'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _openContractDetail(String? contractId) async {
    if (contractId == null || contractId.isEmpty) return;
    final api = context.read<NeighborlyApiService>();
    try {
      final detail = await api.fetchAdminContractDetail(contractId);
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (_) => AlertDialog(
          title: const Text('Contract detail'),
          content: SizedBox(
            width: 520,
            child: SingleChildScrollView(
              child: Text(
                'Order: ${detail['order'] is Map ? (detail['order'] as Map)['id'] : '-'}\n'
                'Current status: ${detail['currentVersion'] is Map ? (detail['currentVersion'] as Map)['status'] : '-'}\n'
                'API actions available: mark-reviewed, override-supersede, internal-note',
              ),
            ),
          ),
          actions: [TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Close'))],
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _markContractReviewed(String? contractId) async {
    if (contractId == null || contractId.isEmpty) return;
    final api = context.read<NeighborlyApiService>();
    try {
      await api.markAdminContractReviewed(contractId);
      await _loadData();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Widget _buildPaymentsLedgerPage() {
    if (_paymentLedgerItems.isEmpty) {
      return const Center(child: Text('No payment records in ledger.'));
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _paymentLedgerItems.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, i) {
        final row = _paymentLedgerItems[i];
        return Card(
          child: ListTile(
            title: Text('${row['category'] ?? 'payment'} · ${row['amount'] ?? '-'}'),
            subtitle: Text('order=${row['order'] is Map ? (row['order'] as Map)['id'] : '-'}'),
            trailing: OutlinedButton(
              onPressed: () => _openPaymentDetail(row['id']?.toString()),
              child: const Text('Detail'),
            ),
          ),
        );
      },
    );
  }

  Future<void> _openPaymentDetail(String? transactionId) async {
    if (transactionId == null || transactionId.isEmpty) return;
    final api = context.read<NeighborlyApiService>();
    try {
      final detail = await api.fetchAdminPaymentLedgerDetail(transactionId);
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (_) => AlertDialog(
          title: const Text('Payment detail'),
          content: SizedBox(
            width: 540,
            child: SingleChildScrollView(
              child: Text(
                'Transaction: ${detail['transaction'] is Map ? (detail['transaction'] as Map)['id'] : '-'}\n'
                'Order: ${detail['order'] is Map ? (detail['order'] as Map)['id'] : '-'}\n'
                'Status visibility: read-only (no mutate API exposed on admin payments ledger).',
              ),
            ),
          ),
          actions: [TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Close'))],
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Widget _buildPlaceholderPage() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            LucideIcons.construction,
            size: 64,
            color: Colors.white.withValues(alpha: 0.2),
          ),
          const SizedBox(height: 16),
          Text(
            'Coming Soon',
            style: GoogleFonts.inter(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: Colors.white.withValues(alpha: 0.6),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'This page is under development',
            style: GoogleFonts.inter(
              fontSize: 14,
              color: Colors.white.withValues(alpha: 0.4),
            ),
          ),
        ],
      ),
    );
  }

  void _navigateToPage(AdminPage page) {
    if (page == _currentPage) return;
    setState(() {
      _currentPage = page;
    });
  }

  @override
  Widget build(BuildContext context) {
    final api = context.watch<NeighborlyApiService>();
    final themeNotifier = context.watch<NeighborlyThemeNotifier>();

    return Theme(
      data: NeighborlyTheme.dark(), // Force dark theme for admin
      child: Scaffold(
        backgroundColor: const Color(0xFF0a0a0a),
        body: Row(
          children: [
            // Sidebar
            _buildSidebar(context, api, themeNotifier),
            // Main content
            Expanded(
              child: Column(
                children: [
                  _buildTopBar(context, api, themeNotifier),
                  if (_error != null)
                    Container(
                      margin: const EdgeInsets.all(16),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.red.shade900.withValues(alpha: 0.3),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.red.shade700),
                      ),
                      child: Row(
                        children: [
                          Icon(LucideIcons.alertCircle, color: Colors.red.shade400),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              _error!,
                              style: GoogleFonts.inter(
                                color: Colors.red.shade300,
                                fontSize: 13,
                              ),
                            ),
                          ),
                          IconButton(
                            onPressed: _loadData,
                            icon: const Icon(LucideIcons.refreshCw, size: 18),
                            color: Colors.red.shade400,
                          ),
                        ],
                      ),
                    ),
                  if (_isLoading)
                    const LinearProgressIndicator(
                      backgroundColor: Colors.transparent,
                      valueColor: AlwaysStoppedAnimation(Color(0xFF10b981)),
                    ),
                  Expanded(
                    child: _currentPageWidget,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSidebar(BuildContext context, NeighborlyApiService api, NeighborlyThemeNotifier themeNotifier) {
    return Container(
      width: 260,
      decoration: BoxDecoration(
        color: const Color(0xFF111111),
        border: Border(
          right: BorderSide(color: Colors.white.withValues(alpha: 0.08)),
        ),
      ),
      child: Column(
        children: [
          _buildSidebarHeader(),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildNavSection('MAIN', [
                    _NavItem('Overview', AdminPage.overview, LucideIcons.layoutDashboard),
                    _NavItem('Users', AdminPage.users, LucideIcons.users),
                    _NavItem('KYC Review', AdminPage.kycReview, LucideIcons.shieldCheck),
                    _NavItem('Services', AdminPage.services, LucideIcons.briefcase),
                  ]),
                  const SizedBox(height: 24),
                  _buildNavSection('INTELLIGENCE', [
                    _NavItem('Intelligence', AdminPage.intelligence, LucideIcons.brain),
                    _NavItem('Moderation Queue', AdminPage.moderationQueue, LucideIcons.shieldAlert),
                    _NavItem('Contracts Queue', AdminPage.contractsQueue, LucideIcons.fileStack),
                    _NavItem('Payments Ledger', AdminPage.paymentsLedger, LucideIcons.receipt),
                    _NavItem('Financial Ledger', AdminPage.financialLedger, LucideIcons.wallet),
                  ]),
                  const SizedBox(height: 24),
                  _buildNavSection('MANAGEMENT', [
                    _NavItem('Teams', AdminPage.teams, LucideIcons.users2),
                    _NavItem('CMS', AdminPage.cms, LucideIcons.fileText),
                    _NavItem('Monitoring', AdminPage.monitoring, LucideIcons.activity),
                    _NavItem('Integrations', AdminPage.integrations, LucideIcons.plug),
                  ]),
                  const SizedBox(height: 24),
                  _buildNavSection('SYSTEM', [
                    _NavItem('Legal', AdminPage.legal, LucideIcons.scale),
                    _NavItem('Settings', AdminPage.settings, LucideIcons.settings),
                  ]),
                ],
              ),
            ),
          ),
          _buildSidebarFooter(context, api),
        ],
      ),
    );
  }

  Widget _buildSidebarHeader() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(color: Colors.white.withValues(alpha: 0.08)),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Center(
              child: Transform.rotate(
                angle: 0.785398,
                child: Container(
                  width: 16,
                  height: 16,
                  decoration: BoxDecoration(
                    color: const Color(0xFF111111),
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'CONTROL',
                style: GoogleFonts.inter(
                  fontWeight: FontWeight.w900,
                  fontStyle: FontStyle.italic,
                  fontSize: 18,
                  color: Colors.white,
                  letterSpacing: -0.5,
                ),
              ),
              Text(
                'PLATFORM ADMIN PANEL',
                style: GoogleFonts.inter(
                  fontSize: 8,
                  fontWeight: FontWeight.w800,
                  color: Colors.white.withValues(alpha: 0.5),
                  letterSpacing: 1,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildNavSection(String title, List<_NavItem> items) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 12, bottom: 8),
          child: Text(
            title,
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              color: Colors.white.withValues(alpha: 0.4),
              letterSpacing: 1.5,
            ),
          ),
        ),
        ...items.map((item) => _buildNavTile(item)),
      ],
    );
  }

  Widget _buildNavTile(_NavItem item) {
    final isActive = _currentPage == item.page;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => _navigateToPage(item.page),
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          margin: const EdgeInsets.only(bottom: 4),
          decoration: BoxDecoration(
            color: isActive ? Colors.white.withValues(alpha: 0.08) : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            border: isActive
                ? Border.all(color: Colors.white.withValues(alpha: 0.15))
                : null,
          ),
          child: Row(
            children: [
              Icon(
                item.icon,
                size: 18,
                color: isActive ? Colors.white : Colors.white.withValues(alpha: 0.5),
              ),
              const SizedBox(width: 12),
              Text(
                item.label,
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                  color: isActive ? Colors.white : Colors.white.withValues(alpha: 0.6),
                ),
              ),
              if (isActive) ...[
                const Spacer(),
                Container(
                  width: 4,
                  height: 4,
                  decoration: const BoxDecoration(
                    color: Color(0xFF10b981),
                    shape: BoxShape.circle,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSidebarFooter(BuildContext context, NeighborlyApiService api) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border(
          top: BorderSide(color: Colors.white.withValues(alpha: 0.08)),
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () async {
            await api.logout();
            if (context.mounted) {
              Navigator.of(context).pushNamedAndRemoveUntil('/', (route) => false);
            }
          },
          borderRadius: BorderRadius.circular(10),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              children: [
                Icon(
                  LucideIcons.logOut,
                  size: 18,
                  color: Colors.red.shade400,
                ),
                const SizedBox(width: 12),
                Text(
                  'Sign Out',
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Colors.red.shade400,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTopBar(BuildContext context, NeighborlyApiService api, NeighborlyThemeNotifier themeNotifier) {
    return Container(
      height: 64,
      padding: const EdgeInsets.symmetric(horizontal: 24),
      decoration: BoxDecoration(
        color: const Color(0xFF111111),
        border: Border(
          bottom: BorderSide(color: Colors.white.withValues(alpha: 0.08)),
        ),
      ),
      child: Row(
        children: [
          Text(
            _pageTitle.toUpperCase(),
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w900,
              color: Colors.white,
              letterSpacing: 2,
            ),
          ),
          const Spacer(),
          Container(
            width: 320,
            height: 40,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
            ),
            child: Row(
              children: [
                const SizedBox(width: 12),
                Icon(
                  LucideIcons.search,
                  size: 16,
                  color: Colors.white.withValues(alpha: 0.4),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: Colors.white.withValues(alpha: 0.8),
                    ),
                    decoration: InputDecoration(
                      hintText: 'Search...',
                      hintStyle: GoogleFonts.inter(
                        fontSize: 13,
                        color: Colors.white.withValues(alpha: 0.4),
                      ),
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.zero,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
              ],
            ),
          ),
          const SizedBox(width: 16),
          IconButton(
            onPressed: themeNotifier.toggleTheme,
            icon: Icon(
              themeNotifier.isDark ? LucideIcons.sun : LucideIcons.moon,
              size: 18,
              color: Colors.white.withValues(alpha: 0.6),
            ),
          ),
          const SizedBox(width: 8),
          Stack(
            children: [
              IconButton(
                onPressed: () {},
                icon: Icon(
                  LucideIcons.bell,
                  size: 18,
                  color: Colors.white.withValues(alpha: 0.6),
                ),
              ),
              Positioned(
                right: 8,
                top: 8,
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Color(0xFFef4444),
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(width: 12),
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: const Color(0xFF10b981),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Center(
              child: Text(
                api.user?.displayName.substring(0, 1).toUpperCase() ?? 'A',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NavItem {
  final String label;
  final AdminPage page;
  final IconData icon;

  _NavItem(this.label, this.page, this.icon);
}
