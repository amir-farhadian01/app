import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';

/// KYC Review page with Personal/Business tabs and stats
class AdminKycPage extends StatefulWidget {
  final List<Map<String, dynamic>> submissions;
  final VoidCallback onRefresh;

  const AdminKycPage({
    super.key,
    this.submissions = const [],
    required this.onRefresh,
  });

  @override
  State<AdminKycPage> createState() => _AdminKycPageState();
}

class _AdminKycPageState extends State<AdminKycPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _searchQuery = '';
  String _statusFilter = 'All';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> get _filteredSubmissions {
    return widget.submissions.where((sub) {
      final name = sub['displayName']?.toString().toLowerCase() ?? '';
      final email = sub['email']?.toString().toLowerCase() ?? '';
      final status = sub['kycStatus']?.toString() ?? 'pending';
      final type = sub['kycType']?.toString() ?? 'personal';

      final matchesSearch = name.contains(_searchQuery.toLowerCase()) ||
          email.contains(_searchQuery.toLowerCase());
      final matchesStatus = _statusFilter == 'All' || status == _statusFilter.toLowerCase();
      final matchesType = _tabController.index == 0
          ? type == 'personal'
          : type == 'business';

      return matchesSearch && matchesStatus && matchesType;
    }).toList();
  }

  Map<String, int> get _stats {
    final personal = widget.submissions.where((s) => s['kycType'] == 'personal').toList();
    final business = widget.submissions.where((s) => s['kycType'] == 'business').toList();

    return {
      'personalPending': personal.where((s) => s['kycStatus'] == 'pending').length,
      'personalVerified': personal.where((s) => s['kycStatus'] == 'verified').length,
      'personalRejected': personal.where((s) => s['kycStatus'] == 'rejected').length,
      'businessPending': business.where((s) => s['kycStatus'] == 'pending').length,
      'businessVerified': business.where((s) => s['kycStatus'] == 'verified').length,
      'businessRejected': business.where((s) => s['kycStatus'] == 'rejected').length,
    };
  }

  @override
  Widget build(BuildContext context) {
    final stats = _stats;

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Tabs
          Row(
            children: [
              _buildTab('PERSONAL KYC', 0, LucideIcons.user),
              const SizedBox(width: 24),
              _buildTab('BUSINESS KYC', 1, LucideIcons.building2),
            ],
          ),
          const SizedBox(height: 24),
          // Stats cards
          _buildStatsCards(stats),
          const SizedBox(height: 24),
          // Submissions table
          Expanded(
            child: _buildSubmissionsTable(),
          ),
        ],
      ),
    );
  }

  Widget _buildTab(String label, int index, IconData icon) {
    final isActive = _tabController.index == index;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          setState(() {
            _tabController.index = index;
          });
        },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(
                color: isActive ? const Color(0xFF10b981) : Colors.transparent,
                width: 2,
              ),
            ),
          ),
          child: Row(
            children: [
              Icon(
                icon,
                size: 16,
                color: isActive ? Colors.white : Colors.white.withValues(alpha: 0.5),
              ),
              const SizedBox(width: 8),
              Text(
                label,
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: isActive ? Colors.white : Colors.white.withValues(alpha: 0.5),
                  letterSpacing: 1,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatsCards(Map<String, int> stats) {
    final isPersonal = _tabController.index == 0;

    final cards = [
      _KycStatCard(
        'Pending Verification',
        isPersonal ? stats['personalPending'] ?? 0 : stats['businessPending'] ?? 0,
        LucideIcons.clock,
        const Color(0xFFf59e0b),
      ),
      _KycStatCard(
        'Verified Users',
        isPersonal ? stats['personalVerified'] ?? 0 : stats['businessVerified'] ?? 0,
        LucideIcons.checkCircle,
        const Color(0xFF10b981),
      ),
      _KycStatCard(
        'Rejected',
        isPersonal ? stats['personalRejected'] ?? 0 : stats['businessRejected'] ?? 0,
        LucideIcons.xCircle,
        const Color(0xFFef4444),
      ),
    ];

    return Row(
      children: cards.map((card) => Expanded(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8),
          child: _buildStatCard(card),
        ),
      )).toList(),
    );
  }

  Widget _buildStatCard(_KycStatCard card) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF111111),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: card.color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  card.icon,
                  size: 20,
                  color: card.color,
                ),
              ),
              if (card.count > 0)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: card.color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    card.count.toString(),
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: card.color,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            card.count.toString(),
            style: GoogleFonts.inter(
              fontSize: 36,
              fontWeight: FontWeight.w900,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            card.label.toUpperCase(),
            style: GoogleFonts.inter(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: Colors.white.withValues(alpha: 0.5),
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSubmissionsTable() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF111111),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with search
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'KYC SUBMISSIONS',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                    letterSpacing: 1,
                  ),
                ),
                Row(
                  children: [
                    // Search
                    Container(
                      width: 280,
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
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextField(
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                color: Colors.white.withValues(alpha: 0.9),
                              ),
                              decoration: InputDecoration(
                                hintText: 'Search name, email, phone...',
                                hintStyle: GoogleFonts.inter(
                                  fontSize: 13,
                                  color: Colors.white.withValues(alpha: 0.4),
                                ),
                                border: InputBorder.none,
                                contentPadding: EdgeInsets.zero,
                              ),
                              onChanged: (value) => setState(() => _searchQuery = value),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    // Status filter
                    Container(
                      height: 40,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.05),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _statusFilter,
                          dropdownColor: const Color(0xFF1c1917),
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            color: Colors.white.withValues(alpha: 0.8),
                          ),
                          icon: Icon(
                            LucideIcons.chevronDown,
                            size: 16,
                            color: Colors.white.withValues(alpha: 0.5),
                          ),
                          items: ['All', 'Pending', 'Verified', 'Rejected'].map((option) {
                            return DropdownMenuItem(
                              value: option,
                              child: Text(
                                option,
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.white.withValues(alpha: 0.9),
                                ),
                              ),
                            );
                          }).toList(),
                          onChanged: (value) => setState(() => _statusFilter = value!),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          // Table header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            decoration: BoxDecoration(
              border: Border(
                top: BorderSide(color: Colors.white.withValues(alpha: 0.08)),
                bottom: BorderSide(color: Colors.white.withValues(alpha: 0.08)),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  flex: 3,
                  child: _buildHeaderCell('USER DETAILS'),
                ),
                Expanded(
                  flex: 2,
                  child: _buildHeaderCell('TYPE'),
                ),
                Expanded(
                  flex: 2,
                  child: _buildHeaderCell('STATUS'),
                ),
                Expanded(
                  flex: 2,
                  child: _buildHeaderCell('SUBMITTED'),
                ),
                SizedBox(
                  width: 100,
                  child: _buildHeaderCell('ACTIONS'),
                ),
              ],
            ),
          ),
          // Table body
          if (_filteredSubmissions.isEmpty)
            Expanded(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      LucideIcons.shieldCheck,
                      size: 64,
                      color: Colors.white.withValues(alpha: 0.2),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'No KYC submissions found',
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Colors.white.withValues(alpha: 0.5),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Submissions will appear here when users complete KYC',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: Colors.white.withValues(alpha: 0.4),
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            Expanded(
              child: ListView.separated(
                itemCount: _filteredSubmissions.length,
                separatorBuilder: (_, __) => Divider(
                  color: Colors.white.withValues(alpha: 0.05),
                  height: 1,
                ),
                itemBuilder: (context, index) {
                  final submission = _filteredSubmissions[index];
                  return _buildSubmissionRow(submission);
                },
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildHeaderCell(String label) {
    return Text(
      label,
      style: GoogleFonts.inter(
        fontSize: 10,
        fontWeight: FontWeight.w800,
        color: Colors.white.withValues(alpha: 0.4),
        letterSpacing: 1,
      ),
    );
  }

  Widget _buildSubmissionRow(Map<String, dynamic> submission) {
    final displayName = submission['displayName']?.toString() ?? 'Unknown';
    final email = submission['email']?.toString() ?? '';
    final role = submission['role']?.toString() ?? '';
    final type = submission['kycType']?.toString() ?? 'personal';
    final status = submission['kycStatus']?.toString() ?? 'pending';
    final submittedAt = submission['kycSubmittedAt']?.toString() ?? '';

    Color statusColor;
    switch (status.toLowerCase()) {
      case 'verified':
        statusColor = const Color(0xFF10b981);
        break;
      case 'pending':
        statusColor = const Color(0xFFf59e0b);
        break;
      case 'rejected':
        statusColor = const Color(0xFFef4444);
        break;
      default:
        statusColor = Colors.white.withValues(alpha: 0.5);
    }

    String formattedDate = 'Unknown';
    if (submittedAt.isNotEmpty) {
      try {
        final date = DateTime.parse(submittedAt);
        formattedDate = '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
      } catch (_) {}
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: Row(
        children: [
          // User details
          Expanded(
            flex: 3,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  displayName,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  email,
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    color: Colors.white.withValues(alpha: 0.4),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  role.isEmpty ? 'No phone' : role,
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    color: Colors.white.withValues(alpha: 0.3),
                  ),
                ),
              ],
            ),
          ),
          // Type
          Expanded(
            flex: 2,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                type.toUpperCase(),
                style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: Colors.white.withValues(alpha: 0.7),
                  letterSpacing: 0.5,
                ),
              ),
            ),
          ),
          // Status
          Expanded(
            flex: 2,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: statusColor.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: statusColor,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    status.toUpperCase(),
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: statusColor,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Submitted date
          Expanded(
            flex: 2,
            child: Text(
              formattedDate,
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: Colors.white.withValues(alpha: 0.6),
              ),
            ),
          ),
          // Actions
          SizedBox(
            width: 100,
            child: ElevatedButton(
              onPressed: () {},
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: const Color(0xFF0c0a09),
                elevation: 0,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: Text(
                'REVIEW',
                style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.5,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _KycStatCard {
  final String label;
  final int count;
  final IconData icon;
  final Color color;

  _KycStatCard(this.label, this.count, this.icon, this.color);
}
