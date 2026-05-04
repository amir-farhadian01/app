import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';

String _formatTxDate(dynamic raw) {
  if (raw == null) return '—';
  if (raw is String) {
    final d = DateTime.tryParse(raw);
    return d != null ? DateFormat.yMMMd().format(d.toLocal()) : raw;
  }
  return raw.toString();
}

class CustomerFinanceScreen extends StatefulWidget {
  const CustomerFinanceScreen({
    super.key,
    required this.initialTransactions,
    required this.reloadTransactions,
  });

  final List<Map<String, dynamic>> initialTransactions;
  final Future<List<Map<String, dynamic>>> Function() reloadTransactions;

  @override
  State<CustomerFinanceScreen> createState() => _CustomerFinanceScreenState();
}

class _CustomerFinanceScreenState extends State<CustomerFinanceScreen> {
  late List<Map<String, dynamic>> _tx;

  @override
  void initState() {
    super.initState();
    _tx = List<Map<String, dynamic>>.from(widget.initialTransactions);
  }

  double get _totalSpent {
    return _tx
        .where((t) => t['type']?.toString() == 'outcome')
        .fold<double>(0, (s, t) => s + ((t['amount'] as num?)?.toDouble() ?? 0));
  }

  Future<void> _pull() async {
    final next = await widget.reloadTransactions();
    if (!mounted) return;
    setState(() => _tx = next);
  }

  List<MapEntry<DateTime, List<Map<String, dynamic>>>> _groupedByMonth() {
    final map = <DateTime, List<Map<String, dynamic>>>{};
    for (final t in _tx) {
      final ts = t['timestamp'];
      DateTime? d;
      if (ts is String) d = DateTime.tryParse(ts)?.toLocal();
      d ??= DateTime.fromMillisecondsSinceEpoch(0);
      final monthStart = DateTime(d.year, d.month);
      map.putIfAbsent(monthStart, () => []).add(t);
    }
    final keys = map.keys.toList()..sort((a, b) => b.compareTo(a));
    return keys.map((k) => MapEntry(k, map[k]!)).toList();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final groups = _groupedByMonth();

    return Scaffold(
      backgroundColor: cs.surface,
      appBar: AppBar(
        elevation: 0,
        backgroundColor: cs.surface,
        foregroundColor: cs.onSurface,
        title: Text(
          'My Spending',
          style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: cs.onSurface),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _pull,
        child: _tx.isEmpty
            ? ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  _TopSpentCard(total: _totalSpent, cs: cs),
                  const SizedBox(height: 24),
                  _FinanceEmpty(cs: cs),
                  const SizedBox(height: 96),
                ],
              )
            : ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 96),
                children: [
                  _TopSpentCard(total: _totalSpent, cs: cs),
                  const SizedBox(height: 24),
                  for (final g in groups) ...[
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      margin: const EdgeInsets.only(bottom: 8),
                      decoration: BoxDecoration(
                        color: cs.surfaceContainerHighest.withValues(alpha: 0.6),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        DateFormat('MMMM yyyy').format(g.key),
                        style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: cs.secondary),
                      ),
                    ),
                    for (final t in g.value)
                      _TxRow(t: t, cs: cs),
                    const SizedBox(height: 8),
                  ],
                ],
              ),
      ),
    );
  }
}

class _TopSpentCard extends StatelessWidget {
  const _TopSpentCard({required this.total, required this.cs});

  final double total;
  final ColorScheme cs;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Semantics(
        label: 'Total spent ${total.toStringAsFixed(2)} dollars',
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: cs.primary,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: Theme.of(context).brightness == Brightness.dark ? 0.3 : 0.07),
                blurRadius: 16,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Total spent',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: cs.onPrimary.withValues(alpha: 0.85),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                '\$${total.toStringAsFixed(2)}',
                style: GoogleFonts.inter(fontSize: 28, fontWeight: FontWeight.w700, color: cs.onPrimary),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TxRow extends StatelessWidget {
  const _TxRow({required this.t, required this.cs});

  final Map<String, dynamic> t;
  final ColorScheme cs;

  @override
  Widget build(BuildContext context) {
    final amt = (t['amount'] as num?)?.toDouble() ?? 0;
    return Semantics(
      label: '${t['description']}, ${amt.toStringAsFixed(2)} dollars',
      child: SizedBox(
        height: 56,
        child: Material(
          color: Colors.transparent,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Icon(LucideIcons.receipt, size: 20, color: cs.secondary),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        t['description']?.toString() ?? '—',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600, color: cs.onSurface),
                      ),
                      Text(
                        _formatTxDate(t['timestamp']),
                        style: GoogleFonts.inter(fontSize: 13, color: cs.secondary),
                      ),
                    ],
                  ),
                ),
                Text(
                  '\$${amt.toStringAsFixed(2)}',
                  style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w800, color: cs.onSurface),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _FinanceEmpty extends StatelessWidget {
  const _FinanceEmpty({required this.cs});

  final ColorScheme cs;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          Icon(LucideIcons.wallet, size: 48, color: cs.secondary),
          const SizedBox(height: 16),
          Text(
            'No transactions yet',
            style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: cs.onSurface),
          ),
          const SizedBox(height: 8),
          Text(
            'Payments and refunds will appear here after you book services.',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(fontSize: 15, color: cs.secondary, height: 1.35),
          ),
        ],
      ),
    );
  }
}
