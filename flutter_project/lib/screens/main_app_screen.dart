import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../services/auth_provider.dart';
import '../services/neighborly_api_service.dart';
import '../services/neighborly_theme_notifier.dart';
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
    final api = context.watch<NeighborlyApiService>();
    final themeNotifier = context.watch<NeighborlyThemeNotifier>();
    final userModel = api.user;
    if (userModel == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    final user = AppUser.fromUserModel(userModel);
    final cs = Theme.of(context).colorScheme;
    final isDark = themeNotifier.isDark;

    final isProvider = user.role == 'provider';
    final canToggle = isProvider;

    final dashboardContent = _showingCustomerView || !isProvider
        ? CustomerDashboardScreen(user: user)
        : const ProviderDashboardScreen();

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (canToggle)
            Material(
              color: cs.surface,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  border: Border(bottom: BorderSide(color: cs.outline)),
                ),
                child: Row(
                  children: [
                    Text(
                      'WORKSPACE',
                      style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1.5, color: cs.secondary),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF262626) : cs.surfaceContainerHighest,
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
                  ],
                ),
              ),
            ),
          Expanded(child: dashboardContent),
        ],
      ),
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
