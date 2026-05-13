import 'dart:io';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../models/order_models.dart';
import '../models/user_model.dart';
import '../services/neighborly_api_service.dart';
import '../services/neighborly_theme_notifier.dart';

// ─── static legal strings ───────────────────────────────────────────────────

const _kTerms = '''
Terms and Conditions – Neighborly Platform
Effective date: January 1, 2025

1. Acceptance
By creating a Neighborly account or using our services you agree to these Terms. If you do not agree, please do not use the platform.

2. Description of Service
Neighborly is a local-services marketplace that connects customers with independent service providers. We provide the technology platform only; we are not a party to any service agreement between Customer and Provider.

3. Eligibility
You must be at least 18 years old and legally capable of entering binding contracts to use Neighborly. Accounts are personal and non-transferable.

4. Account Security
You are responsible for keeping your credentials secure. Notify us immediately at support@neighborly.app if you suspect unauthorized access.

5. Payments & Fees
Service fees are agreed between Customer and Provider. Neighborly may charge a platform fee disclosed at checkout. All payments are processed by our third-party payment partners.

6. Cancellations & Refunds
Cancellation and refund policies are set per order. Please review the Provider's policy before booking. Disputes may be escalated through the Neighborly resolution centre.

7. Prohibited Conduct
You may not use Neighborly to: violate any law; transmit harmful content; attempt to circumvent the platform; solicit Providers off-platform; or engage in fraud or misrepresentation.

8. Limitation of Liability
To the maximum extent permitted by law, Neighborly's total liability shall not exceed the amount paid by you in the three months preceding the claim.

9. Changes to Terms
We may update these Terms with 14 days' notice. Continued use after notice constitutes acceptance.

Contact: legal@neighborly.app
''';

const _kRules = '''
Community Rules – Neighborly Platform
Last updated: January 1, 2025

1. Be Respectful
Treat every person on the platform with courtesy and respect. Harassment, discrimination, or abusive language will result in immediate account suspension.

2. Be Honest
Provide accurate information in your profile, order requests, and reviews. Misleading information and identity fraud are grounds for permanent removal.

3. Safety First
Do not share personal financial details through the chat. All payments must go through the Neighborly checkout. Off-platform cash deals are not protected by our guarantee.

4. Keep Appointments
If you book a service, be present and prepared. If you need to cancel, do so at least 24 hours in advance.

5. Protect Privacy
Do not photograph, record, or share personal information about other users without explicit consent.

6. No Spam or Solicitation
Do not send unsolicited promotional messages or contact users for purposes unrelated to an active order.

7. Report Issues
If you witness rule violations, use the Report button or contact support@neighborly.app.

8. Fair Reviews
Reviews must reflect your genuine experience. Fake reviews or pressuring users for positive ratings is prohibited.

Violations may result in warnings, suspension, or permanent account removal.
''';

const _kPrivacy = '''
Privacy Policy – Neighborly Platform
Effective date: January 1, 2025

1. What We Collect
Account data: name, email, phone, profile photo, and address when you register.
Usage data: pages visited, features used, search queries, device information.
Order data: service requests, chat messages, transaction history.
Location data: only when you grant permission or enter an address for a booking.
Verification data: government ID documents submitted for KYC — stored encrypted.

2. How We Use Your Data
To provide, maintain, and improve the Neighborly platform.
To process payments and prevent fraud.
To send transactional notifications (order updates, receipts).
To comply with legal obligations.
With your consent: marketing communications (opt-out any time).

3. Sharing Your Data
We do not sell your personal data. We share data only with Providers you book, payment processors, and cloud infrastructure providers bound by data processing agreements, or when required by law.

4. Data Retention
Active account data is retained while your account is open. After deletion we retain anonymized transaction records for 7 years.

5. Your Rights
You may request access, correction, deletion, or portability of your personal data. Submit requests to privacy@neighborly.app. We respond within 30 days.

6. Security
We use TLS encryption in transit, AES-256 at rest, and role-based access controls.

7. Children
Neighborly is not directed at persons under 18.

Contact our Data Protection Officer: privacy@neighborly.app
''';

// ─── Root screen ─────────────────────────────────────────────────────────────

class NeighborlyAccountScreen extends StatelessWidget {
  const NeighborlyAccountScreen({super.key, this.initialTab = 0});

  final int initialTab;

  @override
  Widget build(BuildContext context) {
    final idx = initialTab.clamp(0, 2);
    return DefaultTabController(
      length: 3,
      initialIndex: idx,
      child: Scaffold(
        backgroundColor: Theme.of(context).colorScheme.surface,
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(LucideIcons.x),
            onPressed: () => Navigator.of(context).pop(),
          ),
          title: Text(
            'My Account',
            style: GoogleFonts.plusJakartaSans(
                fontWeight: FontWeight.w700, fontSize: 17),
          ),
          centerTitle: true,
          bottom: const PreferredSize(
            preferredSize: Size.fromHeight(44),
            child: Align(
              alignment: Alignment.centerLeft,
              child: TabBar(
                isScrollable: true,
                tabAlignment: TabAlignment.start,
                tabs: [
                  Tab(text: 'Account'),
                  Tab(text: 'Personal'),
                  Tab(text: 'Finance'),
                ],
              ),
            ),
          ),
        ),
        body: const TabBarView(
          children: [
            _AccountTab(),
            _PersonalTab(),
            _FinanceTab(),
          ],
        ),
      ),
    );
  }
}

