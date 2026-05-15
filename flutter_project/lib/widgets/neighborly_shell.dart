import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../models/user_model.dart';
import '../routing/app_navigator.dart';
import '../screens/notifications_screen.dart';
import '../services/neighborly_api_service.dart';
import '../services/neighborly_theme_notifier.dart';
import '../theme/account_hub_style.dart';
import '../theme/account_hub_typography.dart';

/// Color constants matching port 8077 reference UI.
const _kPrimaryBlue = Color(0xFF2B6EFF);
const _kBusinessOrange = Color(0xFFFF7A2B);
const _kBgDark = Color(0xFF0D0F1A);
const _kCardBg = Color(0xFF1E2235);
const _kBorderColor = Color(0xFF2A2F4A);
const _kTextPrimary = Color(0xFFF0F2FF);
const _kTextSecondary = Color(0xFF8B8FA3);

/// Sticky header + main + footer + mobile bottom bar — mirrors web [Layout.tsx].
class NeighborlyShell extends StatefulWidget {
  const NeighborlyShell({super.key, this.child});

  final Widget? child;

  @override
  State<NeighborlyShell> createState() => _NeighborlyShellState();
}

class _NeighborlyShellState extends State<NeighborlyShell> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  bool _isAdminRole(String? role) {
    const admins = {'owner', 'platform_admin', 'support', 'finance'};
    return role != null && admins.contains(role);
  }

  /// Full marketing footer steals vertical space on the desktop admin panel.
  bool _useCompactFooterForPath(String path, UserModel? user) {
    if (!_isAdminRole(user?.role)) return false;
    if (path == '/dashboard') return true;
    if (path.startsWith('/admin')) return true;
    return false;
  }

  /// Nav items matching port 8077 reference: Home, Explore, Orders, Business (orange).
  List<_NavItem> _navItems(NeighborlyApiService api) {
    final role = api.user?.role;
    if (_isAdminRole(role)) {
      return const [
        _NavItem('Admin', '/dashboard', LucideIcons.layoutDashboard),
        _NavItem('Explorer', '/home', LucideIcons.compass),
        _NavItem('Account', '/profile', LucideIcons.user),
      ];
    }
    if (role == 'provider') {
      return const [
        _NavItem('Home', '/', LucideIcons.home),
        _NavItem('Explorer', '/home', LucideIcons.compass),
        _NavItem('Services', '/my-orders', LucideIcons.shoppingBag),
        _NavItem('My Business', '/provider/dashboard', LucideIcons.building2),
      ];
    }
    // Customer nav matching Layout.tsx: Home, Explore, Orders, Business
    return const [
      _NavItem('Home', '/', LucideIcons.home),
      _NavItem('Explore', '/home', LucideIcons.search),
      _NavItem('Orders', '/my-orders', LucideIcons.clock),
      _NavItem('Business', '/dashboard', LucideIcons.briefcase, isBusiness: true),
    ];
  }

  void _go(String path) {
    neighborlyNavigatorKey.currentState?.pushNamedAndRemoveUntil(path, (r) => false);
  }

  @override
  Widget build(BuildContext context) {
    final child = widget.child;
    // MaterialApp.builder can pass a null [child] on the first frame (or during
    // navigator rebuild). Returning [SizedBox.shrink] here made the whole app
    // an empty box → blank "white" screen in the browser.
    if (child == null) {
      final cs = Theme.of(context).colorScheme;
      return Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        body: Center(
          child: CircularProgressIndicator(color: cs.primary),
        ),
      );
    }

    return ListenableBuilder(
      listenable: neighborlyRoutePathNotifier,
      builder: (context, _) => _buildShell(context, child),
    );
  }

  Widget _buildShell(BuildContext context, Widget child) {
    final api = context.watch<NeighborlyApiService>();
    final themeNotifier = context.watch<NeighborlyThemeNotifier>();
    final cs = Theme.of(context).colorScheme;
    final path = neighborlyRoutePathNotifier.value;
    final w = MediaQuery.sizeOf(context).width;
    final wide = w >= 900;
    final user = api.user;
    final nav = _navItems(api);
    final isCustomer = user?.role == 'customer';

    final showBottom = w < 768;

    return Scaffold(
      key: _scaffoldKey,
      extendBody: showBottom,
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      // Drawer (left) for unauthenticated users on mobile
      drawer: (!wide && user == null)
          ? _buildGuestDrawer(context, nav)
          : null,
      // End drawer (right) for authenticated users — matches Layout.tsx slide-in menu
      endDrawer: user != null
          ? _buildAuthDrawer(context, api, nav, user)
          : null,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _HeaderBar(
            wide: wide,
            hideCompactEntryControls: showBottom,
            path: path,
            nav: nav,
            user: user,
            unreadNotificationsCount: api.unreadNotificationsCount,
            isDark: themeNotifier.isDark,
            onTheme: themeNotifier.toggleTheme,
            onNotifications: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const NotificationsScreen()),
              );
            },
            onLogo: () => _go('/'),
            onMenu: () {
              if (user != null) {
                _scaffoldKey.currentState?.openEndDrawer();
              } else {
                _scaffoldKey.currentState?.openDrawer();
              }
            },
            onAccountMenu: () => _scaffoldKey.currentState?.openEndDrawer(),
            onAuth: () => neighborlyNavigatorKey.currentState?.pushNamed('/auth'),
            onLogout: () async {
              await api.logout();
              if (context.mounted) _go('/');
            },
            onNavTap: _navTap,
          ),
          Expanded(
              child: MediaQuery(
              data: MediaQuery.of(context).copyWith(
                padding: MediaQuery.of(context).padding.copyWith(
                  bottom: showBottom
                      ? (isCustomer ? 72 : 46) + MediaQuery.viewPaddingOf(context).bottom
                      : null,
                ),
              ),
              child: child,
            ),
          ),
          if (w >= 768)
            _useCompactFooterForPath(path, user)
                ? _footerCompact(cs)
                : _footer(cs),
        ],
      ),
      bottomNavigationBar: showBottom
          ? (isCustomer ? _customerMobileBottomNav(context, api, path) : _mobileBottomNav(context, api, path))
          : null,
    );
  }

  /// Guest drawer (left side) — simple menu for unauthenticated users.
  Widget _buildGuestDrawer(BuildContext context, List<_NavItem> nav) {
    return Drawer(
      backgroundColor: _kBgDark,
      child: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text('MENU', style: GoogleFonts.inter(fontWeight: FontWeight.w900, fontStyle: FontStyle.italic, fontSize: 22, color: _kTextPrimary)),
            const SizedBox(height: 20),
            ...nav.map((e) => ListTile(
                  leading: Icon(e.icon, color: _kTextSecondary),
                  title: Text(e.label, style: GoogleFonts.inter(fontWeight: FontWeight.w700, color: _kTextPrimary)),
                  onTap: () {
                    Navigator.pop(context);
                    _navTap(e.path);
                  },
                )),
          ],
        ),
      ),
    );
  }

  /// Auth drawer (right side) — matches Layout.tsx slide-in menu with Navigation, Events Hub, Profile & Business sections.
  Widget _buildAuthDrawer(BuildContext context, NeighborlyApiService api, List<_NavItem> nav, UserModel user) {
    final eventItems = <_DrawerLink>[
      const _DrawerLink('Alerts', LucideIcons.bell, '/notifications'),
      const _DrawerLink('Tickets', LucideIcons.headphones, '/tickets'),
    ];

    final profileItems = <_DrawerLink>[
      const _DrawerLink('Account', LucideIcons.user, '/account'),
      const _DrawerLink('My Profile', LucideIcons.user, '/profile'),
      const _DrawerLink('My Requests', LucideIcons.clipboardList, '/dashboard?tab=requests'),
      const _DrawerLink('Spending', LucideIcons.dollarSign, '/dashboard?tab=finance'),
    ];

    return Drawer(
      width: 320,
      backgroundColor: _kBgDark,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header: "Menu" title + close button
            Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Menu', style: GoogleFonts.inter(fontWeight: FontWeight.w900, fontStyle: FontStyle.italic, fontSize: 22, color: _kTextPrimary)),
                  Container(
                    decoration: BoxDecoration(
                      color: _kCardBg,
                      borderRadius: BorderRadius.circular(100),
                      border: Border.all(color: _kBorderColor),
                    ),
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: () => Navigator.pop(context),
                        borderRadius: BorderRadius.circular(100),
                        child: const Padding(
                          padding: EdgeInsets.all(8),
                          child: Icon(LucideIcons.x, color: _kTextPrimary, size: 24),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // Navigation section
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                children: [
                  // Navigation section
                  Padding(
                    padding: const EdgeInsets.only(left: 8, bottom: 12),
                    child: Text('NAVIGATION', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1.5, color: _kTextSecondary)),
                  ),
                  ...nav.map((e) => _drawerNavTile(context, e)),
                  const SizedBox(height: 24),
                  // Events Hub section
                  Container(height: 1, color: _kBorderColor),
                  const SizedBox(height: 24),
                  Padding(
                    padding: const EdgeInsets.only(left: 8, bottom: 12),
                    child: Text('EVENTS HUB', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1.5, color: _kTextSecondary)),
                  ),
                  ...eventItems.map((e) => _drawerLinkTile(context, e)),
                  const SizedBox(height: 24),
                  // Profile & Business section
                  Container(height: 1, color: _kBorderColor),
                  const SizedBox(height: 24),
                  Padding(
                    padding: const EdgeInsets.only(left: 8, bottom: 12),
                    child: Text('PROFILE & BUSINESS', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1.5, color: _kTextSecondary)),
                  ),
                  ...profileItems.map((e) => _drawerLinkTile(context, e)),
                ],
              ),
            ),
            // Sign Out button
            Padding(
              padding: const EdgeInsets.all(20),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () async {
                    Navigator.pop(context);
                    await api.logout();
                    if (context.mounted) _go('/');
                  },
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    decoration: BoxDecoration(
                      color: Colors.red.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(LucideIcons.logOut, color: Colors.redAccent, size: 20),
                        const SizedBox(width: 8),
                        Text('Sign Out', style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.5,
                          color: Colors.redAccent,
                        )),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _drawerNavTile(BuildContext context, _NavItem e) {
    final active = _shellNavActive(neighborlyRoutePathNotifier.value, e);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            Navigator.pop(context);
            _navTap(e.path);
          },
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
            decoration: BoxDecoration(
              color: active ? _kPrimaryBlue.withValues(alpha: 0.15) : Colors.transparent,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: active ? _kPrimaryBlue.withValues(alpha: 0.3) : Colors.transparent,
              ),
            ),
            child: Row(
              children: [
                Icon(e.icon, size: 20, color: active ? _kPrimaryBlue : _kTextSecondary),
                const SizedBox(width: 12),
                Text(e.label, style: GoogleFonts.inter(
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                  color: active ? _kPrimaryBlue : _kTextPrimary,
                )),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _drawerLinkTile(BuildContext context, _DrawerLink e) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            Navigator.pop(context);
            _navTap(e.path);
          },
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                Icon(e.icon, size: 20, color: _kTextSecondary),
                const SizedBox(width: 12),
                Text(e.label, style: GoogleFonts.inter(
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                  color: _kTextPrimary,
                )),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _sideTile(BuildContext context, _NavItem e) {
    return ListTile(
      leading: Icon(e.icon),
      title: Text(e.label, style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
      onTap: () {
        Navigator.pop(context);
        _navTap(e.path);
      },
    );
  }

  void _navTap(String path) {
    var normalized = path;
    if (normalized.contains('?')) normalized = normalized.split('?').first;
    final api = context.read<NeighborlyApiService>();

    switch (normalized) {
      case '/notifications':
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const NotificationsScreen()),
        );
        return;
      case '/tickets':
        // Tickets are now integrated into the Notifications screen (Admin tab)
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const NotificationsScreen()),
        );
        return;
      case '/services':
        _go('/home');
        return;
      default:
        if (api.user == null && _pathRequiresSignIn(normalized)) {
          neighborlyNavigatorKey.currentState?.pushNamed('/auth');
          return;
        }
        _go(normalized.isEmpty ? '/' : normalized);
    }
  }

  /// Home (`/`) and Explorer (`/home`) stay public; account/profile require a session.
  static bool _pathRequiresSignIn(String path) {
    const gated = {
      '/profile',
      '/account',
      '/dashboard',
      '/orders',
      '/provider/account',
      '/provider/orders',
      '/provider/notifications',
      '/provider/settings',
    };
    return gated.contains(path);
  }

  /// Mobile bottom nav for customers — matches Layout.tsx full-width bar with orange for Business, blue for active, dot indicator.
  Widget _customerMobileBottomNav(
    BuildContext context,
    NeighborlyApiService api,
    String path,
  ) {
    final nav = _navItems(api);

    return Container(
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: _kBorderColor)),
        color: _kBgDark,
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.only(top: 10, bottom: 4),
          child: Row(
            children: [
              for (final item in nav)
                Expanded(
                  child: _MobileBottomNavCell(
                    item: item,
                    active: _shellNavActive(path, item),
                    onTap: () => _navTap(item.path),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  /// Generic mobile bottom nav for non-customer roles.
  Widget _mobileBottomNav(
    BuildContext context,
    NeighborlyApiService api,
    String path,
  ) {
    final nav = _navItems(api);
    final viewportWidth = MediaQuery.sizeOf(context).width;
    final barWidth = (viewportWidth * 0.7).clamp(250.0, 560.0);
    const glassTint = Color(0xFF1A1D2E);
    const borderColor = Color(0xFF2A2F4A);

    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 0, 8, 4),
      child: SafeArea(
        top: false,
        child: Align(
          alignment: Alignment.bottomCenter,
          child: SizedBox(
            width: barWidth,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(24),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: glassTint.withValues(alpha: 0.88),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: borderColor.withValues(alpha: 0.95), width: 1),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.08),
                        blurRadius: 10,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Material(
                    type: MaterialType.transparency,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 2),
                      child: Row(
                        children: [
                          for (final item in nav)
                            Expanded(
                              child: _shellNavCell(context, path, item),
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _shellNavCell(
    BuildContext context,
    String path,
    _NavItem item,
  ) {
    final active = _shellNavActive(path, item);
    return _GlassNavCell(
      item: item,
      active: active,
      onTap: () => _navTap(item.path),
    );
  }

  /// Slim strip for admin dashboard so content keeps the viewport.
  Widget _footerCompact(ColorScheme cs) {
    return Container(
      decoration: BoxDecoration(
        color: cs.surface,
        border: Border(top: BorderSide(color: cs.outline)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Center(
        child: Text(
          '© 2026 Neighborly Inc.',
          style: GoogleFonts.inter(fontSize: 11, color: cs.secondary),
        ),
      ),
    );
  }

  Widget _footer(ColorScheme cs) {
    return Container(
      decoration: BoxDecoration(
        color: cs.surface,
        border: Border(top: BorderSide(color: cs.outline)),
      ),
      padding: const EdgeInsets.fromLTRB(24, 40, 24, 32),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1120),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const _LogoMark(),
                  const SizedBox(width: 8),
                  Text('NEIGHBORLY', style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontStyle: FontStyle.italic, fontSize: 18)),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                'Connecting neighbors with trusted local service providers.',
                style: GoogleFonts.inter(color: cs.secondary, fontSize: 14, height: 1.5),
              ),
              const SizedBox(height: 24),
              Divider(color: cs.outline),
              const SizedBox(height: 16),
              Text('© 2026 Neighborly Inc. All rights reserved.', style: GoogleFonts.inter(fontSize: 12, color: cs.secondary)),
            ],
          ),
        ),
      ),
    );
  }
}

bool _shellNavActive(String rawPath, _NavItem item) {
  var p = rawPath;
  if (p.contains('?')) p = p.split('?').first;
  if (p.isEmpty) p = '/';
  if (p == '/auth' || p == '/login') {
    return item.path == '/profile' || item.path == '/provider/account';
  }
  if (item.path == '/profile') {
    return p == '/profile' || p == '/account';
  }
  if (item.path == '/provider/account') {
    return p == '/provider/account' ||
        p == '/provider/notifications' ||
        p == '/provider/settings';
  }
  if (item.path == '/provider/dashboard') {
    return p == '/provider/dashboard' ||
        p == '/workspace/packages' ||
        p == '/workspace/inventory' ||
        p == '/workspace/company';
  }
  if (item.path == '/dashboard') {
    return p == '/dashboard' || p.startsWith('/admin');
  }
  if (item.path == '/orders') {
    return p == '/orders' ||
        p.startsWith('/orders/') ||
        p == '/provider/orders';
  }
  if (item.path == '/') return p == '/' || p == '/customer-home';
  if (item.path == '/home') return p == '/home' || p.startsWith('/service/');
  if (item.path == '/my-orders') return p == '/my-orders' || p.startsWith('/my-orders/');
  return p == item.path;
}

/// Mobile bottom nav cell — matches Layout.tsx full-width bar style.
class _MobileBottomNavCell extends StatelessWidget {
  const _MobileBottomNavCell({
    required this.item,
    required this.active,
    required this.onTap,
  });

  final _NavItem item;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isBusiness = item.isBusiness;
    final activeColor = isBusiness ? _kBusinessOrange : _kPrimaryBlue;
    const inactiveColor = Color(0xFF4A4F70);
    final textColor = isBusiness
        ? _kBusinessOrange
        : (active ? _kPrimaryBlue : inactiveColor);

    return Semantics(
      label: '${item.label} tab',
      button: true,
      selected: active,
      child: GestureDetector(
        onTap: onTap,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              item.icon,
              size: 22,
              color: isBusiness ? _kBusinessOrange : (active ? _kPrimaryBlue : inactiveColor),
            ),
            const SizedBox(height: 4),
            Text(
              item.label,
              style: GoogleFonts.inter(
                fontSize: 10,
                fontWeight: FontWeight.w500,
                color: textColor,
              ),
            ),
            if (active && !isBusiness)
              Container(
                margin: const EdgeInsets.only(top: 3),
                width: 4,
                height: 4,
                decoration: const BoxDecoration(
                  color: _kPrimaryBlue,
                  shape: BoxShape.circle,
                ),
              )
            else
              const SizedBox(height: 7),
          ],
        ),
      ),
    );
  }
}

