import 'package:go_router/go_router.dart';

import '../../screens/splash_screen.dart';
import '../../screens/onboarding_screen.dart';
import '../../screens/login_screen.dart';
import '../../screens/register_screen.dart';
import '../../screens/home_screen.dart';
import '../../screens/explore_screen.dart';
import '../../screens/bookings_screen.dart';
import '../../screens/profile_screen.dart';
import '../../screens/service_detail_screen.dart';
import '../../screens/order_detail_screen.dart';
import '../../screens/business_dashboard_screen.dart';
import '../../screens/business_services_screen.dart';
import '../../screens/admin_dashboard_screen.dart';

/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Neighborly App Router — go_router
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
abstract final class AppRouter {
  static final GoRouter router = GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(path: '/', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/onboarding', builder: (_, __) => const OnboardingScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
      GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
      GoRoute(path: '/explore', builder: (_, __) => const ExploreScreen()),
      GoRoute(path: '/bookings', builder: (_, __) => const BookingsScreen()),
      GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
      GoRoute(
        path: '/service/:id',
        builder: (_, state) => ServiceDetailScreen(
          serviceId: state.pathParameters['id'] ?? '',
        ),
      ),
      GoRoute(
        path: '/order/:id',
        builder: (_, state) => OrderDetailScreen(
          orderId: state.pathParameters['id'] ?? '',
        ),
      ),
      GoRoute(path: '/business/dashboard', builder: (_, __) => const BusinessDashboardScreen()),
      GoRoute(path: '/business/services', builder: (_, __) => const BusinessServicesScreen()),
      GoRoute(path: '/admin/dashboard', builder: (_, __) => const AdminDashboardScreen()),
    ],
  );
}
