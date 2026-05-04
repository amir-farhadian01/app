import 'package:flutter/material.dart';

import '../models/order_models.dart';

String? _datePrefWire(String? label) {
  switch (label) {
    case 'Today':
      return 'today';
    case 'Tomorrow':
      return 'tomorrow';
    case 'This weekend':
      return 'this_weekend';
    default:
      return null;
  }
}

String? _timePrefWire(String? label) {
  switch (label) {
    case 'Morning':
      return 'morning';
    case 'Afternoon':
      return 'afternoon';
    case 'Evening':
      return 'evening';
    default:
      return null;
  }
}

/// Quick / auto-match booking branch.
class AutoBookingForm extends StatefulWidget {
  const AutoBookingForm({
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
  State<AutoBookingForm> createState() => _AutoBookingFormState();
}

class _AutoBookingFormState extends State<AutoBookingForm> {
  late final TextEditingController _addressCtrl =
      TextEditingController(text: widget.base.serviceAddress ?? '');
  String? _datePrefLabel;
  String? _timePrefLabel;
  late final TextEditingController _notesCtrl =
      TextEditingController(text: widget.base.accessNotes ?? '');

  static const _dateOpts = ['Today', 'Tomorrow', 'This weekend'];
  static const _timeOpts = ['Morning', 'Afternoon', 'Evening'];

  @override
  void initState() {
    super.initState();
    switch (widget.base.datePreference) {
      case 'today':
        _datePrefLabel = 'Today';
        break;
      case 'tomorrow':
        _datePrefLabel = 'Tomorrow';
        break;
      case 'this_weekend':
        _datePrefLabel = 'This weekend';
        break;
      default:
        break;
    }
    switch (widget.base.timeWindow) {
      case 'morning':
        _timePrefLabel = 'Morning';
        break;
      case 'afternoon':
        _timePrefLabel = 'Afternoon';
        break;
      case 'evening':
        _timePrefLabel = 'Evening';
        break;
      default:
        break;
    }
  }

  @override
  void dispose() {
    _addressCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  void _emitPatch() {
    widget.onPatch?.call(
      widget.base.copyWith(
        serviceAddress: _addressCtrl.text.trim().isEmpty ? null : _addressCtrl.text.trim(),
        datePreference: _datePrefWire(_datePrefLabel),
        timeWindow: _timePrefWire(_timePrefLabel),
        accessNotes: _notesCtrl.text.trim().isEmpty ? null : _notesCtrl.text.trim(),
      ),
    );
  }

  bool get _canContinue {
    return _addressCtrl.text.trim().isNotEmpty && _datePrefLabel != null && _timePrefLabel != null;
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Auto match for ${widget.catalogName}',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
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
          const Text('When do you need this?', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
          Wrap(
            spacing: 16,
            runSpacing: 8,
            children: _dateOpts.map((opt) {
              final isSelected = _datePrefLabel == opt;
              return ChoiceChip(
                label: Text(opt),
                selected: isSelected,
                onSelected: (sel) {
                  if (!sel) return;
                  setState(() => _datePrefLabel = opt);
                  _emitPatch();
                },
              );
            }).toList(),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 16,
            runSpacing: 8,
            children: _timeOpts.map((opt) {
              final isSelected = _timePrefLabel == opt;
              return ChoiceChip(
                label: Text(opt),
                selected: isSelected,
                onSelected: (sel) {
                  if (!sel) return;
                  setState(() => _timePrefLabel = opt);
                  _emitPatch();
                },
              );
            }).toList(),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _notesCtrl,
            decoration: const InputDecoration(
              labelText: 'Notes (optional)',
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
                  child: const Text('Find match'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
