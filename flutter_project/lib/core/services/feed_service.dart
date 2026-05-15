/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Feed Service — Social Feed, Businesses & Post Interactions
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
///
/// Backend endpoints used:
///   GET  /api/posts?page=&pageSize=  — public post list
///   GET  /api/categories             — list categories
///   GET  /api/users/me/stats         — user stats (requires auth)
///   POST /api/posts/:id/react        — toggle like reaction (requires auth)
///
/// Mocked endpoints (if backend returns 404):
///   Posts, categories, stats, and businesses are mocked with placeholder data.
///
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import 'dart:developer' as developer;

import 'api_client.dart';

/// Provides data for the social feed: posts, businesses, and interactions.
class FeedService {
  /// Fetch posts from the backend.
  ///
  /// Uses `GET /api/posts?page=$page&pageSize=$limit`.
  /// Falls back to mock data if the endpoint returns 404.
  Future<List<Map<String, dynamic>>> getPosts({
    int page = 1,
    int limit = 10,
  }) async {
    try {
      final response =
          await ApiClient.get('/api/posts?page=$page&pageSize=$limit');
      if (response is Map && response.containsKey('data')) {
        final List<dynamic> data = response['data'] as List<dynamic>;
        return data.cast<Map<String, dynamic>>();
      }
      if (response is List) {
        return response.cast<Map<String, dynamic>>();
      }
      developer.log(
        '⚠️ Unexpected response shape from /api/posts — using mock data',
        name: 'feed_service',
      );
      return _mockPosts();
    } on ApiException catch (e) {
      if (e.statusCode == 404) {
        developer.log(
          '⚠️ MOCK: GET /api/posts not implemented yet — returning mock posts',
          name: 'feed_service',
        );
        return _mockPosts();
      }
      developer.log(
        '⚠️ Error fetching posts (${e.statusCode}): ${e.message} — using mock data',
        name: 'feed_service',
      );
      return _mockPosts();
    }
  }

  /// Fetch businesses for the social feed avatars row.
  ///
  /// Uses `GET /api/companies` (or similar).
  /// Falls back to mock data if the endpoint returns 404.
  Future<List<Map<String, dynamic>>> getBusinesses() async {
    try {
      final response = await ApiClient.get('/api/companies');
      if (response is Map && response.containsKey('data')) {
        final List<dynamic> data = response['data'] as List<dynamic>;
        return data.cast<Map<String, dynamic>>();
      }
      if (response is List) {
        return response.cast<Map<String, dynamic>>();
      }
      developer.log(
        '⚠️ Unexpected response shape from /api/companies — using mock data',
        name: 'feed_service',
      );
      return _mockBusinesses();
    } on ApiException catch (e) {
      if (e.statusCode == 404) {
        developer.log(
          '⚠️ MOCK: GET /api/companies not implemented yet — returning mock businesses',
          name: 'feed_service',
        );
        return _mockBusinesses();
      }
      developer.log(
        '⚠️ Error fetching businesses (${e.statusCode}): ${e.message} — using mock data',
        name: 'feed_service',
      );
      return _mockBusinesses();
    }
  }

  /// Toggle like on a post.
  ///
  /// Uses `POST /api/posts/:postId/react` with body `{"type": "like"}`.
  /// On 404: silently logs and returns (no crash).
  Future<void> likePost(String postId) async {
    try {
      await ApiClient.post('/api/posts/$postId/react', {'type': 'like'});
      developer.log('✅ Like toggled for post $postId', name: 'feed_service');
    } on ApiException catch (e) {
      if (e.statusCode == 404) {
        developer.log(
          '⚠️ MOCK: like endpoint not available for post $postId',
          name: 'feed_service',
        );
        return;
      }
      developer.log(
        '⚠️ Error liking post $postId (${e.statusCode}): ${e.message}',
        name: 'feed_service',
      );
      rethrow;
    }
  }

  /// Fetch categories from the backend.
  ///
  /// Uses `GET /api/categories`.
  /// Falls back to mock data if the endpoint returns 404.
  Future<List<Map<String, dynamic>>> getCategories() async {
    try {
      final response = await ApiClient.get('/api/categories');
      if (response is List) {
        return response.cast<Map<String, dynamic>>();
      }
      developer.log(
        '⚠️ Unexpected response shape from /api/categories — using mock data',
        name: 'feed_service',
      );
      return _mockCategories();
    } on ApiException catch (e) {
      if (e.statusCode == 404) {
        developer.log(
          '⚠️ MOCK: GET /api/categories not implemented yet — returning mock categories',
          name: 'feed_service',
        );
        return _mockCategories();
      }
      developer.log(
        '⚠️ Error fetching categories (${e.statusCode}): ${e.message} — using mock data',
        name: 'feed_service',
      );
      return _mockCategories();
    }
  }

