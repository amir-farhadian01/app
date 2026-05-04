import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../services/neighborly_api_service.dart';

class ProviderWorkspacePackagesScreen extends StatefulWidget {
  const ProviderWorkspacePackagesScreen({super.key});

  @override
  State<ProviderWorkspacePackagesScreen> createState() => _ProviderWorkspacePackagesScreenState();
}

class _ProviderWorkspacePackagesScreenState extends State<ProviderWorkspacePackagesScreen> {
  bool _loading = true;
  String? _err;
  List<Map<String, dynamic>> _items = const [];

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
      final items = await api.fetchWorkspaceServicePackages(wid);
      if (!mounted) return;
      setState(() {
        _items = items;
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
      appBar: AppBar(title: const Text('My packages')),
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
                : _items.isEmpty
                    ? ListView(
                        children: [
                          SizedBox(height: MediaQuery.sizeOf(context).height * 0.2),
                          Center(
                            child: Text(
                              'No service packages yet.',
                              style: GoogleFonts.inter(color: cs.secondary),
                            ),
                          ),
                        ],
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(12, 12, 12, 24),
                        itemCount: _items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (_, i) {
                          final row = _items[i];
                          final cat = row['serviceCatalog'] is Map
                              ? Map<String, dynamic>.from(row['serviceCatalog'] as Map)
                              : const <String, dynamic>{};
                          final name = row['name']?.toString() ?? 'Package';
                          final price = row['finalPrice'];
                          final cur = row['currency']?.toString() ?? '';
                          return Card(
                            child: ListTile(
                              title: Text(name, style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
                              subtitle: Text(
                                '${cat['name'] ?? 'Service'} · ${price != null ? '$cur $price' : '—'}',
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}
