import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../models/contract_models.dart';
import '../services/contracts_service.dart';
import '../services/neighborly_api_service.dart';

/// Displays the contract panel for an order.
/// [orderStatus] is used to gate Approve/Reject buttons (only shown when `contracted`).
class ContractViewWidget extends StatefulWidget {
  const ContractViewWidget({
    super.key,
    required this.orderId,
    required this.orderStatus,
    this.onContractActioned,
  });

  final String orderId;
  final String orderStatus;
  /// Called after a successful approve or reject so the parent can refresh.
  final VoidCallback? onContractActioned;

  @override
  State<ContractViewWidget> createState() => _ContractViewWidgetState();
}

class _ContractViewWidgetState extends State<ContractViewWidget>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  ContractsBundle? _bundle;
  bool _loading = true;
  bool _busy = false;
  String? _error;
  final TextEditingController _rejectNote =
      TextEditingController(text: 'Please revise the terms.');

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  @override
  void dispose() {
    _rejectNote.dispose();
    super.dispose();
  }

  Future<void> _fetch() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final svc = ContractsService(context.read<NeighborlyApiService>());
      final bundle = await svc.getContracts(widget.orderId);
      if (!mounted) return;
      setState(() {
        _bundle = bundle;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _approve(String versionId) async {
    setState(() => _busy = true);
    try {
      final svc = ContractsService(context.read<NeighborlyApiService>());
      await svc.approveContract(widget.orderId, versionId);
      if (!mounted) return;
      widget.onContractActioned?.call();
      await _fetch();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _reject(String versionId) async {
    final note = _rejectNote.text.trim();
    setState(() => _busy = true);
    try {
      final svc = ContractsService(context.read<NeighborlyApiService>());
      await svc.rejectContract(
        widget.orderId,
        versionId,
        note: note.isEmpty ? 'Please revise the terms.' : note,
      );
      if (!mounted) return;
      widget.onContractActioned?.call();
      await _fetch();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(_error!, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            FilledButton(onPressed: _fetch, child: const Text('Retry')),
          ],
        ),
      );
    }

    final bundle = _bundle;
    if (bundle == null || bundle.versions.isEmpty) {
      return _WaitingPlaceholder(
        lockReason: bundle?.lockReason,
        readOnly: bundle?.readOnly ?? true,
      );
    }

    final role = context.read<NeighborlyApiService>().user?.role ?? '';
    final isCustomer = role == 'customer';
    // Approve/Reject only when order is in 'contracted' status AND there is a sent version.
    final canAct = isCustomer &&
        widget.orderStatus == 'contracted' &&
        bundle.latestSent != null;
    final sentVersion = bundle.latestSent;
    final latest = bundle.versions.first;

    return RefreshIndicator(
      onRefresh: _fetch,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Lock reason banner
          if (bundle.readOnly && bundle.lockReason != null)
            _InfoBanner(message: bundle.lockReason!),

          // Latest contract card
          _ContractCard(version: latest),
          const SizedBox(height: 16),

          // Approve / Reject (customer + contracted + sent version)
          if (canAct && sentVersion != null) ...[
            TextField(
              controller: _rejectNote,
              minLines: 1,
              maxLines: 3,
              decoration: InputDecoration(
                labelText: 'Rejection note (if rejecting)',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _busy
                        ? null
                        : () => _reject(sentVersion.id),
                    child: Text(
                      'Reject',
                      style: GoogleFonts.inter(fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton(
                    onPressed: _busy
                        ? null
                        : () => _approve(sentVersion.id),
                    child: _busy
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(
                            'Approve',
                            style:
                                GoogleFonts.inter(fontWeight: FontWeight.w700),
                          ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
          ],

          // Version history
          if (bundle.versions.length > 1) ...[
            Text(
              'Version history',
              style: GoogleFonts.inter(
                  fontSize: 14, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            ...bundle.versions.skip(1).map(
                  (v) => _VersionHistoryRow(version: v),
                ),
          ],
        ],
      ),
    );
  }
}

class _WaitingPlaceholder extends StatelessWidget {
  const _WaitingPlaceholder({this.lockReason, required this.readOnly});

  final String? lockReason;
  final bool readOnly;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(LucideIcons.fileText, size: 48, color: cs.secondary),
            const SizedBox(height: 16),
            Text(
              lockReason ?? 'Waiting for provider to draft a contract.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                  fontSize: 15, color: cs.secondary, height: 1.4),
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoBanner extends StatelessWidget {
  const _InfoBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: cs.secondaryContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(LucideIcons.info, size: 16, color: cs.onSecondaryContainer),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: GoogleFonts.inter(
                  fontSize: 13, color: cs.onSecondaryContainer),
            ),
          ),
        ],
      ),
    );
  }
}

class _ContractCard extends StatelessWidget {
  const _ContractCard({required this.version});

  final ContractVersion version;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final (Color chipFg, Color chipBg) = switch (version.status) {
      'approved' => (cs.onTertiaryContainer, cs.tertiaryContainer),
      'rejected' => (cs.onErrorContainer, cs.errorContainer),
      'sent' => (cs.onPrimaryContainer, cs.primaryContainer),
      _ => (cs.onSecondaryContainer, cs.secondaryContainer),
    };

    return Card(
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: cs.outline.withValues(alpha: 0.3)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    version.title,
                    style: GoogleFonts.inter(
                        fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: chipBg,
                    borderRadius: BorderRadius.circular(100),
                  ),
                  child: Text(
                    version.status,
                    style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: chipFg),
                  ),
                ),
              ],
            ),
            if (version.scopeSummary != null &&
                version.scopeSummary!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                version.scopeSummary!,
                style: GoogleFonts.inter(
                    fontSize: 13,
                    color: cs.secondary,
                    fontStyle: FontStyle.italic),
              ),
            ],
            if (version.amount != null) ...[
              const SizedBox(height: 8),
              Text(
                '${version.currency} ${version.amount!.toStringAsFixed(2)}',
                style: GoogleFonts.inter(
                    fontSize: 15, fontWeight: FontWeight.w700),
              ),
            ],
            const SizedBox(height: 12),
            const Divider(),
            const SizedBox(height: 8),
            Text(
              version.termsMarkdown,
              style: GoogleFonts.inter(fontSize: 13, height: 1.55),
            ),
          ],
        ),
      ),
    );
  }
}

class _VersionHistoryRow extends StatelessWidget {
  const _VersionHistoryRow({required this.version});

  final ContractVersion version;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final dt = DateTime.tryParse(version.createdAt)?.toLocal();
    final label = dt != null
        ? '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}'
        : version.createdAt;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(LucideIcons.fileText, size: 14, color: cs.secondary),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              version.title,
              style: GoogleFonts.inter(fontSize: 13),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            '${version.status} · $label',
            style: GoogleFonts.inter(fontSize: 11, color: cs.secondary),
          ),
        ],
      ),
    );
  }
}