// ─── shared widgets ──────────────────────────────────────────────────────────

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: cs.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
            color: cs.outline.withValues(alpha: 0.15)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: children,
      ),
    );
  }
}

class _TileDivider extends StatelessWidget {
  const _TileDivider();

  @override
  Widget build(BuildContext context) {
    return Divider(
      height: 1,
      thickness: 1,
      indent: 52,
      color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.12),
    );
  }
}

class _RowTile extends StatelessWidget {
  const _RowTile({
    required this.icon,
    required this.label,
    this.subtitle,
    this.onTap,
    this.danger = false,
  });

  final IconData icon;
  final String label;
  final String? subtitle;
  final VoidCallback? onTap;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final iconColor = danger ? Colors.red : cs.onSurfaceVariant;
    final labelColor = danger ? Colors.red : cs.onSurface;

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
        child: Row(
          children: [
            Icon(icon, size: 18, color: iconColor),
            const SizedBox(width: 14),
            Expanded(
              child: subtitle != null
                  ? Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(label,
                            style: GoogleFonts.plusJakartaSans(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: labelColor)),
                        const SizedBox(height: 2),
                        Text(subtitle!,
                            style: GoogleFonts.plusJakartaSans(
                                fontSize: 12,
                                color: cs.onSurfaceVariant),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis),
                      ],
                    )
                  : Text(label,
                      style: GoogleFonts.plusJakartaSans(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: labelColor)),
            ),
            if (onTap != null)
              Icon(LucideIcons.chevronRight,
                  size: 14, color: cs.onSurfaceVariant),
          ],
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(0, 20, 0, 8),
      child: Text(
        text.toUpperCase(),
        style: GoogleFonts.plusJakartaSans(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          letterSpacing: 1.0,
          color: Theme.of(context).colorScheme.onSurfaceVariant,
        ),
      ),
    );
  }
}

// ─── Avatar widget ───────────────────────────────────────────────────────────

class _Avt extends StatelessWidget {
  const _Avt({required this.user, required this.size});
  final UserModel user;
  final double size;

  String get _initials {
    final fn = user.firstName?.trim() ?? '';
    final ln = user.lastName?.trim() ?? '';
    if (fn.isNotEmpty && ln.isNotEmpty) {
      return '${fn[0]}${ln[0]}'.toUpperCase();
    }
    final dn = user.displayName.trim();
    if (dn.isNotEmpty) {
      final parts = dn.split(' ');
      return parts.length >= 2
          ? '${parts[0][0]}${parts[1][0]}'.toUpperCase()
          : dn[0].toUpperCase();
    }
    return user.email[0].toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final url = user.photoURL;
    if (url != null && url.isNotEmpty) {
      return CircleAvatar(
          radius: size / 2, backgroundImage: NetworkImage(url));
    }
    return CircleAvatar(
      radius: size / 2,
      backgroundColor: const Color(0xFF3B82F6),
      child: Text(
        _initials,
        style: GoogleFonts.plusJakartaSans(
            fontSize: size * 0.35,
            fontWeight: FontWeight.w700,
            color: Colors.white),
      ),
    );
  }
}

// ─── Legal bottom sheet ──────────────────────────────────────────────────────

void _showLegal(BuildContext context, String title, String content) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (ctx) => DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.75,
      maxChildSize: 0.95,
      minChildSize: 0.4,
      builder: (_, sc) => Column(
        children: [
          const SizedBox(height: 8),
          Container(
            width: 36,
            height: 4,
            decoration: BoxDecoration(
              color: Theme.of(ctx)
                  .colorScheme
                  .outline
                  .withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 8, 8),
            child: Row(
              children: [
                Expanded(
                    child: Text(title,
                        style: GoogleFonts.plusJakartaSans(
                            fontSize: 16,
                            fontWeight: FontWeight.w700))),
                IconButton(
                    icon: const Icon(LucideIcons.x),
                    onPressed: () => Navigator.pop(ctx)),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: SingleChildScrollView(
              controller: sc,
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
              child: Text(content,
                  style: GoogleFonts.plusJakartaSans(
                      fontSize: 13.5,
                      height: 1.7,
                      color: Theme.of(ctx).colorScheme.onSurface)),
            ),
          ),
        ],
      ),
    ),
  );
}

// ─── Tab 1: Account ──────────────────────────────────────────────────────────

class _AccountTab extends StatefulWidget {
  const _AccountTab();

  @override
  State<_AccountTab> createState() => _AccountTabState();
}

class _AccountTabState extends State<_AccountTab> {
  bool _editing = false;
  bool _saving = false;
  bool _uploadingPhoto = false;
  String _saveErr = '';

  late TextEditingController _firstName;
  late TextEditingController _lastName;
  late TextEditingController _displayName;
  late TextEditingController _phone;

