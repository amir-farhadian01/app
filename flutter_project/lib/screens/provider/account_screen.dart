import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../routing/app_navigator.dart';
import '../../services/neighborly_api_service.dart';

/// Provider hub: orders, notifications, settings, help, sign-out.
/// Teal accent `#01696f` on warm surfaces (Neighborly design system).
class ProviderAccountScreen extends StatelessWidget {
  const ProviderAccountScreen({super.key});

  static const Color _tealAccent = Color(0xFF01696f);

  @override
  Widget build(BuildContext context) {
    final api = context.watch<NeighborlyApiService>();
    final cs = Theme.of(context).colorScheme;

    if (api.user == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        neighborlyNavigatorKey.currentState?.pushNamed('/login');
      });
      return Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        body: Center(child: CircularProgressIndicator(color: cs.primary)),
      );
    }

    if (api.user!.role != 'provider') {
      return Scaffold(
        appBar: AppBar(title: const Text('Account')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              'This area is for service providers.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(fontSize: 16, color: cs.onSurface),
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(
          'Account',
          style: GoogleFonts.inter(
            fontWeight: FontWeight.w800,
            color: cs.onSurface,
          ),
        ),
        backgroundColor: cs.surface.withValues(alpha: 0.95),
        foregroundColor: cs.onSurface,
        elevation: 0,
        surfaceTintColor: _tealAccent.withValues(alpha: 0.12),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Divider(height: 1, color: cs.outline.withValues(alpha: 0.6)),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
        children: [
          Text(
            'Workspace',
            style: GoogleFonts.inter(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.2,
              color: cs.secondary,
            ),
          ),
          const SizedBox(height: 12),
          Card(
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                _AccountListTile(
                  icon: LucideIcons.clipboardList,
                  label: 'Orders',
                  onTap: () => neighborlyNavigatorKey.currentState?.pushNamed('/provider/orders'),
                ),
                const Divider(height: 1),
                _AccountListTile(
                  icon: LucideIcons.bell,
                  label: 'Notifications',
                  onTap: () => neighborlyNavigatorKey.currentState?.pushNamed('/provider/notifications'),
                ),
                const Divider(height: 1),
                _AccountListTile(
                  icon: LucideIcons.settings,
                  label: 'Settings',
                  onTap: () => neighborlyNavigatorKey.currentState?.pushNamed('/provider/settings'),
                ),
                const Divider(height: 1),
                _AccountListTile(
                  icon: LucideIcons.helpCircle,
                  label: 'Help',
                  onTap: () => _showHelpSheet(context),
                ),
                const Divider(height: 1),
                _AccountListTile(
                  icon: LucideIcons.logOut,
                  label: 'Log out',
                  destructive: true,
                  onTap: () => _confirmLogout(context, api),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static void _showHelpSheet(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      backgroundColor: cs.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Help & support',
                  style: GoogleFonts.inter(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: cs.onSurface,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Browse FAQs, safety tips, and how to manage jobs in the Neighborly help center. '
                  'If you need a person, use Settings → support options when available.',
                  style: GoogleFonts.inter(
                    fontSize: 15,
                    height: 1.45,
                    color: cs.secondary,
                  ),
                ),
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  style: FilledButton.styleFrom(
                    backgroundColor: _tealAccent,
                    foregroundColor: Colors.white,
                  ),
                  child: Text('Close', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  static Future<void> _confirmLogout(BuildContext context, NeighborlyApiService api) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Log out?', style: GoogleFonts.inter(fontWeight: FontWeight.w800)),
        content: Text(
          'You will need to sign in again to access your provider workspace.',
          style: GoogleFonts.inter(color: Theme.of(ctx).colorScheme.secondary),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFF01696f)),
            child: const Text('Log out'),
          ),
        ],
      ),
    );
    if (ok != true || !context.mounted) return;
    await api.logout();
    if (!context.mounted) return;
    neighborlyNavigatorKey.currentState?.pushNamedAndRemoveUntil('/login', (r) => false);
  }
}

class _AccountListTile extends StatelessWidget {
  const _AccountListTile({
    required this.icon,
    required this.label,
    required this.onTap,
    this.destructive = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool destructive;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final accent = destructive ? const Color(0xFFB42318) : ProviderAccountScreen._tealAccent;
    final onTile = destructive ? accent : cs.onSurface;

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      leading: CircleAvatar(
        radius: 22,
        backgroundColor: accent.withValues(alpha: 0.12),
        child: Icon(icon, color: accent, size: 22),
      ),
      title: Text(
        label,
        style: GoogleFonts.inter(
          fontWeight: FontWeight.w600,
          fontSize: 16,
          color: onTile,
        ),
      ),
      trailing: Icon(
        LucideIcons.chevronRight,
        size: 20,
        color: cs.secondary.withValues(alpha: 0.8),
      ),
      onTap: onTap,
    );
  }
}