class _CustomerPillNavCell extends StatelessWidget {
  const _CustomerPillNavCell({
    required this.item,
    required this.active,
    required this.hasNotificationDot,
    required this.onTap,
  });

  final _NavItem item;
  final bool active;
  final bool hasNotificationDot;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final onPrimary = AccountHubStyle.primaryText(context);
    final secondary = AccountHubStyle.secondaryText(context);
    final pill = AccountHubStyle.bottomBarActivePill(context);
    final blue = AccountHubStyle.accentBlue(context);

    return Semantics(
      label: '${item.label} tab',
      button: true,
      selected: active,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 2),
        child: Material(
          color: Colors.transparent,
          clipBehavior: Clip.hardEdge,
          borderRadius: BorderRadius.circular(22),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(22),
            splashColor: blue.withValues(alpha: 0.12),
            highlightColor: blue.withValues(alpha: 0.06),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              curve: Curves.easeOutCubic,
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
              decoration: BoxDecoration(
                color: active ? pill : Colors.transparent,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Icon(
                        item.icon,
                        size: 24,
                        color: active ? onPrimary : secondary,
                      ),
                      if (hasNotificationDot)
                        Positioned(
                          right: -2,
                          top: -2,
                          child: Container(
                            width: 7,
                            height: 7,
                            decoration: BoxDecoration(color: blue, shape: BoxShape.circle),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      item.label,
                      maxLines: 1,
                      style: AccountHubTypography.navPillLabel(
                        active ? onPrimary : secondary,
                        active: active,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _GlassNavCell extends StatelessWidget {
  const _GlassNavCell({
    required this.item,
    required this.active,
    required this.onTap,
  });

  final _NavItem item;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Semantics(
      label: '${item.label} tab',
      button: true,
      selected: active,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 2),
        child: Material(
          color: Colors.transparent,
          clipBehavior: Clip.hardEdge,
          borderRadius: BorderRadius.circular(16),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(14),
            splashColor: active ? Colors.transparent : cs.primary.withValues(alpha: 0.14),
            highlightColor: active ? Colors.transparent : cs.primary.withValues(alpha: 0.08),
            hoverColor: active ? Colors.transparent : cs.primary.withValues(alpha: 0.06),
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 30),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 0.5),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  curve: Curves.easeOutCubic,
                  decoration: BoxDecoration(
                    color: active ? cs.primary : Colors.transparent,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        item.icon,
                        size: 16,
                        color: active ? cs.onPrimary : cs.secondary,
                      ),
                      const SizedBox(height: 0.5),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 1),
                        child: FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text(
                            item.label,
                            maxLines: 1,
                            style: GoogleFonts.inter(
                              fontSize: 8,
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.1,
                              color: active ? cs.onPrimary : cs.secondary,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _NavItem {
  const _NavItem(this.label, this.path, this.icon, {this.isBusiness = false});
  final String label;
  final String path;
  final IconData icon;
  final bool isBusiness;
}

/// Helper data class for drawer link items.
class _DrawerLink {
  const _DrawerLink(this.label, this.icon, this.path);
  final String label;
  final IconData icon;
  final String path;
}

/// Header sits in [NeighborlyShell] *above* the [Navigator] subtree, so there is
/// no [Overlay] ancestor. Avoid [IconButton] / [ButtonStyleButton] here: Material 3
/// may insert [Tooltip] → [RawTooltip], which asserts without an overlay.
class _HeaderTapIcon extends StatelessWidget {
  const _HeaderTapIcon({
    required this.onPressed,
    required this.icon,
    this.semanticLabel,
  });

  final VoidCallback onPressed;
  final Icon icon;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final tap = Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(22),
        child: SizedBox(
          width: 52,
          height: 52,
          child: Center(child: icon),
        ),
      ),
    );
    return Semantics(
      label: semanticLabel,
      button: true,
      child: tap,
    );
  }
}

/// Desktop nav link — matches Layout.tsx style: uppercase, letter-spacing, orange for Business, blue for active.
class _DesktopNavLink extends StatelessWidget {
  const _DesktopNavLink({
    required this.label,
    required this.isActive,
    required this.isBusiness,
    required this.onTap,
  });

  final String label;
  final bool isActive;
  final bool isBusiness;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    Color textColor;
    if (isBusiness) {
      textColor = isActive ? const Color(0xFFFF9A5F) : const Color(0xFFFF7A2B);
    } else if (isActive) {
      textColor = _kPrimaryBlue;
    } else {
      textColor = const Color(0xFF8B90B0);
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(8),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
            child: Text(
              label.toUpperCase(),
              style: GoogleFonts.inter(
                fontSize: 10,
                fontWeight: FontWeight.w900,
                letterSpacing: 2,
                color: textColor,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Header bar matching Layout.tsx exactly:
/// - NeighborHub logo (Home icon in blue box + "NeighborHub" + "Canada local app")
/// - Desktop nav items with uppercase, letter-spacing, orange for Business, blue for active
/// - Notification bell with red dot
/// - Avatar/sign-in button
class _HeaderBar extends StatelessWidget {
  const _HeaderBar({
    required this.wide,
    required this.hideCompactEntryControls,
    required this.path,
    required this.nav,
    required this.user,
    required this.unreadNotificationsCount,
    required this.isDark,
    required this.onTheme,
    required this.onNotifications,
    required this.onLogo,
    required this.onMenu,
    required this.onAccountMenu,
    required this.onAuth,
    required this.onLogout,
    required this.onNavTap,
  });

  final bool wide;
  final bool hideCompactEntryControls;
  final String path;
  final List<_NavItem> nav;
  final UserModel? user;
  final int unreadNotificationsCount;
  final bool isDark;
  final VoidCallback onTheme;
  final VoidCallback onNotifications;
  final VoidCallback onLogo;
  final VoidCallback onMenu;
  final VoidCallback onAccountMenu;
  final VoidCallback onAuth;
  final VoidCallback onLogout;
  final void Function(String path) onNavTap;

  @override
  Widget build(BuildContext context) {
    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
        child: Container(
          decoration: const BoxDecoration(
            color: Color(0xFF0D0F1A),
            border: Border(bottom: BorderSide(color: _kBorderColor)),
          ),
          child: SafeArea(
            bottom: false,
            child: SizedBox(
              height: 64,
              child: Row(
                children: [
                  // Mobile: hamburger menu
                  if (!wide && !hideCompactEntryControls)
                    _HeaderTapIcon(
                      onPressed: onMenu,
                      semanticLabel: 'Open menu',
                      icon: const Icon(LucideIcons.menu, color: _kTextSecondary),
                    ),
                  // Logo: Home icon in blue box + "NeighborHub" + "Canada local app"
                  InkWell(
                    onTap: onLogo,
                    borderRadius: BorderRadius.circular(12),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Home icon in blue box — matches Layout.tsx
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: _kPrimaryBlue.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: _kPrimaryBlue.withValues(alpha: 0.3)),
                            ),
                            child: const Icon(LucideIcons.home, size: 20, color: _kPrimaryBlue),
                          ),
                          const SizedBox(width: 8),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                'NeighborHub',
                                style: GoogleFonts.inter(
                                  fontWeight: FontWeight.w900,
                                  fontStyle: FontStyle.italic,
                                  fontSize: 14,
                                  color: _kTextPrimary,
                                ),
                              ),
                              Text(
                                'Canada local app',
                                style: GoogleFonts.inter(
                                  fontSize: 8,
                                  fontWeight: FontWeight.w500,
                                  color: _kTextSecondary,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  // Desktop nav items (wide only)
                  if (wide) ...[
                    const SizedBox(width: 8),
                    Expanded(
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          for (final item in nav)
                            _DesktopNavLink(
                              label: item.label,
                              isActive: _shellNavActive(path, item),
                              isBusiness: item.isBusiness,
                              onTap: () => onNavTap(item.path),
                            ),
                        ],
                      ),
                    ),
                  ],
                  const Spacer(),
                  // Right side: notification bell + avatar/sign-in
                  if (user != null) ...[
                    // Notification bell with red dot
                    Stack(
                      children: [
                        _HeaderTapIcon(
                          onPressed: onNotifications,
                          semanticLabel: 'Notifications',
                          icon: const Icon(LucideIcons.bell, color: _kTextSecondary),
                        ),
                        if (unreadNotificationsCount > 0)
                          Positioned(
                            right: 8,
                            top: 8,
                            child: Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                color: Colors.redAccent,
                                shape: BoxShape.circle,
                              ),
                            ),
                          ),
                      ],
                    ),
                    // Avatar — wrapped in GestureDetector (not _HeaderTapIcon, which expects Icon)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: GestureDetector(
                        onTap: onAccountMenu,
                        child: CircleAvatar(
                          radius: 16,
                          backgroundColor: _kPrimaryBlue.withValues(alpha: 0.2),
                          child: Text(
                            _avatarInitials(user),
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: _kPrimaryBlue,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ] else ...[
                    // Sign In button — matches Layout.tsx
                    Padding(
                      padding: const EdgeInsets.only(right: 12),
                      child: Material(
                        color: Colors.transparent,
                        child: InkWell(
                          onTap: onAuth,
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            decoration: BoxDecoration(
                              color: _kPrimaryBlue.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: _kPrimaryBlue.withValues(alpha: 0.3)),
                            ),
                            child: Text(
                              'SIGN IN',
                              style: GoogleFonts.inter(
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 2,
                                color: _kPrimaryBlue,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  /// Returns the first character of the user's display name or email for the avatar.
  String _avatarInitials(UserModel? user) {
    if (user == null) return '?';
    final name = user.displayName;
    if (name.isNotEmpty) return name.substring(0, 1).toUpperCase();
    final email = user.email;
    if (email.isNotEmpty) return email.substring(0, 1).toUpperCase();
    return '?';
  }
}

/// Logo mark used in footer — matches Layout.tsx style.
class _LogoMark extends StatelessWidget {
  const _LogoMark();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        color: _kPrimaryBlue.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _kPrimaryBlue.withValues(alpha: 0.3)),
      ),
      child: const Icon(LucideIcons.home, size: 20, color: _kPrimaryBlue),
    );
  }
}
