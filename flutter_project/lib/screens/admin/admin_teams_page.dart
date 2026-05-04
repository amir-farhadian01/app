import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';

/// Teams page with Internal Teams cards and Staff Directory
class AdminTeamsPage extends StatefulWidget {
  final List<Map<String, dynamic>> users;
  final VoidCallback onRefresh;

  const AdminTeamsPage({
    super.key,
    this.users = const [],
    required this.onRefresh,
  });

  @override
  State<AdminTeamsPage> createState() => _AdminTeamsPageState();
}

class _AdminTeamsPageState extends State<AdminTeamsPage> {
  String _searchQuery = '';
  String _selectedTeam = 'All';

  List<Map<String, dynamic>> get _filteredUsers {
    return widget.users.where((user) {
      final displayName = user['displayName']?.toString().toLowerCase() ?? '';
      final email = user['email']?.toString().toLowerCase() ?? '';
      final role = user['role']?.toString().toLowerCase() ?? '';
      
      final matchesSearch = displayName.contains(_searchQuery.toLowerCase()) ||
          email.contains(_searchQuery.toLowerCase());
      final matchesTeam = _selectedTeam == 'All' || _getTeamForRole(role) == _selectedTeam;
      
      return matchesSearch && matchesTeam;
    }).toList();
  }

  String _getTeamForRole(String role) {
    switch (role) {
      case 'support':
        return 'Support';
      case 'finance':
        return 'Financial';
      case 'operations':
        return 'Operations';
      case 'platform_admin':
      case 'owner':
        return 'Platform Admins';
      default:
        return 'Other';
    }
  }

  int _getTeamCount(String team) {
    return widget.users.where((user) {
      final role = user['role']?.toString().toLowerCase() ?? '';
      return _getTeamForRole(role) == team;
    }).length;
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'INTERNAL TEAMS',
                style: GoogleFonts.inter(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                  letterSpacing: 1,
                ),
              ),
              ElevatedButton.icon(
                onPressed: () {},
                icon: const Icon(LucideIcons.plus, size: 16),
                label: Text(
                  'Assign Member',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: const Color(0xFF0c0a09),
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          // Teams Grid
          _buildTeamsGrid(),
          const SizedBox(height: 32),
          // Staff Directory
          _buildStaffDirectory(),
        ],
      ),
    );
  }

  Widget _buildTeamsGrid() {
    final teams = [
      _TeamCard(
        'Support Team',
        _getTeamCount('Support'),
        LucideIcons.headphones,
        const Color(0xFF3b82f6),
      ),
      _TeamCard(
        'Financial Team',
        _getTeamCount('Financial'),
        LucideIcons.dollarSign,
        const Color(0xFF10b981),
      ),
      _TeamCard(
        'Operations Team',
        _getTeamCount('Operations'),
        LucideIcons.settings2,
        const Color(0xFFf59e0b),
      ),
      _TeamCard(
        'Platform Admins',
        _getTeamCount('Platform Admins'),
        LucideIcons.shield,
        const Color(0xFF8b5cf6),
      ),
    ];

    return Row(
      children: teams.map((team) => Expanded(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8),
          child: _buildTeamCard(team),
        ),
      )).toList(),
    );
  }

  Widget _buildTeamCard(_TeamCard team) {
    return Container(
      height: 140,
      decoration: BoxDecoration(
        color: const Color(0xFF111111),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            setState(() {
              _selectedTeam = team.name;
            });
          },
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: team.color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    team.icon,
                    size: 20,
                    color: team.color,
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      team.name.toUpperCase(),
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${team.count} Active Members',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        color: Colors.white.withValues(alpha: 0.5),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStaffDirectory() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF111111),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Text(
                      'STAFF DIRECTORY',
                      style: GoogleFonts.inter(
                        fontSize: 14,
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
                        '${_filteredUsers.length} MEMBERS',
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
                    // Search
                    Container(
                      width: 260,
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
                                hintText: 'Search staff...',
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
                    // Team filter
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
                          value: _selectedTeam,
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
                          items: ['All', 'Support', 'Financial', 'Operations', 'Platform Admins'].map((option) {
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
                          onChanged: (value) => setState(() => _selectedTeam = value!),
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
                  child: _buildHeaderCell('MEMBER'),
                ),
                Expanded(
                  flex: 2,
                  child: _buildHeaderCell('TEAM'),
                ),
                Expanded(
                  flex: 2,
                  child: _buildHeaderCell('ROLE'),
                ),
                Expanded(
                  flex: 2,
                  child: _buildHeaderCell('STATUS'),
                ),
                SizedBox(
                  width: 100,
                  child: _buildHeaderCell('ACTIONS'),
                ),
              ],
            ),
          ),
          // Table body
          if (_filteredUsers.isEmpty)
            SizedBox(
              height: 200,
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      LucideIcons.users,
                      size: 48,
                      color: Colors.white.withValues(alpha: 0.2),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'No team members found',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        color: Colors.white.withValues(alpha: 0.5),
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _filteredUsers.length,
              separatorBuilder: (_, __) => Divider(
                color: Colors.white.withValues(alpha: 0.05),
                height: 1,
              ),
              itemBuilder: (context, index) {
                final user = _filteredUsers[index];
                return _buildStaffRow(user);
              },
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

  Widget _buildStaffRow(Map<String, dynamic> user) {
    final displayName = user['displayName']?.toString() ?? 'Unknown';
    final email = user['email']?.toString() ?? '';
    final role = user['role']?.toString() ?? 'customer';
    final status = user['status']?.toString() ?? 'active';
    final photoUrl = user['photoURL']?.toString();

    final team = _getTeamForRole(role.toLowerCase());
    
    Color teamColor;
    switch (team) {
      case 'Support':
        teamColor = const Color(0xFF3b82f6);
        break;
      case 'Financial':
        teamColor = const Color(0xFF10b981);
        break;
      case 'Operations':
        teamColor = const Color(0xFFf59e0b);
        break;
      case 'Platform Admins':
        teamColor = const Color(0xFF8b5cf6);
        break;
      default:
        teamColor = Colors.white.withValues(alpha: 0.5);
    }

    Color statusColor = status.toLowerCase() == 'active' 
        ? const Color(0xFF10b981) 
        : const Color(0xFFf59e0b);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      child: Row(
        children: [
          // Member info
          Expanded(
            flex: 3,
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: teamColor.withValues(alpha: 0.15),
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
                                  color: teamColor,
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
                              color: teamColor,
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
          // Team
          Expanded(
            flex: 2,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: teamColor.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                team.toUpperCase(),
                style: GoogleFonts.inter(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: teamColor,
                  letterSpacing: 0.5,
                ),
              ),
            ),
          ),
          // Role
          Expanded(
            flex: 2,
            child: Text(
              role.toUpperCase(),
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: Colors.white.withValues(alpha: 0.7),
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
          // Actions
          SizedBox(
            width: 100,
            child: Row(
              children: [
                IconButton(
                  onPressed: () {},
                  icon: Icon(
                    LucideIcons.pencil,
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

class _TeamCard {
  final String name;
  final int count;
  final IconData icon;
  final Color color;

  _TeamCard(this.name, this.count, this.icon, this.color);
}
