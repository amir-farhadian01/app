import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../models/order_models.dart';

String? _urgencyWire(String? label) {
  switch (label) {
    case 'Immediate (today)':
      return 'immediate';
    case 'This week':
      return 'this_week';
    case 'No rush':
      return 'no_rush';
    default:
      return null;
  }
}

String? _contactWire(String? label) {
  switch (label) {
    case 'In-app chat':
      return 'in_app';
    case 'Phone call':
      return 'phone';
    default:
      return null;
  }
}

/// Negotiation / custom-quote style booking branch.
class NegotiationBookingForm extends StatefulWidget {
  const NegotiationBookingForm({
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
  State<NegotiationBookingForm> createState() => _NegotiationBookingFormState();
}

class _NegotiationBookingFormState extends State<NegotiationBookingForm> {
  late final TextEditingController _addressCtrl =
      TextEditingController(text: widget.base.serviceAddress ?? '');
  late final TextEditingController _descCtrl = TextEditingController(text: widget.base.notes ?? '');
  String? _urgencyLabel;
  double _budget = 85;
  XFile? _photo;
  String? _contactLabel = 'In-app chat';

  static const _urgencyOpts = ['Immediate (today)', 'This week', 'No rush'];
  static const _contactOpts = ['In-app chat', 'Phone call'];

  @override
  void initState() {
    super.initState();
    switch (widget.base.urgency) {
      case 'immediate':
        _urgencyLabel = 'Immediate (today)';
        break;
      case 'this_week':
        _urgencyLabel = 'This week';
        break;
      case 'no_rush':
        _urgencyLabel = 'No rush';
        break;
      default:
        break;
    }
    switch (widget.base.contactPreference) {
      case 'phone':
        _contactLabel = 'Phone call';
        break;
      case 'in_app':
      default:
        _contactLabel = 'In-app chat';
        break;
    }
    final b = widget.base.budgetMin ?? widget.base.budgetMax;
    if (b != null && b >= 25 && b <= 500) {
      _budget = b;
    }
  }

  @override
  void dispose() {
    _addressCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  void _emitPatch() {
    widget.onPatch?.call(
      widget.base.copyWith(
        serviceAddress: _addressCtrl.text.trim().isEmpty ? null : _addressCtrl.text.trim(),
        notes: _descCtrl.text.trim().isEmpty ? null : _descCtrl.text.trim(),
        urgency: _urgencyWire(_urgencyLabel),
        budgetMin: _budget,
        budgetMax: _budget,
        contactPreference: _contactWire(_contactLabel),
      ),
    );
  }

  Future<void> _pickPhoto() async {
    final p = ImagePicker();
    final f = await p.pickImage(source: ImageSource.gallery);
    if (f != null) {
      setState(() => _photo = f);
    }
  }

  int get _descLen => _descCtrl.text.trim().length;

  bool get _canContinue =>
      _addressCtrl.text.trim().isNotEmpty && _descLen >= 20 && _urgencyLabel != null && _contactLabel != null;

  @override
  Widget build(BuildContext context) {
    final title = widget.providerName != null && widget.providerName!.trim().isNotEmpty
        ? '${widget.catalogName} from ${widget.providerName!.trim()}'
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
          TextField(
            controller: _descCtrl,
            decoration: const InputDecoration(
              labelText: 'Describe your issue (min 20 characters)',
              border: OutlineInputBorder(),
            ),
            maxLines: 4,
            maxLength: 500,
            onChanged: (_) {
              setState(() {});
              _emitPatch();
            },
            buildCounter: (ctx, {required currentLength, required isFocused, required maxLength}) {
              return Text(
                '$currentLength / $maxLength',
                style: TextStyle(
                  color: currentLength >= 20 ? Colors.green.shade700 : Colors.red.shade700,
                  fontSize: 12,
                ),
              );
            },
          ),
          const SizedBox(height: 12),
          const Text('How urgent?', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
          Wrap(
            spacing: 16,
            children: _urgencyOpts.map((opt) {
              final isSelected = _urgencyLabel == opt;
              return ChoiceChip(
                label: Text(opt),
                selected: isSelected,
                onSelected: (sel) {
                  if (!sel) return;
                  setState(() => _urgencyLabel = opt);
                  _emitPatch();
                },
              );
            }).toList(),
          ),
          const SizedBox(height: 12),
          Text('Budget (CAD): ${_budget.round()}'),
          Slider(
            value: _budget,
            min: 25,
            max: 500,
            divisions: 19,
            label: _budget.round().toString(),
            onChanged: (v) {
              setState(() => _budget = v);
              _emitPatch();
            },
          ),
          const SizedBox(height: 8),
          const Text('Contact preference', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
          Wrap(
            spacing: 16,
            children: _contactOpts.map((opt) {
              final isSelected = _contactLabel == opt;
              return ChoiceChip(
                label: Text(opt),
                selected: isSelected,
                onSelected: (sel) {
                  if (!sel) return;
                  setState(() => _contactLabel = opt);
                  _emitPatch();
                },
              );
            }).toList(),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _pickPhoto,
            icon: const Icon(Icons.photo_camera_outlined),
            label: Text(_photo == null ? 'Attach photo (optional)' : 'Photo: ${_photo!.name}'),
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
                  child: const Text('Start negotiation'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
