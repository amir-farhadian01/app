import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/user_model.dart';
import '../services/neighborly_api_service.dart';
import '../theme/account_hub_style.dart';
import '../widgets/customer_profile_hub_body.dart';
import '../widgets/theme_toggle_pill.dart';
import 'account_center_screen.dart';
import 'finance_screen.dart';
import 'kyc_screen.dart';
import 'notifications_screen.dart';
import 'neighborly_account_screen.dart';

const _kAppVersion = '1.0.0';
const _kPushNotifsPref = 'push_notifs_enabled';

class _CountryDial {
  const _CountryDial({required this.flag, required this.name, required this.code});
  final String flag;
  final String name;
  final String code;
}

const _countries = <_CountryDial>[
  _CountryDial(flag: '🇨🇦', name: 'Canada', code: '+1'),
  _CountryDial(flag: '🇺🇸', name: 'United States', code: '+1'),
  _CountryDial(flag: '🇬🇧', name: 'United Kingdom', code: '+44'),
  _CountryDial(flag: '🇦🇺', name: 'Australia', code: '+61'),
  _CountryDial(flag: '🇮🇷', name: 'Iran', code: '+98'),
];

String _digitsOnly(String s) => s.replaceAll(RegExp(r'\D'), '');

/// Tabbed profile: Personal, Security, Identity, Settings.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _firstNameFocus = FocusNode();

  final _firstNameCtrl = TextEditingController();
  final _lastNameCtrl = TextEditingController();
  final _displayNameCtrl = TextEditingController();
  final _phoneNationalCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _bioCtrl = TextEditingController();

  _CountryDial _selectedCountry = _countries[0];
  bool _displayNameUserEdited = false;
  bool _personalSaving = false;
  String? _boundUserId;
  bool _bindScheduled = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _firstNameCtrl.addListener(_maybeAutofillDisplayName);
    _lastNameCtrl.addListener(_maybeAutofillDisplayName);
    _displayNameCtrl.addListener(() {
      if (_displayNameCtrl.text.isNotEmpty) _displayNameUserEdited = true;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _loadUserStats();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _firstNameFocus.dispose();
    _firstNameCtrl.dispose();
    _lastNameCtrl.dispose();
    _displayNameCtrl.dispose();
    _phoneNationalCtrl.dispose();
    _addressCtrl.dispose();
    _bioCtrl.dispose();
    super.dispose();
  }

  void _maybeAutofillDisplayName() {
    if (_displayNameUserEdited) return;
    final f = _firstNameCtrl.text.trim();
    final l = _lastNameCtrl.text.trim();
    if (f.isNotEmpty && l.isNotEmpty) {
      final combined = '$f $l';
      if (_displayNameCtrl.text != combined) {
        _displayNameCtrl.text = combined;
      }
    }
  }

  Future<void> _loadUserStats() async {
    try {
      await context.read<NeighborlyApiService>().refreshUserStats();
    } catch (_) {}
  }

  void _populateControllersFromUser(UserModel user) {
    final parts = user.displayName.split(' ');
    final fn = user.firstName ?? (parts.isNotEmpty ? parts.first : '');
    final ln = user.lastName ?? (parts.length > 1 ? parts.sublist(1).join(' ') : '');

    _firstNameCtrl.text = fn;
    _lastNameCtrl.text = ln;
    _displayNameCtrl.text = user.displayName.trim().isEmpty ? '$fn $ln'.trim() : user.displayName;
    _displayNameUserEdited = false;
    _bioCtrl.text = user.bio ?? '';
    _addressCtrl.text = user.location ?? '';

    final parsed = _parsePhone(user.phone);
    _selectedCountry = parsed.$1;
    _phoneNationalCtrl.text = parsed.$2;
  }

  (_CountryDial, String) _parsePhone(String? raw) {
    if (raw == null || raw.trim().isEmpty) {
      return (_countries[0], '');
    }
    final t = raw.trim();
    if (t.startsWith('+98')) return (_countries[4], _digitsOnly(t.substring(3)));
    if (t.startsWith('+61')) return (_countries[3], _digitsOnly(t.substring(3)));
    if (t.startsWith('+44')) return (_countries[2], _digitsOnly(t.substring(3)));
    if (t.startsWith('+1')) {
      final d = _digitsOnly(t.substring(2));
      return (t.contains('US') ? _countries[1] : _countries[0], d);
    }
    final d = _digitsOnly(t);
    if (d.length == 11 && d.startsWith('1')) {
      return (_countries[0], d.substring(1));
    }
    if (d.length == 10) {
      return (_countries[0], d);
    }
    return (_countries[0], d);
  }

  String _phoneForApi() {
    final national = _digitsOnly(_phoneNationalCtrl.text);
    if (national.isEmpty) return '';
    return '${_selectedCountry.code}$national';
  }

  Future<void> _savePersonal() async {
    final api = context.read<NeighborlyApiService>();
    setState(() => _personalSaving = true);
    try {
      final display = _displayNameCtrl.text.trim();
      final fn = _firstNameCtrl.text.trim();
      final ln = _lastNameCtrl.text.trim();
      final phoneOut = _phoneForApi();
      await api.updateProfile({
        'displayName': display.isEmpty ? null : display,
        'firstName': fn.isEmpty ? null : fn,
        'lastName': ln.isEmpty ? null : ln,
        'phone': phoneOut.isEmpty ? null : phoneOut,
        'bio': _bioCtrl.text.trim().isEmpty ? null : _bioCtrl.text.trim(),
        'location': _addressCtrl.text.trim().isEmpty ? null : _addressCtrl.text.trim(),
      });
      if (!mounted) return;
      final u = api.user;
      if (u != null) {
        setState(() => _populateControllersFromUser(u));
      }
      _displayNameUserEdited = false;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Profile updated', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('$e', style: GoogleFonts.inter()),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _personalSaving = false);
    }
  }

  void _focusPersonalFirstName() {
    _tabController.animateTo(0);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        FocusScope.of(context).requestFocus(_firstNameFocus);
      }
    });
  }

  void _pickCountry(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: cs.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: ListView(
            shrinkWrap: true,
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  'Country code',
                  style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700),
                ),
              ),
              for (final c in _countries)
                ListTile(
                  leading: Text(c.flag, style: const TextStyle(fontSize: 22)),
                  title: Text(c.name, style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
                  trailing: Text(c.code, style: GoogleFonts.inter(color: cs.secondary)),
                  onTap: () {
                    setState(() => _selectedCountry = c);
                    Navigator.pop(ctx);
                  },
                ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final api = context.watch<NeighborlyApiService>();
    final user = api.user;
    final cs = Theme.of(context).colorScheme;

    if (user == null) {
      _boundUserId = null;
      return _GuestProfile(cs: cs);
    }

    if (_boundUserId != user.uid && !_bindScheduled) {
      _bindScheduled = true;
      final u = user;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _bindScheduled = false;
        if (!mounted) return;
        if (api.user?.uid != u.uid) return;
        setState(() {
          _populateControllersFromUser(u);
          _boundUserId = u.uid;
        });
      });
    }

    if (user.role == 'customer') {
      return Scaffold(
        backgroundColor: AccountHubStyle.pageBackground(context),
        resizeToAvoidBottomInset: true,
        body: CustomerProfileHubBody(
          user: user,
          onEditPersonal: () {
            Navigator.of(context).push<void>(
              MaterialPageRoute<void>(
                fullscreenDialog: true,
                builder: (_) => const NeighborlyAccountScreen(initialTab: 0),
              ),
            );
          },
          onBecomeProvider: () => _showBecomeProviderDialog(context),
        ),
      );
    }

    return Scaffold(
      backgroundColor: cs.surface,
      resizeToAvoidBottomInset: true,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _ProfileHeader(
            user: user,
            cs: cs,
            onAvatarTap: () => _showAvatarOptions(context),
            onEditTap: _focusPersonalFirstName,
          ),
          Material(
            color: cs.surface,
            child: AnimatedBuilder(
              animation: _tabController,
              builder: (context, _) {
                return TabBar(
                  controller: _tabController,
                  labelPadding: EdgeInsets.zero,
                  indicatorColor: cs.primary,
                  indicatorWeight: 3,
                  indicatorSize: TabBarIndicatorSize.tab,
                  dividerColor: cs.outline,
                  tabs: [
                    _profileTab(LucideIcons.user, 'Personal', cs, 0),
                    _profileTab(LucideIcons.lock, 'Security', cs, 1),
                    _profileTab(LucideIcons.shieldCheck, 'Identity', cs, 2),
                    _profileTab(LucideIcons.settings, 'Settings', cs, 3),
                  ],
                );
              },
            ),
          ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _PersonalTab(
                  cs: cs,
                  user: user,
                  firstNameCtrl: _firstNameCtrl,
                  lastNameCtrl: _lastNameCtrl,
                  displayNameCtrl: _displayNameCtrl,
                  phoneNationalCtrl: _phoneNationalCtrl,
                  addressCtrl: _addressCtrl,
                  bioCtrl: _bioCtrl,
                  firstNameFocus: _firstNameFocus,
                  selectedCountry: _selectedCountry,
                  onPickCountry: () => _pickCountry(context),
                  saving: _personalSaving,
                  onSave: _savePersonal,
                  onRefresh: _loadUserStats,
                  onBecomeProvider: () => _showBecomeProviderDialog(context),
                ),
                _SecurityTab(
                  cs: cs,
                  user: user,
                  api: api,
                ),
                _IdentityTab(
                  cs: cs,
                  user: user,
                  onKyc: () => _navigateToKyc(context),
                ),
                _SettingsTab(
                  cs: cs,
                  api: api,
                  onFinance: () => _navigateToFinance(context),
                  onNotifications: () => _navigateToNotifications(context),
                  onAccountCenter: () => _openAccountCenter(context),
                  onLogout: () {
                    _confirmSignOut(context, api);
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Tab _profileTab(IconData icon, String label, ColorScheme cs, int index) {
    final active = _tabController.index == index;
    return Tab(
      height: 60,
      child: Semantics(
        label: '$label tab',
        button: true,
        selected: active,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 20, color: active ? cs.onSurface : cs.secondary),
            const SizedBox(height: 4),
            Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: active ? cs.onSurface : cs.secondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _openAccountCenter(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute<void>(builder: (_) => const AccountCenterScreen()),
    );
  }

  void _navigateToFinance(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute<void>(builder: (_) => const FinanceScreen()),
    );
  }

  void _navigateToNotifications(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute<void>(builder: (_) => const NotificationsScreen()),
    );
  }

  void _navigateToKyc(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute<void>(builder: (_) => const KycScreen()),
    );
  }

  void _showAvatarOptions(BuildContext context) {
    _showComingSoon(context, 'Avatar Upload');
  }

  void _showBecomeProviderDialog(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Become a Provider', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
        content: Text(
          'Would you like to start offering services? You\'ll need to complete verification first.',
          style: GoogleFonts.inter(),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel', style: GoogleFonts.inter()),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pushNamed(context, '/kyc');
            },
            child: Text('Continue', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmSignOut(BuildContext context, NeighborlyApiService api) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Sign out', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
        content: Text('Are you sure you want to sign out?', style: GoogleFonts.inter()),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text('Cancel', style: GoogleFonts.inter())),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Sign out')),
        ],
      ),
    );
    if (ok == true && context.mounted) {
      await api.logout();
      if (context.mounted) {
        Navigator.of(context).pushNamedAndRemoveUntil('/auth', (r) => false);
      }
    }
  }

  void _showComingSoon(BuildContext context, String feature) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$feature coming soon!', style: GoogleFonts.inter()),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}

