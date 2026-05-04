import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/neighborly_api_service.dart';
import 'service_details_screen.dart';

/// Loads `/api/services/:id` then shows [ServiceDetailsScreen] (web `/service/:id`).
class ServiceLoaderScreen extends StatelessWidget {
  const ServiceLoaderScreen({super.key, required this.serviceId});

  final String serviceId;

  @override
  Widget build(BuildContext context) {
    final api = context.read<NeighborlyApiService>();
    return FutureBuilder(
      future: api.fetchServiceById(serviceId),
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        if (snap.hasError || !snap.hasData) {
          return Scaffold(
            appBar: AppBar(title: const Text('Service')),
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(snap.error?.toString() ?? 'Not found', textAlign: TextAlign.center),
                    const SizedBox(height: 16),
                    FilledButton(onPressed: () => Navigator.pop(context), child: const Text('Back')),
                  ],
                ),
              ),
            ),
          );
        }
        return ServiceDetailsScreen(service: snap.data!);
      },
    );
  }
}
