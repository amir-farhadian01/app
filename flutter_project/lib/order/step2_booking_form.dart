import 'package:flutter/material.dart';

import '../models/order_models.dart';
import 'appointment_booking_form.dart';
import 'auto_booking_form.dart';
import 'negotiation_booking_form.dart';

/// Dispatches Step 2 UI by `args.bookingMode` wire string (web `Step2BookingForm`).
class Step2BookingForm extends StatelessWidget {
  const Step2BookingForm({
    super.key,
    required this.args,
    this.onNext,
    this.onBack,
    this.onPatch,
  });

  final OrderWizardArgs args;
  final VoidCallback? onNext;
  final VoidCallback? onBack;
  final ValueChanged<OrderWizardArgs>? onPatch;

  Widget _buildBody(String mode, String catalogName, String? providerName) {
    switch (mode) {
      case 'auto_appointment':
        return AutoBookingForm(
          base: args,
          catalogName: catalogName,
          providerName: providerName,
          onPatch: onPatch,
          onNext: onNext,
          onBack: onBack,
        );
      case 'inherit_from_catalog':
        return AppointmentBookingForm(
          base: args,
          catalogName: catalogName,
          providerName: providerName,
          onPatch: onPatch,
          onNext: onNext,
          onBack: onBack,
        );
      case 'negotiation':
        return NegotiationBookingForm(
          base: args,
          catalogName: catalogName,
          providerName: providerName,
          onPatch: onPatch,
          onNext: onNext,
          onBack: onBack,
        );
      default:
        return Center(child: Text('Unknown mode: $mode'));
    }
  }

  @override
  Widget build(BuildContext context) {
    final mode = args.bookingMode?.trim();
    if (mode == null || mode.isEmpty) {
      return const Center(child: Text('No service selected. Pick a service first.'));
    }
    final title = args.catalogName?.trim().isNotEmpty == true ? args.catalogName!.trim() : 'Service';
    final provider = args.providerName?.trim().isNotEmpty == true
        ? args.providerName!.trim()
        : args.prefillProviderName?.trim();

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Booking details',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          _buildBody(mode, title, provider),
        ],
      ),
    );
  }
}