class _GuestProfile extends StatelessWidget {
  const _GuestProfile({required this.cs});

  final ColorScheme cs;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(LucideIcons.user, size: 64, color: cs.secondary.withValues(alpha: 0.5)),
            const SizedBox(height: 20),
            Text(
              'Profile & Account',
              style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w800, color: cs.onSurface),
            ),
            const SizedBox(height: 12),
            Text(
              'Sign in to see your profile, manage your services, and track your activity.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(fontSize: 15, color: cs.secondary, height: 1.5),
            ),
            const SizedBox(height: 32),
            FilledButton.icon(
              onPressed: () => Navigator.pushNamed(context, '/auth'),
              icon: const Icon(LucideIcons.logIn, size: 18),
              label: Text('Sign In', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader({
    required this.user,
    required this.cs,
    required this.onAvatarTap,
    required this.onEditTap,
  });

  final UserModel user;
  final ColorScheme cs;
  final VoidCallback onAvatarTap;
  final VoidCallback onEditTap;

  @override
  Widget build(BuildContext context) {
    final name = user.displayName.trim().isEmpty ? user.email.split('@').first : user.displayName;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Hero(
            tag: 'profile-avatar',
            child: Semantics(
              label: 'Profile photo, tap to change',
              button: true,
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: onAvatarTap,
                  borderRadius: BorderRadius.circular(40),
                  child: Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: cs.primaryContainer,
                      border: Border.all(color: cs.primary.withValues(alpha: 0.2), width: 2),
                    ),
                    child: user.photoURL != null && user.photoURL!.isNotEmpty
                        ? ClipOval(
                            child: Image.network(
                              user.photoURL!,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => _fallback(name, cs),
                            ),
                          )
                        : _fallback(name, cs),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w700, color: cs.onSurface),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  user.email,
                  style: GoogleFonts.inter(fontSize: 13, color: cs.secondary),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: cs.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(100),
                  ),
                  child: Text(
                    _roleLabel(user.role),
                    style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: cs.onSurface),
                  ),
                ),
              ],
            ),
          ),
          Semantics(
            label: 'Edit profile',
            button: true,
            child: SizedBox(
              width: 40,
              height: 40,
              child: IconButton(
                onPressed: onEditTap,
                icon: Icon(LucideIcons.pencil, size: 20, color: cs.primary),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _fallback(String name, ColorScheme cs) {
    return Center(
      child: Text(
        name.isNotEmpty ? name[0].toUpperCase() : '?',
        style: GoogleFonts.inter(fontSize: 28, fontWeight: FontWeight.w800, color: cs.onPrimaryContainer),
      ),
    );
  }

  String _roleLabel(String role) {
    switch (role) {
      case 'provider':
        return 'Service Provider';
      case 'owner':
        return 'Business Owner';
      case 'customer':
        return 'Customer';
      default:
        return role.isEmpty ? 'User' : '${role[0].toUpperCase()}${role.length > 1 ? role.substring(1) : ''}';
    }
  }
}

class _PersonalTab extends StatelessWidget {
  const _PersonalTab({
    required this.cs,
    required this.user,
    required this.firstNameCtrl,
    required this.lastNameCtrl,
    required this.displayNameCtrl,
    required this.phoneNationalCtrl,
    required this.addressCtrl,
    required this.bioCtrl,
    required this.firstNameFocus,
    required this.selectedCountry,
    required this.onPickCountry,
    required this.saving,
    required this.onSave,
    required this.onRefresh,
    required this.onBecomeProvider,
  });

  final ColorScheme cs;
  final UserModel user;
  final TextEditingController firstNameCtrl;
  final TextEditingController lastNameCtrl;
  final TextEditingController displayNameCtrl;
  final TextEditingController phoneNationalCtrl;
  final TextEditingController addressCtrl;
  final TextEditingController bioCtrl;
  final FocusNode firstNameFocus;
  final _CountryDial selectedCountry;
  final VoidCallback onPickCountry;
  final bool saving;
  final Future<void> Function() onSave;
  final Future<void> Function() onRefresh;
  final VoidCallback onBecomeProvider;

  @override
  Widget build(BuildContext context) {
    final stats = user.stats;
    const spentLabel = '—';

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
        children: [
          TextFormField(
            controller: firstNameCtrl,
            focusNode: firstNameFocus,
            autofillHints: const [AutofillHints.givenName],
            decoration: InputDecoration(
              labelText: 'First name',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
            ),
            style: GoogleFonts.inter(fontSize: 15),
            textInputAction: TextInputAction.next,
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: lastNameCtrl,
            autofillHints: const [AutofillHints.familyName],
            decoration: InputDecoration(
              labelText: 'Last name',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
            ),
            style: GoogleFonts.inter(fontSize: 15),
            textInputAction: TextInputAction.next,
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: displayNameCtrl,
            autofillHints: const [AutofillHints.name],
            decoration: InputDecoration(
              labelText: 'Display name',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
            ),
            style: GoogleFonts.inter(fontSize: 15),
            textInputAction: TextInputAction.next,
          ),
          const SizedBox(height: 16),
          Text('Phone', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: cs.secondary)),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Semantics(
                label: 'Country code ${selectedCountry.name}',
                button: true,
                child: Material(
                  color: cs.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(14),
                  child: InkWell(
                    onTap: onPickCountry,
                    borderRadius: BorderRadius.circular(14),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(selectedCountry.flag, style: const TextStyle(fontSize: 20)),
                          const SizedBox(width: 8),
                          Text(selectedCountry.code, style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
                          Icon(LucideIcons.chevronDown, size: 16, color: cs.secondary),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextFormField(
                  controller: phoneNationalCtrl,
                  keyboardType: TextInputType.phone,
                  autofillHints: const [AutofillHints.telephoneNumber],
                  decoration: InputDecoration(
                    labelText: 'Phone number',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  style: GoogleFonts.inter(fontSize: 15),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: addressCtrl,
            autofillHints: const [AutofillHints.fullStreetAddress],
            decoration: InputDecoration(
              labelText: 'Address',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
            ),
            style: GoogleFonts.inter(fontSize: 15),
            maxLines: 1,
            textInputAction: TextInputAction.next,
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: bioCtrl,
            autofillHints: const [AutofillHints.jobTitle],
            decoration: InputDecoration(
              labelText: 'Bio',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
              alignLabelWithHint: true,
            ),
            style: GoogleFonts.inter(fontSize: 15),
            maxLines: 3,
            maxLength: 200,
            buildCounter: (context, {required currentLength, required isFocused, maxLength}) {
              return Text(
                '$currentLength / $maxLength',
                style: GoogleFonts.inter(fontSize: 12, color: cs.secondary),
              );
            },
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: saving
                ? null
                : () async {
                    await onSave();
                  },
            style: FilledButton.styleFrom(
              minimumSize: const Size(double.infinity, 52),
              padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
            ),
            child: saving
                ? SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: cs.onPrimary),
                  )
                : Text('Save Changes', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 15)),
          ),
          const SizedBox(height: 28),
          Row(
            children: [
              Expanded(
                child: _MiniStatCard(
                  value: '${stats?.totalRequests ?? 0}',
                  label: 'Total Requests',
                  cs: cs,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _MiniStatCard(
                  value: spentLabel,
                  label: 'Total Spent',
                  cs: cs,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _MiniStatCard(
                  value: '${stats?.activeContracts ?? 0}',
                  label: 'Active Jobs',
                  cs: cs,
                ),
              ),
            ],
          ),
          if (user.role == 'customer') ...[
            const SizedBox(height: 24),
            Material(
              color: cs.primary,
              borderRadius: BorderRadius.circular(20),
              child: InkWell(
                onTap: onBecomeProvider,
                borderRadius: BorderRadius.circular(20),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Icon(LucideIcons.briefcase, color: cs.onPrimary, size: 22),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Become a Provider',
                              style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: cs.onPrimary),
                            ),
                            Text(
                              'Offer services to neighbors',
                              style: GoogleFonts.inter(fontSize: 13, color: cs.onPrimary.withValues(alpha: 0.8)),
                            ),
                          ],
                        ),
                      ),
                      Icon(LucideIcons.chevronRight, color: cs.onPrimary, size: 18),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _MiniStatCard extends StatelessWidget {
  const _MiniStatCard({required this.value, required this.label, required this.cs});

  final String value;
  final String label;
  final ColorScheme cs;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
      decoration: BoxDecoration(
        color: cs.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cs.outline.withValues(alpha: 0.2)),
      ),
      child: Column(
        children: [
          Text(value, style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800, color: cs.onSurface)),
          const SizedBox(height: 4),
          Text(
            label,
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(fontSize: 11, color: cs.secondary, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }
}

class _SecurityTab extends StatelessWidget {
  const _SecurityTab({required this.cs, required this.user, required this.api});

  final ColorScheme cs;
  final UserModel user;
  final NeighborlyApiService api;

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
      children: [
        _SecurityCard(
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            minVerticalPadding: 20,
            leading: Icon(LucideIcons.keyRound, color: cs.primary, size: 22),
            title: Text('Change password', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 15)),
            subtitle: Text('Update your sign-in password', style: GoogleFonts.inter(fontSize: 13, color: cs.secondary)),
            trailing: Icon(LucideIcons.chevronRight, color: cs.secondary, size: 18),
            onTap: () => _openChangePassword(context, api),
          ),
        ),
        const SizedBox(height: 12),
        _SecurityCard(
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            minVerticalPadding: 20,
            leading: Icon(LucideIcons.mail, color: cs.primary, size: 22),
            title: Text(
              user.googleLinked ? 'Google Account Linked ✓' : 'Link Google Account',
              style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 15),
            ),
            subtitle: Text(
              user.googleLinked ? (user.email) : 'Sign in faster with Google',
              style: GoogleFonts.inter(fontSize: 13, color: cs.secondary),
            ),
            trailing: Icon(LucideIcons.chevronRight, color: cs.secondary, size: 18),
            onTap: () => _onGoogleCard(context, user),
          ),
        ),
        const SizedBox(height: 12),
        _SecurityCard(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 8, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(LucideIcons.shield, color: cs.primary, size: 22),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Two-factor authentication',
                            style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 15),
                          ),
                          Text(
                            user.mfaEnabled ? 'Enabled' : 'Disabled',
                            style: GoogleFonts.inter(fontSize: 13, color: cs.secondary),
                          ),
                        ],
                      ),
                    ),
                    _MfaSwitch(user: user, api: api),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Adds an extra layer of protection when signing in.',
                  style: GoogleFonts.inter(fontSize: 13, color: cs.secondary, height: 1.35),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        _SecurityCard(
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            minVerticalPadding: 20,
            leading: Icon(LucideIcons.monitor, color: cs.primary, size: 22),
            title: Text('Active sessions', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 15)),
            subtitle: Text('Manage where you\'re signed in.', style: GoogleFonts.inter(fontSize: 13, color: cs.secondary)),
            trailing: Icon(LucideIcons.chevronRight, color: cs.secondary, size: 18),
            onTap: () => _sessionsSheet(context, api),
          ),
        ),
      ],
    );
  }

  void _onGoogleCard(BuildContext context, UserModel user) {
    if (user.googleLinked) {
      showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text('Unlink Google', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
          content: Text('Unlinking Google is not available in the app yet. Use the web app or contact support.', style: GoogleFonts.inter()),
          actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK'))],
        ),
      );
      return;
    }
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 24,
            right: 24,
            top: 24,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Google login', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              Text(
                'Sign in faster with your Google account. Linking will be available in a future update.',
                style: GoogleFonts.inter(fontSize: 15, color: Theme.of(context).colorScheme.secondary, height: 1.4),
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Google linking — coming soon', style: GoogleFonts.inter(fontWeight: FontWeight.w600))),
                  );
                },
                child: Text('Connect Google', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
              ),
            ],
          ),
        );
      },
    );
  }

  void _openChangePassword(BuildContext context, NeighborlyApiService api) {
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
      isDismissible: false,
      enableDrag: false,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setModal) {
            final sheetCs = Theme.of(ctx).colorScheme;
            Future<void> submit() async {
              if (nw.text != nw2.text) {
                ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text('Passwords do not match', style: GoogleFonts.inter())));
                return;
              }
              if (nw.text.length < 8) {
                ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text('Min 8 characters', style: GoogleFonts.inter())));
                return;
              }
              setModal(() => busy = true);
              try {
                await api.changePassword(currentPassword: current.text, newPassword: nw.text);
                if (ctx.mounted) {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Password updated', style: GoogleFonts.inter(fontWeight: FontWeight.w600))),
                  );
                }
              } catch (e) {
                if (ctx.mounted) {
                  ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text('$e', style: GoogleFonts.inter())));
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
                        Expanded(
                          child: Text(
                            'Change Password',
                            style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w700),
                          ),
                        ),
                        IconButton(onPressed: busy ? null : () => Navigator.pop(ctx), icon: const Icon(LucideIcons.x)),
                      ],
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: current,
                      obscureText: obscure1,
                      autofillHints: const [AutofillHints.password],
                      decoration: InputDecoration(
                        labelText: 'Current password',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
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
                      autofillHints: const [AutofillHints.newPassword],
                      decoration: InputDecoration(
                        labelText: 'New password',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
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
                      autofillHints: const [AutofillHints.newPassword],
                      decoration: InputDecoration(
                        labelText: 'Confirm new password',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                        suffixIcon: IconButton(
                          icon: Icon(obscure3 ? LucideIcons.eye : LucideIcons.eyeOff),
                          onPressed: () => setModal(() => obscure3 = !obscure3),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: busy ? null : submit,
                      style: FilledButton.styleFrom(minimumSize: const Size(double.infinity, 52)),
                      child: busy
                          ? SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: sheetCs.onPrimary))
                          : Text('Update Password', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
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

  void _sessionsSheet(BuildContext context, NeighborlyApiService api) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Sessions', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700)),
                const SizedBox(height: 16),
                ListTile(
                  leading: const Icon(LucideIcons.smartphone),
                  title: Text('Current device', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
                  subtitle: Text('Active now', style: GoogleFonts.inter(fontSize: 13, color: Theme.of(ctx).colorScheme.secondary)),
                ),
                const SizedBox(height: 12),
                OutlinedButton(
                  onPressed: () async {
                    Navigator.pop(ctx);
                    await api.logout();
                    if (context.mounted) {
                      Navigator.of(context).pushNamedAndRemoveUntil('/auth', (r) => false);
                    }
                  },
                  child: Text('Sign out all other devices', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _SecurityCard extends StatelessWidget {
  const _SecurityCard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Material(
      color: cs.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(color: cs.outline.withValues(alpha: 0.25)),
      ),
      clipBehavior: Clip.antiAlias,
      child: child,
    );
  }
}

class _MfaSwitch extends StatefulWidget {
  const _MfaSwitch({required this.user, required this.api});

  final UserModel user;
  final NeighborlyApiService api;

  @override
  State<_MfaSwitch> createState() => _MfaSwitchState();
}

class _MfaSwitchState extends State<_MfaSwitch> {
  late bool _v;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _v = widget.user.mfaEnabled;
  }

  @override
  void didUpdateWidget(covariant _MfaSwitch oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.user.mfaEnabled != widget.user.mfaEnabled) {
      _v = widget.user.mfaEnabled;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Switch.adaptive(
      value: _v,
      onChanged: _busy
          ? null
          : (nv) async {
              setState(() {
                _busy = true;
                _v = nv;
              });
              try {
                await widget.api.updateProfile({'mfaEnabled': nv});
              } catch (e) {
                setState(() => _v = !nv);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e', style: GoogleFonts.inter())));
                }
              } finally {
                if (mounted) setState(() => _busy = false);
              }
            },
    );
  }
}

class _IdentityTab extends StatelessWidget {
  const _IdentityTab({required this.cs, required this.user, required this.onKyc});

  final ColorScheme cs;
  final UserModel user;
  final VoidCallback onKyc;

  @override
  Widget build(BuildContext context) {
    final kyc = user.kyc;
    final complete = kyc.canPlaceOrder;

    Color statusColor;
    String statusTitle;
    if (complete) {
      statusColor = Colors.green;
      statusTitle = 'Verified';
    } else if (kyc.level >= 1) {
      statusColor = Colors.orange;
      statusTitle = 'In progress';
    } else {
      statusColor = cs.primary;
      statusTitle = 'Not started';
    }

    String cta;
    if (complete) {
      cta = 'View Status →';
    } else if (kyc.level >= 1 || kyc.status == 'pending') {
      cta = 'Continue →';
    } else {
      cta = 'Start Verification';
    }

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: statusColor.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: statusColor.withValues(alpha: 0.35)),
          ),
          child: Row(
            children: [
              Icon(LucideIcons.shieldCheck, color: statusColor, size: 28),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Identity status', style: GoogleFonts.inter(fontSize: 13, color: cs.secondary)),
                    Text(statusTitle, style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w800, color: cs.onSurface)),
                  ],
                ),
              ),
            ],
          ),
        ),
        if (kyc.status == 'rejected' && (kyc.reviewNote != null && kyc.reviewNote!.isNotEmpty)) ...[
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.amber.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.amber.withValues(alpha: 0.5)),
            ),
            child: Text(
              kyc.reviewNote!,
              style: GoogleFonts.inter(fontSize: 14, color: cs.onSurface, height: 1.35),
            ),
          ),
        ],
        const SizedBox(height: 20),
        _StepCard(
          cs: cs,
          step: 0,
          title: 'Level 0: Basics',
          subtitle: 'Email, phone, address',
          trailing: _step01Trail(kyc, cs, addressFilled: (user.location ?? '').trim().isNotEmpty),
        ),
        const SizedBox(height: 12),
        _StepCard(
          cs: cs,
          step: 1,
          title: 'Level 1: Personal ID',
          subtitle: 'ID document & verification',
          trailing: Text(
            kyc.identityVerified ? 'Verified' : kyc.status == 'pending' ? 'Pending' : kyc.status == 'rejected' ? 'Rejected' : 'Incomplete',
            style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: cs.secondary),
          ),
        ),
        if (user.role == 'provider') ...[
          const SizedBox(height: 12),
          _StepCard(
            cs: cs,
            step: 2,
            title: 'Level 2: Business',
            subtitle: 'Provider verification',
            trailing: Text(
              user.role == 'provider' ? (complete ? 'Complete' : 'Required') : '—',
              style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: cs.secondary),
            ),
          ),
        ],
        const SizedBox(height: 24),
        FilledButton(
          onPressed: onKyc,
          style: FilledButton.styleFrom(minimumSize: const Size(double.infinity, 52)),
          child: Text(cta, style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 15)),
        ),
      ],
    );
  }

  Widget _step01Trail(KycStatus kyc, ColorScheme cs, {required bool addressFilled}) {
    final email = kyc.emailVerified ? '✅' : '⬜';
    final phone = kyc.phoneVerified ? '✅' : '⬜';
    final addr = addressFilled ? '✅' : '⬜';
    return Text(
      '$email Email  $phone Phone  $addr Address',
      style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: cs.secondary),
      textAlign: TextAlign.right,
    );
  }
}

