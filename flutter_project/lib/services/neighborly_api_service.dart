import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../models/place_prediction.dart';
import '../models/order_models.dart';
import '../models/request_model.dart';
import '../order/category_path_resolve.dart';
import '../models/service_model.dart';
import '../models/user_model.dart';

/// REST + JWT client aligned with web [src/lib/api.ts]: refresh cookie + Bearer access token.
class NeighborlyApiService extends ChangeNotifier {
  static const _kToken = 'accessToken';

  String? _accessToken;
  UserModel? _user;

  UserModel? get user => _user;
  bool get hasActiveSession => (_accessToken != null && _accessToken!.isNotEmpty) && _user != null;

  static String get _configuredBase {
    const fromEnv = String.fromEnvironment('API_BASE_URL', defaultValue: '');
    return fromEnv.replaceAll(RegExp(r'/$'), '');
  }

  String get _origin {
    final cfg = _configuredBase;
    if (cfg.isNotEmpty) return cfg;
    if (kIsWeb) {
      if (kDebugMode) return 'http://localhost:8077';
      return Uri.base.origin;
    }
    return 'http://10.0.2.2:8077';
  }

  Uri _uri(String path) {
    final p = path.startsWith('/') ? path : '/$path';
    return Uri.parse('$_origin$p');
  }

