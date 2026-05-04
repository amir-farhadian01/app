import 'package:flutter/material.dart';

import '../models/order_models.dart';

String _ymd(DateTime d) {
  final m = d.month.toString().padLeft(2, '0');
  final day = d.day.toString().padLeft(2, '0');
  return '${d.year}-$m-$day';
}

/// Scheduled / appointment-style booking branch.
class AppointmentBookingForm extends StatefulWidget {
  const AppointmentBookingForm({
    super.key,
    required this.base,
    required this.catalogName,
    this.providerName,
    this.onPatch,
    this.onNext,
    this.onBack,
  });

  final OrderWizardArgs base;
  final String catalogName;
  final String? providerName;
  final ValueChanged<OrderWizardArgs>? onPatch;
  final VoidCallback? onNext;
  final VoidCallback? onBack;

  @override
  State<AppointmentBookingForm> createState() => _AppointmentBookingFormState();
}

class _AppointmentBookingFormState extends State<AppointmentBookingForm> {
  late final TextEditingController _addressCtrl =
      TextEditingController(text: widget.base.serviceAddress ?? '');
  DateTime? _date;
  String? _time;
  late final TextEditingController _accessCtrl =
      TextEditingController(text: widget.base.accessNotes ?? '');

  static const _slots = [
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
  ];

  @override
  void initState() {
    super.initState();
    final bd = widget.base.bookingDate?.trim();
    if (bd != null && bd.isNotEmpty) {
      final p = DateTime.tryParse(bd);
      if (p != null) _date = p;
    }
    final bt = widget.base.bookingTime?.trim();
    if (bt != null && bt.isNotEmpty && _slots.contains(bt)) {
      _time = bt;
    }
  }

  @override
  void dispose() {
    _addressCtrl.dispose();
    _accessCtrl.dispose();
    super.dispose();
  }

  void _emitPatch() {
    widget.onPatch?.call(
      widget.base.copyWith(
        serviceAddress: _addressCtrl.text.trim().isEmpty ? null : _addressCtrl.text.trim(),
        bookingDate: _date != null ? _ymd(_date!) : null,
        bookingTime: _time,
        accessNotes: _accessCtrl.text.trim().isEmpty ? null : _accessCtrl.text.trim(),
      ),
    );
  }

  Future<void> _pickDate() async {
    final d = await showDatePicker(
      context: context,
      initialDate: _date ?? DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (d != null) {
      setState(() => _date = d);
      _emitPatch();
    }
  }

  bool get _canContinue =>
      _addressCtrl.text.trim().isNotEmpty && _date != null && _time != null && _time!.isNotEmpty;

  @override
  Widget build(BuildContext context) {
    final border = BorderSide(color: Colors.grey.shade400);
    final title = widget.providerName != null && widget.providerName!.trim().isNotEmpty
        ? '${widget.catalogName} with ${widget.providerName!.trim()}'
        : widget.catalogName;

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          TextField(
            controller: _addressCtrl,
            decoration: const InputDecoration(
              labelText: 'Service address',
              border: OutlineInputBorder(),
            ),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 12),
          Material(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8), side: border),
            child: ListTile(
              title: Text(_date == null ? 'Pick a date' : _ymd(_date!)),
              trailing: const Icon(Icons.calendar_today),
              onTap: _pickDate,
            ),
          ),
          const SizedBox(height: 12),
          const Text('Pick a time', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
          Column(
            children: _slots.map((slot) {
              final isSelected = _time == slot;
              return Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Material(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8), side: border),
                  color: isSelected ? Colors.green.shade50 : null,
                  child: ListTile(
                    title: Text(slot),
                    trailing: isSelected ? Icon(Icons.check_circle, color: Colors.green.shade700) : null,
                    onTap: () {
                      setState(() => _time = slot);
                      _emitPatch();
                    },
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _accessCtrl,
            decoration: const InputDecoration(
              labelText: 'Gate code, parking info (optional)',
              border: OutlineInputBorder(),
            ),
            maxLines: 3,
            onChanged: (_) => _emitPatch(),
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: FilledButton.tonal(
                  onPressed: widget.onBack,
                  style: FilledButton.styleFrom(minimumSize: const Size(double.infinity, 48)),
                  child: const Text('Back'),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: FilledButton(
                  onPressed: _canContinue
                      ? () {
                          _emitPatch();
                          widget.onNext?.call();
                        }
                      : null,
                  style: FilledButton.styleFrom(minimumSize: const Size(double.infinity, 48)),
                  child: const Text('Request appointment'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