class _StepCard extends StatelessWidget {
  const _StepCard({
    required this.cs,
    required this.step,
    required this.title,
    required this.subtitle,
    required this.trailing,
  });

  final ColorScheme cs;
  final int step;
  final String title;
  final String subtitle;
  final Widget trailing;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cs.surfaceContainerHighest.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: cs.outline.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: cs.primary, shape: BoxShape.circle),
            child: Text(
              '$step',
              style: GoogleFonts.inter(fontWeight: FontWeight.w800, color: cs.onPrimary),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700)),
                Text(subtitle, style: GoogleFonts.inter(fontSize: 13, color: cs.secondary)),
              ],
            ),
          ),
          trailing,
        ],
      ),
    );
  }
}

class _SettingsTab extends StatefulWidget {
  const _SettingsTab({
    required this.cs,
    required this.api,
    required this.onFinance,
    required this.onNotifications,
    required this.onAccountCenter,
    required this.onLogout,
  });

  final ColorScheme cs;
  final NeighborlyApiService api;
  final VoidCallback onFinance;
  final VoidCallback onNotifications;
  final VoidCallback onAccountCenter;
  final VoidCallback onLogout;

  @override
  State<_SettingsTab> createState() => _SettingsTabState();
}

class _SettingsTabState extends State<_SettingsTab> {
  bool _push = true;