  /// Fetch user stats from the backend.
  ///
  /// Uses `GET /api/users/me/stats` (requires auth).
  /// Falls back to mock data if the endpoint returns 404.
  Future<Map<String, dynamic>> getUserStats() async {
    try {
      final response = await ApiClient.get('/api/users/me/stats');
      if (response is Map<String, dynamic>) {
        return response;
      }
      return _mockStats();
    } on ApiException catch (e) {
      if (e.statusCode == 404) {
        developer.log(
          '⚠️ MOCK: GET /api/users/me/stats not implemented yet — returning mock stats',
          name: 'feed_service',
        );
        return _mockStats();
      }
      developer.log(
        '⚠️ Error fetching user stats (${e.statusCode}): ${e.message} — using mock data',
        name: 'feed_service',
      );
      return _mockStats();
    }
  }

  // ── Mock Data ─────────────────────────────────────────────────────

  List<Map<String, dynamic>> _mockPosts() {
    final now = DateTime.now();
    return [
      {
        'id': 'mock-1',
        'caption':
            'Welcome to Neighborly! Discover local services and connect with your community. Our platform makes it easy to find trusted professionals in your area.',
        'type': 'TEXT',
        'createdAt': now.subtract(const Duration(minutes: 25)).toIso8601String(),
        'author': {
          'id': 'author-1',
          'displayName': 'Neighborly',
          'avatarUrl': null,
        },
        'reactions': [
          {'id': 'r1', 'type': 'like', 'userId': 'current-user'},
        ],
        'comments': [
          {'id': 'c1', 'text': 'Great platform!', 'userId': 'user-2'},
        ],
        '_count': {'reactions': 5, 'comments': 2},
        'mediaUrl': null,
        'businessId': null,
        'serviceId': null,
      },
      {
        'id': 'mock-2',
        'caption':
            'Join us this weekend for the Vaughan Community Fair! Live music, food trucks, and local artisans. Bring the whole family!',
        'type': 'TEXT',
        'createdAt': now.subtract(const Duration(hours: 3)).toIso8601String(),
        'author': {
          'id': 'author-2',
          'displayName': 'Vaughan Events',
          'avatarUrl': null,
        },
        'reactions': [],
        'comments': [],
        '_count': {'reactions': 12, 'comments': 3},
        'mediaUrl': null,
        'businessId': null,
        'serviceId': null,
      },
      {
        'id': 'mock-3',
        'caption':
            'New coffee shop opening on Major Mackenzie Drive — grand opening this Friday! First 50 customers get a free latte. ☕',
        'type': 'TEXT',
        'createdAt': now.subtract(const Duration(hours: 8)).toIso8601String(),
        'author': {
          'id': 'author-3',
          'displayName': 'Local Business',
          'avatarUrl': null,
        },
        'reactions': [],
        'comments': [],
        '_count': {'reactions': 8, 'comments': 1},
        'mediaUrl': null,
        'businessId': null,
        'serviceId': null,
      },
      {
        'id': 'mock-4',
        'caption':
            'Spring special: 20% off all auto detailing services. Book now and get your car looking brand new! 🚗✨',
        'type': 'TEXT',
        'createdAt': now.subtract(const Duration(days: 1)).toIso8601String(),
        'author': {
          'id': 'author-4',
          'displayName': 'AutoFix Pro',
          'avatarUrl': null,
        },
        'reactions': [],
        'comments': [],
        '_count': {'reactions': 24, 'comments': 5},
        'mediaUrl': null,
        'businessId': null,
        'serviceId': null,
      },
    ];
  }

  List<Map<String, dynamic>> _mockBusinesses() {
    return [
      {'id': 'b1', 'name': 'AutoFix', 'avatarUrl': null},
      {'id': 'b2', 'name': 'BeautyX', 'avatarUrl': null},
      {'id': 'b3', 'name': 'GreenBuild', 'avatarUrl': null},
      {'id': 'b4', 'name': 'FoodHub', 'avatarUrl': null},
      {'id': 'b5', 'name': 'TaxPros', 'avatarUrl': null},
      {'id': 'b6', 'name': 'CleanCo', 'avatarUrl': null},
      {'id': 'b7', 'name': 'FitLife', 'avatarUrl': null},
    ];
  }

  List<Map<String, dynamic>> _mockCategories() {
    return [
      {'id': '1', 'name': 'Building', 'icon': '🏗️'},
      {'id': '2', 'name': 'Auto', 'icon': '🚗'},
      {'id': '3', 'name': 'Beauty', 'icon': '💅'},
      {'id': '4', 'name': 'Transport', 'icon': '🚌'},
      {'id': '5', 'name': 'Health', 'icon': '🏥'},
      {'id': '6', 'name': 'Cleaning', 'icon': '🧹'},
      {'id': '7', 'name': 'Education', 'icon': '📚'},
      {'id': '8', 'name': 'Food', 'icon': '🍕'},
    ];
  }

  Map<String, dynamic> _mockStats() {
    return {
      'interactionScore': 42,
      'bookings': 3,
      'totalRequests': 5,
      'completedRequests': 3,
      'activeContracts': 1,
    };
  }
}
