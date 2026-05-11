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

  List<_NavItem> _navItems(NeighborlyApiService api) {
    final role = api.user?.role;
    if (_isAdminRole(role)) {
      return const [
        _NavItem('Admin', '/dashboard', LucideIcons.layoutDashboard),
        _NavItem('AI', '/ai', LucideIcons.sparkles),
        _NavItem('Explorer', '/home', LucideIcons.compass),
        _NavItem('Profile', '/profile', LucideIcons.user),
      ];
    }
    if (role == 'provider') {
      return const [
        _NavItem('Home', '/dashboard', LucideIcons.home),
        _NavItem('Orders', '/orders', LucideIcons.clipboardList),
        _NavItem('AI', '/ai', LucideIcons.sparkles),
        _NavItem('Explorer', '/home', LucideIcons.compass),
        _NavItem('Account', '/provider/account', LucideIcons.user),
      ];
    }
    return const [
      _NavItem('Home', '/', LucideIcons.home),
      _NavItem('AI', '/ai', LucideIcons.sparkles),
      _NavItem('Explorer', '/home', LucideIcons.compass),
      _NavItem('Account', '/profile', LucideIcons.user),
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
      drawer: (!wide && user == null)
          ? Drawer(
              backgroundColor: cs.surface,
              child: SafeArea(
                child: ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    Text('MENU', style: GoogleFonts.inter(fontWeight: FontWeight.w900, fontStyle: FontStyle.italic, fontSize: 22)),
                    const SizedBox(height: 20),
                    ...nav.map((e) => ListTile(
                          leading: Icon(e.icon, color: cs.onSurface),
                          title: Text(e.label, style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
                          onTap: () {
                            Navigator.pop(context);
                            _navTap(e.path);
                          },
                        )),
                  ],
                ),
              ),
            )
          : null,
      endDrawer: user != null
          ? Drawer(
              width: 320,
              backgroundColor: cs.surface,
              child: SafeArea(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(20),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('MENU', style: GoogleFonts.inter(fontWeight: FontWeight.w900, fontStyle: FontStyle.italic, fontSize: 22)),
                          IconButton(icon: const Icon(LucideIcons.x), onPressed: () => Navigator.pop(context)),
                        ],
                      ),
                    ),
                    Expanded(
                      child: ListView(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        children: [
                          Text('NAVIGATION', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900, color: cs.secondary)),
                          ...nav.map((e) => _sideTile(context, e)),
                          const Divider(height: 32),
                          Text('EVENTS HUB', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900, color: cs.secondary)),
                          ListTile(
                            leading: const Icon(LucideIcons.bell),
                            title: const Text('Messages & Alerts'),
                            onTap: () {
                              Navigator.pop(context);
                              Navigator.of(context).push(
                                MaterialPageRoute(builder: (_) => const NotificationsScreen()),
                              );
                            },
                          ),
                          ListTile(
                            leading: const Icon(LucideIcons.headphones),
                            title: const Text('Support'),
                            onTap: () {
                              Navigator.pop(context);
                              Navigator.of(context).push(
                                MaterialPageRoute(builder: (_) => const NotificationsScreen()),
                              );
                            },
                          ),
                          const Divider(height: 32),
                          ListTile(
                            leading: const Icon(LucideIcons.logOut, color: Colors.red),
                            title: Text('Sign out', style: GoogleFonts.inter(color: Colors.red, fontWeight: FontWeight.w800)),
                            onTap: () async {
                              Navigator.pop(context);
                              await api.logout();
                              if (context.mounted) _go('/');
                            },
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            )
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

  /// Home (`/`) and Explorer (`/home`) stay public; AI + account/profile require a session.
  static bool _pathRequiresSignIn(String path) {
    const gated = {
      '/ai',
      '/ai-consultant',
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

  Widget _customerMobileBottomNav(
    BuildContext context,
    NeighborlyApiService api,
    String path,
  ) {
    final nav = _navItems(api);
    final viewportWidth = MediaQuery.sizeOf(context).width;
    final barWidth = (viewportWidth - 32).clamp(280.0, 560.0);
    final fill = AccountHubStyle.bottomBarFill(context);
    final shadow = AccountHubStyle.bottomBarShadow(context);
    final outline = AccountHubStyle.secondaryText(context).withValues(alpha: 0.14);

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: SafeArea(
        top: false,
        child: Align(
          alignment: Alignment.bottomCenter,
          child: SizedBox(
            width: barWidth,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: fill,
                borderRadius: BorderRadius.circular(36),
                border: Border.all(color: outline, width: 1),
                boxShadow: [
                  BoxShadow(
                    color: shadow,
                    blurRadius: 18,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Material(
                color: Colors.transparent,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
                  child: Row(
                    children: [
                      for (final item in nav)
                        Expanded(
                          child: _CustomerPillNavCell(
                            item: item,
                            active: _shellNavActive(path, item),
                            hasNotificationDot: item.path == '/profile' && api.unreadNotificationsCount > 0,
                            onTap: () => _navTap(item.path),
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
                    color: glassTint.withOpacity(0.88),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: borderColor.withOpacity(0.95), width: 1),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.08),
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
                  _LogoMark(),
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
    return item.path == '/profile';
  }
  if (item.path == '/profile') {
    return p == '/profile' || p == '/account';
  }
  if (item.path == '/provider/account') {
    return p == '/provider/account' ||
        p == '/provider/notifications' ||
        p == '/provider/settings';
  }
  if (item.path == '/orders') {
    return p == '/orders' ||
        p.startsWith('/orders/') ||
        p == '/provider/orders';
  }
  if (item.path == '/') return p == '/';
  return p == item.path;
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
  const _NavItem(this.label, this.path, this.icon);
  final String label;
  final String path;
  final IconData icon;
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
    final cs = Theme.of(context).colorScheme;
    return Material(
      color: cs.surface.withValues(alpha: 0.88),
      elevation: 0,
      child: Container(
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: cs.outline)),
        ),
        child: SafeArea(
          bottom: false,
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 1120),
              child: SizedBox(
                height: 56,
                child: Row(
                  children: [
                    if (!wide && !hideCompactEntryControls)
                      _HeaderTapIcon(
                        onPressed: onMenu,
                        semanticLabel: 'Open menu',
                        icon: const Icon(LucideIcons.menu),
                      ),
                    InkWell(
                      onTap: onLogo,
                      borderRadius: BorderRadius.circular(12),
                      child: Row(
                        children: [
                          _LogoMark(),
                          const SizedBox(width: 8),
                          Text(
                            'Neighborly',
                            style: GoogleFonts.inter(
                              fontWeight: FontWeight.w800,
                              fontStyle: FontStyle.italic,
                              fontSize: 18,
                              letterSpacing: -0.5,
                              color: cs.onSurface,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Spacer(),
                    if (wide)
                      Row(
                        children: [
                          for (final e in nav) ...[
                            TextButton(
                              onPressed: () => onNavTap(e.path),
                              child: Text(
                                e.label.toUpperCase(),
                                style: GoogleFonts.inter(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 2,
                                  color: _shellNavActive(path, e) ? cs.onSurface : cs.secondary,
                                ),
                              ),
                            ),
                            const SizedBox(width: 4),
                          ],
                        ],
                      ),
                    if (wide)
                      _HeaderTapIcon(
                        onPressed: onTheme,
                        semanticLabel: isDark ? 'Switch to light mode' : 'Switch to dark mode',
                        icon: Icon(
                          isDark ? Icons.light_mode : Icons.dark_mode,
                          color: cs.secondary,
                        ),
                      ),
                    if (user != null && wide) ...[
                      Stack(
                        clipBehavior: Clip.none,
                        children: [
                          _HeaderTapIcon(
                            onPressed: onAccountMenu,
                            semanticLabel: 'Account menu',
                            icon: const Icon(LucideIcons.menu),
                          ),
                          Positioned(
                            right: 8,
                            top: 8,
                            child: Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(color: Colors.redAccent, shape: BoxShape.circle),
                            ),
                          ),
                        ],
                      ),
                      _HeaderTapIcon(
                        onPressed: onLogout,
                        semanticLabel: 'Sign out',
                        icon: Icon(LucideIcons.logOut, color: cs.secondary),
                      ),
                    ] else if (user != null && !wide)
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          _HeaderTapIcon(
                            onPressed: onTheme,
                            semanticLabel: isDark ? 'Switch to light mode' : 'Switch to dark mode',
                            icon: Icon(
                              isDark ? Icons.light_mode : Icons.dark_mode,
                              color: cs.secondary,
                            ),
                          ),
                          Semantics(
                            label: unreadNotificationsCount > 0
                                ? 'Notifications, $unreadNotificationsCount unread'
                                : 'Notifications',
                            button: true,
                            child: Material(
                              color: Colors.transparent,
                              child: InkWell(
                                onTap: onNotifications,
                                borderRadius: BorderRadius.circular(26),
                                child: SizedBox(
                                  width: 52,
                                  height: 52,
                                  child: Stack(
                                    alignment: Alignment.center,
                                    clipBehavior: Clip.none,
                                    children: [
                                      Icon(LucideIcons.bell, color: cs.onSurface, size: 22),
                                      if (unreadNotificationsCount > 0)
                                        Positioned(
                                          right: 6,
                                          top: 6,
                                          child: Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: cs.primary,
                                              borderRadius: BorderRadius.circular(100),
                                            ),
                                            constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                                            child: Text(
                                              unreadNotificationsCount > 99 ? '99+' : '$unreadNotificationsCount',
                                              textAlign: TextAlign.center,
                                              style: GoogleFonts.inter(
                                                fontSize: 10,
                                                fontWeight: FontWeight.w800,
                                                color: cs.onPrimary,
                                                height: 1.1,
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
                        ],
                      )
                    else if (!hideCompactEntryControls)
                      FilledButton(
                        onPressed: onAuth,
                        child: Text('Get Started', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
                      )
                    else
                      const SizedBox.shrink(),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

}

class _LogoMark extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        color: cs.brightness == Brightness.dark ? Colors.white : const Color(0xFF171717),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Center(
        child: Transform.rotate(
          angle: 0.785398,
          child: Container(
            width: 14,
            height: 14,
            decoration: BoxDecoration(
              color: cs.brightness == Brightness.dark ? const Color(0xFF171717) : Colors.white,
              borderRadius: BorderRadius.circular(3),
            ),
          ),
        ),
      ),
    );
  }
}
