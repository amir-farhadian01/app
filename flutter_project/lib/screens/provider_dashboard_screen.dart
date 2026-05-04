import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/auth_provider.dart';
import '../services/api_service.dart';

class ProviderDashboardScreen extends StatefulWidget {
  final AppUser user;
  const ProviderDashboardScreen({super.key, required this.user});

  @override
  State<ProviderDashboardScreen> createState() => _ProviderDashboardScreenState();
}

class _ProviderDashboardScreenState extends State<ProviderDashboardScreen> {
  int _selectedIndex = 0;
  List<dynamic> _services = [];
  List<dynamic> _requests = [];
  List<dynamic> _contracts = [];
  bool _loading = true;

  // ── Helpers ────────────────────────────────────────────────────────────────
  bool get _isDark => Theme.of(context).brightness == Brightness.dark;
  Color get _borderColor => _isDark ? const Color(0xFF262626) : const Color(0xFFF5F5F5);
  Color get _cardColor => Theme.of(context).cardColor;
  Color get _textColor => Theme.of(context).colorScheme.onSurface;
  Color get _subtleText => const Color(0xFF737373);

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        ApiService.getServices(providerId: widget.user.id),
        ApiService.getRequests(),
        ApiService.getContracts(),
      ]);
      setState(() {
        _services = results[0];
        _requests = results[1];
        _contracts = results[2];
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      _buildOverviewTab(),
      _buildServicesTab(),
      _buildRequestsTab(),
      _buildContractsTab(),
    ];

    return Scaffold(
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: pages[_selectedIndex],
            ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          border: Border(top: BorderSide(color: _borderColor)),
        ),
        child: NavigationBar(
          selectedIndex: _selectedIndex,
          onDestinationSelected: (i) => setState(() => _selectedIndex = i),
          destinations: const [
            NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard_rounded), label: 'Overview'),
            NavigationDestination(icon: Icon(Icons.build_outlined), selectedIcon: Icon(Icons.build_rounded), label: 'Services'),
            NavigationDestination(icon: Icon(Icons.inbox_outlined), selectedIcon: Icon(Icons.inbox_rounded), label: 'Legacy bookings'),
            NavigationDestination(icon: Icon(Icons.handshake_outlined), selectedIcon: Icon(Icons.handshake_rounded), label: 'Contracts'),
          ],
        ),
      ),
      floatingActionButton: _selectedIndex == 1
          ? FloatingActionButton.extended(
              onPressed: _showAddServiceSheet,
              backgroundColor: Theme.of(context).colorScheme.primary,
              foregroundColor: Theme.of(context).colorScheme.onPrimary,
              icon: const Icon(Icons.add_rounded),
              label: Text('Add Service', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
            )
          : null,
    );
  }

  // ── Overview Tab ──────────────────────────────────────────────────────────
  Widget _buildOverviewTab() {
    final pendingRequests = _requests.where((r) => r['status'] == 'pending').length;
    final activeContracts = _contracts.where((c) => c['status'] == 'confirmed').length;

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
      children: [
        Text(
          'DASHBOARD',
          style: GoogleFonts.inter(fontSize: 36, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic, letterSpacing: -1.5, color: _textColor),
        ),
        const SizedBox(height: 4),
        Text('Manage your services and legacy client bookings.', style: GoogleFonts.inter(color: _subtleText, fontSize: 13)),
        const SizedBox(height: 28),

        // Stats grid
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 3,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.1,
          children: [
            _miniStat('${_services.length}', 'Services', Icons.build_rounded, const Color(0xFF3B82F6)),
            _miniStat('$pendingRequests', 'Pending', Icons.pending_actions_rounded, const Color(0xFFF59E0B)),
            _miniStat('$activeContracts', 'Active', Icons.handshake_rounded, const Color(0xFF10B981)),
          ],
        ),

        if (pendingRequests > 0) ...[
          const SizedBox(height: 28),
          Row(
            children: [
              Text(
                'PENDING REQUESTS',
                style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic, color: _textColor),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ..._requests.where((r) => r['status'] == 'pending').take(3).map((r) => _requestCard(r)),
        ],
      ],
    );
  }

  // ── Services Tab ──────────────────────────────────────────────────────────
  Widget _buildServicesTab() {
    if (_services.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.build_circle_outlined, size: 64, color: _borderColor),
            const SizedBox(height: 16),
            Text('No services yet', style: GoogleFonts.inter(color: _subtleText, fontWeight: FontWeight.w700, fontSize: 16)),
            const SizedBox(height: 8),
            Text('Tap + to add your first service', style: GoogleFonts.inter(color: _subtleText, fontSize: 13)),
          ],
        ),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 100),
      itemCount: _services.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, i) {
        final s = _services[i];
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: _cardColor,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: _borderColor),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(s['title'] ?? '', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 15, color: _textColor)),
                    const SizedBox(height: 4),
                    Text(
                      '\$${s['price']}  ·  ${s['category'] ?? 'General'}',
                      style: GoogleFonts.inter(color: _subtleText, fontSize: 12),
                    ),
                  ],
                ),
              ),
              PopupMenuButton<String>(
                icon: Icon(Icons.more_vert_rounded, color: _subtleText),
                color: _cardColor,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                itemBuilder: (_) => [
                  PopupMenuItem(
                    value: 'delete',
                    child: Text('Delete', style: GoogleFonts.inter(color: const Color(0xFFEF4444), fontWeight: FontWeight.w700)),
                  ),
                ],
                onSelected: (val) async {
                  if (val == 'delete') {
                    await ApiService.deleteService(s['id']);
                    _loadData();
                  }
                },
              ),
            ],
          ),
        );
      },
    );
  }

  // ── Requests Tab ─────────────────────────────────────────────────────────
  Widget _buildRequestsTab() {
    if (_requests.isEmpty) {
      return Center(child: Text('No requests yet', style: GoogleFonts.inter(color: _subtleText, fontWeight: FontWeight.w600)));
    }
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
      itemCount: _requests.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, i) => _requestCard(_requests[i]),
    );
  }

  // ── Contracts Tab ─────────────────────────────────────────────────────────
  Widget _buildContractsTab() {
    if (_contracts.isEmpty) {
      return Center(child: Text('No contracts yet', style: GoogleFonts.inter(color: _subtleText, fontWeight: FontWeight.w600)));
    }
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
      itemCount: _contracts.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, i) {
        final c = _contracts[i];
        return Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: _cardColor,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: _borderColor),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Contract', style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 15, color: _textColor)),
                  _statusBadge(c['status']),
                ],
              ),
              const SizedBox(height: 10),
              Text('Client: ${c['customer']?['displayName'] ?? '—'}', style: GoogleFonts.inter(fontSize: 13, color: _subtleText)),
              Text('Amount: \$${c['amount']}', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: _textColor)),
              if (c['providerSigned'] != true) ...[
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () async {
                      await ApiService.signContract(c['id']);
                      _loadData();
                    },
                    child: Text('Sign Contract', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  // ─── Shared Widgets ───────────────────────────────────────────────────────

  Widget _requestCard(dynamic r) {
    return Container(
      margin: const EdgeInsets.only(bottom: 2),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: _cardColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(r['service']?['title'] ?? 'Service',
                    style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 15, color: _textColor)),
              ),
              _statusBadge(r['status']),
            ],
          ),
          const SizedBox(height: 6),
          Text('From: ${r['customer']?['displayName'] ?? '—'}',
              style: GoogleFonts.inter(fontSize: 12, color: _subtleText)),
          if (r['status'] == 'pending') ...[
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: () async {
                      await ApiService.updateRequestStatus(r['id'], 'accepted');
                      _loadData();
                    },
                    child: Text('Accept', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () async {
                      await ApiService.updateRequestStatus(r['id'], 'declined');
                      _loadData();
                    },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFFEF4444),
                      side: const BorderSide(color: Color(0xFFEF4444)),
                    ),
                    child: Text('Decline', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _miniStat(String value, String label, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _cardColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: _borderColor),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 8),
          Text(value, style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w900, color: _textColor)),
          const SizedBox(height: 2),
          Text(label, style: GoogleFonts.inter(color: _subtleText, fontSize: 11, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  Widget _statusBadge(String? status) {
    final colors = {
      'pending': const Color(0xFFF59E0B),
      'accepted': const Color(0xFF3B82F6),
      'confirmed': const Color(0xFF10B981),
      'completed': const Color(0xFF10B981),
      'declined': const Color(0xFFEF4444),
    };
    final color = colors[status] ?? const Color(0xFF8E9299);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: _isDark ? 0.15 : 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        status ?? '',
        style: GoogleFonts.inter(color: color, fontWeight: FontWeight.w800, fontSize: 11),
      ),
    );
  }

  void _showAddServiceSheet() {
    final titleCtrl = TextEditingController();
    final priceCtrl = TextEditingController();
    final descCtrl = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: _cardColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (sheetContext) {
        final sheetNavigator = Navigator.of(sheetContext);
        return Padding(
          padding: EdgeInsets.only(
            left: 24, right: 24, top: 28,
            bottom: MediaQuery.of(sheetContext).viewInsets.bottom + 28,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'ADD SERVICE',
                style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic, color: _textColor),
              ),
              const SizedBox(height: 20),
              TextField(
                controller: titleCtrl,
                style: GoogleFonts.inter(color: _textColor),
                decoration: const InputDecoration(labelText: 'Service Title'),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: priceCtrl,
                keyboardType: TextInputType.number,
                style: GoogleFonts.inter(color: _textColor),
                decoration: const InputDecoration(labelText: 'Price (\$)'),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: descCtrl,
                maxLines: 3,
                style: GoogleFonts.inter(color: _textColor),
                decoration: const InputDecoration(labelText: 'Description'),
              ),
              const SizedBox(height: 22),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () async {
                    if (titleCtrl.text.isEmpty || priceCtrl.text.isEmpty) return;
                    await ApiService.createService({
                      'title': titleCtrl.text,
                      'price': double.tryParse(priceCtrl.text) ?? 0,
                      'description': descCtrl.text,
                      'category': 'General',
                    });
                    if (!mounted) return;
                    sheetNavigator.pop();
                    _loadData();
                  },
                  child: Text('Add Service', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
