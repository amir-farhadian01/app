import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/auth_provider.dart';
import '../services/api_service.dart';

class CustomerDashboardScreen extends StatefulWidget {
  final AppUser user;
  const CustomerDashboardScreen({super.key, required this.user});

  @override
  State<CustomerDashboardScreen> createState() => _CustomerDashboardScreenState();
}

class _CustomerDashboardScreenState extends State<CustomerDashboardScreen> {
  int _selectedIndex = 0;
  List<dynamic> _services = [];
  List<dynamic> _requests = [];
  List<dynamic> _contracts = [];
  List<dynamic> _notifications = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        ApiService.getServices(),
        ApiService.getRequests(),
        ApiService.getContracts(),
        ApiService.getNotifications(),
      ]);
      setState(() {
        _services = results[0];
        _requests = results[1];
        _contracts = results[2];
        _notifications = results[3];
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  bool get _isDark => Theme.of(context).brightness == Brightness.dark;
  Color get _borderColor => _isDark ? const Color(0xFF262626) : const Color(0xFFF5F5F5);
  Color get _cardColor => Theme.of(context).cardColor;
  Color get _textColor => Theme.of(context).colorScheme.onSurface;
  Color get _subtleText => _isDark ? const Color(0xFF737373) : const Color(0xFF737373);

  @override
  Widget build(BuildContext context) {
    final pages = [
      _buildHomeTab(),
      _buildServicesTab(),
      _buildRequestsTab(),
      _buildNotificationsTab(),
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
            NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home_rounded),
              label: 'Home',
            ),
            NavigationDestination(
              icon: Icon(Icons.explore_outlined),
              selectedIcon: Icon(Icons.explore_rounded),
              label: 'Explorer',
            ),
            NavigationDestination(
              icon: Icon(Icons.assignment_outlined),
              selectedIcon: Icon(Icons.assignment_rounded),
              label: 'Requests',
            ),
            NavigationDestination(
              icon: Icon(Icons.notifications_outlined),
              selectedIcon: Icon(Icons.notifications_rounded),
              label: 'Alerts',
            ),
          ],
        ),
      ),
    );
  }

  // ── Home Tab ───────────────────────────────────────────────────────────────
  Widget _buildHomeTab() {
    final unread = _notifications.where((n) => n['read'] == false).length;
    final activeJobs = _requests.where((r) => r['status'] != 'completed' && r['status'] != 'declined').length;

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
      children: [
        // ── Header ────────────────────────────────────────
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'TERMINAL',
                    style: GoogleFonts.inter(
                      fontSize: 36,
                      fontWeight: FontWeight.w900,
                      fontStyle: FontStyle.italic,
                      letterSpacing: -1.5,
                      height: 1,
                      color: _textColor,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Welcome back, ${widget.user.displayName.split(' ').first}. Your neighborhood awaits.',
                    style: GoogleFonts.inter(color: _subtleText, fontSize: 13),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            ElevatedButton.icon(
              onPressed: _showBecomeProviderDialog,
              icon: const Icon(Icons.work_outline_rounded, size: 14),
              label: Text(
                'Become a Provider',
                style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700),
              ),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
          ],
        ),
        const SizedBox(height: 28),

        // ── Stats Grid (2×2) ──────────────────────────────
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 2,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.55,
          children: [
            _statCard('\$0', 'Total Spent', Icons.attach_money_rounded,
                const Color(0xFF10B981), const Color(0xFFECFDF5), const Color(0xFF065F46)),
            _statCard('$activeJobs', 'Active Jobs', Icons.work_rounded,
                const Color(0xFF3B82F6), const Color(0xFFEFF6FF), const Color(0xFF1E3A5F)),
            _statCard('450', 'Reward Points', Icons.star_rounded,
                const Color(0xFFF59E0B), const Color(0xFFFFFBEB), const Color(0xFF78350F)),
            _statCard('$unread', 'Open Tickets', Icons.chat_bubble_rounded,
                const Color(0xFF8B5CF6), const Color(0xFFF5F3FF), const Color(0xFF4C1D95)),
          ],
        ),
        const SizedBox(height: 28),

        // ── Recommended Services ──────────────────────────
        _sectionHeader('RECOMMENDED', 'View All', () {}),
        const SizedBox(height: 12),
        if (_services.isEmpty)
          _emptyPlaceholder('No services available')
        else
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 1.0,
            ),
            itemCount: _services.take(4).length,
            itemBuilder: (_, i) => _serviceGridCard(_services[i]),
          ),
        const SizedBox(height: 28),

        // ── Active Jobs ────────────────────────────────────
        _sectionHeader('ACTIVE JOBS', 'Manage', () => setState(() => _selectedIndex = 2)),
        const SizedBox(height: 12),
        if (_requests.isEmpty)
          _emptyDashedCard('No active jobs found.')
        else
          ..._requests.take(2).map((req) => _activeJobCard(req)),
        const SizedBox(height: 28),

        // ── Neighborhood Points ────────────────────────────
        _neighborhoodPointsCard(),
        const SizedBox(height: 24),

        // ── Quick Access ───────────────────────────────────
        Text(
          'QUICK ACCESS',
          style: GoogleFonts.inter(
            fontSize: 10,
            fontWeight: FontWeight.w900,
            letterSpacing: 2.5,
            color: _subtleText,
          ),
        ),
        const SizedBox(height: 10),
        _quickAccessBtn('AI Consultant', Icons.auto_awesome_rounded),
        const SizedBox(height: 8),
        _quickAccessBtn('Address Book', Icons.location_on_outlined),
        const SizedBox(height: 8),
        _quickAccessBtn('Support Center', Icons.help_outline_rounded),
      ],
    );
  }

  // ── Services Tab ──────────────────────────────────────────────────────────
  Widget _buildServicesTab() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
      children: [
        Text(
          'EXPLORER',
          style: GoogleFonts.inter(fontSize: 36, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic, letterSpacing: -1.5, color: _textColor),
        ),
        const SizedBox(height: 4),
        Text('Discover trusted services nearby.', style: GoogleFonts.inter(color: _subtleText, fontSize: 13)),
        const SizedBox(height: 24),
        if (_services.isEmpty)
          _emptyPlaceholder('No services available')
        else
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 1.0,
            ),
            itemCount: _services.length,
            itemBuilder: (_, i) => _serviceGridCard(_services[i]),
          ),
      ],
    );
  }

  // ── Requests Tab ─────────────────────────────────────────────────────────
  Widget _buildRequestsTab() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
      children: [
        Text(
          'MY REQUESTS',
          style: GoogleFonts.inter(fontSize: 36, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic, letterSpacing: -1.5, color: _textColor),
        ),
        const SizedBox(height: 4),
        Text('Track your active jobs and history.', style: GoogleFonts.inter(color: _subtleText, fontSize: 13)),
        const SizedBox(height: 24),
        if (_requests.isEmpty)
          _emptyDashedCard('No requests yet')
        else
          ..._requests.map((r) => _requestCard(r)),
      ],
    );
  }

  // ── Notifications Tab ─────────────────────────────────────────────────────
  Widget _buildNotificationsTab() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
      children: [
        Text(
          'ALERTS',
          style: GoogleFonts.inter(fontSize: 36, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic, letterSpacing: -1.5, color: _textColor),
        ),
        const SizedBox(height: 4),
        Text('Stay up to date with your neighborhood.', style: GoogleFonts.inter(color: _subtleText, fontSize: 13)),
        const SizedBox(height: 24),
        if (_notifications.isEmpty)
          _emptyPlaceholder('No notifications yet')
        else
          ..._notifications.map((n) => _notificationItem(n)),
      ],
    );
  }

  // ─── Widget Builders ───────────────────────────────────────────────────────

  Widget _sectionHeader(String title, String action, VoidCallback onAction) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: GoogleFonts.inter(
            fontWeight: FontWeight.w900,
            fontStyle: FontStyle.italic,
            fontSize: 20,
            letterSpacing: -0.5,
            color: _textColor,
          ),
        ),
        TextButton(
          onPressed: onAction,
          child: Text(
            action,
            style: GoogleFonts.inter(
              fontSize: 11,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.5,
              color: _subtleText,
            ),
          ),
        ),
      ],
    );
  }

  Widget _statCard(String value, String label, IconData icon, Color iconColor, Color lightBg, Color darkBg) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _cardColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(
              color: _isDark ? iconColor.withOpacity(0.15) : lightBg,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: iconColor, size: 18),
          ),
          const Spacer(),
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 9,
              fontWeight: FontWeight.w900,
              color: _subtleText,
              letterSpacing: 1,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: GoogleFonts.inter(
              fontSize: 22,
              fontWeight: FontWeight.w900,
              color: _textColor,
              height: 1,
            ),
          ),
        ],
      ),
    );
  }

  Widget _serviceGridCard(dynamic s) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: Stack(
        fit: StackFit.expand,
        children: [
          Image.network(
            'https://picsum.photos/seed/${s['id']}/400/400',
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => Container(
              color: _isDark ? const Color(0xFF1C1C1C) : const Color(0xFFF5F5F5),
              child: Icon(Icons.image_not_supported_outlined, color: _subtleText),
            ),
          ),
          // Gradient overlay
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Colors.transparent, Color(0xCC000000)],
                stops: [0.4, 1.0],
              ),
            ),
          ),
          // Text content
          Positioned(
            bottom: 12, left: 12, right: 12,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (s['category'] != null)
                  Text(
                    (s['category'] as String).toUpperCase(),
                    style: GoogleFonts.inter(fontSize: 9, color: Colors.white54, fontWeight: FontWeight.w900, letterSpacing: 1),
                  ),
                Text(
                  s['title'] ?? '',
                  style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.white, height: 1.2),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _activeJobCard(dynamic req) {
    final status = req['status'] ?? 'pending';
    final isPending = status == 'pending';
    final letter = status.substring(0, 1).toUpperCase();

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _cardColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _borderColor),
      ),
      child: Row(
        children: [
          Container(
            width: 48, height: 48,
            decoration: BoxDecoration(
              color: isPending
                  ? const Color(0xFFFFF3CD)
                  : (_isDark ? Colors.white : const Color(0xFF141414)),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Center(
              child: Text(
                letter,
                style: GoogleFonts.inter(
                  fontWeight: FontWeight.w900,
                  fontSize: 20,
                  fontStyle: FontStyle.italic,
                  color: isPending
                      ? const Color(0xFFD97706)
                      : (_isDark ? const Color(0xFF141414) : Colors.white),
                ),
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Job #${req['id'].toString().substring(0, 8).toUpperCase()}',
                  style: GoogleFonts.inter(fontWeight: FontWeight.w900, fontSize: 14, color: _textColor),
                ),
                const SizedBox(height: 2),
                Text(
                  status.toUpperCase(),
                  style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900, color: _subtleText, letterSpacing: 1),
                ),
              ],
            ),
          ),
          Icon(Icons.chevron_right_rounded, color: _subtleText, size: 20),
        ],
      ),
    );
  }

  Widget _requestCard(dynamic r) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
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
                Text(
                  r['service']?['title'] ?? 'Service',
                  style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 14, color: _textColor),
                ),
                const SizedBox(height: 4),
                Text(
                  'Provider: ${r['provider']?['displayName'] ?? '—'}',
                  style: GoogleFonts.inter(color: _subtleText, fontSize: 12),
                ),
              ],
            ),
          ),
          _statusBadge(r['status']),
        ],
      ),
    );
  }

  Widget _notificationItem(dynamic n) {
    final isRead = n['read'] == true;
    return GestureDetector(
      onTap: () async {
        if (!isRead) {
          await ApiService.markNotificationRead(n['id']);
          setState(() => n['read'] = true);
        }
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 2),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: _cardColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isRead ? _borderColor : const Color(0xFF141414).withOpacity(0.2)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 10, height: 10,
              margin: const EdgeInsets.only(top: 4, right: 12),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isRead ? _borderColor : const Color(0xFF141414),
              ),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(n['title'] ?? '', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 14, color: _textColor)),
                  const SizedBox(height: 2),
                  Text(n['message'] ?? '', style: GoogleFonts.inter(fontSize: 12, color: _subtleText)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _neighborhoodPointsCard() {
    final bgColor = _isDark ? Colors.white : const Color(0xFF141414);
    final mainTextColor = _isDark ? const Color(0xFF141414) : Colors.white;
    final subtleCardText = _isDark ? Colors.black38 : Colors.white30;
    final trackColor = _isDark ? const Color(0xFFE5E5E5) : Colors.white12;
    final progressColor = _isDark ? const Color(0xFF141414) : Colors.white;

    return Container(
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(28),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'NEIGHBORHOOD POINTS',
            style: GoogleFonts.inter(
              fontSize: 10, fontWeight: FontWeight.w900,
              color: subtleCardText, letterSpacing: 1.5,
            ),
          ),
          const SizedBox(height: 8),
          RichText(
            text: TextSpan(children: [
              TextSpan(
                text: '450 ',
                style: GoogleFonts.inter(
                  fontSize: 38, fontWeight: FontWeight.w900,
                  fontStyle: FontStyle.italic, color: mainTextColor,
                ),
              ),
              TextSpan(
                text: 'XP',
                style: GoogleFonts.inter(
                  fontSize: 16, fontWeight: FontWeight.w700,
                  color: subtleCardText,
                ),
              ),
            ]),
          ),
          const SizedBox(height: 16),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: 0.67,
              minHeight: 6,
              backgroundColor: trackColor,
              valueColor: AlwaysStoppedAnimation(progressColor),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Level 4 Neighbor  •  150 XP to Level 5',
            style: GoogleFonts.inter(
              fontSize: 10, fontWeight: FontWeight.w700,
              color: subtleCardText, letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _quickAccessBtn(String label, IconData icon) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: _cardColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: _borderColor),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: _subtleText),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              label,
              style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 14, color: _textColor),
            ),
          ),
          Icon(Icons.chevron_right_rounded, size: 18, color: _subtleText),
        ],
      ),
    );
  }

  Widget _emptyDashedCard(String message) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(36),
      decoration: BoxDecoration(
        color: _cardColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _borderColor, style: BorderStyle.solid),
      ),
      child: Center(
        child: Text(
          message,
          style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: _subtleText),
        ),
      ),
    );
  }

  Widget _emptyPlaceholder(String message) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 40),
      child: Center(
        child: Text(
          message,
          style: GoogleFonts.inter(color: _subtleText, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }

  Widget _statusBadge(String? status) {
    final colors = {
      'pending': const Color(0xFFF59E0B),
      'accepted': const Color(0xFF3B82F6),
      'started': const Color(0xFF6366F1),
      'completed': const Color(0xFF10B981),
      'declined': const Color(0xFFEF4444),
    };
    final color = colors[status] ?? const Color(0xFF8E9299);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(_isDark ? 0.15 : 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        status ?? '',
        style: GoogleFonts.inter(color: color, fontWeight: FontWeight.w800, fontSize: 11),
      ),
    );
  }

  void _showBecomeProviderDialog() {
    final isDark = _isDark;
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: isDark ? const Color(0xFF171717) : Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: Text(
          'Start Earning',
          style: GoogleFonts.inter(fontWeight: FontWeight.w900, fontStyle: FontStyle.italic, color: _textColor),
        ),
        content: Text(
          'Transform your skills into a business. Join our network of professional neighbors.',
          style: GoogleFonts.inter(color: _subtleText),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Maybe Later', style: GoogleFonts.inter(color: _subtleText, fontWeight: FontWeight.w700)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Apply Now', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }
}
