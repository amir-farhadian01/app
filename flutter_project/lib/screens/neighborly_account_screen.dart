import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../models/user_model.dart';
import '../services/neighborly_api_service.dart';
import 'profile_edit_screen.dart';

/// Full-screen account hub (tabs: Home, Personal info, Security, Privacy & Data).
/// Light surfaces; Neighborly-specific copy (no third-party branding).
class NeighborlyAccountScreen extends StatelessWidget {
  const NeighborlyAccountScreen({super.key, this.initialTab = 0});

  final int initialTab;

  static const _bg = Color(0xFFFFFFFF);
  static const _text = Color(0xFF000000);
  static const _sub = Color(0xFF545454);
  static const _divider = Color(0xFFEEEEEE);
  static const _pill = Color(0xFFF3F3F3);
  static const _blue = Color(0xFF276EF1);

  @override
  Widget build(BuildContext context) {
    final idx = initialTab.clamp(0, 3);
    return Theme(
      data: ThemeData(
        brightness: Brightness.light,
        scaffoldBackgroundColor: _bg,
        colorScheme: const ColorScheme.light(
          surface: _bg,
          onSurface: _text,
          primary: _text,
          onPrimary: _bg,
          secondary: _sub,
          outline: _divider,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: _bg,
          foregroundColor: _text,
          elevation: 0,
          scrolledUnderElevation: 0,
          centerTitle: true,
          surfaceTintColor: Colors.transparent,
        ),
        dividerTheme: const DividerThemeData(color: _divider, thickness: 1),
        useMaterial3: true,
      ),
      child: DefaultTabController(
        length: 4,
        initialIndex: idx,
        child: Builder(
          builder: (context) {
            final tc = DefaultTabController.of(context);
            return Scaffold(
              backgroundColor: _bg,
              appBar: AppBar(
                leading: IconButton(
                  icon: const Icon(LucideIcons.x),
                  onPressed: () => Navigator.of(context).pop(),
                  tooltip: 'Close',
                ),
                title: Text(
                  'Neighborly Account',
                  style: GoogleFonts.plusJakartaSans(
                    fontWeight: FontWeight.w700,
                    fontSize: 17,
                    color: _text,
                    letterSpacing: -0.35,
                  ),
                ),
                bottom: PreferredSize(
                  preferredSize: const Size.fromHeight(48),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: TabBar(
                      controller: tc,
                      isScrollable: true,
                      tabAlignment: TabAlignment.start,
                      indicatorColor: _text,
                      indicatorWeight: 3,
                      labelColor: _text,
                      unselectedLabelColor: _sub,
                      labelStyle: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w700, letterSpacing: -0.2),
                      unselectedLabelStyle: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w500, letterSpacing: -0.12),
                      tabs: const [
                        Tab(text: 'Home'),
                        Tab(text: 'Personal info'),
                        Tab(text: 'Security'),
                        Tab(text: 'Privacy & Data'),
                      ],
                    ),
                  ),
                ),
              ),
              body: TabBarView(
                controller: tc,
                children: [
                  _AccountHomeTab(onOpenTab: (i) => tc.animateTo(i)),
                  const _PersonalInfoTab(),
                  const _SecurityTab(),
                  const _PrivacyDataTab(),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _AccountHomeTab extends StatelessWidget {
  const _AccountHomeTab({required this.onOpenTab});

  final void Function(int index) onOpenTab;

  String _shortName(UserModel u) {
    final fn = u.firstName?.trim();
    if (fn != null && fn.isNotEmpty) return fn;
    final n = u.displayName.trim();
    if (n.isNotEmpty) return n.split(' ').first;
    return u.email.split('@').first;
  }

  @override
  Widget build(BuildContext context) {
    final u = context.watch<NeighborlyApiService>().user;
    if (u == null) return const SizedBox.shrink();

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
      children: [
        DecoratedBox(
          decoration: BoxDecoration(
            color: NeighborlyAccountScreen._pill,
            borderRadius: BorderRadius.circular(28),
          ),
          child: TextField(
            readOnly: true,
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Account assistant is coming soon.', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w600))),
              );
            },
            style: GoogleFonts.plusJakartaSans(fontSize: 15, color: NeighborlyAccountScreen._text),
            decoration: InputDecoration(
              hintText: 'Ask me anything about your Neighborly account…',
              hintStyle: GoogleFonts.plusJakartaSans(fontSize: 15, color: NeighborlyAccountScreen._sub),
              prefixIcon: const Icon(LucideIcons.search, color: NeighborlyAccountScreen._sub, size: 20),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerRight,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Powered by AI', style: GoogleFonts.plusJakartaSans(fontSize: 11, color: NeighborlyAccountScreen._sub)),
              const SizedBox(width: 4),
              Icon(Icons.info_outline, size: 14, color: NeighborlyAccountScreen._sub.withValues(alpha: 0.8)),
            ],
          ),
        ),
        const SizedBox(height: 28),
        Center(child: _AccountAvatar(url: u.photoURL, radius: 48)),
        const SizedBox(height: 16),
        Center(
          child: Text(
            _shortName(u),
            style: GoogleFonts.plusJakartaSans(fontSize: 22, fontWeight: FontWeight.w800, color: NeighborlyAccountScreen._text),
          ),
        ),
        const SizedBox(height: 6),
        Center(
          child: Text(
            u.email,
            textAlign: TextAlign.center,
            style: GoogleFonts.plusJakartaSans(fontSize: 14, color: NeighborlyAccountScreen._sub),
          ),
        ),
        const SizedBox(height: 28),
        Row(
          children: [
            Expanded(child: _HomeShortcut(icon: LucideIcons.user, label: 'Personal info', onTap: () => onOpenTab(1))),
            const SizedBox(width: 12),
            Expanded(child: _HomeShortcut(icon: LucideIcons.shieldCheck, label: 'Security', onTap: () => onOpenTab(2))),
            const SizedBox(width: 12),
            Expanded(child: _HomeShortcut(icon: LucideIcons.lock, label: 'Privacy & Data', onTap: () => onOpenTab(3))),
          ],
        ),
        const SizedBox(height: 32),
        Text('Suggestions', style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w800, color: NeighborlyAccountScreen._text)),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: NeighborlyAccountScreen._bg,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: NeighborlyAccountScreen._divider),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Complete your account checkup',
                style: GoogleFonts.plusJakartaSans(fontSize: 17, fontWeight: FontWeight.w800, color: NeighborlyAccountScreen._text),
              ),
              const SizedBox(height: 8),
              Text(
                'Finish verification and security basics so bookings and payments run smoothly.',
                style: GoogleFonts.plusJakartaSans(fontSize: 14, height: 1.4, color: NeighborlyAccountScreen._sub),
              ),
              const SizedBox(height: 16),
              FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: NeighborlyAccountScreen._pill,
                  foregroundColor: NeighborlyAccountScreen._text,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                ),
                onPressed: () => onOpenTab(1),
                child: Text('Begin checkup', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700)),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _HomeShortcut extends StatelessWidget {
  const _HomeShortcut({required this.icon, required this.label, required this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: NeighborlyAccountScreen._pill,
      borderRadius: BorderRadius.circular(14),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 8),
          child: Column(
            children: [
              Icon(icon, size: 28, color: NeighborlyAccountScreen._text),
              const SizedBox(height: 10),
              Text(
                label,
                textAlign: TextAlign.center,
                maxLines: 2,
                style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: NeighborlyAccountScreen._text, height: 1.2),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PersonalInfoTab extends StatelessWidget {
  const _PersonalInfoTab();

  @override
  Widget build(BuildContext context) {
    final u = context.watch<NeighborlyApiService>().user;
    if (u == null) return const SizedBox.shrink();

    final name = u.displayName.trim().isNotEmpty
        ? u.displayName.trim()
        : '${u.firstName ?? ''} ${u.lastName ?? ''}'.trim().isNotEmpty
            ? '${u.firstName ?? ''} ${u.lastName ?? ''}'.trim()
            : u.email.split('@').first;

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
      children: [
        Text(
          'Personal info',
          style: GoogleFonts.plusJakartaSans(
            fontSize: 28,
            fontWeight: FontWeight.w800,
            color: NeighborlyAccountScreen._text,
            letterSpacing: -0.9,
            height: 1.05,
          ),
        ),
        const SizedBox(height: 24),
        Center(
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              _AccountAvatar(url: u.photoURL, radius: 52),
              Positioned(
                right: -2,
                bottom: -2,
                child: Material(
                  color: NeighborlyAccountScreen._bg,
                  shape: const CircleBorder(),
                  elevation: 1,
                  child: IconButton(
                    style: IconButton.styleFrom(
                      backgroundColor: NeighborlyAccountScreen._pill,
                      padding: const EdgeInsets.all(8),
                    ),
                    icon: const Icon(LucideIcons.pencil, size: 18, color: NeighborlyAccountScreen._text),
                    onPressed: () {
                      Navigator.of(context).push<void>(
                        MaterialPageRoute<void>(builder: (_) => const ProfileEditScreen()),
                      );
                    },
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 32),
        _PersonalRow(
          label: 'Name',
          value: name,
          onTap: () {
            Navigator.of(context).push<void>(
              MaterialPageRoute<void>(builder: (_) => const ProfileEditScreen()),
            );
          },
        ),
        const Divider(height: 1, color: NeighborlyAccountScreen._divider),
        _PersonalRow(
          label: 'Gender',
          value: 'Not set',
          onTap: () {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Gender will be editable in a future update.', style: GoogleFonts.plusJakartaSans())),
            );
          },
        ),
        const Divider(height: 1, color: NeighborlyAccountScreen._divider),
        _PersonalRow(
          label: 'Phone number',
          value: (u.phone ?? '').trim().isEmpty ? 'Not set' : u.phone!,
          verified: u.kyc.phoneVerified,
          onTap: () {
            Navigator.of(context).push<void>(
              MaterialPageRoute<void>(builder: (_) => const ProfileEditScreen()),
            );
          },
        ),
        const Divider(height: 1, color: NeighborlyAccountScreen._divider),
        _PersonalRow(
          label: 'Email',
          value: u.email,
          verified: u.kyc.emailVerified || u.isVerified,
          onTap: () {
            Navigator.of(context).push<void>(
              MaterialPageRoute<void>(builder: (_) => const ProfileEditScreen()),
            );
          },
        ),
        const Divider(height: 1, color: NeighborlyAccountScreen._divider),
        InkWell(
          onTap: () {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Language follows your device settings.', style: GoogleFonts.plusJakartaSans())),
            );
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Language', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: NeighborlyAccountScreen._text)),
                      const SizedBox(height: 4),
                      Text(
                        'Update device language',
                        style: GoogleFonts.plusJakartaSans(fontSize: 15, color: NeighborlyAccountScreen._sub),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.open_in_new_rounded, size: 20, color: NeighborlyAccountScreen._sub),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _PersonalRow extends StatelessWidget {
  const _PersonalRow({
    required this.label,
    required this.value,
    required this.onTap,
    this.verified = false,
  });

  final String label;
  final String value;
  final VoidCallback onTap;
  final bool verified;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: NeighborlyAccountScreen._text)),
                  const SizedBox(height: 4),
                  Text(value, style: GoogleFonts.plusJakartaSans(fontSize: 15, color: NeighborlyAccountScreen._sub)),
                ],
              ),
            ),
            if (verified)
              const Padding(
                padding: EdgeInsets.only(right: 8, top: 2),
                child: Icon(Icons.check_circle, color: Color(0xFF05944F), size: 20),
              ),
            const Icon(LucideIcons.chevronRight, size: 20, color: NeighborlyAccountScreen._sub),
          ],
        ),
      ),
    );
  }
}

class _SecurityTab extends StatefulWidget {
  const _SecurityTab();

  @override
  State<_SecurityTab> createState() => _SecurityTabState();
}

class _SecurityTabState extends State<_SecurityTab> {
  bool _mfaBusy = false;

  Future<void> _setMfa(NeighborlyApiService api, bool v) async {
    setState(() => _mfaBusy = true);
    try {
      await api.updateProfile({'mfaEnabled': v});
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e', style: GoogleFonts.plusJakartaSans())));
      }
    } finally {
      if (mounted) setState(() => _mfaBusy = false);
    }
  }

  void _openChangePassword(BuildContext context) {
    final api = context.read<NeighborlyApiService>();
    final current = TextEditingController();
    final nw = TextEditingController();
    final nw2 = TextEditingController();
    var obscure1 = true;
    var obscure2 = true;
    var obscure3 = true;
    var busy = false;

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: NeighborlyAccountScreen._bg,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setModal) {
            Future<void> submit() async {
              if (nw.text != nw2.text) {
                ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text('Passwords do not match', style: GoogleFonts.plusJakartaSans())));
                return;
              }
              if (nw.text.length < 8) {
                ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text('Use at least 8 characters', style: GoogleFonts.plusJakartaSans())));
                return;
              }
              setModal(() => busy = true);
              try {
                await api.changePassword(currentPassword: current.text, newPassword: nw.text);
                if (ctx.mounted) {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Password updated', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w600))),
                  );
                }
              } catch (e) {
                if (ctx.mounted) {
                  ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text('$e', style: GoogleFonts.plusJakartaSans())));
                }
              } finally {
                if (ctx.mounted) setModal(() => busy = false);
              }
            }

            return Padding(
              padding: EdgeInsets.only(
                left: 24,
                right: 24,
                top: 24,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
              ),
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text('Change password', style: GoogleFonts.plusJakartaSans(fontSize: 20, fontWeight: FontWeight.w700))),
                        IconButton(onPressed: busy ? null : () => Navigator.pop(ctx), icon: const Icon(LucideIcons.x)),
                      ],
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: current,
                      obscureText: obscure1,
                      decoration: InputDecoration(
                        labelText: 'Current password',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        suffixIcon: IconButton(
                          icon: Icon(obscure1 ? LucideIcons.eye : LucideIcons.eyeOff),
                          onPressed: () => setModal(() => obscure1 = !obscure1),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: nw,
                      obscureText: obscure2,
                      decoration: InputDecoration(
                        labelText: 'New password',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        suffixIcon: IconButton(
                          icon: Icon(obscure2 ? LucideIcons.eye : LucideIcons.eyeOff),
                          onPressed: () => setModal(() => obscure2 = !obscure2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: nw2,
                      obscureText: obscure3,
                      decoration: InputDecoration(
                        labelText: 'Confirm new password',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        suffixIcon: IconButton(
                          icon: Icon(obscure3 ? LucideIcons.eye : LucideIcons.eyeOff),
                          onPressed: () => setModal(() => obscure3 = !obscure3),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: busy ? null : submit,
                      style: FilledButton.styleFrom(
                        backgroundColor: NeighborlyAccountScreen._text,
                        foregroundColor: NeighborlyAccountScreen._bg,
                        minimumSize: const Size(double.infinity, 52),
                      ),
                      child: busy
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : Text('Update password', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700)),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    ).whenComplete(() {
      current.dispose();
      nw.dispose();
      nw2.dispose();
    });
  }

  @override
  Widget build(BuildContext context) {
    final u = context.watch<NeighborlyApiService>().user;
    if (u == null) return const SizedBox.shrink();
    final api = context.read<NeighborlyApiService>();

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
      children: [
        Text(
          'Security',
          style: GoogleFonts.plusJakartaSans(
            fontSize: 28,
            fontWeight: FontWeight.w800,
            color: NeighborlyAccountScreen._text,
            letterSpacing: -0.9,
            height: 1.05,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Logging in',
          style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w800, color: NeighborlyAccountScreen._text),
        ),
        const SizedBox(height: 8),
        _SecurityChevronTile(
          title: 'Passkeys',
          subtitle: 'Passkeys are easier and more secure than passwords.',
          onTap: () {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Passkeys are not available yet.', style: GoogleFonts.plusJakartaSans())),
            );
          },
        ),
        const Divider(height: 1, color: NeighborlyAccountScreen._divider),
        _SecurityChevronTile(
          title: 'Password',
          subtitle: 'Change the password you use with email sign-in.',
          onTap: () => _openChangePassword(context),
        ),
        const Divider(height: 1, color: NeighborlyAccountScreen._divider),
        _SecurityChevronTile(
          title: 'Authenticator app',
          subtitle: 'Add an authenticator app as a second step after your password.',
          onTap: () {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Authenticator setup is coming soon.', style: GoogleFonts.plusJakartaSans())),
            );
          },
        ),
        const Divider(height: 1, color: NeighborlyAccountScreen._divider),
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('2-step verification', style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 4),
                    Text(
                      'Require a second factor for sensitive account changes.',
                      style: GoogleFonts.plusJakartaSans(fontSize: 14, color: NeighborlyAccountScreen._sub, height: 1.35),
                    ),
                  ],
                ),
              ),
              Switch.adaptive(
                value: u.mfaEnabled,
                onChanged: _mfaBusy ? null : (v) => _setMfa(api, v),
              ),
            ],
          ),
        ),
        const Divider(height: 1, color: NeighborlyAccountScreen._divider),
        _SecurityChevronTile(
          title: 'Recovery phone',
          subtitle: 'Add a backup phone number to recover access.',
          onTap: () {
            Navigator.of(context).push<void>(
              MaterialPageRoute<void>(builder: (_) => const ProfileEditScreen()),
            );
          },
        ),
        const SizedBox(height: 28),
        Text(
          'Connected social apps',
          style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w800, color: NeighborlyAccountScreen._text),
        ),
        const SizedBox(height: 8),
        Text(
          'Manage linked providers you can use to sign in.',
          style: GoogleFonts.plusJakartaSans(fontSize: 14, color: NeighborlyAccountScreen._sub, height: 1.35),
        ),
        const SizedBox(height: 16),
        _SocialRow(
          label: 'Google',
          linked: u.googleLinked,
          onPressed: () {
            if (u.googleLinked) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Disconnect Google from the web app or support for now.', style: GoogleFonts.plusJakartaSans())),
              );
            } else {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Google sign-in linking is coming soon in the mobile app.', style: GoogleFonts.plusJakartaSans())),
              );
            }
          },
        ),
        const SizedBox(height: 12),
        _SocialRow(
          label: 'Apple',
          linked: false,
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Apple sign-in is not available yet.', style: GoogleFonts.plusJakartaSans())),
            );
          },
        ),
        const SizedBox(height: 28),
        Text(
          'Login activity',
          style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w800, color: NeighborlyAccountScreen._text),
        ),
        const SizedBox(height: 8),
        Text(
          'Recent sessions on this device appear here. Full device history is coming soon.',
          style: GoogleFonts.plusJakartaSans(fontSize: 14, color: NeighborlyAccountScreen._sub, height: 1.35),
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: NeighborlyAccountScreen._bg,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: NeighborlyAccountScreen._divider),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(LucideIcons.smartphone, size: 22, color: NeighborlyAccountScreen._text),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('This device', style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 4),
                    Text('Your current session', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w600, color: NeighborlyAccountScreen._blue)),
                    const SizedBox(height: 4),
                    Text('Neighborly mobile / web', style: GoogleFonts.plusJakartaSans(fontSize: 13, color: NeighborlyAccountScreen._sub)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _SecurityChevronTile extends StatelessWidget {
  const _SecurityChevronTile({required this.title, required this.subtitle, required this.onTap});

  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Text(subtitle, style: GoogleFonts.plusJakartaSans(fontSize: 14, color: NeighborlyAccountScreen._sub, height: 1.35)),
                ],
              ),
            ),
            const Icon(LucideIcons.chevronRight, size: 20, color: NeighborlyAccountScreen._sub),
          ],
        ),
      ),
    );
  }
}

