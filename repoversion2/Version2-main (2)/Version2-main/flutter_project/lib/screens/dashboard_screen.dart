import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../services/firebase_service.dart';
import '../models/user_model.dart';
import '../models/request_model.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    final firebase = context.read<FirebaseService>();
    final user = context.watch<User?>();

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      body: SafeArea(
        child: FutureBuilder<UserModel?>(
          future: firebase.getUserModel(user!.uid),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            final userModel = snapshot.data;
            if (userModel == null) return const Center(child: Text('User not found.'));

            return IndexedStack(
              index: _selectedIndex,
              children: [
                _buildMainDashboard(userModel, firebase),
                _buildRequestsList(userModel, firebase),
                _buildProfile(userModel),
              ],
            );
          },
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

  Widget _buildMainDashboard(UserModel user, FirebaseService firebase) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Welcome, ${user.displayName.split(' ')[0]}',
            style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            'Manage your ${user.role} dashboard.',
            style: const TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 32),
          if (user.role == 'provider') ...[
            _buildStatCard('Total Earnings', '\$1,240', LucideIcons.dollarSign, Colors.emerald),
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
                color: color.withOpacity(0.1),
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

  Widget _buildRequestsList(UserModel user, FirebaseService firebase) {
    return StreamBuilder<List<RequestModel>>(
      stream: firebase.getRequests(user.uid, user.role),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
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

  Widget _buildProfile(UserModel user) {
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
          Text(user.displayName, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
          Text(user.email, style: const TextStyle(color: Colors.grey)),
          const SizedBox(height: 32),
          ElevatedButton(
            onPressed: () => FirebaseAuth.instance.signOut(),
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }
}
