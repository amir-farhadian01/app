import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../services/neighborly_api_service.dart';
import '../models/user_model.dart';
import '../models/request_model.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _selectedIndex = 0;

  String _welcomeName(UserModel user) {
    final n = user.displayName.trim();
    if (n.isEmpty) return user.email.split('@').first;
    return n.split(' ').first;
  }

  @override
  Widget build(BuildContext context) {
    final api = context.watch<NeighborlyApiService>();
    final userModel = api.user;
    if (userModel == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      body: SafeArea(
        child: IndexedStack(
          index: _selectedIndex,
          children: [
            _buildMainDashboard(userModel),
            _buildRequestsList(api),
            _buildProfile(userModel, api),
          ],
        ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: (index) => setState(() => _selectedIndex = index),
        items: const [
          BottomNavigationBarItem(icon: Icon(LucideIcons.layoutDashboard), label: 'Dashboard'),
          BottomNavigationBarItem(icon: Icon(LucideIcons.clock), label: 'Requests'),
          BottomNavigationBarItem(icon: Icon(LucideIcons.user), label: 'Profile'),
        ],
      ),
    );
  }

  Widget _buildMainDashboard(UserModel user) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Welcome, ${_welcomeName(user)}',
            style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            'Manage your ${user.role} dashboard.',
            style: const TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 32),
          if (user.role == 'provider') ...[
            _buildStatCard('Total Earnings', '\$1,240', LucideIcons.dollarSign, const Color(0xFF10B981)),
            const SizedBox(height: 16),
            _buildStatCard('Active Jobs', '4', LucideIcons.briefcase, Colors.blue),
          ] else ...[
            _buildStatCard('Active Requests', '2', LucideIcons.clock, Colors.amber),
            const SizedBox(height: 16),
            _buildStatCard('Total Spent', '\$450', LucideIcons.dollarSign, Colors.indigo),
          ],
        ],
      ),
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(icon, color: color),
            ),
            const SizedBox(width: 16),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRequestsList(NeighborlyApiService api) {
    return StreamBuilder<List<RequestModel>>(
      stream: api.watchRequests(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting && !snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        if (!snapshot.hasData || snapshot.data!.isEmpty) {
          return const Center(child: Text('No requests found.'));
        }
        return ListView.builder(
          padding: const EdgeInsets.all(24),
          itemCount: snapshot.data!.length,
          itemBuilder: (context, index) {
            final req = snapshot.data![index];
            return Card(
              margin: const EdgeInsets.only(bottom: 16),
              child: ListTile(
                title: Text('Request #${req.id.substring(0, 6)}'),
                subtitle: Text('Status: ${req.status}'),
                trailing: const Icon(LucideIcons.chevronRight),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildProfile(UserModel user, NeighborlyApiService api) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircleAvatar(
            radius: 50,
            backgroundColor: Colors.grey[200],
            child: const Icon(LucideIcons.user, size: 50, color: Colors.grey),
          ),
          const SizedBox(height: 16),
          Text(
            user.displayName.isNotEmpty ? user.displayName : user.email,
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          Text(user.email, style: const TextStyle(color: Colors.grey)),
          const SizedBox(height: 32),
          ElevatedButton(
            onPressed: () async {
              await api.logout();
              if (!mounted) return;
              Navigator.of(context).pushNamedAndRemoveUntil('/home', (r) => false);
            },
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }
}
