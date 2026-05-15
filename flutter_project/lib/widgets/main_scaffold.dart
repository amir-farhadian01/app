import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/app_theme.dart';
import '../screens/home_screen.dart';
import '../screens/social_screen.dart';
import '../screens/business_dashboard_screen.dart';

/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Main Scaffold — Bottom Navigation (mobile) / NavigationRail (desktop)
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// 4 tabs: Home, Social, Account, Business
/// Uses IndexedStack to preserve tab state.
/// Responsive: NavigationRail for widths > 800px, BottomNavigationBar otherwise.
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class MainScaffold extends StatefulWidget {
  const MainScaffold({super.key});

  @override
  State<MainScaffold> createState() => _MainScaffoldState();
}

class _MainScaffoldState extends State<MainScaffold> {
  int _currentIndex = 0;

  static final List<Widget> _screens = [
    const HomeScreen(),
    const SocialScreen(),
    const _AccountPlaceholder(),
    const BusinessDashboardScreen(),
  ];

  static const List<_NavItem> _navItems = [
    _NavItem('Home', Icons.home_outlined, Icons.home),
    _NavItem('Social', Icons.explore_outlined, Icons.explore),
    _NavItem('Account', Icons.person_outline, Icons.person),
    _NavItem('Business', Icons.business_outlined, Icons.business),
  ];

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth > 800;
        if (isWide) {
          return _buildDesktopLayout();
        }
        return _buildMobileLayout();
      },
    );
  }

  // ── Desktop Layout (NavigationRail) ───────────────────────────────

  Widget _buildDesktopLayout() {
    return Scaffold(
      backgroundColor: NeighborlyColors.bgPrimary,
      body: SafeArea(
        child: Row(
          children: [
            NavigationRail(
              backgroundColor: NeighborlyColors.bgCard,
              selectedIndex: _currentIndex,
              onDestinationSelected: (index) {
                setState(() => _currentIndex = index);
              },
              labelType: NavigationRailLabelType.all,
              selectedIconTheme: const IconThemeData(
                color: NeighborlyColors.accent,
              ),
              unselectedIconTheme: const IconThemeData(
                color: NeighborlyColors.textSecondary,
              ),
              selectedLabelTextStyle: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: NeighborlyColors.accent,
              ),
              unselectedLabelTextStyle: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: NeighborlyColors.textSecondary,
              ),
              minWidth: 72,
              leading: Padding(
                padding: const EdgeInsets.only(top: 16, bottom: 8),
                child: Column(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: NeighborlyColors.accent.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Center(
                        child: Text('🏘️', style: TextStyle(fontSize: 20)),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Hub',
                      style: GoogleFonts.inter(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: NeighborlyColors.accent,
                      ),
                    ),
                  ],
                ),
              ),
              destinations: _navItems
                  .map((item) => NavigationRailDestination(
                        icon: Icon(item.icon),
                        selectedIcon: Icon(item.activeIcon),
                        label: Text(item.label),
                      ))
                  .toList(),
            ),
            const VerticalDivider(width: 1, color: NeighborlyColors.textFaint),
            // Content
            Expanded(
              child: IndexedStack(
                index: _currentIndex,
                children: _screens,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Mobile Layout (BottomNavigationBar) ───────────────────────────

  Widget _buildMobileLayout() {
    return Scaffold(
      backgroundColor: NeighborlyColors.bgPrimary,
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          border: Border(
            top: BorderSide(
              color: NeighborlyColors.textFaint.withValues(alpha: 0.3),
              width: 0.5,
            ),
          ),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) => setState(() => _currentIndex = index),
          type: BottomNavigationBarType.fixed,
          backgroundColor: NeighborlyColors.bgCard,
          selectedItemColor: NeighborlyColors.accent,
          unselectedItemColor: NeighborlyColors.textSecondary,
          elevation: 0,
          selectedLabelStyle: GoogleFonts.inter(
            fontSize: 10,
            fontWeight: FontWeight.w600,
            color: NeighborlyColors.accent,
          ),
          unselectedLabelStyle: GoogleFonts.inter(
            fontSize: 10,
            fontWeight: FontWeight.w500,
            color: NeighborlyColors.textSecondary,
          ),
          items: _navItems
              .map((item) => BottomNavigationBarItem(
                    icon: Icon(item.icon),
                    activeIcon: Icon(item.activeIcon),
                    label: item.label,
                  ))
              .toList(),
        ),
      ),
    );
  }
}

// ── Supporting Types ─────────────────────────────────────────────────

class _NavItem {
  final String label;
  final IconData icon;
  final IconData activeIcon;

  const _NavItem(this.label, this.icon, this.activeIcon);
}

/// Placeholder for Account tab (not yet implemented).
class _AccountPlaceholder extends StatelessWidget {
  const _AccountPlaceholder();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: NeighborlyColors.bgPrimary,
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: NeighborlyColors.accent.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(40),
                ),
                child: const Center(
                  child: Icon(Icons.person, size: 40, color: NeighborlyColors.accent),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Account',
                style: GoogleFonts.inter(
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                  color: NeighborlyColors.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Your profile and settings',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w400,
                  color: NeighborlyColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
