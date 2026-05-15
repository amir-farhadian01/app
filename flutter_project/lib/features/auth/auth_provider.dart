/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Auth Provider — Riverpod state management for authentication
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/app_exception.dart';
import '../../core/storage/secure_storage.dart';
import 'auth_repository.dart';

// ─── Providers ──────────────────────────────────────────────────────

/// Provides the [AuthRepository] singleton.
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final dio = ref.watch(apiClientProvider);
  return AuthRepository(dio);
});

/// Provides the [AuthNotifier] and exposes [AuthState].
final authStateProvider =
    StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final repository = ref.watch(authRepositoryProvider);
  final secureStorage = ref.watch(secureStorageProvider);
  return AuthNotifier(repository, secureStorage);
});

// ─── State ──────────────────────────────────────────────────────────

/// Possible authentication states for the app.
sealed class AuthState {
  const AuthState();
}

/// App just launched, checking if a stored token is still valid.
class AuthInitial extends AuthState {
  const AuthInitial();
}

/// An auth request (login / register / checkAuthStatus) is in flight.
class AuthLoading extends AuthState {
  const AuthLoading();
}

/// User is authenticated and [user] holds their profile.
class AuthAuthenticated extends AuthState {
  final UserProfile user;
  const AuthAuthenticated(this.user);
}

/// User is not authenticated. [error] may contain a human-readable
/// message from the last failed attempt.
class AuthUnauthenticated extends AuthState {
  final String? error;
  const AuthUnauthenticated([this.error]);
}

// ─── Notifier ───────────────────────────────────────────────────────

/// Manages auth state transitions and coordinates between the
/// repository and secure storage.
class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(
    this._repository,
    this._secureStorage,
  ) : super(const AuthInitial());

  final AuthRepository _repository;
  final SecureStorage _secureStorage;

  /// Check whether a stored token is still valid by calling
  /// `GET /api/auth/me`.
  ///
  /// Called by the splash screen on startup.
  Future<void> checkAuthStatus() async {
    state = const AuthLoading();

    try {
      final token = await _secureStorage.getAccessToken();
      if (token == null) {
        state = const AuthUnauthenticated();
        return;
      }

      final user = await _repository.getMe();
      state = AuthAuthenticated(user);
    } catch (_) {
      // Token missing, expired, or network error → unauthenticated
      await _secureStorage.clearTokens();
      state = const AuthUnauthenticated();
    }
  }

  /// Authenticate with email + password.
  Future<void> login(String email, String password) async {
    state = const AuthLoading();

    try {
      final response = await _repository.login(email, password);
      await _secureStorage.saveTokens(
        response.accessToken,
        response.refreshToken ?? '',
      );
      state = AuthAuthenticated(response.user);
    } on AppException catch (e) {
      state = AuthUnauthenticated(e.message);
    } catch (_) {
      state = const AuthUnauthenticated('An unexpected error occurred.');
    }
  }

  /// Register a new account.
  Future<void> register(RegisterRequest request) async {
    state = const AuthLoading();

    try {
      final response = await _repository.register(request);
      await _secureStorage.saveTokens(
        response.accessToken,
        response.refreshToken ?? '',
      );
      state = AuthAuthenticated(response.user);
    } on AppException catch (e) {
      state = AuthUnauthenticated(e.message);
    } catch (_) {
      state = const AuthUnauthenticated('An unexpected error occurred.');
    }
  }

  /// Log the user out: call the backend, clear stored tokens, and
  /// reset state to unauthenticated.
  Future<void> logout() async {
    state = const AuthLoading();

    try {
      await _repository.logout();
    } catch (_) {
      // Even if the server call fails, we still clear local state.
    }

    await _secureStorage.clearTokens();
    state = const AuthUnauthenticated();
  }
}
