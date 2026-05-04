import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';

String _formatDate(dynamic raw) {
  if (raw == null) return '—';
  if (raw is String) {
    final d = DateTime.tryParse(raw);
    return d != null ? d.toLocal().toString().split(' ').first : raw;
  }
  return raw.toString();
}

class CustomerRequestsScreen extends StatefulWidget {
  const CustomerRequestsScreen({
    super.key,
    required this.initialRequests,
    required this.reloadRequests,
  });

  final List<Map<String, dynamic>> initialRequests;
  final Future<List<Map<String, dynamic>>> Function() reloadRequests;

  @override
  State<CustomerRequestsScreen> createState() => _CustomerRequestsScreenState();
}

class _CustomerRequestsScreenState extends State<CustomerRequestsScreen> {
  late List<Map<String, dynamic>> _items;
  _RequestFilter _filter = _RequestFilter.all;

  @override
  void initState() {
    super.initState();
    _items = List<Map<String, dynamic>>.from(widget.initialRequests);
  }

  Future<void> _pull() async {
    final next = await widget.reloadRequests();
    if (!mounted) return;
    setState(() => _items = next);
  }

  List<Map<String, dynamic>> get _filtered {
    switch (_filter) {
      case _RequestFilter.active:
        return _items.where((r) {
          final st = r['status']?.toString() ?? '';
          return st != 'completed' && st != 'declined';
        }).toList();
      case _RequestFilter.completed:
        return _items.where((r) => r['status']?.toString() == 'completed').toList();
      case _RequestFilter.all:
        return List<Map<String, dynamic>>.from(_items);
    }
  }

  IconData _categoryIcon(String? cat) {
    switch (cat?.toLowerCase()) {
      case 'cleaning':
        return LucideIcons.sparkles;
      case 'plumbing':
        return LucideIcons.droplet;
      case 'gardening':
        return LucideIcons.flower2;
      case 'repairs':
        return LucideIcons.wrench;
      default:
        return LucideIcons.briefcase;
    }
  }

  Color _statusBarColor(ColorScheme cs, String? st) {
    switch (st) {
      case 'completed':
        return cs.tertiary;
      case 'declined':
        return cs.error;
      default:
        return cs.tertiaryContainer;
    }
  }

