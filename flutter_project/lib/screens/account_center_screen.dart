import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../services/neighborly_api_service.dart';
import '../widgets/account_personal_extras.dart';
import '../widgets/device_safety_pin_body.dart';
import 'profile_edit_screen.dart';

/// Account & Security: **Personal** (profile + privacy + device whitelist), **Security** (password, Google, 2FA), **Safety** (biometric, PIN, backup).
class AccountCenterScreen extends StatefulWidget {
  const AccountCenterScreen({super.key, this.initialIndex = 0});

  final int initialIndex;

  @override
  State<AccountCenterScreen> createState() => _AccountCenterScreenState();
}

class _AccountCenterScreenState extends State<AccountCenterScreen> with SingleTickerProviderStateMixin {
  late TabController _tab;

  @override
  void initState() {
    super.initState();
    _tab = TabController(
      length: 3,
      vsync: this,
      initialIndex: widget.initialIndex.clamp(0, 2),
    );
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: cs.surface,
      appBar: AppBar(
        backgroundColor: cs.surface,
        elevation: 0,
        centerTitle: true,
        title: Column(
          children: [
            Text(
              'ACCOUNT & SECURITY',
              style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w900, letterSpacing: 0.6, color: cs.secondary),
            ),
            Text(
              'Manage your personal info, protection & privacy',
              style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800, color: cs.onSurface),
            ),
          ],
        ),
        leading: IconButton(
          icon: Icon(LucideIcons.chevronLeft, color: cs.onSurface),
          onPressed: () => Navigator.pop(context),
        ),
        bottom: TabBar(
          controller: _tab,
          labelStyle: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w800),
          indicatorColor: cs.primary,
          tabs: const [
            Tab(text: 'PERSONAL', icon: Icon(LucideIcons.user, size: 18)),
            Tab(text: 'SECURITY', icon: Icon(LucideIcons.shield, size: 18)),
            Tab(text: 'SAFETY', icon: Icon(LucideIcons.zap, size: 18)),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tab,
        physics: const AlwaysScrollableScrollPhysics(),
        children: const [
          _PersonalTabView(),
          _SecurityTabView(),
          DeviceSafetyPinBody(),
        ],
      ),
    );
  }
}

class _PersonalTabView extends StatelessWidget {
  const _PersonalTabView();

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ProfileEditScreen(
            embedInAccountCenter: true,
            onSaved: () {
              // optional: haptic; refresh already in updateProfile
            },
          ),
          const AccountPersonalExtras(),
        ],
      ),
    );
  }
}

class _SecurityTabView extends StatefulWidget {
  const _SecurityTabView();

  @override
  State<_SecurityTabView> createState() => _SecurityTabViewState();
}

class _SecurityTabViewState extends State<_SecurityTabView> {
  final _old = TextEditingController();
  final _nw1 = TextEditingController();
  final _nw2 = TextEditingController();
  final _googleToken = TextEditingController();
  bool _busy = false;
  bool _mfa = false;
  String? _err;

  @override
  void initState() {
    super.initState();
    _mfa = context.read<NeighborlyApiService>().user?.mfaEnabled == true;
  }

  @override
  void dispose() {
    _old.dispose();
    _nw1.dispose();
    _nw2.dispose();
    _googleToken.dispose();
    super.dispose();
  }

  Future<void> _changePassword() async {
    if (_nw1.text != _nw2.text) {
      setState(() => _err = 'New passwords do not match');
      return;
    }
    if (_nw1.text.length < 8) {
      setState(() => _err = 'New password must be at least 8 characters');
      return;
    }
    setState(() {
      _err = null;
      _busy = true;
    });
    final api = context.read<NeighborlyApiService>();
    try {
      await api.changePassword(currentPassword: _old.text, newPassword: _nw1.text);
      _old.clear();
      _nw1.clear();
      _nw2.clear();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Password updated', style: GoogleFonts.inter())),
        );
      }
    } catch (e) {
      setState(() => _err = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _linkGoogle() async {
    final t = _googleToken.text.trim();
    if (t.isEmpty) {
      setState(() => _err = 'Paste a Google id_token (from web/mobile OAuth) first.');
      return;
    }
    setState(() {
      _err = null;
      _busy = true;
    });
    final api = context.read<NeighborlyApiService>();
    try {
      await api.linkGoogleAccount(t);
      _googleToken.clear();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Google account linked', style: GoogleFonts.inter())),
        );
      }
    } catch (e) {
      setState(() => _err = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _mfaChange(bool v) async {
    setState(() => _busy = true);
    final api = context.read<NeighborlyApiService>();
    try {
      await api.updateProfile({'mfaEnabled': v});
      setState(() => _mfa = v);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$e', style: GoogleFonts.inter())),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final u = context.watch<NeighborlyApiService>().user;
    final linked = u?.googleLinked == true;

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        _secTitle('Google account', cs),
        ListTile(
          contentPadding: EdgeInsets.zero,
          title: Text('Login with Google', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
          subtitle: Text(
            linked ? 'CONNECTED' : 'NOT LINKED',
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: linked ? Colors.green[700] : cs.secondary,
            ),
          ),
          trailing: Card(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              child: Text(linked ? 'Connected' : 'Optional', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w800)),
            ),
          ),
        ),
        Text(
          'Paste a Google `id_token` to link (same token your web app uses with POST /api/auth/google). In production, replace this with the Google Sign-In button.',
          style: GoogleFonts.inter(fontSize: 11, color: cs.secondary, height: 1.3),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _googleToken,
          maxLines: 2,
          decoration: InputDecoration(
            labelText: 'id_token (optional link)',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerLeft,
          child: FilledButton.tonal(
            onPressed: _busy || linked ? null : _linkGoogle,
            child: Text('Link Google account', style: GoogleFonts.inter(fontWeight: FontWeight.w800)),
          ),
        ),
        const SizedBox(height: 24),
        _secTitle('Change password', cs),
        TextField(
          controller: _old,
          obscureText: true,
          decoration: InputDecoration(
            labelText: 'Current password',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _nw1,
          obscureText: true,
          decoration: InputDecoration(
            labelText: 'New password',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _nw2,
          obscureText: true,
          decoration: InputDecoration(
            labelText: 'Confirm new password',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        if (_err != null) ...[
          const SizedBox(height: 8),
          Text(_err!, style: GoogleFonts.inter(color: cs.error, fontSize: 12)),
        ],
        const SizedBox(height: 12),
        FilledButton(
          onPressed: _busy ? null : _changePassword,
          child: _busy
              ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : Text('Update password', style: GoogleFonts.inter(fontWeight: FontWeight.w800)),
        ),
        const SizedBox(height: 24),
        _secTitle('Two-factor (Google Authenticator style)', cs),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          value: _mfa,
          onChanged: _busy ? null : _mfaChange,
          title: Text('Require authenticator for sensitive actions', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
          subtitle: Text(
            'When enabled, your account flags MFA in the app. Full TOTP setup can be added next to this toggle.',
            style: GoogleFonts.inter(fontSize: 12, color: cs.secondary),
          ),
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _secTitle(String t, ColorScheme cs) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        t,
        style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 0.6, color: cs.secondary),
      ),
    );
  }
}