  @override
  void initState() {
    super.initState();
    final u = context.read<NeighborlyApiService>().user;
    _firstName = TextEditingController(text: u?.firstName ?? '');
    _lastName = TextEditingController(text: u?.lastName ?? '');
    _displayName = TextEditingController(text: u?.displayName ?? '');
    _phone = TextEditingController(text: u?.phone ?? '');
  }

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    _displayName.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _pickPhoto() async {
    final picker = ImagePicker();
    final picked =
        await picker.pickImage(source: ImageSource.gallery, imageQuality: 80);
    if (picked == null || !mounted) return;
    setState(() => _uploadingPhoto = true);
    try {
      final svc = context.read<NeighborlyApiService>();
      final url = await svc.uploadFile(File(picked.path), 'avatar');
      await svc.updateProfile({'avatarUrl': url});
    } catch (_) {
    } finally {
      if (mounted) { setState(() => _uploadingPhoto = false); }
    }
  }

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _saveErr = '';
    });
    try {
      final svc = context.read<NeighborlyApiService>();
      final fn = _firstName.text.trim();
      final ln = _lastName.text.trim();
      await svc.updateProfile({
        'firstName': fn,
        'lastName': ln,
        'displayName': _displayName.text.trim().isEmpty
            ? '$fn $ln'.trim()
            : _displayName.text.trim(),
        'phone': _phone.text.trim(),
      });
      if (mounted) {
        setState(() {
          _editing = false;
          _saving = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _saveErr = e.toString();
          _saving = false;
        });
      }
    }
  }

  Future<void> _toggleMfa(bool val) async {
    try {
      await context.read<NeighborlyApiService>().updateProfile({'mfaEnabled': val});
    } catch (_) {}
  }

  Future<void> _logout() async {
    final nav = Navigator.of(context);
    await context.read<NeighborlyApiService>().logout();
    nav.popUntil((r) => r.isFirst);
  }

  @override
  Widget build(BuildContext context) {
    final svc = context.watch<NeighborlyApiService>();
    final u = svc.user;
    if (u == null) return const SizedBox.shrink();

    final theme = context.watch<NeighborlyThemeNotifier>();
    final cs = Theme.of(context).colorScheme;
    final parts = [u.firstName, u.lastName]
        .where((s) => s != null && s.trim().isNotEmpty)
        .map((s) => s!)
        .toList();
    final fullName = parts.isNotEmpty ? parts.join(' ') : u.displayName.trim();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      children: [
        // ── Profile card ──
        _SectionCard(children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Stack(
                  children: [
                    _Avt(user: u, size: 68),
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: GestureDetector(
                        onTap: _uploadingPhoto ? null : _pickPhoto,
                        child: Container(
                          width: 26,
                          height: 26,
                          decoration: BoxDecoration(
                            color: const Color(0xFF2563EB),
                            shape: BoxShape.circle,
                            border: Border.all(color: cs.surface, width: 2),
                          ),
                          child: _uploadingPhoto
                              ? const Padding(
                                  padding: EdgeInsets.all(5),
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white),
                                )
                              : const Icon(LucideIcons.camera,
                                  size: 13, color: Colors.white),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        fullName,
                        style: GoogleFonts.plusJakartaSans(
                            fontSize: 16, fontWeight: FontWeight.w700),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        '@${u.displayName.isEmpty ? u.email.split('@').first : u.displayName}',
                        style: GoogleFonts.plusJakartaSans(
                            fontSize: 13, color: cs.onSurfaceVariant),
                      ),
                      Text(
                        u.email,
                        style: GoogleFonts.plusJakartaSans(
                            fontSize: 12, color: cs.onSurfaceVariant),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                TextButton(
                  onPressed: () => setState(() {
                    _editing = !_editing;
                    _saveErr = '';
                  }),
                  child: Text(
                    _editing ? 'Cancel' : 'Edit',
                    style: GoogleFonts.plusJakartaSans(
                        fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),

          // edit form
          AnimatedSize(
            duration: const Duration(milliseconds: 220),
            curve: Curves.easeInOut,
            child: _editing
                ? Column(
                    children: [
                      Divider(
                          height: 1,
                          color: cs.outline.withValues(alpha: 0.15)),
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          children: [
                            if (_saveErr.isNotEmpty)
                              Container(
                                margin: const EdgeInsets.only(bottom: 12),
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: Colors.red.withValues(alpha: 0.08),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Text(_saveErr,
                                    style: GoogleFonts.plusJakartaSans(
                                        fontSize: 12, color: Colors.red)),
                              ),
                            Row(
                              children: [
                                Expanded(
                                    child: _InputField(
                                        label: 'First Name',
                                        ctrl: _firstName)),
                                const SizedBox(width: 10),
                                Expanded(
                                    child: _InputField(
                                        label: 'Last Name',
                                        ctrl: _lastName)),
                              ],
                            ),
                            const SizedBox(height: 10),
                            _InputField(
                                label: 'Username', ctrl: _displayName),
                            const SizedBox(height: 10),
                            _InputField(
                              label: 'Email',
                              ctrl: TextEditingController(text: u.email),
                              readOnly: true,
                            ),
                            const SizedBox(height: 10),
                            _InputField(
                              label: 'Phone',
                              ctrl: _phone,
                              keyboard: TextInputType.phone,
                            ),
                            const SizedBox(height: 14),
                            SizedBox(
                              width: double.infinity,
                              child: FilledButton(
                                onPressed: _saving ? null : _save,
                                style: FilledButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(
                                        vertical: 13)),
                                child: _saving
                                    ? const SizedBox(
                                        width: 18,
                                        height: 18,
                                        child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                            color: Colors.white))
                                    : Text('Save Changes',
                                        style: GoogleFonts.plusJakartaSans(
                                            fontWeight: FontWeight.w600)),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  )
                : const SizedBox.shrink(),
          ),
        ]),

        // ── Settings ──
        const _SectionLabel('Settings'),
        _SectionCard(children: [
          // Dark / Light
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
            child: Row(
              children: [
                Icon(
                  theme.isDark ? LucideIcons.moon : LucideIcons.sun,
                  size: 18,
                  color: cs.onSurfaceVariant,
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    theme.isDark ? 'Dark Mode' : 'Light Mode',
                    style: GoogleFonts.plusJakartaSans(
                        fontSize: 14, fontWeight: FontWeight.w600),
                  ),
                ),
                Switch(
                    value: theme.isDark,
                    onChanged: (_) => theme.toggleTheme()),
              ],
            ),
          ),
          const _TileDivider(),

          // 2FA
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
            child: Row(
              children: [
                Icon(LucideIcons.shieldCheck,
                    size: 18, color: cs.onSurfaceVariant),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Two-Factor Auth',
                          style: GoogleFonts.plusJakartaSans(
                              fontSize: 14, fontWeight: FontWeight.w600)),
                      Text(
                        u.mfaEnabled
                            ? 'Active — your account is more secure'
                            : 'Add extra protection to your account',
                        style: GoogleFonts.plusJakartaSans(
                            fontSize: 12, color: cs.onSurfaceVariant),
                      ),
                    ],
                  ),
                ),
                Switch(
                    value: u.mfaEnabled,
                    onChanged: (v) => _toggleMfa(v)),
              ],
            ),
          ),
          const _TileDivider(),

          _RowTile(
            icon: LucideIcons.lock,
            label: 'Change Password',
            onTap: () => _showChangePassword(context),
          ),
        ]),

        // ── Legal ──
        const _SectionLabel('Legal'),
        _SectionCard(children: [
          _RowTile(
            icon: LucideIcons.fileText,
            label: 'Terms and Conditions',
            onTap: () =>
                _showLegal(context, 'Terms and Conditions', _kTerms),
          ),
          const _TileDivider(),
          _RowTile(
            icon: LucideIcons.fileText,
            label: 'Community Rules',
            onTap: () => _showLegal(context, 'Community Rules', _kRules),
          ),
          const _TileDivider(),
          _RowTile(
            icon: LucideIcons.fileText,
            label: 'Privacy Policy',
            onTap: () => _showLegal(context, 'Privacy Policy', _kPrivacy),
          ),
        ]),

        // ── Sign out ──
        const SizedBox(height: 8),
        _SectionCard(children: [
          _RowTile(
            icon: LucideIcons.logOut,
            label: 'Sign Out',
            onTap: _logout,
            danger: true,
          ),
        ]),
      ],
    );
  }
}

