import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/neighborly_api_service.dart';

class ProviderOnboardingScreen extends StatelessWidget {
  const ProviderOnboardingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<NeighborlyApiService>().user;
    return Scaffold(
      appBar: AppBar(title: const Text('Provider setup required')),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520),
          child: Card(
            margin: const EdgeInsets.all(20),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Complete provider onboarding',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'Your account does not have an active provider workspace yet. '
                    'Legacy provider dashboards are disabled for parity flows.',
                  ),
                  const SizedBox(height: 8),
                  Text('Signed in as: ${user?.email ?? '-'}'),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: () => Navigator.of(context).pushNamed('/profile'),
                    child: const Text('Open Profile / KYC'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
