import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../services/neighborly_api_service.dart';

/// Finance History Screen - Shows complete order and payment history
class FinanceScreen extends StatefulWidget {
  const FinanceScreen({super.key});

  @override
  State<FinanceScreen> createState() => _FinanceScreenState();
}

class _FinanceScreenState extends State<FinanceScreen> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _financeHistory = [];
  String _selectedFilter = 'all';

  @override
  void initState() {
    super.initState();
    _loadFinanceHistory();
  }

  Future<void> _loadFinanceHistory() async {
    setState(() => _isLoading = true);
    try {
      final api = context.read<NeighborlyApiService>();
      final data = await api.fetchFinanceHistory();
      setState(() {
        _financeHistory = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Failed to load finance history: ${e.toString()}',
              style: GoogleFonts.inter(),
            ),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    }
  }

  List<Map<String, dynamic>> get _filteredHistory {
    if (_selectedFilter == 'all') return _financeHistory;
    return _financeHistory.where((item) {
      final status = item['status']?.toString().toLowerCase() ?? '';
      return status == _selectedFilter;
    }).toList();
  }

  double get _totalAmount {
    return _filteredHistory.fold(0.0, (sum, item) {
      final amount = (item['amount'] as num?)?.toDouble() ?? 0.0;
      return sum + amount;
    });
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: cs.surface,
      appBar: AppBar(
        backgroundColor: cs.surface,
        elevation: 0,
        centerTitle: true,
        title: Text(
          'Finance History',
          style: GoogleFonts.inter(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: cs.onSurface,
          ),
        ),
        leading: IconButton(
          icon: Icon(LucideIcons.chevronLeft, color: cs.onSurface),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: Icon(LucideIcons.filter, color: cs.onSurface),
            onPressed: () => _showFilterSheet(context),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadFinanceHistory,
        child: Column(
          children: [
            // Summary Cards
            _buildSummarySection(cs),
            const SizedBox(height: 16),
            // Filter Tabs
            _buildFilterTabs(cs),
            const SizedBox(height: 8),
            // History List
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _filteredHistory.isEmpty
                      ? _buildEmptyState(cs)
                      : _buildHistoryList(cs),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummarySection(ColorScheme cs) {
    final completedCount = _financeHistory
        .where((item) => item['status']?.toString().toLowerCase() == 'completed')
        .length;
    final pendingCount = _financeHistory
        .where((item) => item['status']?.toString().toLowerCase() == 'pending')
        .length;

    return Container(
      padding: const EdgeInsets.all(20),
      margin: const EdgeInsets.symmetric(horizontal: 20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [cs.primary, cs.primaryContainer],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Total Spending',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: cs.onPrimary.withValues(alpha: 0.8),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: cs.onPrimary.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${_filteredHistory.length} Orders',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: cs.onPrimary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '\$${_totalAmount.toStringAsFixed(2)}',
            style: GoogleFonts.inter(
              fontSize: 32,
              fontWeight: FontWeight.w800,
              color: cs.onPrimary,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _buildStatusBadge(
                'Completed',
                completedCount.toString(),
                LucideIcons.checkCircle,
                Colors.green,
                cs,
              ),
              const SizedBox(width: 12),
              _buildStatusBadge(
                'Pending',
                pendingCount.toString(),
                LucideIcons.clock,
                Colors.orange,
                cs,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(
    String label,
    String count,
    IconData icon,
    Color color,
    ColorScheme cs,
  ) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: cs.onPrimary.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
          Text(
            '$count $label',
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: cs.onPrimary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterTabs(ColorScheme cs) {
    final filters = [
      {'key': 'all', 'label': 'All'},
      {'key': 'completed', 'label': 'Completed'},
      {'key': 'pending', 'label': 'Pending'},
      {'key': 'in_progress', 'label': 'In Progress'},
    ];

    return Container(
      height: 40,
      margin: const EdgeInsets.symmetric(horizontal: 20),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: filters.length,
        itemBuilder: (context, index) {
          final filter = filters[index];
          final isSelected = _selectedFilter == filter['key'];

          return GestureDetector(
            onTap: () => setState(() => _selectedFilter = filter['key']!),
            child: Container(
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: isSelected ? cs.primary : cs.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: isSelected ? cs.primary : cs.outline.withValues(alpha: 0.2),
                ),
              ),
              child: Center(
                child: Text(
                  filter['label']!,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: isSelected ? cs.onPrimary : cs.onSurface,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildHistoryList(ColorScheme cs) {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      itemCount: _filteredHistory.length,
      itemBuilder: (context, index) {
        final item = _filteredHistory[index];
        return _buildHistoryCard(item, cs);
      },
    );
  }

  Widget _buildHistoryCard(Map<String, dynamic> item, ColorScheme cs) {
    final status = item['status']?.toString().toLowerCase() ?? 'pending';
    final amount = (item['amount'] as num?)?.toDouble() ?? 0.0;
    final serviceTitle = item['service']?['title']?.toString() ?? 'Unknown Service';
    final providerName = item['provider']?['displayName']?.toString() ?? 'Unknown Provider';
    final date = item['createdAt'] != null
        ? DateTime.tryParse(item['createdAt'].toString())
        : null;

    Color statusColor;
    IconData statusIcon;
    String statusLabel;

    switch (status) {
      case 'completed':
        statusColor = Colors.green;
        statusIcon = LucideIcons.checkCircle;
        statusLabel = 'Completed';
        break;
      case 'pending':
        statusColor = Colors.orange;
        statusIcon = LucideIcons.clock;
        statusLabel = 'Pending';
        break;
      case 'in_progress':
      case 'active':
        statusColor = cs.primary;
        statusIcon = LucideIcons.loader;
        statusLabel = 'In Progress';
        break;
      case 'cancelled':
        statusColor = cs.error;
        statusIcon = LucideIcons.xCircle;
        statusLabel = 'Cancelled';
        break;
      default:
        statusColor = cs.secondary;
        statusIcon = LucideIcons.helpCircle;
        statusLabel = _capitalize(status);
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: cs.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: cs.outline.withValues(alpha: 0.1),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with amount and status
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: cs.primaryContainer,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    LucideIcons.shoppingBag,
                    size: 22,
                    color: cs.primary,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        serviceTitle,
                        style: GoogleFonts.inter(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: cs.onSurface,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Provider: $providerName',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: cs.secondary,
                        ),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '\$${amount.toStringAsFixed(2)}',
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: cs.primary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(statusIcon, size: 12, color: statusColor),
                          const SizedBox(width: 4),
                          Text(
                            statusLabel,
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: statusColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          // Date and details
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: cs.surfaceContainerHighest.withValues(alpha: 0.3),
              borderRadius: const BorderRadius.vertical(
                bottom: Radius.circular(16),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  LucideIcons.calendar,
                  size: 14,
                  color: cs.secondary,
                ),
                const SizedBox(width: 6),
                Text(
                  date != null
                      ? DateFormat('MMM dd, yyyy • hh:mm a').format(date)
                      : 'Date not available',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    color: cs.secondary,
                  ),
                ),
                const Spacer(),
                if (item['transactionId'] != null)
                  Row(
                    children: [
                      Icon(
                        LucideIcons.receipt,
                        size: 14,
                        color: cs.tertiary,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'Receipt #${item['transactionId'].toString().substring(0, 8)}',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          color: cs.tertiary,
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(ColorScheme cs) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              color: cs.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(24),
            ),
            child: Icon(
              LucideIcons.receipt,
              size: 48,
              color: cs.secondary.withValues(alpha: 0.5),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'No Finance History',
            style: GoogleFonts.inter(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: cs.onSurface,
            ),
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 40),
            child: Text(
              'Your orders and payment history will appear here once you make your first transaction.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                fontSize: 14,
                color: cs.secondary,
                height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showFilterSheet(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    showModalBottomSheet(
      context: context,
      backgroundColor: cs.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 20),
                decoration: BoxDecoration(
                  color: cs.outline.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Text(
                'Filter by Status',
                style: GoogleFonts.inter(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 20),
              _buildFilterOption('all', 'All Orders', LucideIcons.list, cs),
              _buildFilterOption('completed', 'Completed', LucideIcons.checkCircle, cs),
              _buildFilterOption('pending', 'Pending', LucideIcons.clock, cs),
              _buildFilterOption('in_progress', 'In Progress', LucideIcons.loader, cs),
              _buildFilterOption('cancelled', 'Cancelled', LucideIcons.xCircle, cs),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFilterOption(
    String value,
    String label,
    IconData icon,
    ColorScheme cs,
  ) {
    final isSelected = _selectedFilter == value;

    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(
        icon,
        color: isSelected ? cs.primary : cs.secondary,
        size: 22,
      ),
      title: Text(
        label,
        style: GoogleFonts.inter(
          fontSize: 15,
          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
          color: isSelected ? cs.primary : cs.onSurface,
        ),
      ),
      trailing: isSelected
          ? Icon(LucideIcons.check, color: cs.primary, size: 20)
          : null,
      onTap: () {
        setState(() => _selectedFilter = value);
        Navigator.pop(context);
      },
    );
  }
}

// Helper function to capitalize first letter
String _capitalize(String s) {
  if (s.isEmpty) return s;
  return "${s[0].toUpperCase()}${s.substring(1)}";
}