// shared input field
class _InputField extends StatelessWidget {
  const _InputField({
    required this.label,
    required this.ctrl,
    this.readOnly = false,
    this.keyboard = TextInputType.text,
  });

  final String label;
  final TextEditingController ctrl;
  final bool readOnly;
  final TextInputType keyboard;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: GoogleFonts.plusJakartaSans(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: cs.onSurfaceVariant)),
        const SizedBox(height: 5),
        TextField(
          controller: ctrl,
          readOnly: readOnly,
          keyboardType: keyboard,
          style: GoogleFonts.plusJakartaSans(fontSize: 14),
          decoration: InputDecoration(
            filled: true,
            fillColor: readOnly
                ? cs.surfaceContainerHighest.withValues(alpha: 0.4)
                : cs.surfaceContainerHighest.withValues(alpha: 0.6),
            border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
            isDense: true,
          ),
        ),
      ],
    );
  }
}

// change password sheet
void _showChangePassword(BuildContext context) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (ctx) => Padding(
      padding:
          EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
      child: const _ChangePasswordSheet(),
    ),
  );
}

class _ChangePasswordSheet extends StatefulWidget {
  const _ChangePasswordSheet();

  @override
  State<_ChangePasswordSheet> createState() => _ChangePasswordSheetState();
}

class _ChangePasswordSheetState extends State<_ChangePasswordSheet> {
  final _curCtrl = TextEditingController();
  final _newCtrl = TextEditingController();
  final _confCtrl = TextEditingController();
  bool _hideCur = true;
  bool _hideNew = true;
  bool _saving = false;
  bool _done = false;
  String _err = '';