  Widget _statusChip(ColorScheme cs, String? st) {
    final s = st ?? '—';
    Color fg = cs.onSurface;
    Color bg = cs.surfaceContainerHighest;
    if (s == 'completed') {
      fg = cs.onTertiaryContainer;
      bg = cs.tertiaryContainer;
    } else if (s == 'declined') {
      fg = cs.onErrorContainer;
      bg = cs.errorContainer;
    } else {
      fg = cs.onSecondaryContainer;
      bg = cs.secondaryContainer;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(100),
      ),
      child: Text(
        s,
        style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: fg),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final filtered = _filtered;

    return Scaffold(
      backgroundColor: cs.surface,
      appBar: AppBar(
        elevation: 0,
        backgroundColor: cs.surface,
        foregroundColor: cs.onSurface,
        title: Text(
          'Bookings (legacy)',
          style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: cs.onSurface),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _pull,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(
              child: SizedBox(
                height: 52,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: FilterChip(
                        label: Text('ALL', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 14)),
                        selected: _filter == _RequestFilter.all,
                        onSelected: (_) => setState(() => _filter = _RequestFilter.all),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
                        showCheckmark: false,
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: FilterChip(
                        label: Text('ACTIVE', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 14)),
                        selected: _filter == _RequestFilter.active,
                        onSelected: (_) => setState(() => _filter = _RequestFilter.active),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
                        showCheckmark: false,
                      ),
                    ),
                    FilterChip(
                      label: Text('COMPLETED', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 14)),
                      selected: _filter == _RequestFilter.completed,
                      onSelected: (_) => setState(() => _filter = _RequestFilter.completed),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
                      showCheckmark: false,
                    ),
                  ],
                ),
              ),
            ),
            if (filtered.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: _EmptyRequests(
                  filter: _filter,
                  onBrowse: () => Navigator.of(context).pushNamed('/home'),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, i) {
                      final req = filtered[i];
                      final st = req['status']?.toString();
                      final cat = req['category']?.toString();
                      final id = req['id']?.toString() ?? '';
                      final bar = _statusBarColor(cs, st);
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Semantics(
                          label: 'Request $id, status $st',
                          button: true,
                          child: Material(
                            color: cs.surface,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(20),
                              side: BorderSide(color: cs.outline.withValues(alpha: 0.35)),
                            ),
                            clipBehavior: Clip.antiAlias,
                            child: InkWell(
                              onTap: () => _RequestDetailSheet.show(context, req),
                              child: SizedBox(
                                height: 88,
                                child: Row(
                                  children: [
                                    Container(width: 4, color: bar),
                                    const SizedBox(width: 12),
                                    Container(
                                      width: 40,
                                      height: 40,
                                      decoration: BoxDecoration(
                                        color: cs.surfaceContainerHighest,
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Icon(_categoryIcon(cat), size: 20, color: cs.onSurface),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            req['service'] is Map
                                                ? (req['service'] as Map)['title']?.toString() ?? 'Service'
                                                : 'Service',
                                            style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: cs.onSurface),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            req['providerName']?.toString() ?? '—',
                                            style: GoogleFonts.inter(fontSize: 14, color: cs.secondary),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          const SizedBox(height: 6),
                                          Row(
                                            children: [
                                              _statusChip(cs, st),
                                              const SizedBox(width: 8),
                                              Text(
                                                _formatDate(req['updatedAt'] ?? req['createdAt']),
                                                style: GoogleFonts.inter(fontSize: 13, color: cs.secondary),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),
                                    Icon(LucideIcons.chevronRight, size: 16, color: cs.secondary),
                                    const SizedBox(width: 12),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                    childCount: filtered.length,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

enum _RequestFilter { all, active, completed }

class _EmptyRequests extends StatelessWidget {
  const _EmptyRequests({required this.filter, required this.onBrowse});

  final _RequestFilter filter;
  final VoidCallback onBrowse;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    String title;
    String sub;
    switch (filter) {
      case _RequestFilter.active:
        title = 'No active requests';
        sub = 'Book a service to get started.';
        break;
      case _RequestFilter.completed:
        title = 'No completed requests yet';
        sub = 'Finished jobs will show up here.';
        break;
      case _RequestFilter.all:
        title = 'No requests yet';
        sub = 'Browse services and book your first job.';
        break;
    }
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(LucideIcons.inbox, size: 48, color: cs.secondary),
          const SizedBox(height: 16),
          Text(title, style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: cs.onSurface)),
          const SizedBox(height: 8),
          Text(
            sub,
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(fontSize: 15, color: cs.secondary, height: 1.35),
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: onBrowse,
            child: Text('Browse services', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 15)),
          ),
        ],
      ),
    );
  }
}

/// Shared detail sheet (also used from dashboard home).
class _RequestDetailSheet {
  static void show(BuildContext context, Map<String, dynamic> req) {
    final cs = Theme.of(context).colorScheme;
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: cs.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.55,
          minChildSize: 0.35,
          maxChildSize: 0.92,
          builder: (_, scroll) {
            final rows = req.entries.map((e) => MapEntry(e.key.toString(), e.value)).toList()
              ..sort((a, b) => a.key.compareTo(b.key));
            return Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: cs.outline.withValues(alpha: 0.4),
                        borderRadius: BorderRadius.circular(100),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Request details',
                    style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: cs.onSurface),
                  ),
                  const SizedBox(height: 12),
                  Expanded(
                    child: ListView(
                      controller: scroll,
                      children: [
                        for (final e in rows)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  e.key,
                                  style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: cs.secondary),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  _valueString(e.value),
                                  style: GoogleFonts.inter(fontSize: 15, color: cs.onSurface, height: 1.3),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  static String _valueString(dynamic v) {
    if (v == null) return '—';
    if (v is Map || v is List) return v.toString();
    return v.toString();
  }
}

/// Public wrapper for dashboard home recent activity taps.
void showCustomerRequestDetailSheet(BuildContext context, Map<String, dynamic> req) {
  _RequestDetailSheet.show(context, req);
}
