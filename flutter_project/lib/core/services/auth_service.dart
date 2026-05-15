/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Auth Service — Authentication & User Management
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
///
/// Backend endpoints used:
///   POST /api/auth/login       — email/password login
///   POST /api/auth/register    — email/password register
///   POST /api/auth/google      — Google OAuth
///   GET  /api/auth/me          — current user profile (requires auth)
///
/// Mocked endpoints (not yet implemented in backend):
///   POST /api/auth/send-otp    — send OTP to phone
///   POST /api/auth/verify-otp  — verify OTP code
///   POST /api/auth/set-username — set display name after OTP
///
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import 'dart:developer' as developer;

import 'api_client.dart';

/// Handles authentication flows: OTP (mocked), email/password, Google, and profile.
class AuthService {
  /// Send OTP to the given phone number.
  ///
  /// **MOCKED** — the backend does not have a `/send-otp` endpoint yet.
  /// Logs a warning and returns a mock success response.
  Future<void> sendOtp(String phoneNumber) async {
    try {
      await ApiClient.post('/api/auth/send-otp', {'phone': phoneNumber});
    } on ApiException catch (e) {
      if (e.statusCode == 404) {
        developer.log(
          '⚠️ MOCK: POST /api/auth/send-otp not implemented yet — returning mock success',
          name: 'auth_service',
        );
        // Mock: pretend OTP was sent successfully
        return;
      }
      rethrow;
    }
  }

  /// Verify the OTP code for the given phone number.
  ///
  /// **MOCKED** — the backend does not have a `/verify-otp` endpoint yet.
  /// Logs a warning and returns a fake JWT token.
  /// On success, stores the token via [ApiClient.setToken].
  Future<String> verifyOtp(String phoneNumber, String otp) async {
    try {
      final response = await ApiClient.post('/api/auth/verify-otp', {
        'phone': phoneNumber,
        'otp': otp,
      });
      final token = response['token'] as String;
      ApiClient.setToken(token);
      return token;
    } on ApiException catch (e) {
      if (e.statusCode == 404) {
        developer.log(
          '⚠️ MOCK: POST /api/auth/verify-otp not implemented yet — returning mock token',
          name: 'auth_service',
        );
        // Mock: return a fake token and store it
          final mockToken = 'mock-jwt-token-${DateTime.now().millisecondsSinceEpoch}';
        ApiClient.setToken(mockToken);
        return mockToken;
      }
      rethrow;
    }
  }

  /// Set the username (display name) after successful OTP verification.
  ///
  /// **MOCKED** — the backend does not have a `/set-username` endpoint yet.
  /// Logs a warning and returns a mock success response.
  Future<void> setUsername(String username) async {
    try {
      await ApiClient.post('/api/auth/set-username', {'username': username});
    } on ApiException catch (e) {
      if (e.statusCode == 404) {
        developer.log(
          '⚠️ MOCK: POST /api/auth/set-username not implemented yet — returning mock success',
          name: 'auth_service',
        );
        // Mock: pretend username was set successfully
        return;
      }
      rethrow;
    }
  }

  /// Get the current user's profile from the backend.
  ///
  /// Requires a valid JWT token (set via [ApiClient.setToken]).
  /// Uses the real `GET /api/auth/me` endpoint.
  Future<Map<String, dynamic>> getMe() async {
    final response = await ApiClient.get('/api/auth/me');
    return response as Map<String, dynamic>;
  }

  /// Login with email and password.
  ///
  /// Uses the real `POST /api/auth/login` endpoint.
  /// On success, stores the JWT token via [ApiClient.setToken].
  /// Returns the response map containing `accessToken` and `user`.
  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await ApiClient.post('/api/auth/login', {
      'email': email,
      'password': password,
    });
    final token = response['accessToken'] as String;
    ApiClient.setToken(token);
    return response;
  }

  /// Register a new user with email and password.
  ///
  /// Uses the real `POST /api/auth/register` endpoint.
  /// On success, stores the JWT token via [ApiClient.setToken].
  /// Returns the response map containing `accessToken` and `user`.
  Future<Map<String, dynamic>> register(
    String email,
    String password,
    String displayName, {
    String? phone,
    String role = 'customer',
  }) async {
    final response = await ApiClient.post('/api/auth/register', {
      'email': email,
      'password': password,
      'displayName': displayName,
      'role': role,
      if (phone != null) 'phone': phone,
    });
    final token = response['accessToken'] as String;
    ApiClient.setToken(token);
    return response;
  }

  /// Logout — clears the stored token.
  Future<void> logout() async {
    try {
      await ApiClient.post('/api/auth/logout', {});
    } on ApiException {
      // Even if the server call fails, clear the local token
    }
    ApiClient.clearToken();
  }
}