  @override
  void dispose() {
    _curCtrl.dispose();
    _newCtrl.dispose();
    _confCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _err = '');
    if (_newCtrl.text.length < 8) {
      setState(() => _err = 'New password must be at least 8 characters.');
      return;
    }
    if (_newCtrl.text != _confCtrl.text) {
      setState(() => _err = 'Passwords do not match.');
      return;
    }
    setState(() => _saving = true);
    try {
      await context.read<NeighborlyApiService>().changePassword(
            currentPassword: _curCtrl.text,
            newPassword: _newCtrl.text,
          );
      setState(() {
        _done = true;
        _saving = false;
      });
      await Future.delayed(const Duration(milliseconds: 1200));
      if (mounted) Navigator.pop(context);
    } catch (e) {
      setState(() {
        _err = e.toString();
        _saving = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
        child: _done
            ? Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(LucideIcons.checkCircle,
                      size: 44, color: Colors.green),
                  const SizedBox(height: 10),
                  Text('Password updated!',
                      style: GoogleFonts.plusJakartaSans(
                          fontSize: 16, fontWeight: FontWeight.w700)),
                ],
              )
            : Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                          child: Text('Change Password',
                              style: GoogleFonts.plusJakartaSans(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700))),
                      IconButton(
                          icon: const Icon(LucideIcons.x),
                          onPressed: () => Navigator.pop(context)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (_err.isNotEmpty)
                    Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.red.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(_err,
                          style: GoogleFonts.plusJakartaSans(
                              fontSize: 12, color: Colors.red)),
                    ),
                  _PwField(
                      label: 'Current Password',
                      ctrl: _curCtrl,
                      obscure: _hideCur,
                      onToggle: () =>
                          setState(() => _hideCur = !_hideCur)),
                  const SizedBox(height: 10),
                  _PwField(
                      label: 'New Password',
                      ctrl: _newCtrl,
                      obscure: _hideNew,
                      onToggle: () =>
                          setState(() => _hideNew = !_hideNew)),
                  const SizedBox(height: 10),
                  _PwField(
                      label: 'Confirm New Password',
                      ctrl: _confCtrl,
                      obscure: true),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _saving ? null : _submit,
                      style: FilledButton.styleFrom(
                          padding:
                              const EdgeInsets.symmetric(vertical: 14)),
                      child: _saving
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white))
                          : Text('Update Password',
                              style: GoogleFonts.plusJakartaSans(
                                  fontWeight: FontWeight.w600)),
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}

class _PwField extends StatelessWidget {
  const _PwField({
    required this.label,
    required this.ctrl,
    required this.obscure,
    this.onToggle,
  });

  final String label;
  final TextEditingController ctrl;
  final bool obscure;
  final VoidCallback? onToggle;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: GoogleFonts.plusJakartaSans(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: cs.onSurfaceVariant)),
        const SizedBox(height: 5),
        TextField(
          controller: ctrl,
          obscureText: obscure,
          style: GoogleFonts.plusJakartaSans(fontSize: 14),
          decoration: InputDecoration(
            filled: true,
            fillColor: cs.surfaceContainerHighest.withValues(alpha: 0.6),
            border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
            isDense: true,
            suffixIcon: onToggle != null
                ? IconButton(
                    icon: Icon(
                        obscure ? LucideIcons.eyeOff : LucideIcons.eye,
                        size: 16),
                    onPressed: onToggle)
                : null,
          ),
        ),
      ],
    );
  }
}

// ─── Tab 2: Personal ─────────────────────────────────────────────────────────

class _PersonalTab extends StatefulWidget {
  const _PersonalTab();

  @override
  State<_PersonalTab> createState() => _PersonalTabState();
}

class _PersonalTabState extends State<_PersonalTab> {
  Map<String, dynamic> _prefs = {};
  bool _loading = true;
  int _verifyIdx = 0;

  @override
  void initState() {
    super.initState();
    _loadPrefs();
  }

