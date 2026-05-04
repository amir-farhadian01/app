import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../theme/account_hub_typography.dart';
import 'package:local_auth/local_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _kSafetyBiometric = 'safety_biometric_enabled';
const _kSafetyPinHash = 'safety_pin_sha256';
const _kSafetyUseBiometric = 'safety_wants_biometric';

/// Device-only PIN + biometrics (shared by Account & Security and Account → Safety → PIN).
class DeviceSafetyPinBody extends StatefulWidget {
  const DeviceSafetyPinBody({super.key});

  @override
  State<DeviceSafetyPinBody> createState() => _DeviceSafetyPinBodyState();
}

class _DeviceSafetyPinBodyState extends State<DeviceSafetyPinBody> {
  final LocalAuthentication _la = LocalAuthentication();
  final _pin1 = TextEditingController();
  final _pin2 = TextEditingController();

  bool _checking = true;
  bool _bioAvailable = false;
  bool _bioOn = false;
  bool _pinSet = false;
  bool _saving = false;
  String? _msg;

  @override
  void initState() {
    super.initState();
    _hydrate();
  }

  Future<void> _hydrate() async {
    try {
      final bio = await _la.isDeviceSupported() && await _la.canCheckBiometrics;
      final p = await SharedPreferences.getInstance();
      final b = p.getBool(_kSafetyBiometric) == true;
      final hash = p.getString(_kSafetyPinHash);
      if (mounted) {
        setState(() {
          _bioAvailable = bio;
          _bioOn = b;
          _pinSet = hash != null && hash.isNotEmpty;
          _checking = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _checking = false);
    }
  }

  String _hashPin(String pin) => sha256.convert(utf8.encode('neighborly:$pin')).toString();

  Future<void> _setPin() async {
    if (_pin1.text != _pin2.text) {
      setState(() => _msg = 'PINs do not match');
      return;
    }
    if (_pin1.text.length < 4) {
      setState(() => _msg = 'Use at least 4 digits');
      return;
    }
    setState(() {
      _saving = true;
      _msg = null;
    });
    final p = await SharedPreferences.getInstance();
    await p.setString(_kSafetyPinHash, _hashPin(_pin1.text));
    _pin1.clear();
    _pin2.clear();
    if (mounted) {
      setState(() {
        _pinSet = true;
        _saving = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'PIN saved on this device',
            style: AccountHubTypography.pinSnackMessage(Theme.of(context).colorScheme.onSurface),
          ),
        ),
      );
    }
  }

  Future<void> _onBio(bool v) async {
    if (v) {
      if (!_pinSet) {
        setState(() => _msg = 'Set a PIN first, then enable Face / Fingerprint as a fast unlock. The same PIN is your backup if biometrics fail.');
        return;
      }
    }
    setState(() => _saving = true);
    final p = await SharedPreferences.getInstance();
    await p.setBool(_kSafetyBiometric, v);
    await p.setBool(_kSafetyUseBiometric, v);
    if (mounted) {
      setState(() {
        _bioOn = v;
        _saving = false;
      });
    }
  }

  @override
  void dispose() {
    _pin1.dispose();
    _pin2.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    if (_checking) {
      return const Center(child: CircularProgressIndicator());
    }

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text(
          'After you sign in once, you can use this device with Face / Fingerprint or a PIN. If you enable biometrics, a PIN is required as fallback.',
          style: AccountHubTypography.pinIntro(cs.secondary),
        ),
        const SizedBox(height: 20),
        ListTile(
          contentPadding: EdgeInsets.zero,
          leading: Icon(LucideIcons.fingerprint, color: cs.primary, size: 28),
          title: Text('Face / Fingerprint', style: AccountHubTypography.pinListTitle(cs.onSurface)),
          subtitle: Text(
            _bioAvailable ? 'Use device biometrics to confirm it’s you.' : 'Not available on this device / browser',
            style: AccountHubTypography.pinListSubtitle(cs.secondary),
          ),
          trailing: Switch(
            value: _bioOn,
            onChanged: _saving || !_bioAvailable || !_pinSet ? null : _onBio,
          ),
        ),
        if (_msg != null) ...[
          const SizedBox(height: 6),
          Text(_msg!, style: AccountHubTypography.pinError(cs.error)),
        ],
        const SizedBox(height: 20),
        Text(
          'Security PIN (device-only)',
          style: AccountHubTypography.pinSectionLabel(cs.secondary),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: _pin1,
          keyboardType: TextInputType.number,
          obscureText: true,
          decoration: InputDecoration(
            labelText: 'New PIN',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _pin2,
          keyboardType: TextInputType.number,
          obscureText: true,
          decoration: InputDecoration(
            labelText: 'Confirm PIN',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        const SizedBox(height: 12),
        FilledButton(
          onPressed: _saving ? null : _setPin,
          child: Text(
            'Save PIN',
            style: AccountHubTypography.pinCtaLabel(Theme.of(context).colorScheme.onPrimary),
          ),
        ),
        const SizedBox(height: 16),
        Text('BACKUP', style: AccountHubTypography.pinSectionLabel(cs.secondary)),
        Text(
          'The same PIN is your fallback if Face / Fingerprint is unavailable. Set the PIN first, then enable biometrics above.',
          style: AccountHubTypography.pinBackupBody(cs.onSurfaceVariant),
        ),
        const SizedBox(height: 24),
      ],
    );
  }
}
