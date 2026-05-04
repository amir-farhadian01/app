import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../services/neighborly_api_service.dart';

/// Device whitelist + real-time location sharing (Personal tab), persisted via `/api/users/me/account-preferences`.
class AccountPersonalExtras extends StatefulWidget {
  const AccountPersonalExtras({super.key});

  @override
  State<AccountPersonalExtras> createState() => _AccountPersonalExtrasState();
}

class _AccountPersonalExtrasState extends State<AccountPersonalExtras> {
  bool _loading = true;
  bool _saving = false;
  bool _shareDuringService = false;
  final _neighborQuery = TextEditingController();
  final _providerId = TextEditingController();
  List<String> _shareWith = [];
  List<String> _trustedDevices = ['This device'];
  List<String> _providerWhitelist = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final api = context.read<NeighborlyApiService>();
    try {
      final raw = await api.getAccountPreferences();
      final p = raw['privacy'] is Map ? Map<String, dynamic>.from(raw['privacy'] as Map) : <String, dynamic>{};
      final d = raw['devices'] is Map ? Map<String, dynamic>.from(raw['devices'] as Map) : <String, dynamic>{};
      if (!mounted) return;
      setState(() {
        _shareDuringService = p['shareDuringActiveService'] == true;
        _shareWith = (p['shareWith'] is List)
            ? (p['shareWith'] as List<dynamic>).map((e) => e.toString()).toList()
            : <String>[];
        _trustedDevices = (d['trustedLabels'] is List)
            ? (d['trustedLabels'] as List<dynamic>).map((e) => e.toString()).toList()
            : <String>['This device'];
        if (_trustedDevices.isEmpty) _trustedDevices = ['This device'];
        _providerWhitelist = (p['providerIds'] is List)
            ? (p['providerIds'] as List<dynamic>).map((e) => e.toString()).toList()
            : <String>[];
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _persist() async {
    setState(() => _saving = true);
    final api = context.read<NeighborlyApiService>();
    try {
      final cur = await api.getAccountPreferences();
      await api.putAccountPreferences({
        ...cur,
        'privacy': {
          'shareDuringActiveService': _shareDuringService,
          'shareWith': _shareWith,
          'providerIds': _providerWhitelist,
        },
        'devices': {
          'trustedLabels': _trustedDevices,
        },
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Saved', style: GoogleFonts.inter())),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$e', style: GoogleFonts.inter()), backgroundColor: Theme.of(context).colorScheme.error),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  void dispose() {
    _neighborQuery.dispose();
    _providerId.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    if (_loading) {
      return const Padding(
        padding: EdgeInsets.all(24),
        child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _header('Device whitelist', 'Trusted devices for your account', cs),
          const SizedBox(height: 8),
          ..._trustedDevices.map(
            (e) => ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(LucideIcons.smartphone, size: 20, color: cs.primary),
              title: Text(e, style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
            ),
          ),
          const SizedBox(height: 20),
          _header('Location & privacy', 'Share your live location with neighbors during active jobs', cs),
          const SizedBox(height: 8),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            value: _shareDuringService,
            onChanged: (v) {
              setState(() => _shareDuringService = v);
            },
            title: Text('Share my status', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 15)),
            subtitle: Text(
              'Live location during active services (repair visit, on-site work, or when a worker is assigned to you).',
              style: GoogleFonts.inter(fontSize: 12, color: cs.secondary),
            ),
          ),
          const SizedBox(height: 12),
          Text('Share with specific people', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w800, color: cs.secondary, letterSpacing: 0.5)),
          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _neighborQuery,
                  decoration: InputDecoration(
                    hintText: 'Email, name, or user ID',
                    isDense: true,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: () {
                  final q = _neighborQuery.text.trim();
                  if (q.isEmpty) return;
                  setState(() {
                    _shareWith = [..._shareWith, q];
                    _neighborQuery.clear();
                  });
                },
                child: const Text('Add'),
              ),
            ],
          ),
          if (_shareWith.isEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text('No one on your share list yet.', style: GoogleFonts.inter(fontSize: 12, color: cs.onSurfaceVariant)),
            )
          else
            ..._shareWith.map(
              (e) => ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(e, style: GoogleFonts.inter(fontSize: 14)),
                trailing: IconButton(
                  icon: Icon(LucideIcons.trash2, size: 18, color: cs.error),
                  onPressed: () => setState(() => _shareWith = _shareWith.where((x) => x != e).toList()),
                ),
              ),
            ),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Trusted providers (search)', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w800, color: cs.secondary, letterSpacing: 0.5)),
              TextButton(
                onPressed: () {
                  final id = _providerId.text.trim();
                  if (id.isEmpty) return;
                  setState(() {
                    _providerWhitelist = [..._providerWhitelist, id];
                    _providerId.clear();
                  });
                },
                child: const Text('+ Add provider ID'),
              ),
            ],
          ),
          TextField(
            controller: _providerId,
            decoration: InputDecoration(
              hintText: 'Provider user ID to prioritize / trust',
              isDense: true,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          if (_providerWhitelist.isNotEmpty) ...[
            const SizedBox(height: 8),
            ..._providerWhitelist.map(
              (e) => ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(LucideIcons.shieldCheck, size: 20, color: Colors.green[700]),
                title: Text(e, style: GoogleFonts.inter()),
                trailing: IconButton(
                  icon: Icon(LucideIcons.trash2, size: 18, color: cs.error),
                  onPressed: () => setState(() => _providerWhitelist = _providerWhitelist.where((x) => x != e).toList()),
                ),
              ),
            ),
          ] else
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                'Providers you add can be shown as “trusted” in search when we roll out ranking.',
                style: GoogleFonts.inter(fontSize: 12, color: cs.onSurfaceVariant),
              ),
            ),
          const SizedBox(height: 20),
          Align(
            alignment: Alignment.centerRight,
            child: FilledButton.tonal(
              onPressed: _saving ? null : _persist,
              child: _saving
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : Text('Save privacy & devices', style: GoogleFonts.inter(fontWeight: FontWeight.w800)),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _header(String title, String sub, ColorScheme cs) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w900, color: cs.onSurface)),
        Text(sub, style: GoogleFonts.inter(fontSize: 12, color: cs.secondary, height: 1.3)),
      ],
    );
  }
}