  @override
  void initState() {
    super.initState();
    _loadPush();
  }

  Future<void> _loadPush() async {
    final p = await SharedPreferences.getInstance();
    if (mounted) {
      setState(() => _push = p.getBool(_kPushNotifsPref) ?? true);
    }
  }

  Future<void> _setPush(bool v) async {
    final p = await SharedPreferences.getInstance();
    await p.setBool(_kPushNotifsPref, v);
    if (mounted) setState(() => _push = v);
  }

  @override
  Widget build(BuildContext context) {
    final cs = widget.cs;

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
      children: [
        Text('Appearance', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: cs.onSurface)),
        const SizedBox(height: 8),
        const _SettingsCard(child: ThemeTogglePill()),
        const SizedBox(height: 20),
        _SettingsCard(
          child: SwitchListTile.adaptive(
            title: Text('Push notifications', style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 15)),
            subtitle: Text(
              // TODO: wire to backend when push endpoints exist
              'Get alerts about messages and bookings.',
              style: GoogleFonts.inter(fontSize: 13, color: cs.secondary),
            ),
            value: _push,
            onChanged: _setPush,
          ),
        ),
        const SizedBox(height: 12),
        _SettingsCard(
          child: ListTile(
            title: Text('Language', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
            subtitle: Text('English', style: GoogleFonts.inter(color: cs.secondary)),
            trailing: Icon(LucideIcons.chevronRight, color: cs.secondary),
            onTap: () {
              showDialog<void>(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: Text('Language', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
                  content: Text('More languages coming soon.', style: GoogleFonts.inter()),
                  actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK'))],
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 12),
        _SettingsCard(
          child: Column(
            children: [
              ListTile(
                title: Text('App version', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
                subtitle: Text(_kAppVersion, style: GoogleFonts.inter(color: cs.secondary)),
              ),
              ListTile(
                title: Text('Privacy Policy', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
                trailing: Icon(LucideIcons.chevronRight, color: cs.secondary),
                onTap: () => _legalSheet(context, 'Privacy Policy', 'Privacy policy text will appear here.'),
              ),
              ListTile(
                title: Text('Terms of Service', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
                trailing: Icon(LucideIcons.chevronRight, color: cs.secondary),
                onTap: () => _legalSheet(context, 'Terms of Service', 'Terms of service text will appear here.'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        _SettingsCard(
          child: Column(
            children: [
              ListTile(
                leading: Icon(LucideIcons.wallet, color: cs.primary),
                title: Text('Payments & history', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
                trailing: Icon(LucideIcons.chevronRight, color: cs.secondary),
                onTap: widget.onFinance,
              ),
              ListTile(
                leading: Icon(LucideIcons.bell, color: cs.primary),
                title: Text('Messages & notifications', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
                trailing: Icon(LucideIcons.chevronRight, color: cs.secondary),
                onTap: widget.onNotifications,
              ),
              ListTile(
                leading: Icon(LucideIcons.userCircle, color: cs.primary),
                title: Text('Advanced account & security', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
                subtitle: Text('Devices, safety, detailed settings', style: GoogleFonts.inter(fontSize: 12, color: cs.secondary)),
                trailing: Icon(LucideIcons.chevronRight, color: cs.secondary),
                onTap: widget.onAccountCenter,
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        Text('Account', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: cs.error)),
        const SizedBox(height: 8),
        OutlinedButton(
          onPressed: () => widget.onLogout(),
          style: OutlinedButton.styleFrom(
            foregroundColor: cs.error,
            side: BorderSide(color: cs.error),
            minimumSize: const Size(double.infinity, 52),
          ),
          child: Text('Sign out', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
        ),
        const SizedBox(height: 12),
        TextButton(
          onPressed: () {
            showDialog<void>(
              context: context,
              builder: (ctx) => AlertDialog(
                title: Text('Delete account', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
                content: Text('Please contact support to delete your account.', style: GoogleFonts.inter()),
                actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK'))],
              ),
            );
          },
          child: Text('Delete Account', style: GoogleFonts.inter(color: cs.error, fontWeight: FontWeight.w700)),
        ),
      ],
    );
  }

  void _legalSheet(BuildContext context, String title, String body) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Theme.of(context).colorScheme.surface,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(title, style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              Text(body, style: GoogleFonts.inter(fontSize: 15, height: 1.4)),
            ],
          ),
        );
      },
    );
  }
}

class _SettingsCard extends StatelessWidget {
  const _SettingsCard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Material(
      color: cs.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(color: cs.outline.withValues(alpha: 0.2)),
      ),
      clipBehavior: Clip.antiAlias,
      child: child,
    );
  }
}
