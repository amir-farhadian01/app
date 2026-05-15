import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../theme/app_theme.dart';
import 'bottom_nav.dart';

/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Responsive Scaffold
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Uses NavigationRail on wide screens (>= 768px) and
/// BottomNavigationBar on narrow screens (< 768px).
/// Wraps [child] content in the appropriate layout.
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class ResponsiveScaffold extends StatelessWidget {
  final int currentIndex;
  final Widget child;

  const ResponsiveScaffold({
    super.key,
    required this.currentIndex,
    required this.child,
  });

  static const _breakpoint = 768.0;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth >= _breakpoint) {
          return _WideLayout(currentIndex: currentIndex, child: child);
        }
        return _NarrowLayout(currentIndex: currentIndex, child: child);
      },
    );
  }
}

/// ── Wide Layout (NavigationRail) ─────────────────────────────────────
class _WideLayout extends StatelessWidget {
  final int currentIndex;
  final Widget child;

  const _WideLayout({required this.currentIndex, required this.child});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Row(
      children: [
        NavigationRail(
          selectedIndex: currentIndex,
          onDestinationSelected: (i) => _navigate(context, i),
          backgroundColor: isDark ? AppColors.darkSurface : AppColors.surface,
          indicatorColor: AppColors.primary.withValues(alpha: 0.15),
          labelType: NavigationRailLabelType.all,
          leading: Padding(
            padding: const EdgeInsets.symmetric(vertical: AppSpacing.lg),
            child: Column(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(AppRadius.button),
                  ),
                  child: Center(
                    child: Text(
                      'N',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          destinations: const [
            NavigationRailDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home),
              label: Text('Home'),
            ),
            NavigationRailDestination(
              icon: Icon(Icons.search_outlined),
              selectedIcon: Icon(Icons.search),
              label: Text('Explore'),
            ),
            NavigationRailDestination(
              icon: Icon(Icons.calendar_today_outlined),
              selectedIcon: Icon(Icons.calendar_today),
              label: Text('Bookings'),
            ),
            NavigationRailDestination(
              icon: Icon(Icons.person_outline),
              selectedIcon: Icon(Icons.person),
              label: Text('Profile'),
            ),
          ],
          selectedIconTheme: const IconThemeData(color: AppColors.primary),
          unselectedIconTheme: IconThemeData(
            color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
          ),
          selectedLabelTextStyle: GoogleFonts.plusJakartaSans(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: AppColors.primary,
          ),
          unselectedLabelTextStyle: GoogleFonts.plusJakartaSans(
            fontSize: 11,
            fontWeight: FontWeight.w500,
            color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
          ),
        ),
        const VerticalDivider(width: 1, thickness: 1),
        Expanded(child: child),
      ],
    );
  }

  void _navigate(BuildContext context, int index) {
    switch (index) {
      case 0:
        context.go('/home');
        break;
      case 1:
        context.go('/explore');
        break;
      case 2:
        context.go('/bookings');
        break;
      case 3:
        context.go('/profile');
        break;
    }
  }
}

/// ── Narrow Layout (BottomNavigationBar) ──────────────────────────────
class _NarrowLayout extends StatelessWidget {
  final int currentIndex;
  final Widget child;

  const _NarrowLayout({required this.currentIndex, required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: NeighborlyBottomNav(currentIndex: currentIndex),
    );
  }
}