class _SocialRow extends StatelessWidget {
  const _SocialRow({required this.label, required this.linked, required this.onPressed});

  final String label;
  final bool linked;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w600)),
        ),
        TextButton(
          style: TextButton.styleFrom(
            backgroundColor: NeighborlyAccountScreen._pill,
            foregroundColor: NeighborlyAccountScreen._text,
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
          ),
          onPressed: onPressed,
          child: Text(linked ? 'Disconnect' : 'Connect', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700)),
        ),
      ],
    );
  }
}

class _PrivacyDataTab extends StatelessWidget {
  const _PrivacyDataTab();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
      children: [
        Text(
          'Privacy & Data',
          style: GoogleFonts.plusJakartaSans(
            fontSize: 28,
            fontWeight: FontWeight.w800,
            color: NeighborlyAccountScreen._text,
            letterSpacing: -0.9,
            height: 1.05,
          ),
        ),
        const SizedBox(height: 24),
        Text('Privacy', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w800, color: NeighborlyAccountScreen._text)),
        const SizedBox(height: 8),
        _SecurityChevronTile(
          title: 'Privacy centre',
          subtitle: 'Review how we use data and control marketing preferences.',
          onTap: () {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Privacy centre is coming soon.', style: GoogleFonts.plusJakartaSans())),
            );
          },
        ),
        const Divider(height: 1, color: NeighborlyAccountScreen._divider),
        _SecurityChevronTile(
          title: 'Communication preferences',
          subtitle: 'Choose how Neighborly reaches you about bookings and updates.',
          onTap: () {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Communication preferences are coming soon.', style: GoogleFonts.plusJakartaSans())),
            );
          },
        ),
        const SizedBox(height: 28),
        Text(
          'Third-party apps with account access',
          style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w800, color: NeighborlyAccountScreen._text),
        ),
        const SizedBox(height: 8),
        Text(
          'When you connect an app, it will appear here.',
          style: GoogleFonts.plusJakartaSans(fontSize: 14, color: NeighborlyAccountScreen._sub, height: 1.4),
        ),
        const SizedBox(height: 8),
        TextButton(
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Learn more: OAuth and connected apps documentation is coming soon.', style: GoogleFonts.plusJakartaSans())),
            );
          },
          style: TextButton.styleFrom(
            foregroundColor: NeighborlyAccountScreen._text,
            padding: EdgeInsets.zero,
            textStyle: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700, decoration: TextDecoration.underline),
          ),
          child: const Text('Learn more'),
        ),
      ],
    );
  }
}

class _AccountAvatar extends StatelessWidget {
  const _AccountAvatar({required this.url, required this.radius});

  final String? url;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final d = radius * 2;
    final trimmed = url?.trim();
    if (trimmed == null || trimmed.isEmpty) {
      return CircleAvatar(
        radius: radius,
        backgroundColor: NeighborlyAccountScreen._pill,
        child: Icon(LucideIcons.user, size: radius * 1.05, color: NeighborlyAccountScreen._sub),
      );
    }
    return ClipOval(
      child: SizedBox(
        width: d,
        height: d,
        child: Image.network(
          trimmed,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => ColoredBox(
            color: NeighborlyAccountScreen._pill,
            child: Icon(LucideIcons.user, size: radius * 1.05, color: NeighborlyAccountScreen._sub),
          ),
        ),
      ),
    );
  }
}
