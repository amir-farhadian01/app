import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../features/splash/splash_screen.dart';
import '../../features/onboarding/onboarding_screen.dart';
import '../../features/auth/login_screen.dart';
import '../../features/auth/register_screen.dart';
import '../../features/shell/main_shell.dart';
import '../../services/auth_provider.dart';

final GoRouter appRouter = GoRouter(
  initialLocation: '/splash',
  redirect: (BuildContext context, GoRouterState state) {
    final auth = context.read<AuthProvider>();
    final isLoading = auth.loading;
    final isLoggedIn = auth.isLoggedIn;
    final loc = state.matchedLocation;

    if (isLoading) return '/splash';

    final publicRoutes = ['/splash', '/onboarding', '/login', '/register'];
    if (!isLoggedIn && !publicRoutes.contains(loc)) return '/login';
    if (isLoggedIn && (loc == '/login' || loc == '/register')) return '/home';

    return null;
  },
  routes: [
    GoRoute(path: '/splash',      builder: (_, __) => const SplashScreen()),
    GoRoute(path: '/onboarding',  builder: (_, __) => const OnboardingScreen()),
    GoRoute(path: '/login',       builder: (_, __) => const LoginScreen()),
    GoRoute(path: '/register',    builder: (_, __) => const RegisterScreen()),
    GoRoute(path: '/home',        builder: (_, __) => const MainShell()),
  ],
);