  Future<void> _loadPrefs() async {
    try {
      final p = await context
          .read<NeighborlyApiService>()
          .getAccountPreferences();
      if (mounted) {
        setState(() {
          _prefs = p;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) { setState(() => _loading = false); }
    }
  }

  Future<void> _savePrefs(Map<String, dynamic> patch) async {
    final next = Map<String, dynamic>.from(_prefs)..addAll(patch);
    await context
        .read<NeighborlyApiService>()
        .putAccountPreferences(next);
    setState(() => _prefs = next);
  }

  List<Map<String, dynamic>> get _vehicles {
    final raw = _prefs['vehicles'];
    if (raw is List) {
      return raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    }
    return [];
  }

  List<Map<String, dynamic>> get _favorites {
    final raw = _prefs['favorites'];
    if (raw is List) {
      return raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    }
    return [];
  }

  void _editAddress(String type) {
    final key = type == 'home' ? 'homeAddress' : 'workAddress';
    final ctrl =
        TextEditingController(text: _prefs[key] as String? ?? '');
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  type == 'home' ? 'Home Address' : 'Work Address',
                  style: GoogleFonts.plusJakartaSans(
                      fontSize: 16, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: ctrl,
                  minLines: 2,
                  maxLines: 4,
                  style: GoogleFonts.plusJakartaSans(fontSize: 14),
                  decoration: InputDecoration(
                    hintText: 'Enter full address…',
                    filled: true,
                    fillColor: Theme.of(ctx)
                        .colorScheme
                        .surfaceContainerHighest
                        .withValues(alpha: 0.6),
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none),
                    contentPadding: const EdgeInsets.all(14),
                  ),
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () async {
                      await _savePrefs({key: ctrl.text.trim()});
                      if (ctx.mounted) { Navigator.pop(ctx); }
                    },
                    style: FilledButton.styleFrom(
                        padding:
                            const EdgeInsets.symmetric(vertical: 14)),
                    child: Text('Save Address',
                        style: GoogleFonts.plusJakartaSans(
                            fontWeight: FontWeight.w600)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _addVehicle() {
    final makeCtrl = TextEditingController();
    final modelCtrl = TextEditingController();
    final plateCtrl = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Add Vehicle',
                    style: GoogleFonts.plusJakartaSans(
                        fontSize: 16, fontWeight: FontWeight.w700)),
                const SizedBox(height: 14),
                _InputField(
                    label: 'Make (e.g. Toyota)', ctrl: makeCtrl),
                const SizedBox(height: 10),
                _InputField(label: 'Model (e.g. Camry)', ctrl: modelCtrl),
                const SizedBox(height: 10),
                _InputField(
                    label: 'License Plate (optional)', ctrl: plateCtrl),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () async {
                      if (makeCtrl.text.trim().isEmpty ||
                          modelCtrl.text.trim().isEmpty) {
                        return;
                      }
                      final v = {
                        'id': DateTime.now()
                            .millisecondsSinceEpoch
                            .toString(),
                        'make': makeCtrl.text.trim(),
                        'model': modelCtrl.text.trim(),
                        'plate': plateCtrl.text.trim(),
                      };
                      await _savePrefs({
                        'vehicles': [..._vehicles, v]
                      });
                      if (ctx.mounted) { Navigator.pop(ctx); }
                    },
                    style: FilledButton.styleFrom(
                        padding:
                            const EdgeInsets.symmetric(vertical: 14)),
                    child: Text('Add Vehicle',
                        style: GoogleFonts.plusJakartaSans(
                            fontWeight: FontWeight.w600)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _removeVehicle(String id) async {
    await _savePrefs({
      'vehicles': _vehicles.where((v) => v['id'] != id).toList()
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    final svc = context.watch<NeighborlyApiService>();
    final u = svc.user;
    if (u == null) return const SizedBox.shrink();

    final cs = Theme.of(context).colorScheme;
    final kyc = u.kyc;
    final emailVerified = kyc.emailVerified || u.isVerified;
    final phoneVerified = kyc.phoneVerified;
    final homeAddr = _prefs['homeAddress'] as String? ?? '';
    final workAddr = _prefs['workAddress'] as String? ?? '';
    final vehicles = _vehicles;
    final favorites = _favorites;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      children: [
        // ── Verification ──
        const _SectionLabel('Verification'),
        _SectionCard(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
            child: Row(
              children: [
                _VerifyTabBtn(
                    label: 'Email',
                    active: _verifyIdx == 0,
                    onTap: () => setState(() => _verifyIdx = 0)),
                const SizedBox(width: 8),
                _VerifyTabBtn(
                    label: 'Phone',
                    active: _verifyIdx == 1,
                    onTap: () => setState(() => _verifyIdx = 1)),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: _verifyIdx == 0
                ? _VerifyRow(
                    icon: LucideIcons.mail,
                    value: u.email,
                    verified: emailVerified,
                    hint: emailVerified
                        ? 'Verified — looks good!'
                        : 'Not yet verified')
                : _VerifyRow(
                    icon: LucideIcons.phone,
                    value: (u.phone?.isEmpty ?? true)
                        ? 'No phone number'
                        : u.phone!,
                    verified: phoneVerified,
                    hint: phoneVerified
                        ? 'Verified — looks good!'
                        : u.phone?.isNotEmpty == true
                            ? 'Not yet verified'
                            : 'Add a phone number first'),
          ),
        ]),

        // ── Addresses ──
        const _SectionLabel('Addresses'),
        _SectionCard(children: [
          _RowTile(
            icon: LucideIcons.home,
            label: 'Home Address',
            subtitle: homeAddr.isEmpty ? 'Add home address' : homeAddr,
            onTap: () => _editAddress('home'),
          ),
          const _TileDivider(),
          _RowTile(
            icon: LucideIcons.briefcase,
            label: 'Work Address',
            subtitle: workAddr.isEmpty ? 'Add work address' : workAddr,
            onTap: () => _editAddress('work'),
          ),
        ]),

        // ── Vehicles ──
        Padding(
          padding: const EdgeInsets.fromLTRB(0, 20, 0, 8),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  'VEHICLES',
                  style: GoogleFonts.plusJakartaSans(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.0,
                      color: cs.onSurfaceVariant),
                ),
              ),
              GestureDetector(
                onTap: _addVehicle,
                child: Row(
                  children: [
                    Icon(LucideIcons.plus, size: 13, color: cs.primary),
                    const SizedBox(width: 3),
                    Text('Add',
                        style: GoogleFonts.plusJakartaSans(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: cs.primary)),
                  ],
                ),
              ),
            ],
          ),
        ),
        vehicles.isEmpty
            ? GestureDetector(
                onTap: _addVehicle,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 28),
                  decoration: BoxDecoration(
                    border: Border.all(
                        color: cs.outline.withValues(alpha: 0.3), width: 1.5),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    children: [
                      Icon(LucideIcons.car,
                          size: 28, color: cs.onSurfaceVariant),
                      const SizedBox(height: 8),
                      Text('Add your first vehicle',
                          style: GoogleFonts.plusJakartaSans(
                              fontSize: 13, color: cs.onSurfaceVariant)),
                    ],
                  ),
                ),
              )
            : _SectionCard(
                children: [
                  for (int i = 0; i < vehicles.length; i++) ...[
                    if (i > 0) const _TileDivider(),
                    Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 12),
                      child: Row(
                        children: [
                          Icon(LucideIcons.car,
                              size: 18, color: cs.onSurfaceVariant),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '${vehicles[i]['make']} ${vehicles[i]['model']}',
                                  style: GoogleFonts.plusJakartaSans(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600),
                                ),
                                if ((vehicles[i]['plate'] as String?)
                                        ?.isNotEmpty ==
                                    true)
                                  Text(
                                    vehicles[i]['plate'] as String,
                                    style: GoogleFonts.plusJakartaSans(
                                        fontSize: 12,
                                        color: cs.onSurfaceVariant),
                                  ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(LucideIcons.trash2,
                                size: 16),
                            color: cs.onSurfaceVariant,
                            onPressed: () =>
                                _removeVehicle(vehicles[i]['id'] as String),
                          ),
                        ],
                      ),
                    ),
                  ]
                ],
              ),

