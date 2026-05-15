/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// API Client — Neighborly Backend Communication Layer
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
///
/// Backend Routes Discovered (all prefixed with /api):
///
///   Auth (routes/auth.ts):
///     POST /api/auth/register       — email/password register
///     POST /api/auth/login          — email/password login
///     POST /api/auth/google         — Google OAuth
///     POST /api/auth/refresh        — refresh token
///     POST /api/auth/logout         — logout (requires auth)
///     GET  /api/auth/me             — current user profile (requires auth)
///     POST /api/auth/forgot-password
///     POST /api/auth/reset-password
///     POST /api/auth/register-options       — WebAuthn
///     POST /api/auth/verify-registration    — WebAuthn
///     POST /api/auth/login-options          — WebAuthn
///     POST /api/auth/verify-login           — WebAuthn
///     POST /api/auth/google/link            — link Google (requires auth)
///
///   NOTE: No OTP (send-otp / verify-otp) or set-username endpoints exist
///         in the backend. These will be mocked in AuthService.
///
///   Posts (routes/posts.ts):
///     GET  /api/posts?page=&pageSize=  — public post list
///     GET  /api/posts/:id              — single post
///     POST /api/posts                  — create post (requires auth)
///     DELETE /api/posts/:id            — soft-delete (requires auth)
///
///   Feed (routes/feed.ts):
///     GET  /api/feed                   — personalized feed (auth optional)
///     GET  /api/feed/public            — public feed
///
///   Categories (routes/categories.ts):
///     GET  /api/categories?parentId=   — list categories
///     GET  /api/categories/tree        — nested tree
///     GET  /api/categories/tree-with-services — tree + services (requires auth)
///     GET  /api/categories/search?q=   — search categories + service catalogs
///
///   Users (routes/users.ts):
///     GET  /api/users/me               — current user (requires auth)
///     GET  /api/users/me/stats         — user stats (requires auth)
///     POST /api/users/me/change-password (requires auth)
///
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import 'dart:convert';
import 'dart:developer' as developer;

import 'package:http/http.dart' as http;

/// Base URL for the Neighborly backend (local dev).
const String kBaseUrl = 'http://localhost:3000';

/// Exception thrown when the API returns a non-2xx status code.
class ApiException implements Exception {
  final int statusCode;
  final String message;

  const ApiException(this.statusCode, this.message);

  @override
  String toString() => 'ApiException($statusCode): $message';
}

/// Singleton-style HTTP client for the Neighborly backend.
///
/// Stores JWT token in memory only (no persistence).
/// All methods throw [ApiException] on non-2xx responses.
abstract final class ApiClient {
  static String? _token;

  /// Store the JWT token for subsequent requests.
  static void setToken(String token) {
    _token = token;
    developer.log('ApiClient: token set', name: 'api_client');
  }

  /// Clear the stored JWT token (logout).
  static void clearToken() {
    _token = null;
    developer.log('ApiClient: token cleared', name: 'api_client');
  }

  /// Returns true if a token is currently stored.
  static bool get hasToken => _token != null;

  /// Build the standard headers for API requests.
  static Map<String, String> _headers() {
    final headers = <String, String>{
      'Content-Type': 'application/json',
    };
    if (_token != null) {
      headers['Authorization'] = 'Bearer $_token';
    }
    return headers;
  }

  /// Perform a POST request to [path] (e.g. '/auth/login').
  /// Returns the decoded JSON body as a Map.
  static Future<Map<String, dynamic>> post(
    String path,
    Map<String, dynamic> body,
  ) async {
    final uri = Uri.parse('$kBaseUrl$path');
    developer.log('POST $uri', name: 'api_client');
    final response = await http.post(
      uri,
      headers: _headers(),
      body: jsonEncode(body),
    );
    return _handleResponse(response);
  }

  /// Perform a GET request to [path] (e.g. '/posts?page=1').
  /// Returns the decoded JSON body.
  static Future<dynamic> get(String path) async {
    final uri = Uri.parse('$kBaseUrl$path');
    developer.log('GET $uri', name: 'api_client');
    final response = await http.get(uri, headers: _headers());
    return _handleResponse(response);
  }

  /// Perform a PUT request to [path].
  /// Returns the decoded JSON body as a Map.
  static Future<Map<String, dynamic>> put(
    String path,
    Map<String, dynamic> body,
  ) async {
    final uri = Uri.parse('$kBaseUrl$path');
    developer.log('PUT $uri', name: 'api_client');
    final response = await http.put(
      uri,
      headers: _headers(),
      body: jsonEncode(body),
    );
    return _handleResponse(response);
  }

  /// Perform a DELETE request to [path].
  /// Returns the decoded JSON body as a Map.
  static Future<Map<String, dynamic>> delete(String path) async {
    final uri = Uri.parse('$kBaseUrl$path');
    developer.log('DELETE $uri', name: 'api_client');
    final response = await http.delete(uri, headers: _headers());
    return _handleResponse(response);
  }

  /// Parse the response body and throw [ApiException] on non-2xx.
  static dynamic _handleResponse(http.Response response) {
    dynamic body;
    try {
      body = jsonDecode(response.body);
    } catch (_) {
      body = <String, dynamic>{'error': response.body};
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return body;
    }

    final message = body is Map ? (body['error'] as String? ?? body.toString()) : body.toString();
    throw ApiException(response.statusCode, message);
  }
}
