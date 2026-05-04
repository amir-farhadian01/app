import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';

/// User Directory page with search, filters, and data table
class AdminUsersPage extends StatefulWidget {
  final List<Map<String, dynamic>> users;
  final VoidCallback onRefresh;

  const AdminUsersPage({
    super.key,
    this.users = const [],
    required this.onRefresh,
  });

  @override
  State<AdminUsersPage> createState() => _AdminUsersPageState();
}

class _AdminUsersPageState extends State<AdminUsersPage> {
  String _searchQuery = '';
  String _roleFilter = 'All';
  String _statusFilter = 'All';

  List<Map<String, dynamic>> get _filteredUsers {
    return widget.users.where((user) {
      final email = user['email']?.toString().toLowerCase() ?? '';
      final displayName = user['displayName']?.toString().toLowerCase() ?? '';
      final role = user['role']?.toString() ?? '';
      final status = user['status']?.toString() ?? 'active';

      final matchesSearch = email.contains(_searchQuery.toLowerCase()) ||
          displayName.contains(_searchQuery.toLowerCase());
      final matchesRole = _roleFilter == 'All' || role == _roleFilter.toLowerCase();
      final matchesStatus = _statusFilter == 'All' || status == _statusFilter.toLowerCase();

      return matchesSearch && matchesRole && matchesStatus;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Text(
                    'USER DIRECTORY',
                    style: GoogleFonts.inter(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                      letterSpacing: 1,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '${_filteredUsers.length} USERS',
                      style: GoogleFonts.inter(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: Colors.white.withValues(alpha: 0.7),
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  _buildIconButton(LucideIcons.download, 'Export'),
                  const SizedBox(width: 8),
                  _buildIconButton(LucideIcons.plus, 'Add User'),
                  const SizedBox(width: 8),
                  _buildIconButton(LucideIcons.refreshCw, 'Refresh', onTap: widget.onRefresh),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),
          // Search and filters
          Row(
            children: [
              // Search
              Expanded(
                flex: 2,
                child: Container(
                  height: 44,
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
                        size: 18,
                        color: Colors.white.withValues(alpha: 0.4),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            color: Colors.white.withValues(alpha: 0.9),
                          ),
                          decoration: InputDecoration(
                            hintText: 'Search users...',
                            hintStyle: GoogleFonts.inter(
                              fontSize: 14,
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
              ),
              const SizedBox(width: 12),
              // Role filter
              _buildFilterDropdown(
                'Role',
                _roleFilter,
                ['All', 'Customer', 'Provider', 'Owner', 'Admin'],
                (value) => setState(() => _roleFilter = value!),
              ),
              const SizedBox(width: 12),
              // Status filter
              _buildFilterDropdown(
                'Status',
                _statusFilter,
                ['All', 'Active', 'Pending', 'Suspended'],
                (value) => setState(() => _statusFilter = value!),
              ),
              const SizedBox(width: 12),
              _buildIconButton(LucideIcons.slidersHorizontal, 'Filters'),
              const SizedBox(width: 12),
              _buildIconButton(LucideIcons.layoutGrid, 'View'),
            ],
          ),
          const SizedBox(height: 20),
          // Table
          Expanded(
            child: _buildDataTable(),
          ),
        ],
      ),
    );
  }

  Widget _buildIconButton(IconData icon, String tooltip, {VoidCallback? onTap}) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(8),
        child: InkWell(
          onTap: onTap ?? () {},
          borderRadius: BorderRadius.circular(8),
          child: Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
            ),
            child: Icon(
              icon,
              size: 18,
              color: Colors.white.withValues(alpha: 0.6),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFilterDropdown(
    String label,
    String value,
    List<String> options,
    ValueChanged<String?> onChanged,
  ) {
    return Container(
      height: 44,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: value,
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
          items: options.map((option) {
            return DropdownMenuItem(
              value: option,
              child: Row(
                children: [
                  Text(
                    '$label: ',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: Colors.white.withValues(alpha: 0.5),
                    ),
                  ),
                  Text(
                    option,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Colors.white.withValues(alpha: 0.9),
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
          onChanged: onChanged,
        ),
      ),
    );
  }

  Widget _buildDataTable() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF111111),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Column(
        children: [
          // Table header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(color: Colors.white.withValues(alpha: 0.08)),
              ),
            ),
            child: Row(
              children: [
                SizedBox(
                  width: 40,
                  child: _buildCheckbox(),
                ),
                const SizedBox(width: 16),
                Expanded(
                  flex: 3,
                  child: _buildHeaderCell('USER'),
                ),
                Expanded(
                  flex: 2,
                  child: _buildHeaderCell('ROLE'),
                ),
                Expanded(
                  flex: 2,
                  child: _buildHeaderCell('STATUS'),
                ),
                Expanded(
                  flex: 2,
                  child: _buildHeaderCell('LAST INTERACTION'),
                ),
                Expanded(
                  flex: 2,
                  child: _buildHeaderCell('OFFICE/LOCATION'),
                ),
                Expanded(
                  flex: 2,
                  child: _buildHeaderCell('TAGS'),
                ),
                SizedBox(
                  width: 80,
                  child: _buildHeaderCell('ACTIONS'),
                ),
              ],
            ),
          ),
          // Table body
          if (_filteredUsers.isEmpty)
            Expanded(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      LucideIcons.users,
                      size: 64,
                      color: Colors.white.withValues(alpha: 0.2),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'No users found',
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Colors.white.withValues(alpha: 0.5),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Try adjusting your search or filters',
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
                itemCount: _filteredUsers.length,
                separatorBuilder: (_, __) => Divider(
                  color: Colors.white.withValues(alpha: 0.05),
                  height: 1,
                  indent: 76,
                ),
                itemBuilder: (context, index) {
                  final user = _filteredUsers[index];
                  return _buildUserRow(user);
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

  Widget _buildCheckbox() {
    return Container(
      width: 18,
      height: 18,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
      ),
    );
  }

  Widget _buildUserRow(Map<String, dynamic> user) {
    final email = user['email']?.toString() ?? '';
    final displayName = user['displayName']?.toString() ?? 'Unknown';
    final role = user['role']?.toString() ?? 'customer';
    final status = user['status']?.toString() ?? 'active';
    final photoUrl = user['photoURL']?.toString();
    final location = user['location']?.toString() ?? 'Unknown';

    Color statusColor;
    Color roleColor;

    switch (status.toLowerCase()) {
      case 'active':
        statusColor = const Color(0xFF10b981);
        break;
      case 'pending':
      case 'pending_verification':
        statusColor = const Color(0xFFf59e0b);
        break;
      case 'suspended':
      case 'rejected':
        statusColor = const Color(0xFFef4444);
        break;
      default:
        statusColor = Colors.white.withValues(alpha: 0.5);
    }

    switch (role.toLowerCase()) {
      case 'owner':
        roleColor = const Color(0xFF8b5cf6);
        break;
      case 'provider':
        roleColor = const Color(0xFF3b82f6);
        break;
      case 'admin':
        roleColor = const Color(0xFFef4444);
        break;
      default:
        roleColor = Colors.white.withValues(alpha: 0.7);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      child: Row(
        children: [
          SizedBox(
            width: 40,
            child: _buildCheckbox(),
          ),
          const SizedBox(width: 16),
          // User info
          Expanded(
            flex: 3,
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: roleColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: photoUrl != null && photoUrl.isNotEmpty
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: Image.network(
                            photoUrl,
                            width: 40,
                            height: 40,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Center(
                              child: Text(
                                displayName.substring(0, 1).toUpperCase(),
                                style: GoogleFonts.inter(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: roleColor,
                                ),
                              ),
                            ),
                          ),
                        )
                      : Center(
                          child: Text(
                            displayName.substring(0, 1).toUpperCase(),
                            style: GoogleFonts.inter(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: roleColor,
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
                        displayName,
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        email,
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: Colors.white.withValues(alpha: 0.4),
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          // Role
          Expanded(
            flex: 2,
            child: Text(
              role.toUpperCase(),
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: roleColor,
                letterSpacing: 0.5,
              ),
            ),
          ),
          // Status
          Expanded(
            flex: 2,
            child: Row(
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
                    fontWeight: FontWeight.w600,
                    color: statusColor,
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
          ),
          // Last interaction
          Expanded(
            flex: 2,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Never',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Colors.white.withValues(alpha: 0.7),
                  ),
                ),
                Text(
                  'LOGIN',
                  style: GoogleFonts.inter(
                    fontSize: 9,
                    color: Colors.white.withValues(alpha: 0.4),
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
          ),
          // Location
          Expanded(
            flex: 2,
            child: Row(
              children: [
                Icon(
                  LucideIcons.mapPin,
                  size: 12,
                  color: Colors.white.withValues(alpha: 0.4),
                ),
                const SizedBox(width: 6),
                Text(
                  location,
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    color: Colors.white.withValues(alpha: 0.5),
                  ),
                ),
              ],
            ),
          ),
          // Tags
          Expanded(
            flex: 2,
            child: Text(
              'NO TAGS',
              style: GoogleFonts.inter(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: Colors.white.withValues(alpha: 0.3),
                letterSpacing: 0.5,
              ),
            ),
          ),
          // Actions
          SizedBox(
            width: 80,
            child: Row(
              children: [
                IconButton(
                  onPressed: () {},
                  icon: Icon(
                    LucideIcons.mail,
                    size: 16,
                    color: Colors.white.withValues(alpha: 0.5),
                  ),
                  splashRadius: 20,
                ),
                IconButton(
                  onPressed: () {},
                  icon: Icon(
                    LucideIcons.moreVertical,
                    size: 16,
                    color: Colors.white.withValues(alpha: 0.5),
                  ),
                  splashRadius: 20,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