        // ── Favorites ──
        const _SectionLabel('Favorites'),
        favorites.isEmpty
            ? Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 28),
                decoration: BoxDecoration(
                  color: cs.surface,
                  border: Border.all(
                      color: cs.outline.withValues(alpha: 0.15)),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  children: [
                    Icon(LucideIcons.heart,
                        size: 28, color: cs.onSurfaceVariant),
                    const SizedBox(height: 8),
                    Text(
                      'No favorites yet — bookmark services you love',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.plusJakartaSans(
                          fontSize: 13, color: cs.onSurfaceVariant),
                    ),
                  ],
                ),
              )
            : _SectionCard(
                children: [
                  for (int i = 0; i < favorites.length; i++) ...[
                    if (i > 0) const _TileDivider(),
                    _RowTile(
                      icon: LucideIcons.heart,
                      label: favorites[i]['title'] as String? ?? 'Service',
                      subtitle: favorites[i]['category'] as String?,
                    ),
                  ]
                ],
              ),
      ],
    );
  }
}

class _VerifyTabBtn extends StatelessWidget {
  const _VerifyTabBtn(
      {required this.label, required this.active, required this.onTap});
  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 9),
          decoration: BoxDecoration(
            color: active ? cs.primary : cs.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(10),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: active ? Colors.white : cs.onSurfaceVariant,
            ),
          ),
        ),
      ),
    );
  }
}

