import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../services/neighborly_api_service.dart';

/// Mirrors web [ContractView.tsx] — load, sign (customer/provider), basic status.
class ContractScreen extends StatefulWidget {
  const ContractScreen({super.key, required this.contractId});

  final String contractId;

  @override
  State<ContractScreen> createState() => _ContractScreenState();
}

class _ContractScreenState extends State<ContractScreen> {
  Map<String, dynamic>? _contract;
  bool _loading = true;
  String? _error;
  bool _signing = false;
  String _paymentMethod = 'platform';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = context.read<NeighborlyApiService>();
      final c = await api.fetchContract(widget.contractId);
      if (!mounted) return;
      setState(() {
        _contract = c;
        final pm = c['paymentMethod']?.toString();
        if (pm == 'cash') {
          _paymentMethod = 'cash';
        } else if (pm == 'platform') {
          _paymentMethod = 'platform';
        }
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _contract = null;
        _loading = false;
      });
    }
  }

  Future<void> _sign() async {
    final c = _contract;
    if (c == null) return;
    setState(() => _signing = true);
    try {
      final api = context.read<NeighborlyApiService>();
      await api.signContract(c['id'].toString(), paymentMethod: _paymentMethod);
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _signing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final api = context.watch<NeighborlyApiService>();
    final u = api.user;
    if (u == null) {
      return const Scaffold(body: Center(child: Text('Sign in required')));
    }

    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_contract == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Contract')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(_error ?? 'Not found', textAlign: TextAlign.center),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Back'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final c = _contract!;
    final customerId = c['customerId']?.toString();
    final providerId = c['providerId']?.toString();
    final isClient = u.uid == customerId;
    final isProvider = u.uid == providerId;
    final clientSigned = c['clientSigned'] == true;
    final providerSigned = c['providerSigned'] == true;
    final canSign = (isClient && !clientSigned) || (isProvider && !providerSigned);

    return Scaffold(
      appBar: AppBar(
        title: Text('Contract', style: GoogleFonts.inter(fontWeight: FontWeight.w800)),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => Navigator.pop(context)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text(
            'Agreement',
            style: GoogleFonts.inter(fontSize: 28, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic),
          ),
          const SizedBox(height: 8),
          Text('Status: ${c['status'] ?? '—'}', style: GoogleFonts.inter(color: Colors.grey.shade600)),
          const SizedBox(height: 24),
          if (canSign) ...[
            Text('Payment method', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'platform', label: Text('Platform')),
                ButtonSegment(value: 'cash', label: Text('Cash')),
              ],
              selected: {_paymentMethod},
              onSelectionChanged: (s) => setState(() => _paymentMethod = s.first),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _signing ? null : _sign,
              child: _signing
                  ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Sign contract'),
            ),
          ] else
            Text(
              clientSigned && providerSigned ? 'All parties have signed.' : 'Waiting on the other party.',
              style: GoogleFonts.inter(fontWeight: FontWeight.w600),
            ),
        ],
      ),
    );
  }
}
