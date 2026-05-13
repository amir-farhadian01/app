import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/neighborly_api_service.dart';
import 'admin_dashboard_screen.dart';
import 'company_dashboard_screen.dart';
import 'customer_dashboard_screen.dart';
import 'provider_dashboard_screen.dart';
import '../services/auth_provider.dart';

/// Mirrors React [App.tsx] `/dashboard` branch: admin → company → provider → customer.
class RoleDashboardGate extends StatelessWidget {
  const RoleDashboardGate({super.key});

  static const _adminRoles = {'owner', 'platform_admin', 'support', 'finance'};

  @override
  Widget build(BuildContext context) {
    final api = context.watch<NeighborlyApiService>();
    final user = api.user;
    if (user == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final appUser = AppUser.fromUserModel(user);

    if (_adminRoles.contains(user.role)) {
      return const AdminDashboardScreen();
    }

    if (user.companyId != null && user.companyId!.trim().isNotEmpty) {
      return const CompanyDashboardScreen();
    }

    if (user.role == 'provider') {
      return const ProviderDashboardScreen();
    }

    return SafeArea(child: CustomerDashboardScreen(user: appUser));
  }
}