class _VerifyRow extends StatelessWidget {
  const _VerifyRow({
    required this.icon,
    required this.value,
    required this.verified,
    required this.hint,
  });
  final IconData icon;
  final String value;
  final bool verified;
  final String hint;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: cs.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(icon, size: 18, color: cs.onSurfaceVariant),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(value,
                    style: GoogleFonts.plusJakartaSans(
                        fontSize: 14, fontWeight: FontWeight.w600),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis),
                Text(hint,
                    style: GoogleFonts.plusJakartaSans(
                        fontSize: 12, color: cs.onSurfaceVariant)),
              ],
            ),
          ),
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: verified
                  ? Colors.green.withValues(alpha: 0.12)
                  : Colors.orange.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  verified ? LucideIcons.check : LucideIcons.clock,
                  size: 11,
                  color: verified ? Colors.green : Colors.orange,
                ),
                const SizedBox(width: 4),
                Text(
                  verified ? 'Verified' : 'Pending',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: verified ? Colors.green : Colors.orange,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Tab 3: Finance ───────────────────────────────────────────────────────────

class _FinanceTab extends StatefulWidget {
  const _FinanceTab();

  @override
  State<_FinanceTab> createState() => _FinanceTabState();
}

class _FinanceTabState extends State<_FinanceTab> {
  bool _showOrders = true;
  bool _loading = true;
  List<OrderSummary> _orders = [];
  List<Map<String, dynamic>> _invoices = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final svc = context.read<NeighborlyApiService>();
    try {
      final results = await Future.wait([
        svc
            .fetchMyOrders(pageSize: 20)
            .then((r) => r.items)
            .catchError((_) => <OrderSummary>[]),
        svc
            .fetchFinanceHistory()
            .catchError((_) => <Map<String, dynamic>>[]),
      ]);
      if (mounted) {
        setState(() {
          _orders = results[0] as List<OrderSummary>;
          _invoices = results[1] as List<Map<String, dynamic>>;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) { setState(() => _loading = false); }
    }
  }

  Color _statusColor(String status) {
    if (['completed', 'paid', 'active'].contains(status)) {
      return Colors.green;
    }
    if (['pending', 'open', 'submitted', 'draft'].contains(status)) {
      return Colors.orange;
    }
    if (['cancelled', 'rejected', 'failed'].contains(status)) {
      return Colors.red;
    }
    return Colors.grey;
  }

  static const _months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  String _fmtDate(String raw) {
    try {
      final d = DateTime.parse(raw);
      return '${d.day} ${_months[d.month - 1]} ${d.year}';
    } catch (_) {
      return raw;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());

    final cs = Theme.of(context).colorScheme;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
      children: [
        // toggle bar
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: cs.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Row(
            children: [
              _TabToggle(
                  label: 'My Orders',
                  icon: LucideIcons.package,
                  active: _showOrders,
                  onTap: () => setState(() => _showOrders = true)),
              _TabToggle(
                  label: 'Invoices',
                  icon: LucideIcons.creditCard,
                  active: !_showOrders,
                  onTap: () => setState(() => _showOrders = false)),
            ],
          ),
        ),
        const SizedBox(height: 16),

        if (_showOrders)
          _orders.isEmpty
              ? const _EmptyCard(
                  icon: LucideIcons.package,
                  title: 'No orders yet',
                  sub: 'Your service orders will appear here.')
              : _SectionCard(
                  children: [
                    for (int i = 0; i < _orders.length; i++) ...[
                      if (i > 0) const _TileDivider(),
                      Padding(
                        padding: const EdgeInsets.all(14),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 38,
                              height: 38,
                              decoration: BoxDecoration(
                                color: const Color(0xFF2563EB)
                                    .withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(LucideIcons.package,
                                  size: 17, color: Color(0xFF2563EB)),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment:
                                    CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          _orders[i].serviceName,
                                          style: GoogleFonts
                                              .plusJakartaSans(
                                                  fontSize: 14,
                                                  fontWeight:
                                                      FontWeight.w600),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      _StatusBadge(
                                          status: _orders[i].status,
                                          color: _statusColor(
                                              _orders[i].status)),
                                    ],
                                  ),
                                  if (_orders[i].address.isNotEmpty) ...[
                                    const SizedBox(height: 3),
                                    Row(
                                      children: [
                                        Icon(LucideIcons.mapPin,
                                            size: 11,
                                            color: cs.onSurfaceVariant),
                                        const SizedBox(width: 4),
                                        Expanded(
                                          child: Text(
                                            _orders[i].address,
                                            style: GoogleFonts
                                                .plusJakartaSans(
                                                    fontSize: 12,
                                                    color: cs
                                                        .onSurfaceVariant),
                                            maxLines: 1,
                                            overflow:
                                                TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                  const SizedBox(height: 3),
                                  Text(
                                    _fmtDate(_orders[i].createdAt),
                                    style: GoogleFonts.plusJakartaSans(
                                        fontSize: 11,
                                        color: cs.onSurfaceVariant),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ]
                  ],
                )
        else
          _invoices.isEmpty
              ? const _EmptyCard(
                  icon: LucideIcons.creditCard,
                  title: 'No invoices yet',
                  sub: 'Completed transactions will appear here.')
              : _SectionCard(
                  children: [
                    for (int i = 0; i < _invoices.length; i++) ...[
                      if (i > 0) const _TileDivider(),
                      Padding(
                        padding: const EdgeInsets.all(14),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 38,
                              height: 38,
                              decoration: BoxDecoration(
                                color: Colors.green.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(LucideIcons.creditCard,
                                  size: 17, color: Colors.green),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment:
                                    CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          _invoices[i]['serviceTitle']
                                                  ?.toString() ??
                                              'Transaction',
                                          style: GoogleFonts
                                              .plusJakartaSans(
                                                  fontSize: 14,
                                                  fontWeight:
                                                      FontWeight.w600),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      _StatusBadge(
                                        status: _invoices[i][
                                                    'contractStatus']
                                                ?.toString() ??
                                            '',
                                        color: _statusColor(_invoices[i]
                                                ['contractStatus']
                                            ?.toString() ??
                                            ''),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 3),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          _fmtDate(_invoices[i]['createdAt']
                                                  ?.toString() ??
                                              ''),
                                          style: GoogleFonts.plusJakartaSans(
                                              fontSize: 11,
                                              color: cs.onSurfaceVariant),
                                        ),
                                      ),
                                      Text(
                                        '\$${((_invoices[i]['contractAmount'] as num?) ?? 0).toStringAsFixed(2)}',
                                        style: GoogleFonts.plusJakartaSans(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w700),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ]
                  ],
                ),
      ],
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status, required this.color});
  final String status;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        status,
        style: GoogleFonts.plusJakartaSans(
            fontSize: 11, fontWeight: FontWeight.w700, color: color),
      ),
    );
  }
}

class _TabToggle extends StatelessWidget {
  const _TabToggle({
    required this.label,
    required this.icon,
    required this.active,
    required this.onTap,
  });
  final String label;
  final IconData icon;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 11),
          decoration: BoxDecoration(
            color: active ? cs.surface : Colors.transparent,
            borderRadius: BorderRadius.circular(11),
            boxShadow: active
                ? [
                    BoxShadow(
                        color: Colors.black.withValues(alpha: 0.06),
                        blurRadius: 6,
                        offset: const Offset(0, 2))
                  ]
                : null,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon,
                  size: 14,
                  color: active ? cs.primary : cs.onSurfaceVariant),
              const SizedBox(width: 6),
              Text(
                label,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: active ? cs.onSurface : cs.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EmptyCard extends StatelessWidget {
  const _EmptyCard(
      {required this.icon, required this.title, required this.sub});
  final IconData icon;
  final String title;
  final String sub;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 48),
      decoration: BoxDecoration(
        color: cs.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cs.outline.withValues(alpha: 0.15)),
      ),
      child: Column(
        children: [
          Icon(icon, size: 36, color: cs.outline),
          const SizedBox(height: 12),
          Text(title,
              style: GoogleFonts.plusJakartaSans(
                  fontSize: 15, fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text(sub,
              style: GoogleFonts.plusJakartaSans(
                  fontSize: 13, color: cs.onSurfaceVariant)),
        ],
      ),
    );
  }
}
