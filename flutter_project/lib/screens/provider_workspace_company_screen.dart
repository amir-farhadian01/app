import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../services/neighborly_api_service.dart';

class ProviderWorkspaceCompanyScreen extends StatefulWidget {
  const ProviderWorkspaceCompanyScreen({super.key});

  @override
  State<ProviderWorkspaceCompanyScreen> createState() => _ProviderWorkspaceCompanyScreenState();
}

class _ProviderWorkspaceCompanyScreenState extends State<ProviderWorkspaceCompanyScreen> {
  bool _loading = true;
  String? _err;
  Map<String, dynamic>? _company;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final api = context.read<NeighborlyApiService>();
    final user = api.user;
    if (user == null || user.role != 'provider') {
      setState(() {
        _err = 'Provider sign-in required.';
        _loading = false;
      });
      return;
    }
    setState(() {
      _loading = true;
      _err = null;
    });
    try {
      var wid = user.companyId?.trim();
      if (wid == null || wid.isEmpty) {
        final workspaces = await api.fetchMyWorkspaces();
        wid = workspaces.isNotEmpty ? workspaces.first['id']?.toString() : null;
      }
      if (wid == null || wid.isEmpty) {
        throw Exception('No workspace found.');
      }
      final co = await api.fetchCompany(wid);
      if (!mounted) return;
      setState(() {
        _company = co;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _err = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Company profile')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? ListView(
                children: const [
                  SizedBox(height: 120),
                  Center(child: CircularProgressIndicator()),
                ],
              )
            : _err != null
                ? ListView(
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(24),
                        child: Text(_err!, textAlign: TextAlign.center),
                      ),
                    ],
                  )
                : ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Text(
                        _company?['name']?.toString() ?? 'Company',
                        style: GoogleFonts.inter(fontWeight: FontWeight.w900, fontSize: 22),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _company?['about']?.toString() ?? _company?['slogan']?.toString() ?? '',
                        style: GoogleFonts.inter(color: cs.secondary, height: 1.45),
                      ),
                      const SizedBox(height: 16),
                      if (_company?['phone'] != null)
                        ListTile(
                          dense: true,
                          leading: const Icon(Icons.phone_outlined),
                          title: Text(_company!['phone'].toString()),
                        ),
                      if (_company?['address'] != null)
                        ListTile(
                          dense: true,
                          leading: const Icon(Icons.place_outlined),
                          title: Text(_company!['address'].toString()),
                        ),
                      if (_company?['website'] != null)
                        ListTile(
                          dense: true,
                          leading: const Icon(Icons.language_outlined),
                          title: Text(_company!['website'].toString()),
                        ),
                    ],
                  ),
      ),
    );
  }
}
