import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../models/user_model.dart';
import '../routing/app_navigator.dart';
import '../services/neighborly_api_service.dart';

/// Color constants matching port 8077 reference UI.
const _kPrimaryBlue = Color(0xFF2B6EFF);
const _kBgDark = Color(0xFF0D0F1A);
const _kCardBg = Color(0xFF1E2235);
const _kBorderColor = Color(0xFF2A2F4A);
const _kTextPrimary = Color(0xFFF0F2FF);
const _kTextSecondary = Color(0xFF8B8FA3);

/// Customer dashboard matching [src/pages/CustomerDashboard.tsx] on port 8077.
/// Tab-based layout: Overview (Home), My Requests, Spending, Support.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String _activeTab = 'home';
  List<Map<String, dynamic>> _requests = [];
  List<Map<String, dynamic>> _transactions = [];
  List<Map<String, dynamic>> _tickets = [];
  Map<String, dynamic>? _kycData;
  bool _loading = true;
  bool _showBecomeProvider = false;

  // Request filters
  String _filterCategory = 'All';
  String _filterStatus = 'All';
  String _filterSearch = '';

  // Notification toast
  Map<String, dynamic>? _notification;
  Timer? _notificationTimer;

  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _loadDashboard();
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _notificationTimer?.cancel();
    super.dispose();
  }

  void _showNotification(String message, {bool isError = false}) {
    _notificationTimer?.cancel();
    setState(() {
      _notification = {'message': message, 'isError': isError};
    });
    _notificationTimer = Timer(const Duration(seconds: 3), () {
      if (mounted) {
        setState(() => _notification = null);
      }
    });
  }

  Future<void> _loadDashboard() async {
    final api = context.read<NeighborlyApiService>();
    if (api.user?.uid == null) {
      setState(() => _loading = false);
      return;
    }

    try {
      final results = await Future.wait([
        api.fetchJsonList('/api/requests'),
        api.fetchJsonList('/api/transactions'),
        api.fetchJsonList('/api/tickets'),
        api.fetchKycMe(),
      ]);

      if (!mounted) return;

      setState(() {
        _requests = results[0] as List<Map<String, dynamic>>;
        _transactions = results[1] as List<Map<String, dynamic>>;
        _tickets = results[2] as List<Map<String, dynamic>>;
        _kycData = results[3] as Map<String, dynamic>?;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }

    // Poll every 6 seconds like the reference
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 6), (_) {
      if (!mounted) return;
      _pollDashboard();
    });
  }

  Future<void> _pollDashboard() async {
    final api = context.read<NeighborlyApiService>();
    if (api.user?.uid == null) return;

    try {
      final results = await Future.wait([
        api.fetchJsonList('/api/requests'),
        api.fetchJsonList('/api/transactions'),
        api.fetchJsonList('/api/tickets'),
      ]);

      if (!mounted) return;

      setState(() {
        _requests = results[0];
        _transactions = results[1];
        _tickets = results[2];
      });
    } catch (_) {
      // silent
    }
  }

  double get _totalSpent {
    return _transactions
        .where((t) => t['type'] == 'outcome')
        .fold<double>(0, (sum, t) => sum + ((t['amount'] ?? 0) as num).toDouble());
  }

  Future<void> _handleBecomeProvider() async {
    final api = context.read<NeighborlyApiService>();
    final user = api.user;
    if (user?.uid == null) return;

    final personalKyc = (_kycData != null && _kycData!['type'] == 'personal') ? _kycData : null;

    if (personalKyc == null || personalKyc['status'] != 'verified') {
      _showNotification(
        'You must complete Personal Identity Verification (KYC Level 1) before becoming a provider.',
        isError: true,
      );
      Future.delayed(const Duration(seconds: 2), () {
        neighborlyNavigatorKey.currentState?.pushNamed('/account?section=identity');
      });
      return;
    }

    try {
      await api.becomeProvider();
      _showNotification('Application successful! You are now a Provider.');
      setState(() => _showBecomeProvider = false);
      Future.delayed(const Duration(seconds: 1), () {
        neighborlyNavigatorKey.currentState?.pushNamed('/account?section=identity');
      });
    } catch (e) {
      _showNotification('Failed to become provider: $e', isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final api = context.watch<NeighborlyApiService>();
    final user = api.user;

    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: _kPrimaryBlue),
      );
    }

    return Scaffold(
      backgroundColor: _kBgDark,
      body: Stack(
        children: [
          // Main content
          SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Tab bar — sticky below header
                _buildTabBar(),
                const SizedBox(height: 24),
                // Tab content
                _buildTabContent(user),
              ],
            ),
          ),

          // Become Provider Modal
          if (_showBecomeProvider) _buildBecomeProviderModal(),

          // Notification Toast
          if (_notification != null) _buildNotificationToast(),
        ],
      ),
    );
  }

  Widget _buildTabBar() {
    final tabs = [
      ('home', 'Overview', LucideIcons.layoutDashboard),
      ('requests', 'My Requests', LucideIcons.clipboardList),
      ('finance', 'Spending', LucideIcons.dollarSign),
      ('tickets', 'Support', LucideIcons.messageSquare),
    ];

    return Container(
      decoration: const BoxDecoration(
        color: _kCardBg,
        border: Border(bottom: BorderSide(color: _kBorderColor)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: tabs.map((tab) {
            final isActive = _activeTab == tab.$1;
            return GestureDetector(
              onTap: () => setState(() => _activeTab = tab.$1),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(
                      color: isActive ? _kTextPrimary : Colors.transparent,
                      width: 2,
                    ),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      tab.$3,
                      size: 16,
                      color: isActive ? _kTextPrimary : _kTextSecondary,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      tab.$2,
                      style: GoogleFonts.inter(
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.5,
                        color: isActive ? _kTextPrimary : _kTextSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildTabContent(UserModel? user) {
    switch (_activeTab) {
      case 'requests':
        return _buildRequestsTab();
      case 'finance':
        return _buildFinanceTab();
      case 'tickets':
        return _buildSupportTab();
      default:
        return _buildHomeTab(user);
    }
  }

  // ── HOME TAB ──────────────────────────────────────────────────────────────

  Widget _buildHomeTab(UserModel? user) {
    final firstName = user?.firstName ?? user?.displayName.split(' ').firstOrNull ?? 'there';
    final initials = [
      user?.firstName?.isNotEmpty == true ? user!.firstName![0] : '',
      user?.lastName?.isNotEmpty == true ? user!.lastName![0] : '',
    ].join('').toUpperCase();
    final displayInitials = initials.isNotEmpty
        ? initials
        : (user?.displayName.isNotEmpty == true
            ? user!.displayName[0].toUpperCase()
            : '?');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Greeting header
        _buildGreetingHeader(user, firstName, displayInitials),

        const SizedBox(height: 24),

        // Quick Action cards
        _buildQuickActions(),

        const SizedBox(height: 24),

        // Active Orders strip
        _buildActiveOrdersSection(),
      ],
    );
  }

  Widget _buildGreetingHeader(UserModel? user, String firstName, String initials) {
    return Row(
      children: [
        // Avatar
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            color: _kPrimaryBlue.withValues(alpha: 0.2),
            borderRadius: BorderRadius.circular(28),
          ),
          child: user?.photoURL != null && user!.photoURL!.isNotEmpty
              ? ClipRRect(
                  borderRadius: BorderRadius.circular(28),
                  child: Image.network(user.photoURL!, fit: BoxFit.cover),
                )
              : Center(
                  child: Text(
                    initials,
                    style: GoogleFonts.inter(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: _kPrimaryBlue,
                    ),
                  ),
                ),
        ),
        const SizedBox(width: 16),

        // Greeting text
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Welcome back',
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.5,
                color: const Color(0xFF4A4F70),
              ),
            ),
            Text(
              'Hello, $firstName',
              style: GoogleFonts.inter(
                fontSize: 22,
                fontWeight: FontWeight.w900,
                color: _kTextPrimary,
              ),
            ),
          ],
        ),

        const Spacer(),

        // Become a Provider button
        GestureDetector(
          onTap: () => setState(() => _showBecomeProvider = true),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              border: Border.all(color: _kBorderColor),
              borderRadius: BorderRadius.circular(12),
              color: _kCardBg,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(LucideIcons.briefcase, size: 16, color: _kTextSecondary),
                const SizedBox(width: 8),
                Text(
                  'Become a Provider',
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.5,
                    color: _kTextSecondary,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildQuickActions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Quick Actions',
          style: GoogleFonts.inter(
            fontSize: 10,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.5,
            color: const Color(0xFF4A4F70),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 100,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: [
              _QuickActionCard(
                label: 'Book a Service',
                icon: LucideIcons.plus,
                onTap: () => neighborlyNavigatorKey.currentState?.pushNamed('/orders/new'),
              ),
              const SizedBox(width: 12),
              _QuickActionCard(
                label: 'My Active Orders',
                icon: LucideIcons.clipboardList,
                onTap: () => neighborlyNavigatorKey.currentState?.pushNamed('/orders?tab=active'),
              ),
              const SizedBox(width: 12),
              _QuickActionCard(
                label: 'Messages',
                icon: LucideIcons.messageSquare,
                badge: 0,
                onTap: () => neighborlyNavigatorKey.currentState?.pushNamed('/orders'),
              ),
              const SizedBox(width: 12),
              _QuickActionCard(
                label: 'Schedule',
                icon: LucideIcons.calendarClock,
                onTap: () => neighborlyNavigatorKey.currentState?.pushNamed('/dashboard?tab=schedule'),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildActiveOrdersSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Text(
              'Active Orders',
              style: GoogleFonts.inter(
                fontSize: 10,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.5,
                color: const Color(0xFF4A4F70),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        _ActiveOrdersList(),
      ],
    );
  }

  // ── REQUESTS TAB ──────────────────────────────────────────────────────────

  Widget _buildRequestsTab() {
    final filteredRequests = _requests.where((r) {
      final matchesCategory = _filterCategory == 'All' || r['category'] == _filterCategory;
      final matchesStatus = _filterStatus == 'All' || r['status'] == _filterStatus;
      final matchesSearch = _filterSearch.isEmpty ||
          (r['id']?.toString().toLowerCase().contains(_filterSearch.toLowerCase()) ?? false) ||
          (r['providerName']?.toString().toLowerCase().contains(_filterSearch.toLowerCase()) ?? false);
      return matchesCategory && matchesStatus && matchesSearch;
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Header
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'My Requests',
              style: GoogleFonts.inter(
                fontSize: 40,
                fontWeight: FontWeight.w900,
                letterSpacing: -1.5,
                fontStyle: FontStyle.italic,
                color: _kTextPrimary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Track your active jobs and service history.',
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: const Color(0xFF737373),
              ),
            ),
          ],
        ),

        const SizedBox(height: 24),

        // Filters
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: _kCardBg,
            borderRadius: BorderRadius.circular(40),
            border: Border.all(color: _kBorderColor),
          ),
          child: Column(
            children: [
              // Category filter
              _buildFilterDropdown(
                label: 'Category',
                value: _filterCategory,
                items: const ['All', 'Cleaning', 'Plumbing', 'Gardening', 'Repairs'],
                onChanged: (v) => setState(() => _filterCategory = v!),
              ),
              const SizedBox(height: 16),
              // Status filter
              _buildFilterDropdown(
                label: 'Status',
                value: _filterStatus,
                items: const ['All', 'pending', 'accepted', 'started', 'completed'],
                onChanged: (v) => setState(() => _filterStatus = v!),
              ),
              const SizedBox(height: 16),
              // Search
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Search Provider / ID',
                    style: GoogleFonts.inter(
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.5,
                      color: const Color(0xFFA3A3A3),
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    onChanged: (v) => setState(() => _filterSearch = v),
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: _kTextPrimary,
                    ),
                    decoration: InputDecoration(
                      hintText: 'Search...',
                      hintStyle: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: _kTextSecondary,
                      ),
                      filled: true,
                      fillColor: _kBgDark,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: _kBorderColor),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: _kBorderColor),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: 24),

        // Request cards
        if (filteredRequests.isEmpty)
          _buildEmptyState(
            icon: LucideIcons.alertCircle,
            title: 'No matching requests',
            subtitle: 'Try adjusting your filters or find a new service.',
            buttonLabel: 'Explore Services',
            onButtonTap: () => neighborlyNavigatorKey.currentState?.pushNamed('/services'),
          )
        else
          ...filteredRequests.map((req) => _buildRequestCard(req)),
      ],
    );
  }

  Widget _buildFilterDropdown({
    required String label,
    required String value,
    required List<String> items,
    required ValueChanged<String?> onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 10,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.5,
            color: const Color(0xFFA3A3A3),
          ),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: _kBgDark,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: _kBorderColor),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: value,
              isExpanded: true,
              dropdownColor: _kCardBg,
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: _kTextPrimary,
              ),
              items: items.map((item) {
                return DropdownMenuItem(
                  value: item,
                  child: Text(item == 'All' ? 'All ${label}s' : item),
                );
              }).toList(),
              onChanged: onChanged,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildRequestCard(Map<String, dynamic> req) {
    final status = req['status']?.toString() ?? 'pending';
    final statusColor = switch (status) {
      'pending' => const Color(0xFFF59E0B),
      'accepted' => _kPrimaryBlue,
      'started' => const Color(0xFF6366F1),
      _ => const Color(0xFF10B981),
    };
    final statusBgColor = switch (status) {
      'pending' => const Color(0x33F59E0B),
      'accepted' => const Color(0x332B6EFF),
      'started' => const Color(0x336366F1),
      _ => const Color(0x3310B981),
    };

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: _kCardBg,
        borderRadius: BorderRadius.circular(40),
        border: Border.all(color: _kBorderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              // Status letter badge
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: statusBgColor,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Center(
                  child: Text(
                    status[0].toUpperCase(),
                    style: GoogleFonts.inter(
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                      fontStyle: FontStyle.italic,
                      color: statusColor,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 24),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          'Job #${(req['id']?.toString() ?? '').substring(0, (req['id']?.toString().length ?? 8).clamp(0, 8)).toUpperCase()}',
                          style: GoogleFonts.inter(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.5,
                            color: _kTextPrimary,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                          decoration: BoxDecoration(
                            color: statusBgColor,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            status,
                            style: GoogleFonts.inter(
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 1.5,
                              color: statusColor,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Provider: ${req['providerName']?.toString() ?? 'Neighbor'}',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: _kTextSecondary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Requested ${_formatDate(req['createdAt']?.toString())}',
                      style: GoogleFonts.inter(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.5,
                        color: const Color(0xFFA3A3A3),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              OutlinedButton(
                onPressed: () => neighborlyNavigatorKey.currentState?.pushNamed(
                  '/service/${req['serviceId']}',
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: _kTextPrimary,
                  side: const BorderSide(color: Color(0xFFE5E5E5)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                ),
                child: Text(
                  'View Service',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              ElevatedButton(
                onPressed: () {},
                style: ElevatedButton.styleFrom(
                  foregroundColor: Colors.white,
                  backgroundColor: const Color(0xFF1A1A1A),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  elevation: 4,
                  shadowColor: const Color(0x1A1A1A1A),
                ),
                child: Text(
                  'Track Status',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ── FINANCE TAB ───────────────────────────────────────────────────────────

  Widget _buildFinanceTab() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Header
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Spending',
              style: GoogleFonts.inter(
                fontSize: 40,
                fontWeight: FontWeight.w900,
                letterSpacing: -1.5,
                fontStyle: FontStyle.italic,
                color: _kTextPrimary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Manage your payments and transaction history.',
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: const Color(0xFF737373),
              ),
            ),
          ],
        ),

        const SizedBox(height: 24),

        // Stats cards
        Row(
          children: [
            Expanded(
              child: _buildStatCard(
                label: 'Total Spent',
                value: '\$${_totalSpent.toStringAsFixed(0)}',
                isHighlight: true,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildStatCard(
                label: 'Active Subscriptions',
                value: '0',
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildStatCard(
                label: 'Reward Points',
                value: '450',
              ),
            ),
          ],
        ),

        const SizedBox(height: 24),

        // Transaction history
        Container(
          decoration: BoxDecoration(
            color: _kCardBg,
            borderRadius: BorderRadius.circular(48),
            border: Border.all(color: _kBorderColor),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header row
              Padding(
                padding: const EdgeInsets.all(32),
                child: Row(
                  children: [
                    Text(
                      'Transaction History',
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        fontStyle: FontStyle.italic,
                        letterSpacing: -0.5,
                        color: _kTextPrimary,
                      ),
                    ),
                    const Spacer(),
                    Text(
                      'Download PDF',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.5,
                        color: _kTextSecondary,
                      ),
                    ),
                  ],
                ),
              ),

              // Table
              if (_transactions.isEmpty)
                Padding(
                  padding: const EdgeInsets.all(80),
                  child: Center(
                    child: Text(
                      'No transactions found.',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.5,
                        color: _kTextSecondary,
                      ),
                    ),
                  ),
                )
              else
                ..._transactions.map((t) => _buildTransactionRow(t)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStatCard({
    required String label,
    required String value,
    bool isHighlight = false,
  }) {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: isHighlight ? const Color(0xFF1A1A1A) : _kCardBg,
        borderRadius: BorderRadius.circular(48),
        border: isHighlight ? null : Border.all(color: _kBorderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.5,
              color: isHighlight ? Colors.white.withValues(alpha: 0.4) : _kTextSecondary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: GoogleFonts.inter(
              fontSize: 36,
              fontWeight: FontWeight.w900,
              color: isHighlight ? Colors.white : _kTextPrimary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTransactionRow(Map<String, dynamic> t) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: _kBorderColor)),
      ),
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: Text(
              _formatDate(t['timestamp']?.toString()),
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: _kTextPrimary,
              ),
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(
              t['description']?.toString() ?? '',
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: _kTextPrimary,
              ),
            ),
          ),
          Expanded(
            flex: 2,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0x3310B981),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                'Completed',
                style: GoogleFonts.inter(
                  fontSize: 8,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.5,
                  color: const Color(0xFF10B981),
                ),
              ),
            ),
          ),
          Expanded(
            flex: 2,
            child: Text(
              '\$${(t['amount'] ?? 0).toString()}',
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w900,
                color: _kTextPrimary,
              ),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }

  // ── SUPPORT TAB ───────────────────────────────────────────────────────────

  Widget _buildSupportTab() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Header
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Support',
                    style: GoogleFonts.inter(
                      fontSize: 40,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -1.5,
                      fontStyle: FontStyle.italic,
                      color: _kTextPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Manage your tickets and disputes.',
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: const Color(0xFF737373),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 16),
            ElevatedButton(
              onPressed: () => neighborlyNavigatorKey.currentState?.pushNamed('/tickets'),
              style: ElevatedButton.styleFrom(
                foregroundColor: Colors.white,
                backgroundColor: const Color(0xFF1A1A1A),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              ),
              child: Text(
                'New Ticket',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: 24),

        // Ticket list
        if (_tickets.isEmpty)
          _buildEmptyState(
            icon: LucideIcons.messageSquare,
            title: 'No active tickets.',
            subtitle: null,
            buttonLabel: null,
          )
        else
          ..._tickets.map((ticket) => _buildTicketCard(ticket)),
      ],
    );
  }

  Widget _buildTicketCard(Map<String, dynamic> ticket) {
    final status = ticket['status']?.toString() ?? 'open';
    final isOpen = status == 'open';
    final statusColor = isOpen ? _kPrimaryBlue : _kTextSecondary;
    final statusBgColor = isOpen ? const Color(0x332B6EFF) : const Color(0x33A3A3A3);

    return GestureDetector(
      onTap: () => neighborlyNavigatorKey.currentState?.pushNamed(
        '/tickets?id=${ticket['id']}',
      ),
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          color: _kCardBg,
          borderRadius: BorderRadius.circular(40),
          border: Border.all(color: _kBorderColor),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: statusBgColor,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(
                LucideIcons.messageSquare,
                size: 24,
                color: statusColor,
              ),
            ),
            const SizedBox(width: 24),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    ticket['subject']?.toString() ?? '',
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.5,
                      color: _kTextPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Last message ${_formatDate(ticket['createdAt']?.toString())}',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: _kTextSecondary,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: statusBgColor,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                status,
                style: GoogleFonts.inter(
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.5,
                  color: statusColor,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Icon(
              LucideIcons.chevronRight,
              size: 20,
              color: _kTextSecondary,
            ),
          ],
        ),
      ),
    );
  }

  // ── BECOME PROVIDER MODAL ─────────────────────────────────────────────────

  Widget _buildBecomeProviderModal() {
    return Positioned.fill(
      child: Material(
        color: Colors.transparent,
        child: Stack(
          children: [
            // Backdrop
            GestureDetector(
              onTap: () => setState(() => _showBecomeProvider = false),
              child: Container(
                color: Colors.black.withValues(alpha: 0.6),
              ),
            ),
            // Modal content
            Center(
              child: Container(
                constraints: const BoxConstraints(maxWidth: 500),
                margin: const EdgeInsets.all(24),
                padding: const EdgeInsets.all(48),
                decoration: BoxDecoration(
                  color: _kCardBg,
                  borderRadius: BorderRadius.circular(48),
                  border: Border.all(color: _kBorderColor),
                  boxShadow: const [
                    BoxShadow(
                      color: Colors.black26,
                      blurRadius: 40,
                      offset: Offset(0, 20),
                    ),
                  ],
                ),
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Icon
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          color: const Color(0xFF1A1A1A),
                          borderRadius: BorderRadius.circular(32),
                        ),
                        child: const Icon(
                          LucideIcons.briefcase,
                          size: 40,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 24),
                      // Title
                      Text(
                        'Start Earning',
                        style: GoogleFonts.inter(
                          fontSize: 30,
                          fontWeight: FontWeight.w900,
                          fontStyle: FontStyle.italic,
                          letterSpacing: -0.5,
                          color: _kTextPrimary,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Transform your skills into a business. Join our network of professional neighbors.',
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: _kTextSecondary,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 24),
                      // Benefits
                      _buildBenefitRow(
                        icon: LucideIcons.checkCircle2,
                        iconColor: const Color(0xFF10B981),
                        title: 'Set Your Own Rates',
                        subtitle: 'You control how much you earn per hour or project.',
                      ),
                      const SizedBox(height: 16),
                      _buildBenefitRow(
                        icon: LucideIcons.checkCircle2,
                        iconColor: const Color(0xFF10B981),
                        title: 'Flexible Schedule',
                        subtitle: 'Work whenever you want, as much as you want.',
                      ),
                      const SizedBox(height: 32),
                      // Buttons
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _handleBecomeProvider,
                          style: ElevatedButton.styleFrom(
                            foregroundColor: Colors.white,
                            backgroundColor: const Color(0xFF1A1A1A),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 16),
                          ),
                          child: Text(
                            'Apply Now',
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: TextButton(
                          onPressed: () => setState(() => _showBecomeProvider = false),
                          style: TextButton.styleFrom(
                            foregroundColor: _kTextSecondary,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 16),
                          ),
                          child: Text(
                            'Maybe Later',
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBenefitRow({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF7F7F7),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 24, color: iconColor),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF1A1A1A),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: _kTextSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── NOTIFICATION TOAST ────────────────────────────────────────────────────

  Widget _buildNotificationToast() {
    final isError = _notification!['isError'] == true;
    return Positioned(
      bottom: 32,
      right: 32,
      child: Material(
        elevation: 24,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          decoration: BoxDecoration(
            color: isError ? const Color(0xFFEF4444) : const Color(0xFF10B981),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isError ? const Color(0xFFF87171) : const Color(0xFF34D399),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                isError ? LucideIcons.alertCircle : LucideIcons.checkCircle2,
                size: 20,
                color: Colors.white,
              ),
              const SizedBox(width: 12),
              Text(
                _notification!['message'] as String,
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────

  Widget _buildEmptyState({
    required IconData icon,
    String? title,
    String? subtitle,
    String? buttonLabel,
    VoidCallback? onButtonTap,
  }) {
    return Container(
      padding: const EdgeInsets.all(80),
      decoration: BoxDecoration(
        color: _kCardBg,
        borderRadius: BorderRadius.circular(48),
        border: Border.all(color: _kBorderColor),
      ),
      child: Column(
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: const Color(0xFF1A1A1A),
              borderRadius: BorderRadius.circular(40),
            ),
            child: Icon(icon, size: 40, color: _kTextSecondary),
          ),
          const SizedBox(height: 24),
          if (title != null) ...[
            Text(
              title,
              style: GoogleFonts.inter(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: _kTextPrimary,
              ),
            ),
            const SizedBox(height: 8),
          ],
          if (subtitle != null) ...[
            Text(
              subtitle,
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: _kTextSecondary,
              ),
              textAlign: TextAlign.center,
            ),
          ],
          if (buttonLabel != null && onButtonTap != null) ...[
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: onButtonTap,
              style: ElevatedButton.styleFrom(
                foregroundColor: Colors.white,
                backgroundColor: const Color(0xFF1A1A1A),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
              ),
              child: Text(
                buttonLabel,
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _formatDate(String? raw) {
    if (raw == null || raw.isEmpty) return 'N/A';
    final dt = DateTime.tryParse(raw);
    if (dt == null) return raw;
    final months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return '${months[dt.month - 1]} ${dt.day}, ${dt.year}';
  }
}

// ── QUICK ACTION CARD ──────────────────────────────────────────────────────

class _QuickActionCard extends StatelessWidget {
  const _QuickActionCard({
    required this.label,
    required this.icon,
    this.badge,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final int? badge;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 100,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        decoration: BoxDecoration(
          color: _kCardBg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: _kBorderColor),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Stack(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: _kPrimaryBlue.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, size: 20, color: _kPrimaryBlue),
                ),
                if (badge != null && badge! > 0)
                  Positioned(
                    right: -4,
                    top: -4,
                    child: Container(
                      width: 20,
                      height: 20,
                      decoration: const BoxDecoration(
                        color: Color(0xFFFF4D4D),
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Text(
                          badge! > 99 ? '99+' : '$badge',
                          style: GoogleFonts.inter(
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.5,
                color: _kTextSecondary,
              ),
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}

// ── ACTIVE ORDERS LIST ─────────────────────────────────────────────────────

class _ActiveOrdersList extends StatefulWidget {
  @override
  State<_ActiveOrdersList> createState() => _ActiveOrdersListState();
}

class _ActiveOrdersListState extends State<_ActiveOrdersList> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;

  static const _activeStatuses = [
    'submitted', 'matching', 'matched', 'contracted', 'paid', 'in_progress',
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final api = context.read<NeighborlyApiService>();
    try {
      final resp = await api.fetchMyOrders(
        pageSize: 3,
        statuses: _activeStatuses,
      );
      if (!mounted) return;
      setState(() {
        _items = resp.items
            .map((o) => {
                  'id': o.id,
                  'name': o.serviceName,
                  'status': o.status,
                })
            .toList();
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _items = [];
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: SizedBox(
            width: 28,
            height: 28,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: _kPrimaryBlue,
            ),
          ),
        ),
      );
    }

    if (_items.isEmpty) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48),
        decoration: BoxDecoration(
          color: _kCardBg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: _kBorderColor, style: BorderStyle.solid),
        ),
        child: Column(
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: _kBorderColor),
                color: _kBgDark,
              ),
              child: const Icon(
                LucideIcons.clipboardList,
                size: 32,
                color: Color(0xFF4A4F70),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'No active orders yet',
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w900,
                color: _kTextPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Your in-progress services will appear here.',
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: _kTextSecondary,
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => neighborlyNavigatorKey.currentState?.pushNamed('/orders/new'),
              style: ElevatedButton.styleFrom(
                foregroundColor: Colors.white,
                backgroundColor: _kPrimaryBlue,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                minimumSize: const Size(0, 44),
              ),
              child: Text(
                'Book your first service',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        ..._items.map((o) => _buildOrderRow(o)),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerRight,
          child: GestureDetector(
            onTap: () => neighborlyNavigatorKey.currentState?.pushNamed('/orders'),
            child: Text(
              'See all →',
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.5,
                color: _kPrimaryBlue,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildOrderRow(Map<String, dynamic> o) {
    final status = (o['status'] as String?) ?? '';
    Color statusBg;
    Color statusFg;
    switch (status) {
      case 'matched':
      case 'contracted':
        statusBg = const Color(0x3310B981);
        statusFg = const Color(0xFF6EE7B7);
        break;
      case 'matching':
        statusBg = const Color(0x33F59E0B);
        statusFg = const Color(0xFFFCD34D);
        break;
      case 'paid':
      case 'in_progress':
        statusBg = const Color(0x330EA5E9);
        statusFg = const Color(0xFF7DD3FC);
        break;
      default:
        statusBg = const Color(0x332A2F4A);
        statusFg = _kTextSecondary;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: _kCardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _kBorderColor),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  o['name']?.toString() ?? '',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w900,
                    color: _kTextPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                // provider name not available from OrderSummary model
              ],
            ),
          ),
          const SizedBox(width: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: statusBg,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              status.replaceAll('_', ' '),
              style: GoogleFonts.inter(
                fontSize: 10,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.5,
                color: statusFg,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
