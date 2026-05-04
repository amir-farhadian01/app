import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/order_models.dart';
import '../services/neighborly_api_service.dart';

class OrderDetailScreen extends StatefulWidget {
  const OrderDetailScreen({super.key, required this.orderId});

  final String orderId;

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  bool _loading = true;
  String? _error;
  OrderDetail? _order;
  bool _paymentLoading = false;
  bool _paymentBusy = false;
  Map<String, dynamic>? _paymentStatus;
  String? _paymentFailure;
  String? _sessionLink;
  bool _historyLoading = false;
  List<Map<String, dynamic>> _paymentHistory = const [];
  bool _panelLoading = false;
  Map<String, dynamic>? _candidatesBundle;
  Map<String, dynamic>? _chatThread;
  Map<String, dynamic>? _contractsBundle;
  bool _chatReadOnly = false;
  String? _paymentLockReason;
  final TextEditingController _chatInput = TextEditingController();
  final TextEditingController _rejectNote = TextEditingController(text: 'Please revise the terms.');

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _chatInput.dispose();
    _rejectNote.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final row = await context.read<NeighborlyApiService>().fetchOrderById(widget.orderId);
      await _loadCompanionPanels(row.id);
      await _loadPaymentAndHistory(row);
      if (!mounted) return;
      setState(() {
        _order = row;
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

  Future<void> _loadCompanionPanels(String orderId) async {
    setState(() => _panelLoading = true);
    final api = context.read<NeighborlyApiService>();
    Map<String, dynamic>? candidates;
    Map<String, dynamic>? chat;
    Map<String, dynamic>? contracts;
    try {
      candidates = await api.fetchOrderCandidates(orderId);
    } catch (_) {
      candidates = null;
    }
    try {
      chat = await api.fetchOrderChatThread(orderId);
    } catch (_) {
      chat = null;
    }
    try {
      contracts = await api.fetchOrderContracts(orderId);
    } catch (_) {
      contracts = null;
    }
    if (!mounted) return;
    setState(() {
      _candidatesBundle = candidates;
      _chatThread = chat;
      _contractsBundle = contracts;
      _chatReadOnly = chat?['readOnly'] == true;
      _panelLoading = false;
    });
  }

  Future<void> _loadPaymentAndHistory(OrderDetail row) async {
    final api = context.read<NeighborlyApiService>();
    final role = api.user?.role;
    setState(() {
      _paymentLoading = true;
      _historyLoading = role == 'customer';
      _paymentFailure = null;
    });
    try {
      final payment = await api.fetchOrderPaymentStatus(row.id);
      List<Map<String, dynamic>> history = const [];
      if (role == 'customer') {
        final all = await api.fetchFinanceHistory();
        history = all
            .where((tx) {
              final cat = tx['category']?.toString().toLowerCase() ?? '';
              final desc = tx['description']?.toString() ?? '';
              return (cat.contains('order_payment') || cat.contains('payment')) && desc.contains('order:${row.id}');
            })
            .toList();
      }
      if (!mounted) return;
      setState(() {
        _paymentStatus = payment;
        _paymentLockReason = payment['readOnly'] == true ? payment['lockReason']?.toString() : null;
        _paymentHistory = history;
        _paymentLoading = false;
        _historyLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _paymentStatus = null;
        _paymentLockReason = null;
        _paymentFailure = e.toString();
        _paymentLoading = false;
        _historyLoading = false;
      });
    }
  }

  Future<void> _createPaymentSession() async {
    if (_order == null) return;
    setState(() {
      _paymentBusy = true;
      _paymentFailure = null;
    });
    final api = context.read<NeighborlyApiService>();
    try {
      final session = await api.createOrderPaymentSession(_order!.id);
      final payload = session['session'] is Map ? Map<String, dynamic>.from(session['session'] as Map) : const <String, dynamic>{};
      if (!mounted) return;
      setState(() => _sessionLink = payload['paymentUrl']?.toString());
      await _loadPaymentAndHistory(_order!);
    } on PaymentGateException catch (e) {
      if (!mounted) return;
      setState(() => _paymentFailure = e.message);
      await _loadPaymentAndHistory(_order!);
    } catch (e) {
      if (!mounted) return;
      setState(() => _paymentFailure = e.toString());
    } finally {
      if (mounted) {
        setState(() => _paymentBusy = false);
      }
    }
  }

  Future<void> _selectCandidate(String attemptId) async {
    if (_order == null) return;
    final api = context.read<NeighborlyApiService>();
    try {
      await api.selectOrderProvider(orderId: _order!.id, attemptId: attemptId);
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _sendChat() async {
    final order = _order;
    if (order == null) return;
    final text = _chatInput.text.trim();
    if (text.isEmpty) return;
    final api = context.read<NeighborlyApiService>();
    try {
      await api.sendOrderChatMessage(orderId: order.id, text: text);
      _chatInput.clear();
      await _loadCompanionPanels(order.id);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _approveContract(String versionId) async {
    final order = _order;
    if (order == null) return;
    final api = context.read<NeighborlyApiService>();
    try {
      await api.approveContractVersion(orderId: order.id, versionId: versionId);
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _rejectContract(String versionId) async {
    final order = _order;
    if (order == null) return;
    final note = _rejectNote.text.trim();
    final api = context.read<NeighborlyApiService>();
    try {
      await api.rejectContractVersion(
        orderId: order.id,
        versionId: versionId,
        note: note.isEmpty ? 'Please revise contract terms.' : note,
      );
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  @override
  Widget build(BuildContext context) {
    final order = _order;
    return Scaffold(
      appBar: AppBar(title: const Text('Order Detail')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!, textAlign: TextAlign.center))
              : order == null
                  ? const Center(child: Text('Order not found'))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          _kv('Status', order.status),
                          _kv('Phase', order.phase ?? '—'),
                          _kv('Address', order.address),
                          _kv('Schedule', order.scheduleFlexibility),
                          _kv('Entry point', order.entryPoint),
                          _kv('Description', order.description.isEmpty ? '—' : order.description),
                          _matchSection(order),
                          _chatSection(order),
                          _contractsSection(order),
                          _paymentSection(order),
                          _paymentHistorySection(),
                          const SizedBox(height: 12),
                          Text('Answers', style: Theme.of(context).textTheme.titleMedium),
                          const SizedBox(height: 8),
                          ...(order.answers.entries.map((e) => _kv(e.key, '${e.value}'))),
                        ],
                      ),
                    ),
    );
  }

  Widget _paymentSection(OrderDetail order) {
    final api = context.read<NeighborlyApiService>();
    final role = api.user?.role ?? '';
    final customerView = role == 'customer';
    final payment = _paymentStatus?['payment'] is Map ? Map<String, dynamic>.from(_paymentStatus!['payment'] as Map) : null;
    final gateOrderStatus = _paymentStatus?['orderStatus']?.toString();
    final approvedVersion = _paymentStatus?['approvedContractVersionId']?.toString();
    final state = _mapPaymentUiState(
      order: order,
      gateOrderStatus: gateOrderStatus,
      approvedVersion: approvedVersion,
      payment: payment,
      failure: _paymentFailure,
    );
    final ctaVisible = customerView && state == _PaymentUiState.readyToPay;

    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Payment', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            const SizedBox(height: 8),
            if (_paymentLoading)
              const Text('Loading payment status...')
            else ...[
              if (_paymentLockReason != null && _paymentLockReason!.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(_paymentLockReason!, style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
                ),
              _kv('State', _paymentStateLabel(state)),
              if (_paymentFailure != null) Text(_paymentFailure!, style: const TextStyle(color: Colors.red)),
              if (_sessionLink != null && _sessionLink!.isNotEmpty) ...[
                const SizedBox(height: 6),
                SelectableText('Session link: $_sessionLink'),
              ],
              if (!customerView) ...[
                const SizedBox(height: 4),
                const Text('Read-only: payment actions are customer-only in mobile.'),
              ],
              if (ctaVisible)
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: _paymentBusy ? null : _createPaymentSession,
                    child: Text(_paymentBusy ? 'Creating session...' : 'Create payment session'),
                  ),
                ),
              if (customerView && !ctaVisible && state == _PaymentUiState.blocked)
                const Text('Payment action is blocked until contract approval/eligibility is satisfied.'),
            ],
          ],
        ),
      ),
    );
  }

  Widget _matchSection(OrderDetail order) {
    final role = context.read<NeighborlyApiService>().user?.role;
    final candidatesRaw = _candidatesBundle?['candidates'];
    final candidates = candidatesRaw is List
        ? candidatesRaw.map((e) => Map<String, dynamic>.from(e as Map)).toList()
        : <Map<String, dynamic>>[];
    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Match Outcome', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            const SizedBox(height: 8),
            if (_panelLoading)
              const Text('Loading matching state...')
            else if (candidates.isEmpty)
              Text(order.status == 'matching' ? 'No accepted candidates yet.' : 'No candidate actions available.')
            else
              ...candidates.map(
                (c) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(c['providerName']?.toString() ?? 'Provider'),
                  subtitle: Text(
                    '${c['workspaceName'] ?? ''} · ${c['packageName'] ?? ''} · ${c['packageFinalPrice'] ?? '-'} ${c['packageCurrency'] ?? ''}',
                  ),
                  trailing: role == 'customer' && order.status == 'matching'
                      ? FilledButton(
                          onPressed: () => _selectCandidate(c['attemptId']?.toString() ?? ''),
                          child: const Text('Select'),
                        )
                      : const SizedBox.shrink(),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _chatSection(OrderDetail order) {
    final msgsRaw = _chatThread?['messages'];
    final messages = msgsRaw is List ? msgsRaw.map((e) => Map<String, dynamic>.from(e as Map)).toList() : <Map<String, dynamic>>[];
    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Chat Thread', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            const SizedBox(height: 8),
            if (_chatReadOnly)
              const Text(
                'Read-only until your workspace is the matched provider (or you are the customer).',
                style: TextStyle(fontSize: 13),
              ),
            if (_panelLoading)
              const Text('Loading chat...')
            else if (messages.isEmpty)
              const Text('No messages yet.')
            else
              ...messages.take(8).map(
                    (m) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Text('${m['senderRole'] ?? 'user'}: ${m['displayText'] ?? ''}'),
                    ),
                  ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _chatInput,
                    readOnly: _chatReadOnly,
                    minLines: 1,
                    maxLines: 3,
                    decoration: InputDecoration(
                      hintText: _chatReadOnly ? 'Messaging unlocks after match' : 'Send a message',
                      border: const OutlineInputBorder(),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton(onPressed: _chatReadOnly ? null : _sendChat, child: const Text('Send')),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _contractsSection(OrderDetail order) {
    final role = context.read<NeighborlyApiService>().user?.role;
    final contractsReadOnly = _contractsBundle?['readOnly'] == true;
    final lockReason = _contractsBundle?['lockReason']?.toString();
    final versionsRaw = _contractsBundle?['versions'];
    final versions = versionsRaw is List
        ? versionsRaw.map((e) => Map<String, dynamic>.from(e as Map)).toList()
        : <Map<String, dynamic>>[];
    Map<String, dynamic>? sentVersion;
    for (final row in versions) {
      if (row['status']?.toString() == 'sent') {
        sentVersion = row;
        break;
      }
    }
    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Contract', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            const SizedBox(height: 8),
            if (contractsReadOnly && lockReason != null && lockReason.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(lockReason, style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
              ),
            if (_panelLoading)
              const Text('Loading contracts...')
            else if (versions.isEmpty)
              Text(contractsReadOnly ? 'No contract yet (pre-match).' : 'No contract versions yet.')
            else ...[
              Text('Latest status: ${versions.first['status'] ?? '-'}'),
              const SizedBox(height: 6),
              Text(versions.first['title']?.toString() ?? 'Untitled'),
              const SizedBox(height: 6),
              Text((versions.first['scopeSummary'] ?? versions.first['termsMarkdown'] ?? '').toString()),
              if (role == 'customer' && sentVersion != null) ...[
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton.tonal(
                        onPressed: () => _rejectContract(sentVersion!['id']?.toString() ?? ''),
                        child: const Text('Reject'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: FilledButton(
                        onPressed: () => _approveContract(sentVersion!['id']?.toString() ?? ''),
                        child: const Text('Approve'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _rejectNote,
                  minLines: 1,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    labelText: 'Rejection note',
                    border: OutlineInputBorder(),
                  ),
                ),
              ] else
                const Text('Contract actions depend on role and current version state.'),
            ],
          ],
        ),
      ),
    );
  }

  Widget _paymentHistorySection() {
    final role = context.read<NeighborlyApiService>().user?.role;
    if (role != 'customer') return const SizedBox.shrink();
    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Payment History', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            const SizedBox(height: 8),
            if (_historyLoading)
              const Text('Loading history...')
            else if (_paymentHistory.isEmpty)
              const Text('No payment transactions yet.')
            else
              ..._paymentHistory.take(10).map(
                    (tx) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Text(
                        '${tx['category'] ?? 'payment'} · ${tx['amount'] ?? 0} · ${tx['timestamp'] ?? tx['createdAt'] ?? ''}',
                      ),
                    ),
                  ),
          ],
        ),
      ),
    );
  }

  _PaymentUiState _mapPaymentUiState({
    required OrderDetail order,
    required String? gateOrderStatus,
    required String? approvedVersion,
    required Map<String, dynamic>? payment,
    required String? failure,
  }) {
    if (payment?['status']?.toString() == 'paid' || order.status == 'paid') {
      return _PaymentUiState.paid;
    }
    if (payment?['status']?.toString() == 'pending') {
      return _PaymentUiState.pending;
    }
    if (failure != null && failure.isNotEmpty) {
      return _PaymentUiState.failed;
    }
    final gateReady = gateOrderStatus == 'contracted' && approvedVersion != null && approvedVersion.isNotEmpty;
    if (gateReady) return _PaymentUiState.readyToPay;
    return _PaymentUiState.blocked;
  }

  String _paymentStateLabel(_PaymentUiState s) {
    switch (s) {
      case _PaymentUiState.pending:
        return 'pending';
      case _PaymentUiState.readyToPay:
        return 'ready-to-pay';
      case _PaymentUiState.paid:
        return 'paid';
      case _PaymentUiState.failed:
        return 'failed';
      case _PaymentUiState.blocked:
        return 'blocked';
    }
  }

  Widget _kv(String k, String v) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(k, style: const TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text(v),
        ],
      ),
    );
  }
}

enum _PaymentUiState { pending, readyToPay, paid, failed, blocked }
