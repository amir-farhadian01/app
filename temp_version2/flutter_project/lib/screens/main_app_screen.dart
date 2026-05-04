import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../main.dart';
import '../services/auth_provider.dart';
import 'customer_dashboard_screen.dart';
import 'provider_dashboard_screen.dart';

class MainAppScreen extends StatefulWidget {
  const MainAppScreen({super.key});

  @override
  State<MainAppScreen> createState() => _MainAppScreenState();
}

class _MainAppScreenState extends State<MainAppScreen> {
  bool _showingCustomerView = true;

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final themeNotifier = context.watch<ThemeNotifier>();
    final user = auth.user!;
    final cs = Theme.of(context).colorScheme;
    final isDark = themeNotifier.isDark;

    final isProvider = user.role == 'provider';
    final canToggle = isProvider;

    Widget dashboardContent = _showingCustomerView || !isProvider
        ? CustomerDashboardScreen(user: user)
        : ProviderDashboardScreen(user: user);

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            // Logo diamond
            Container(
              width: 30, height: 30,
              decoration: BoxDecoration(
                color: cs.primary,
                borderRadius: BorderRadius.circular(7),
              ),
              child: Center(
                child: Transform.rotate(
                  angle: 0.785,
                  child: Container(
                    width: 14, height: 14,
                    decoration: BoxDecoration(
                      color: cs.onPrimary,
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Text(
              'NEIGHBORLY',
              style: GoogleFonts.inter(
                fontWeight: FontWeight.w900,
                fontStyle: FontStyle.italic,
                fontSize: 16,
                letterSpacing: 0.5,
                color: cs.onSurface,
              ),
            ),
          ],
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(
            height: 1,
            color: isDark ? const Color(0xFF262626) : const Color(0xFFF5F5F5),
          ),
        ),
        actions: [
          // Customer / Provider toggle for providers
          if (canToggle)
            Padding(
              padding: const EdgeInsets.only(right: 4),
              child: Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF262626) : const Color(0xFFF5F5F5),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _toggleBtn('Customer', _showingCustomerView, () => setState(() => _showingCustomerView = true), isDark, cs),
                    _toggleBtn('Provider', !_showingCustomerView, () => setState(() => _showingCustomerView = false), isDark, cs),
                  ],
                ),
              ),
            ),

          // Light / Dark mode toggle
          IconButton(
            icon: AnimatedSwitcher(
              duration: const Duration(milliseconds: 250),
              child: isDark
                  ? const Icon(Icons.wb_sunny_rounded, key: ValueKey('sun'))
                  : const Icon(Icons.nightlight_round, key: ValueKey('moon')),
            ),
            onPressed: () => themeNotifier.toggleTheme(),
            tooltip: isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode',
          ),

          // Logout
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            onPressed: () async => context.read<AuthProvider>().logout(),
            tooltip: 'Sign Out',
          ),
        ],
      ),
      body: dashboardContent,
    );
  }

  Widget _toggleBtn(String label, bool active, VoidCallback onTap, bool isDark, ColorScheme cs) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: active ? cs.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            fontWeight: FontWeight.w700,
            fontSize: 12,
            color: active ? cs.onPrimary : cs.secondary,
          ),
        ),
      ),
    );
  }
}
