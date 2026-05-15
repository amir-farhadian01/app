import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// Same origin rules as [NeighborlyApiService]: Traefik + Flutter on same host hits `/api/*`;
/// Local `npm run dev`: use PORT in `.env` (default 8077 — avoids Windows :8080 conflicts).
/// Override with `--dart-define=API_BASE_URL=...`.
String get apiOrigin {
  const fromEnv = String.fromEnvironment('API_BASE_URL', defaultValue: '');
  final trimmed = fromEnv.replaceAll(RegExp(r'/$'), '');
  if (trimmed.isNotEmpty) return trimmed;
  if (kIsWeb) {
    // Flutter dev server origin has no API — without this, every request fails.
    if (kDebugMode) return 'http://localhost:3000';
    return Uri.base.origin;
  }
  return 'http://10.0.2.2:3000';
}

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  ApiException(this.message, [this.statusCode]);
  @override
  String toString() => message;
}

class ApiService {
  // ─── Token management ──────────────────────────────────────────────────────
  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('accessToken');
  }

  static Future<void> setToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('accessToken', token);
  }

  static Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('accessToken');
    await prefs.remove('currentUser');
  }

  static Future<Map<String, String>> _headers() async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // ─── Core request ──────────────────────────────────────────────────────────
  static Future<dynamic> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? queryParams,
  }) async {
    final uri = Uri.parse('$apiOrigin$path').replace(queryParameters: queryParams);
    final headers = await _headers();

    http.Response response;
    switch (method) {
      case 'GET':
        response = await http.get(uri, headers: headers);
        break;
      case 'POST':
        response = await http.post(uri, headers: headers, body: jsonEncode(body));
        break;
      case 'PUT':
        response = await http.put(uri, headers: headers, body: jsonEncode(body));
        break;
      case 'DELETE':
        response = await http.delete(uri, headers: headers);
        break;
      default:
        throw ApiException('Unsupported method: $method');
    }

    if (response.statusCode == 204) return null;

    final data = jsonDecode(response.body);
    if (response.statusCode >= 400) {
      throw ApiException(data['error'] ?? 'Request failed', response.statusCode);
    }
    return data;
  }

  static Future<dynamic> get(String path, {Map<String, String>? params}) =>
      _request('GET', path, queryParams: params);

  static Future<dynamic> post(String path, [Map<String, dynamic>? body]) =>
      _request('POST', path, body: body);

  static Future<dynamic> put(String path, [Map<String, dynamic>? body]) =>
      _request('PUT', path, body: body);

  static Future<dynamic> delete(String path) => _request('DELETE', path);

  // ─── Auth ──────────────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> login(String email, String password) async {
    final data = await post('/api/auth/login', {'email': email, 'password': password});
    await setToken(data['accessToken']);
    return data;
  }

  static Future<Map<String, dynamic>> register(
      String email, String password, String displayName, String role) async {
    final data = await post('/api/auth/register',
        {'email': email, 'password': password, 'displayName': displayName, 'role': role});
    await setToken(data['accessToken']);
    return data;
  }

  static Future<void> logout() async {
    try {
      await post('/api/auth/logout');
    } catch (_) {}
    await clearToken();
  }

  static Future<Map<String, dynamic>?> getMe() async {
    try {
      return await get('/api/auth/me') as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  // ─── Services ──────────────────────────────────────────────────────────────
  static Future<List<dynamic>> getServices({String? category, String? providerId}) =>
      get('/api/services', params: {
        if (category != null) 'category': category,
        if (providerId != null) 'providerId': providerId,
      }).then((v) => v as List);

  static Future<dynamic> getService(String id) => get('/api/services/$id');

  static Future<dynamic> createService(Map<String, dynamic> data) =>
      post('/api/services', data);

  static Future<dynamic> updateService(String id, Map<String, dynamic> data) =>
      put('/api/services/$id', data);

  static Future<void> deleteService(String id) => delete('/api/services/$id');

  // ─── Requests ──────────────────────────────────────────────────────────────
  static Future<List<dynamic>> getRequests() =>
      get('/api/requests').then((v) => v as List);

  static Future<dynamic> createRequest(Map<String, dynamic> data) =>
      post('/api/requests', data);

  static Future<dynamic> updateRequestStatus(String id, String status) =>
      put('/api/requests/$id/status', {'status': status});

  // ─── Contracts ─────────────────────────────────────────────────────────────
  static Future<List<dynamic>> getContracts() =>
      get('/api/contracts').then((v) => v as List);

  static Future<dynamic> getContract(String id) => get('/api/contracts/$id');

  static Future<dynamic> signContract(String id) => put('/api/contracts/$id/sign');

  static Future<dynamic> updateContractStatus(String id, String status) =>
      put('/api/contracts/$id/status', {'status': status});

  // ─── Tickets ───────────────────────────────────────────────────────────────
  static Future<List<dynamic>> getTickets() =>
      get('/api/tickets').then((v) => v as List);

  static Future<dynamic> createTicket(Map<String, dynamic> data) =>
      post('/api/tickets', data);

  static Future<dynamic> addTicketMessage(String id, String text) =>
      put('/api/tickets/$id/message', {'text': text});

  // ─── Notifications ─────────────────────────────────────────────────────────
  static Future<List<dynamic>> getNotifications() =>
      get('/api/notifications').then((v) => v as List);

  static Future<void> markNotificationRead(String id) =>
      put('/api/notifications/$id/read');

  static Future<void> markAllNotificationsRead() =>
      put('/api/notifications/read-all');

  // ─── Companies ─────────────────────────────────────────────────────────────
  static Future<dynamic> getCompany(String id) => get('/api/companies/$id');

  static Future<dynamic> createCompany(Map<String, dynamic> data) =>
      post('/api/companies', data);

  static Future<dynamic> updateCompany(String id, Map<String, dynamic> data) =>
      put('/api/companies/$id', data);

  // ─── Profile ───────────────────────────────────────────────────────────────
  static Future<dynamic> updateProfile(Map<String, dynamic> data) =>
      put('/api/users/me', data);

  // ─── Categories ────────────────────────────────────────────────────────────
  static Future<List<dynamic>> getCategories({String? parentId}) =>
      get('/api/categories', params: {
        if (parentId != null) 'parentId': parentId,
      }).then((v) => v as List);
}