  Map<String, String> _headers({bool jsonBody = true}) => {
        if (jsonBody) 'Content-Type': 'application/json',
        if (_accessToken != null) 'Authorization': 'Bearer $_accessToken',
      };

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _accessToken = prefs.getString(_kToken);
    if (_accessToken != null) {
      try {
        await refreshMe().timeout(const Duration(seconds: 12));
      } catch (_) {
        _accessToken = null;
        await prefs.remove(_kToken);
        _user = null;
      }
    }
    notifyListeners();
  }

  Future<void> _persistToken(String? token) async {
    _accessToken = token;
    final prefs = await SharedPreferences.getInstance();
    if (token == null) {
      await prefs.remove(_kToken);
    } else {
      await prefs.setString(_kToken, token);
    }
  }

  dynamic _jsonDecodeBody(String body) {
    if (body.isEmpty) return null;
    return jsonDecode(body);
  }

  Future<void> _throwUnlessOk(http.Response res) async {
    if (res.statusCode < 400) return;
    final data = _jsonDecodeBody(res.body);
    final msg = data is Map && data['error'] != null ? data['error'].toString() : res.reasonPhrase ?? 'Request failed';
    final code = data is Map && data['code'] != null ? data['code'].toString() : null;
    throw NeighborlyApiException(statusCode: res.statusCode, message: msg, code: code);
  }

  Future<bool> _refreshAccessToken() async {
    try {
      final res = await http.post(
        _uri('/api/auth/refresh'),
        headers: const {'Content-Type': 'application/json'},
      );
      if (res.statusCode != 200) return false;
      final data = _jsonDecodeBody(res.body);
      if (data is! Map || data['accessToken'] == null) return false;
      await _persistToken(data['accessToken'] as String);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<http.Response> _get(String path, {bool retryOn401 = true}) async {
    var res = await http.get(_uri(path), headers: _headers(jsonBody: false));
    if (res.statusCode == 401 && retryOn401 && await _refreshAccessToken()) {
      res = await http.get(_uri(path), headers: _headers(jsonBody: false));
    }
    return res;
  }

  /// Public reads (services, companies, category tree, wizard taxonomy): must work
  /// when signed out. If a bad bearer triggers 401, retry with no Authorization so
  /// guests and stale-token sessions still load data.
  Future<http.Response> _getPublicCatalog(String path) async {
    var res = await http.get(_uri(path), headers: _headers(jsonBody: false));
    if (res.statusCode == 401) {
      res = await http.get(_uri(path), headers: const {});
    }
    return res;
  }

  Future<http.Response> _postJson(String path, [Map<String, dynamic>? body]) async {
    var res = await http.post(
      _uri(path),
      headers: _headers(),
      body: jsonEncode(body ?? {}),
    );
    if (res.statusCode == 401 && await _refreshAccessToken()) {
      res = await http.post(
        _uri(path),
        headers: _headers(),
        body: jsonEncode(body ?? {}),
      );
    }
    return res;
  }

  Future<http.Response> _postEmpty(String path) async {
    var res = await http.post(_uri(path), headers: _headers(jsonBody: false));
    if (res.statusCode == 401 && await _refreshAccessToken()) {
      res = await http.post(_uri(path), headers: _headers(jsonBody: false));
    }
    return res;
  }

  Future<http.Response> _putJson(String path, Map<String, dynamic> body) async {
    var res = await http.put(_uri(path), headers: _headers(), body: jsonEncode(body));
    if (res.statusCode == 401 && await _refreshAccessToken()) {
      res = await http.put(_uri(path), headers: _headers(), body: jsonEncode(body));
    }
    return res;
  }

  Future<void> login(String email, String password) async {
    final res = await http.post(
      _uri('/api/auth/login'),
      headers: _headers(),
      body: jsonEncode({'email': email, 'password': password}),
    );
    await _throwUnlessOk(res);
    final data = _jsonDecodeBody(res.body) as Map<String, dynamic>;
    await _persistToken(data['accessToken'] as String);
    await refreshMe();
  }

  Future<void> forgotPassword(String email) async {
    final res = await http.post(
      _uri('/api/auth/forgot-password'),
      headers: _headers(),
      body: jsonEncode({'email': email}),
    );
    await _throwUnlessOk(res);
  }

  Future<void> resetPassword({
    required String email,
    required String newPassword,
  }) async {
    final res = await http.post(
      _uri('/api/auth/reset-password'),
      headers: _headers(),
      body: jsonEncode({'email': email, 'newPassword': newPassword}),
    );
    await _throwUnlessOk(res);
  }

  Future<void> register({
    required String email,
    required String password,
    required String displayName,
    required String role,
  }) async {
    final res = await http.post(
      _uri('/api/auth/register'),
      headers: _headers(),
      body: jsonEncode({
        'email': email,
        'password': password,
        'displayName': displayName,
        'role': role,
      }),
    );
    await _throwUnlessOk(res);
    final data = _jsonDecodeBody(res.body) as Map<String, dynamic>;
    await _persistToken(data['accessToken'] as String);
    await refreshMe();
  }

  Future<void> refreshMe() async {
    final res = await _get('/api/auth/me');
    await _throwUnlessOk(res);
    final data = _jsonDecodeBody(res.body) as Map<String, dynamic>;
    _user = UserModel.fromMap(data);
    notifyListeners();
  }

  Future<void> logout() async {
    try {
      if (_accessToken != null) {
        final res = await _postEmpty('/api/auth/logout');
        await _throwUnlessOk(res);
      }
    } catch (_) {
      /* ignore */
    }
    await _persistToken(null);
    _user = null;
    notifyListeners();
  }

  Future<List<ServiceModel>> fetchServices({String? category, String? providerId}) async {
    final q = <String, String>{};
    if (category != null) q['category'] = category;
    if (providerId != null) q['providerId'] = providerId;
    final path = q.isEmpty ? '/api/services' : '/api/services?${Uri(queryParameters: q).query}';
    final res = await _getPublicCatalog(path);
    await _throwUnlessOk(res);
    final list = _jsonDecodeBody(res.body) as List<dynamic>;
    return list.map((e) {
      final m = Map<String, dynamic>.from(e as Map);
      final id = m['id']?.toString() ?? '';
      return ServiceModel.fromMap(m, id);
    }).toList();
  }

  Future<ServiceModel> fetchServiceById(String id) async {
    final res = await _getPublicCatalog('/api/services/$id');
    await _throwUnlessOk(res);
    final m = Map<String, dynamic>.from(_jsonDecodeBody(res.body) as Map);
    final sid = m['id']?.toString() ?? id;
    return ServiceModel.fromMap(m, sid);
  }

  /// Public Explorer feed (same payload as web `/api/posts`).
  Future<List<Map<String, dynamic>>> fetchExplorerPosts() async {
    final res = await _getPublicCatalog('/api/posts');
    await _throwUnlessOk(res);
    final body = _jsonDecodeBody(res.body);
    if (body is! List) return [];
    return body.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<Map<String, dynamic>> likeExplorerPost(String postId) async {
    final res = await _postJson('/api/posts/$postId/like', {});
    await _throwUnlessOk(res);
    return Map<String, dynamic>.from(_jsonDecodeBody(res.body) as Map);
  }

  Future<Map<String, dynamic>> commentOnPost(String postId, String text) async {
    final res = await _postJson('/api/posts/$postId/comments', {'text': text});
    await _throwUnlessOk(res);
    return Map<String, dynamic>.from(_jsonDecodeBody(res.body) as Map);
  }

  Stream<List<ServiceModel>> watchServices({String? category, Duration interval = const Duration(seconds: 12)}) async* {
    yield await fetchServices(category: category);
    yield* Stream.periodic(interval, (_) => null).asyncMap((_) => fetchServices(category: category));
  }

  Future<List<RequestModel>> fetchRequests() async {
    final res = await _get('/api/requests');
    await _throwUnlessOk(res);
    final list = _jsonDecodeBody(res.body) as List<dynamic>;
    return list.map((e) {
      final m = Map<String, dynamic>.from(e as Map);
      final id = m['id']?.toString() ?? '';
      return RequestModel.fromMap(m, id);
    }).toList();
  }

  Stream<List<RequestModel>> watchRequests({Duration interval = const Duration(seconds: 10)}) async* {
    yield await fetchRequests();
    yield* Stream.periodic(interval, (_) => null).asyncMap((_) => fetchRequests());
  }

  /// Raw JSON lists (customer dashboard, admin tables).
  Future<List<Map<String, dynamic>>> fetchJsonList(String path) async {
    final res = await _get(path);
    await _throwUnlessOk(res);
    final list = _jsonDecodeBody(res.body) as List<dynamic>;
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<Map<String, dynamic>?> fetchJsonMap(String path) async {
    final res = await _get(path);
    if (res.statusCode == 404) return null;
    await _throwUnlessOk(res);
    final data = _jsonDecodeBody(res.body);
    if (data is! Map) return null;
    return Map<String, dynamic>.from(data);
  }

  Future<Map<String, dynamic>> fetchJsonMapRequired(String path) async {
    final res = await _get(path);
    await _throwUnlessOk(res);
    return Map<String, dynamic>.from(_jsonDecodeBody(res.body) as Map);
  }

  Future<OrdersListResponse> fetchMyOrders({
    int page = 1,
    int pageSize = 20,
    List<String> phases = const <String>[],
    List<String> statuses = const <String>[],
    bool includeDrafts = true,
  }) async {
    final q = <String, String>{
      'page': '$page',
      'pageSize': '$pageSize',
      if (!includeDrafts) 'includeDrafts': 'false',
    };
    final uri = Uri(queryParameters: q).query;
    final phaseQuery = phases.map((p) => 'phase=${Uri.encodeQueryComponent(p)}').join('&');
    final statusQuery = statuses.map((s) => 'status=${Uri.encodeQueryComponent(s)}').join('&');
    final extra = [phaseQuery, statusQuery].where((s) => s.isNotEmpty).join('&');
    final path = extra.isEmpty ? '/api/orders/me?$uri' : '/api/orders/me?$uri&$extra';
    final res = await _get(path);
    await _throwUnlessOk(res);
    final data = _jsonDecodeBody(res.body) as Map<String, dynamic>;
    final list = data['items'] as List<dynamic>? ?? const [];
    final facetsMap = data['facets'] is Map ? Map<String, dynamic>.from(data['facets'] as Map) : null;
    final phaseMap = facetsMap?['phase'] is Map ? Map<String, dynamic>.from(facetsMap!['phase'] as Map) : null;
    return OrdersListResponse(
      items: list
          .map((e) => OrderSummary.fromMap(Map<String, dynamic>.from(e as Map)))
          .toList(),
      total: data['total'] is num ? (data['total'] as num).toInt() : 0,
      page: data['page'] is num ? (data['page'] as num).toInt() : 1,
      pageSize: data['pageSize'] is num ? (data['pageSize'] as num).toInt() : pageSize,
      facets: phaseMap == null ? null : OrderPhaseFacets.fromMap(phaseMap),
    );
  }

  /// Provider / workspace orders (matched, workspace-linked, or active inbox attempts).
  Future<OrdersListResponse> fetchProviderMyOrders({
    int page = 1,
    int pageSize = 20,
    List<String> phases = const <String>[],
    List<String> statuses = const <String>[],
  }) async {
    final q = <String, String>{
      'page': '$page',
      'pageSize': '$pageSize',
    };
    final uri = Uri(queryParameters: q).query;
    final phaseQuery = phases.map((p) => 'phase=${Uri.encodeQueryComponent(p)}').join('&');
    final statusQuery = statuses.map((s) => 'status=${Uri.encodeQueryComponent(s)}').join('&');
    final extra = [phaseQuery, statusQuery].where((s) => s.isNotEmpty).join('&');
    final path = extra.isEmpty ? '/api/orders/provider/me?$uri' : '/api/orders/provider/me?$uri&$extra';
    final res = await _get(path);
    await _throwUnlessOk(res);
    final data = _jsonDecodeBody(res.body) as Map<String, dynamic>;
    final list = data['items'] as List<dynamic>? ?? const [];
    final facetsMap = data['facets'] is Map ? Map<String, dynamic>.from(data['facets'] as Map) : null;
    final phaseMap = facetsMap?['phase'] is Map ? Map<String, dynamic>.from(facetsMap!['phase'] as Map) : null;
    return OrdersListResponse(
      items: list
          .map((e) => OrderSummary.fromMap(Map<String, dynamic>.from(e as Map)))
          .toList(),
      total: data['total'] is num ? (data['total'] as num).toInt() : 0,
      page: data['page'] is num ? (data['page'] as num).toInt() : 1,
      pageSize: data['pageSize'] is num ? (data['pageSize'] as num).toInt() : pageSize,
      facets: phaseMap == null ? null : OrderPhaseFacets.fromMap(phaseMap),
    );
  }

  Future<List<Map<String, dynamic>>> fetchWorkspaceServicePackages(String workspaceId) async {
    final res = await _get('/api/workspaces/${Uri.encodeComponent(workspaceId)}/service-packages');
    await _throwUnlessOk(res);
    final data = _jsonDecodeBody(res.body);
    if (data is! List) return <Map<String, dynamic>>[];
    return data.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<List<Map<String, dynamic>>> fetchWorkspaceProducts(String workspaceId) async {
    final res = await _get(
      '/api/workspaces/${Uri.encodeComponent(workspaceId)}/products?page=1&pageSize=100',
    );
    await _throwUnlessOk(res);
    final data = _jsonDecodeBody(res.body) as Map<String, dynamic>;
    final list = data['items'] as List<dynamic>? ?? const [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<Map<String, dynamic>> fetchCompany(String companyId) async {
    return fetchJsonMapRequired('/api/companies/${Uri.encodeComponent(companyId)}');
  }

  Future<OrderDetail> fetchOrderById(String orderId) async {
    final res = await _get('/api/orders/${Uri.encodeComponent(orderId)}');
    await _throwUnlessOk(res);
    final data = _jsonDecodeBody(res.body) as Map<String, dynamic>;
    return OrderDetail.fromMap(data);
  }

  Future<Map<String, dynamic>> fetchOrderCandidates(String orderId) async {
    final res = await _get('/api/orders/${Uri.encodeComponent(orderId)}/candidates');
    await _throwUnlessOk(res);
    return Map<String, dynamic>.from(_jsonDecodeBody(res.body) as Map);
  }

  Future<Map<String, dynamic>> selectOrderProvider({
    required String orderId,
    required String attemptId,
  }) async {
    final res = await _postJson('/api/orders/${Uri.encodeComponent(orderId)}/select-provider', {
      'attemptId': attemptId,
    });
    await _throwUnlessOk(res);
    return Map<String, dynamic>.from(_jsonDecodeBody(res.body) as Map);
  }

  Future<OrderDetail> createOrderDraft({
    required String serviceCatalogId,
    required OrderEntryPoint entryPoint,
    Map<String, dynamic>? prefill,
  }) async {
    final res = await _postJson('/api/orders/draft', {
      'serviceCatalogId': serviceCatalogId,
      'entryPoint': entryPoint.wireValue,
      if (prefill != null) 'prefill': prefill,
    });
    await _throwUnlessOk(res);
    final data = _jsonDecodeBody(res.body) as Map<String, dynamic>;
    return OrderDetail.fromMap(data);
  }

  Future<OrderDetail> updateOrderDraft(String orderId, Map<String, dynamic> patch) async {
    final res = await _putJson('/api/orders/draft/${Uri.encodeComponent(orderId)}', patch);
    await _throwUnlessOk(res);
    final data = _jsonDecodeBody(res.body) as Map<String, dynamic>;
    return OrderDetail.fromMap(data);
  }

  Future<Map<String, dynamic>> submitOrderDraft(String orderId, Map<String, dynamic> patch) async {
    final res = await _postJson('/api/orders/draft/${Uri.encodeComponent(orderId)}/submit', patch);
    await _throwUnlessOk(res);
    final data = _jsonDecodeBody(res.body);
    if (data is Map<String, dynamic>) return data;
    return <String, dynamic>{};
  }

  Future<Map<String, dynamic>> fetchOrderPaymentStatus(String orderId) async {
    final res = await _get('/api/orders/${Uri.encodeComponent(orderId)}/payments/status');
    await _throwUnlessOk(res);
    return Map<String, dynamic>.from(_jsonDecodeBody(res.body) as Map);
  }

  Future<Map<String, dynamic>> createOrderPaymentSession(String orderId) async {
    final res = await _postJson('/api/orders/${Uri.encodeComponent(orderId)}/payments/session', {});
    final data = _jsonDecodeBody(res.body);
    if (res.statusCode == 409) {
      final m = data is Map ? Map<String, dynamic>.from(data) : <String, dynamic>{};
      throw PaymentGateException(
        code: m['code']?.toString() ?? 'PAYMENT_GATE',
        message: m['error']?.toString() ?? 'Payment is not available yet',
      );
    }
    await _throwUnlessOk(res);
    return Map<String, dynamic>.from(data as Map);
  }

  Future<List<ServiceCatalogSearchHit>> searchServiceCatalogs(String query, {int limit = 20}) async {
    final qp = Uri(queryParameters: {'q': query, 'limit': '$limit'}).query;
    final res = await _getPublicCatalog('/api/categories/search?$qp');
    await _throwUnlessOk(res);
    final data = _jsonDecodeBody(res.body) as Map<String, dynamic>;
    final raw = data['serviceCatalogs'] as List<dynamic>? ?? const [];
    return raw
        .map((e) => ServiceCatalogSearchHit.fromMap(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  /// Category rows from GET /api/categories/search (AI-assist / slug resolve).
  Future<List<CategorySearchHit>> searchCategories(String query, {int limit = 20}) async {
    final qp = Uri(queryParameters: {'q': query, 'limit': '$limit'}).query;
    final res = await _getPublicCatalog('/api/categories/search?$qp');
    await _throwUnlessOk(res);
    final data = _jsonDecodeBody(res.body) as Map<String, dynamic>;
    final raw = data['categories'] as List<dynamic>? ?? const [];
    return raw
        .map((e) => CategorySearchHit.fromMap(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  /// Public taxonomy tree (same as web wizard).
  Future<List<CategoryTreeNode>> fetchCategoryTree() async {
    final res = await _getPublicCatalog('/api/categories/tree');
    await _throwUnlessOk(res);
    final data = _jsonDecodeBody(res.body);
    if (data is! List) return const [];
    return data
        .whereType<Map>()
        .map((e) => CategoryTreeNode.fromMap(Map<String, dynamic>.from(e)))
        .toList();
  }

  /// Active service catalog tiles for a category. Use [deep] to include descendant categories.
  Future<List<ServiceCatalogTile>> fetchServiceCatalogsByCategory(String categoryId, {bool deep = false}) async {
    final qp = deep ? '?deep=1' : '';
    final res = await _getPublicCatalog('/api/service-catalog/by-category/${Uri.encodeComponent(categoryId)}$qp');
    await _throwUnlessOk(res);
    final data = _jsonDecodeBody(res.body);
    if (data is! Map) return const [];
    final raw = data['items'];
    if (raw is! List) return const [];
    return raw
        .whereType<Map>()
        .map((e) => ServiceCatalogTile.fromMap(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<Map<String, dynamic>?> fetchKycMe() async {
    try {
      final m = await fetchJsonMap('/api/kyc/me');
      if (m == null || m.isEmpty) return null;
      return m;
    } catch (_) {
      return null;
    }
  }

  Future<void> becomeProvider() async {
    final res = await _postJson('/api/users/me/become-provider');
    await _throwUnlessOk(res);
    await refreshMe();
  }

  Future<void> updateProfile(Map<String, dynamic> data) async {
    final res = await _putJson('/api/users/me', data);
    await _throwUnlessOk(res);
    final responseData = _jsonDecodeBody(res.body) as Map<String, dynamic>;
    _user = UserModel.fromMap(responseData);
    notifyListeners();
  }

  /// Old password + new password (8+ chars). Server: POST /api/users/me/change-password
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    final res = await _postJson('/api/users/me/change-password', {
      'currentPassword': currentPassword,
      'newPassword': newPassword,
    });
    await _throwUnlessOk(res);
  }

  /// Link Google to the current account. Pass an OAuth id_token (GSI, mobile SDK, etc.)
  Future<void> linkGoogleAccount(String idToken) async {
    final res = await _postJson('/api/auth/google/link', {'idToken': idToken});
    await _throwUnlessOk(res);
    await refreshMe();
  }

  Future<Map<String, dynamic>> getAccountPreferences() async {
    final res = await _get('/api/users/me/account-preferences');
    await _throwUnlessOk(res);
    final d = _jsonDecodeBody(res.body);
    if (d is! Map) return {};
    return Map<String, dynamic>.from(d);
  }

  Future<void> putAccountPreferences(Map<String, dynamic> body) async {
    final res = await _putJson('/api/users/me/account-preferences', body);
    await _throwUnlessOk(res);
    await refreshMe();
  }

  Future<void> refreshUserStats() async {
    try {
      final res = await _get('/api/users/me/stats');
      if (res.statusCode == 200) {
        final data = _jsonDecodeBody(res.body) as Map<String, dynamic>;
        final stats = UserStats.fromMap(data);
        if (_user != null) {
          _user = _user!.copyWith(stats: stats);
          notifyListeners();
        }
      }
    } catch (_) {
      // Stats are optional, don't fail if endpoint isn't available yet
    }
  }

  Future<void> markNotificationRead(String id) async {
    final res = await _putJson('/api/notifications/$id/read', {});
    await _throwUnlessOk(res);
  }

  Future<Map<String, dynamic>> fetchContract(String id) async {
    return fetchJsonMapRequired('/api/contracts/$id');
  }

  Future<List<Map<String, dynamic>>> fetchMyWorkspaces() async {
    final res = await _get('/api/workspaces/me');
    await _throwUnlessOk(res);
    final data = _jsonDecodeBody(res.body);
    if (data is! List) return <Map<String, dynamic>>[];
    return data.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<Map<String, dynamic>> fetchProviderInbox({
    required String workspaceId,
    List<String> statuses = const <String>[],
    int page = 1,
    int pageSize = 25,
  }) async {
    final params = <String, String>{
      'page': '$page',
      'pageSize': '$pageSize',
    };
    final qp = Uri(queryParameters: params).query;
    final statusPart = statuses.map((s) => 'status[]=${Uri.encodeQueryComponent(s)}').join('&');
    final suffix = statusPart.isEmpty ? qp : '$qp&$statusPart';
    final res = await _get('/api/workspaces/${Uri.encodeComponent(workspaceId)}/inbox?$suffix');
    await _throwUnlessOk(res);
    return Map<String, dynamic>.from(_jsonDecodeBody(res.body) as Map);
  }

  Future<Map<String, dynamic>> fetchProviderInboxAttemptDetail({
    required String workspaceId,
    required String attemptId,
  }) async {
    final res = await _get(
      '/api/workspaces/${Uri.encodeComponent(workspaceId)}/inbox/${Uri.encodeComponent(attemptId)}',
    );
    await _throwUnlessOk(res);
    return Map<String, dynamic>.from(_jsonDecodeBody(res.body) as Map);
  }

  Future<void> acceptProviderInboxAttempt({
    required String workspaceId,
    required String attemptId,
  }) async {
    final res = await _postJson(
      '/api/workspaces/${Uri.encodeComponent(workspaceId)}/inbox/${Uri.encodeComponent(attemptId)}/accept',
      {},
    );
    await _throwUnlessOk(res);
  }

  Future<void> acknowledgeProviderInboxAttempt({
    required String workspaceId,
    required String attemptId,
  }) async {
    final res = await _postJson(
      '/api/workspaces/${Uri.encodeComponent(workspaceId)}/inbox/${Uri.encodeComponent(attemptId)}/acknowledge',
      {},
    );
    await _throwUnlessOk(res);
  }

  Future<void> declineProviderInboxAttempt({
    required String workspaceId,
    required String attemptId,
    required String reason,
  }) async {
    final res = await _postJson(
      '/api/workspaces/${Uri.encodeComponent(workspaceId)}/inbox/${Uri.encodeComponent(attemptId)}/decline',
      {'reason': reason},
    );
    await _throwUnlessOk(res);
  }

  Future<Map<String, dynamic>> fetchOrderChatThread(String orderId) async {
    final res = await _get('/api/orders/${Uri.encodeComponent(orderId)}/chat/thread');
    await _throwUnlessOk(res);
    return Map<String, dynamic>.from(_jsonDecodeBody(res.body) as Map);
  }

  Future<Map<String, dynamic>> sendOrderChatMessage({
    required String orderId,
    required String text,
    String? sourceLang,
    String? translateTo,
  }) async {
    final res = await _postJson('/api/orders/${Uri.encodeComponent(orderId)}/chat/messages', {
      'text': text,
      if (sourceLang != null && sourceLang.trim().isNotEmpty) 'sourceLang': sourceLang.trim(),
      if (translateTo != null && translateTo.trim().isNotEmpty) 'translateTo': translateTo.trim(),
    });
    await _throwUnlessOk(res);
    return Map<String, dynamic>.from(_jsonDecodeBody(res.body) as Map);
  }

  Future<Map<String, dynamic>> translateOrderChatMessage({
    required String orderId,
    required String messageId,
    required String targetLang,
  }) async {
    final res = await _postJson(
      '/api/orders/${Uri.encodeComponent(orderId)}/chat/messages/${Uri.encodeComponent(messageId)}/translate',
      {'targetLang': targetLang},
    );
    await _throwUnlessOk(res);
    return Map<String, dynamic>.from(_jsonDecodeBody(res.body) as Map);
  }

  Future<Map<String, dynamic>> fetchOrderContracts(String orderId) async {
    final res = await _get('/api/orders/${Uri.encodeComponent(orderId)}/contracts');
    await _throwUnlessOk(res);
    return Map<String, dynamic>.from(_jsonDecodeBody(res.body) as Map);
  }

  Future<Map<String, dynamic>> upsertOrderContractDraft({
    required String orderId,
    required String title,
    required String termsMarkdown,
    String? policiesMarkdown,
    String? scopeSummary,
    double? amount,
    String currency = 'CAD',
  }) async {
    final res = await _postJson('/api/orders/${Uri.encodeComponent(orderId)}/contracts/draft', {
      'title': title,
      'termsMarkdown': termsMarkdown,
      if (policiesMarkdown != null && policiesMarkdown.trim().isNotEmpty) 'policiesMarkdown': policiesMarkdown.trim(),
      if (scopeSummary != null && scopeSummary.trim().isNotEmpty) 'scopeSummary': scopeSummary.trim(),
      if (amount != null) 'amount': amount,
      'currency': currency,
    });
    await _throwUnlessOk(res);
    return Map<String, dynamic>.from(_jsonDecodeBody(res.body) as Map);
  }

  Future<Map<String, dynamic>> sendContractVersion({
    required String orderId,
    required String versionId,
  }) async {
    final res = await _postJson(
      '/api/orders/${Uri.encodeComponent(orderId)}/contracts/${Uri.encodeComponent(versionId)}/send',
      {},
    );
    await _throwUnlessOk(res);
    return Map<String, dynamic>.from(_jsonDecodeBody(res.body) as Map);
  }

  Future<Map<String, dynamic>> approveContractVersion({
    required String orderId,
    required String versionId,
  }) async {
    final res = await _postJson(
      '/api/orders/${Uri.encodeComponent(orderId)}/contracts/${Uri.encodeComponent(versionId)}/approve',
      {},
    );
    await _throwUnlessOk(res);
    return Map<String, dynamic>.from(_jsonDecodeBody(res.body) as Map);
  }

  Future<Map<String, dynamic>> rejectContractVersion({
    required String orderId,
    required String versionId,
    required String note,
    bool requestEdit = true,
  }) async {
    final res = await _postJson(
      '/api/orders/${Uri.encodeComponent(orderId)}/contracts/${Uri.encodeComponent(versionId)}/reject',
      {'note': note, 'requestEdit': requestEdit},
    );
    await _throwUnlessOk(res);
    return Map<String, dynamic>.from(_jsonDecodeBody(res.body) as Map);
  }

  Future<void> signContract(String id, {String paymentMethod = 'platform'}) async {
    final res = await _putJson('/api/contracts/$id/sign', {'paymentMethod': paymentMethod});
    await _throwUnlessOk(res);
  }

  Future<List<Map<String, dynamic>>> fetchAdminUsers() => fetchJsonList('/api/admin/users');

  Future<Map<String, dynamic>> fetchAdminStats() => fetchJsonMapRequired('/api/admin/stats');

  Future<Map<String, dynamic>> fetchAdminModerationQueue({int limit = 80}) async {
    final qp = Uri(queryParameters: {'limit': '$limit'}).query;
    final res = await _get('/api/admin/chat/flags?$qp');
    await _throwUnlessOk(res);
    return Map<String, dynamic>.from(_jsonDecodeBody(res.body) as Map);
  }

  Future<Map<String, dynamic>> reviewAdminModerationFlag(String messageId, {String? internalNote}) async {
    final res = await _postJson('/api/admin/chat/flags/${Uri.encodeComponent(messageId)}/review', {
      if (internalNote != null && internalNote.trim().isNotEmpty) 'internalNote': internalNote.trim(),
    });
    await _throwUnlessOk(res);
    return Map<String, dynamic>.from(_jsonDecodeBody(res.body) as Map);
  }

  Future<Map<String, dynamic>> escalateAdminModerationFlag(String messageId, {String? internalNote}) async {
    final res = await _postJson('/api/admin/chat/flags/${Uri.encodeComponent(messageId)}/escalate', {
      if (internalNote != null && internalNote.trim().isNotEmpty) 'internalNote': internalNote.trim(),
    });
    await _throwUnlessOk(res);
    return Map<String, dynamic>.from(_jsonDecodeBody(res.body) as Map);
  }

  Future<Map<String, dynamic>> fetchAdminContractsQueue() async {
    final res = await _get('/api/admin/contracts/queue');
    await _throwUnlessOk(res);
    return Map<String, dynamic>.from(_jsonDecodeBody(res.body) as Map);
  }

  Future<Map<String, dynamic>> fetchAdminContractDetail(String contractId) async {
    final res = await _get('/api/admin/contracts/${Uri.encodeComponent(contractId)}');
    await _throwUnlessOk(res);
    return Map<String, dynamic>.from(_jsonDecodeBody(res.body) as Map);
  }

  Future<Map<String, dynamic>> markAdminContractReviewed(String contractId) async {
    final res = await _postJson('/api/admin/contracts/${Uri.encodeComponent(contractId)}/mark-reviewed', {});
    await _throwUnlessOk(res);
    return Map<String, dynamic>.from(_jsonDecodeBody(res.body) as Map);
  }

  Future<Map<String, dynamic>> fetchAdminPaymentsLedger() async {
    final res = await _get('/api/admin/payments/ledger');
    await _throwUnlessOk(res);
    return Map<String, dynamic>.from(_jsonDecodeBody(res.body) as Map);
  }

  Future<Map<String, dynamic>> fetchAdminPaymentLedgerDetail(String transactionId) async {
    final res = await _get('/api/admin/payments/ledger/${Uri.encodeComponent(transactionId)}');
    await _throwUnlessOk(res);
    return Map<String, dynamic>.from(_jsonDecodeBody(res.body) as Map);
  }

  Future<String> fetchAdminDependencyCatalogJson() async {
    final res = await _get('/api/admin/dependency-catalog');
    await _throwUnlessOk(res);
    final data = _jsonDecodeBody(res.body) as Map<String, dynamic>;
    final cat = data['catalog'];
    return const JsonEncoder.withIndent('  ').convert(cat);
  }

  /// Body must be the catalog object root (same as web `api.put('/api/admin/dependency-catalog', parsed)`).
  Future<void> putAdminDependencyCatalog(Map<String, dynamic> catalog) async {
    var res = await http.put(
      _uri('/api/admin/dependency-catalog'),
      headers: _headers(),
      body: jsonEncode(catalog),
    );
    if (res.statusCode == 401 && await _refreshAccessToken()) {
      res = await http.put(
        _uri('/api/admin/dependency-catalog'),
        headers: _headers(),
        body: jsonEncode(catalog),
      );
    }
    await _throwUnlessOk(res);
  }

  Future<void> postAdminDependencyCatalogReset() async {
    final res = await _postJson('/api/admin/dependency-catalog/reset');
    await _throwUnlessOk(res);
  }

  Future<List<Map<String, dynamic>>> fetchCompanies() async {
    final res = await _getPublicCatalog('/api/companies');
    await _throwUnlessOk(res);
    final list = _jsonDecodeBody(res.body) as List<dynamic>;
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  // ─── Finance History ─────────────────────────────────────────────────────
  Future<List<Map<String, dynamic>>> fetchFinanceHistory() async {
    final res = await _get('/api/transactions/finance-history');
    await _throwUnlessOk(res);
    final list = _jsonDecodeBody(res.body) as List<dynamic>;
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  // ─── Notifications ─────────────────────────────────────────────────────────
  List<Map<String, dynamic>> _notificationsForBadge = const [];

  /// Unread count from the last [fetchNotifications] result (for shell badge).
  int get unreadNotificationsCount =>
      _notificationsForBadge.where((n) => n['read'] != true).length;

  Future<List<Map<String, dynamic>>> fetchNotifications() async {
    final res = await _get('/api/notifications');
    await _throwUnlessOk(res);
    final list = _jsonDecodeBody(res.body) as List<dynamic>;
    final mapped = list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    _notificationsForBadge = mapped;
    notifyListeners();
    return mapped;
  }

  Future<void> markAllNotificationsRead() async {
    final res = await _putJson('/api/notifications/read-all', {});
    await _throwUnlessOk(res);
  }

  Future<void> deleteNotification(String id) async {
    final res = await http.delete(
      _uri('/api/notifications/$id'),
      headers: _headers(jsonBody: false),
    );
    await _throwUnlessOk(res);
  }

  // ─── Provider Messages ─────────────────────────────────────────────────────
  Future<List<Map<String, dynamic>>> fetchProviderMessages() async {
    final res = await _get('/api/chat/provider-messages');
    await _throwUnlessOk(res);
    final list = _jsonDecodeBody(res.body) as List<dynamic>;
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<List<Map<String, dynamic>>> fetchProviderChat(String providerId) async {
    final res = await _get('/api/chat/provider/$providerId');
    await _throwUnlessOk(res);
    final list = _jsonDecodeBody(res.body) as List<dynamic>;
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  /// Send message to provider - monitored by AI for contact info sharing
  Future<void> sendProviderMessage(String providerId, String message) async {
    // Check for contact info patterns before sending
    final contactPatterns = [
      RegExp(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b'), // Phone numbers
      RegExp(r'\+?\d{1,3}[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}'), // International phones
      RegExp(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'), // Emails
      RegExp(r'\b(whatsapp|telegram|signal|viber)\b', caseSensitive: false), // Messaging apps
      RegExp(r'\b(facebook|instagram|twitter|linkedin)\b', caseSensitive: false), // Social media
    ];

    for (final pattern in contactPatterns) {
      if (pattern.hasMatch(message)) {
        throw Exception(
          'Message contains contact information or external platform references. '
          'For your safety, all communication must stay within the app. '
          'Our AI monitors messages to prevent fraud and ensure quality service.'
        );
      }
    }

    final res = await _postJson('/api/chat/provider/$providerId', {
      'message': message,
    });
    await _throwUnlessOk(res);
  }

  // ─── Admin Tickets ─────────────────────────────────────────────────────────
  Future<List<Map<String, dynamic>>> fetchAdminTickets() async {
    final res = await _get('/api/tickets');
    await _throwUnlessOk(res);
    final list = _jsonDecodeBody(res.body) as List<dynamic>;
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<Map<String, dynamic>> createAdminTicket({
    required String subject,
    required String type,
    String? message,
  }) async {
    final res = await _postJson('/api/tickets', {
      'subject': subject,
      'type': type,
      'message': message,
    });
    await _throwUnlessOk(res);
    return _jsonDecodeBody(res.body) as Map<String, dynamic>;
  }

  Future<void> sendTicketMessage(String ticketId, String message) async {
    final res = await _putJson('/api/tickets/$ticketId/message', {
      'text': message,
    });
    await _throwUnlessOk(res);
  }

  // ─── KYC / Identity Verification ────────────────────────────────────────────
  Future<void> submitKycDocument({
    required String documentType,
    // File? documentFile, // TODO: Implement file upload
  }) async {
    final res = await _postJson('/api/kyc/submit', {
      'documentType': documentType,
      // 'document': documentFile,
    });
    await _throwUnlessOk(res);
    // Refresh user data to get updated KYC status
    await refreshMe();
  }

  Future<void> requestEmailVerification() async {
    final res = await _postJson('/api/kyc/verify-email', {});
    await _throwUnlessOk(res);
  }

  Future<void> verifyPhoneCode(String code) async {
    final res = await _postJson('/api/kyc/verify-phone', {
      'code': code,
    });
    await _throwUnlessOk(res);
    // Refresh user data to get updated KYC status
    await refreshMe();
  }

  Future<Map<String, dynamic>> getKycStatus() async {
    final res = await _get('/api/kyc/status');
    await _throwUnlessOk(res);
    return _jsonDecodeBody(res.body) as Map<String, dynamic>;
  }

  // ─── Location (Google Maps via server; keys in Admin → SystemConfig.integrations) ─

  /// True when the API has a Google server key (see GET /api/system/config).
  Future<bool> fetchLocationSearchEnabled() async {
    try {
      final res = await http.get(_uri('/api/system/config'), headers: const {});
      if (res.statusCode != 200) return false;
      final m = _jsonDecodeBody(res.body) as Map<String, dynamic>?;
      return m?['locationSearchEnabled'] == true;
    } catch (_) {
      return false;
    }
  }

  Future<List<PlacePrediction>> fetchPlaceAutocomplete(String input, String session) async {
    if (input.trim().length < 2) return [];
    final res = await _get(
      '/api/places/autocomplete?${Uri(queryParameters: {
        'input': input,
        'session': session,
      }).query}',
    );
    if (res.statusCode == 503) return [];
    if (res.statusCode != 200) return [];
    final data = _jsonDecodeBody(res.body) as Map<String, dynamic>?;
    final list = data?['predictions'] as List<dynamic>? ?? [];
    return list
        .map((e) => PlacePrediction.fromJson(Map<String, dynamic>.from(e as Map)))
        .where((p) => p.placeId.isNotEmpty)
        .toList();
  }

  /// Returns formatted address, or null on error / not configured.
  Future<String?> fetchPlaceFormattedAddress(String placeId, String session) async {
    final res = await _get(
      '/api/places/details?${Uri(queryParameters: {
        'placeId': placeId,
        'session': session,
      }).query}',
    );
    if (res.statusCode != 200) return null;
    final m = _jsonDecodeBody(res.body) as Map<String, dynamic>?;
    final r = m?['result'] as Map<String, dynamic>?;
    return r?['formatted_address'] as String?;
  }

  /// Reverse geocode for "use my location".
  Future<String?> fetchReverseGeocode(double lat, double lng) async {
    final res = await _get(
      '/api/places/reverse-geocode?${Uri(queryParameters: {
        'lat': lat.toString(),
        'lng': lng.toString(),
      }).query}',
    );
    if (res.statusCode != 200) return null;
    final m = _jsonDecodeBody(res.body) as Map<String, dynamic>?;
    final a = m?['formattedAddress'] as String?;
    if (a != null && a.isNotEmpty) return a;
    return null;
  }
}

/// Thrown by [_throwUnlessOk] when the API returns status >= 400.
class NeighborlyApiException implements Exception {
  NeighborlyApiException({
    required this.statusCode,
    required this.message,
    this.code,
  });

  final int statusCode;
  final String message;
  final String? code;

  @override
  String toString() => message;
}

class PaymentGateException implements Exception {
  final String code;
  final String message;

  const PaymentGateException({
    required this.code,
    required this.message,
  });

  @override
  String toString() => '$code: $message';
}
