import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../services/neighborly_api_service.dart';

const _inboxSegments = <String, List<String>>{
  'awaiting': <String>['invited', 'matched'],
  'acknowledged': <String>['accepted'],
  'declined': <String>['declined'],
  'lost': <String>['superseded', 'expired'],
};

class CompanyDashboardScreen extends StatefulWidget {
  const CompanyDashboardScreen({super.key});

  @override
  State<CompanyDashboardScreen> createState() => _CompanyDashboardScreenState();
}

class _CompanyDashboardScreenState extends State<CompanyDashboardScreen> {
  String _inboxSegment = 'awaiting';
  int _tab = 0;
  bool _loading = true;
  String? _error;

  List<Map<String, dynamic>> _inboxItems = const [];

  Widget _quickAction(ColorScheme cs, {required String label, required IconData icon, required VoidCallback onTap}) {
    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Ink(
          decoration: BoxDecoration(
            color: cs.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: cs.outlineVariant.withValues(alpha: 0.45)),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 14),
          child: Column(
            children: [
              Icon(icon, size: 18, color: cs.primary),
              const SizedBox(height: 8),
              Text(label, style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 12)),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final api = context.read<NeighborlyApiService>();
    final user = api.user;
    if (user == null || user.role != 'provider') {
      setState(() {
        _error = 'Provider access required.';
        _loading = false;
      });
      return;
    }

    try {
      setState(() {
        _loading = true;
        _error = null;
      });
      var workspaceId = user.companyId;
      if (workspaceId == null || workspaceId.trim().isEmpty) {
        final workspaces = await api.fetchMyWorkspaces();
        workspaceId = workspaces.isNotEmpty ? workspaces.first['id']?.toString() : null;
      }
      if (workspaceId == null || workspaceId.trim().isEmpty) {
        throw Exception('No provider workspace found.');
      }

      final inbox = await api.fetchProviderInbox(
        workspaceId: workspaceId,
        statuses: _inboxSegments[_inboxSegment] ?? const <String>[],
      );

      final rows = inbox['items'] is List
          ? List<dynamic>.from(inbox['items'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList()
          : <Map<String, dynamic>>[];

      if (!mounted) return;
      setState(() {
        _inboxItems = rows;
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
    final awaitingCount = _inboxItems.where((x) => x['status']?.toString() == 'invited').length;
    return Scaffold(
      appBar: AppBar(
        title: Text('Provider Hub', style: GoogleFonts.inter(fontWeight: FontWeight.w800)),
        actions: [IconButton(onPressed: _load, icon: const Icon(Icons.refresh_rounded))],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!, textAlign: TextAlign.center)))
              : Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                  decoration: BoxDecoration(
                                    color: cs.surfaceContainerHighest,
                                    borderRadius: BorderRadius.circular(14),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.badge_outlined, size: 16),
                                      const SizedBox(width: 8),
                                      Text('Provider role active', style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 12)),
                                      const Spacer(),
                                      if (awaitingCount > 0)
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                          decoration: BoxDecoration(color: cs.primary, borderRadius: BorderRadius.circular(999)),
                                          child: Text('$awaitingCount awaiting', style: GoogleFonts.inter(fontSize: 10, color: cs.onPrimary)),
                                        ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              _quickAction(cs, label: 'Orders', icon: Icons.list_alt_rounded, onTap: () => Navigator.of(context).pushNamed('/orders')),
                              const SizedBox(width: 8),
                              _quickAction(cs, label: 'Packages', icon: Icons.inventory_2_outlined, onTap: () => Navigator.of(context).pushNamed('/workspace/packages')),
                              const SizedBox(width: 8),
                              _quickAction(cs, label: 'Company', icon: Icons.business_outlined, onTap: () => Navigator.of(context).pushNamed('/workspace/company')),
                            ],
                          ),
                        ],
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
                      child: SegmentedButton<int>(
                        showSelectedIcon: false,
                        segments: const [
                          ButtonSegment<int>(value: 0, label: Text('Inbox')),
                          ButtonSegment<int>(value: 1, label: Text('Workspace')),
                          ButtonSegment<int>(value: 2, label: Text('Contracts')),
                        ],
                        selected: <int>{_tab},
                        onSelectionChanged: (s) => setState(() => _tab = s.first),
                      ),
                    ),
                    Expanded(
                      child: _tab == 0
                          ? _buildInbox(cs)
                          : _tab == 1
                              ? _buildWorkspacePlaceholder(cs)
                              : _buildContractsPlaceholder(cs),
                    ),
                  ],
                ),
    );
  }

  Widget _buildInbox(ColorScheme cs) {
    return Column(
      children: [
        SizedBox(
          height: 46,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            children: _inboxSegments.keys
                .map(
                  (k) => Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      selected: _inboxSegment == k,
                      showCheckmark: false,
                      onSelected: (_) {
                        setState(() => _inboxSegment = k);
                        _load();
                      },
                      label: Text(k.toUpperCase(), style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600)),
                    ),
                  ),
                )
                .toList(),
          ),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: _inboxItems.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 28),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.inbox_outlined, size: 36, color: cs.onSurfaceVariant),
                        const SizedBox(height: 10),
                        Text('No inbox attempts yet.', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
                        const SizedBox(height: 4),
                        Text(
                          'When customers invite your workspace, requests show up here.',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.inter(color: cs.onSurfaceVariant, fontSize: 12.5),
                        ),
                      ],
                    ),
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
                  itemCount: _inboxItems.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, i) {
                    final row = _inboxItems[i];
                    final order = row['order'] is Map ? Map<String, dynamic>.from(row['order'] as Map) : const <String, dynamic>{};
                    return Card(
                      margin: EdgeInsets.zero,
                      child: ListTile(
                        title: Text(order['description']?.toString() ?? 'Order', maxLines: 2, overflow: TextOverflow.ellipsis),
                        subtitle: Text('Status: ${row['status'] ?? '-'}'),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildWorkspacePlaceholder(ColorScheme cs) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Text(
          'Workspace actions are available from Orders and Packages.\nUse the top shortcuts for full flow.',
          textAlign: TextAlign.center,
          style: GoogleFonts.inter(color: cs.onSurfaceVariant),
        ),
      ),
    );
  }

  Widget _buildContractsPlaceholder(ColorScheme cs) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Text(
          'Contracts remain visible in order details and follow backend state gates.',
          textAlign: TextAlign.center,
          style: GoogleFonts.inter(color: cs.onSurfaceVariant),
        ),
      ),
    );
  }
}
