/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Home Repository — API calls for Home & Explore screens
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import 'package:dio/dio.dart';

import '../../core/api/api_client.dart';
import 'models/service_model.dart';
import 'models/post_model.dart';
import 'models/category_model.dart';

/// Repository that fetches data for the Home and Explore screens.
class HomeRepository {
  final Dio _dio;

  HomeRepository(this._dio);

  /// Fetch nearby services (public endpoint).
  Future<List<ServiceModel>> getNearbyServices({int limit = 6}) async {
    try {
      final response = await _dio.get<List<dynamic>>(
        '/api/services',
        queryParameters: {'limit': limit.toString(), 'offset': '0'},
      );
      final data = response.data ?? [];
      return data
          .map((e) => ServiceModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  /// Fetch paginated feed posts (public endpoint).
  Future<FeedResponse> getFeed({int page = 1, int limit = 10}) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/feed/public',
        queryParameters: {
          'page': page.toString(),
          'pageSize': limit.toString(),
        },
      );
      final data = response.data;
      final postsJson = (data?['data'] as List<dynamic>?) ?? [];
      final posts = postsJson
          .map((e) => PostModel.fromJson(e as Map<String, dynamic>))
          .toList();
      final total = data?['total'] as int? ?? posts.length;
      return FeedResponse(posts: posts, total: total, page: page);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  /// Fetch all categories (public endpoint).
  Future<List<CategoryModel>> getCategories() async {
    try {
      final response = await _dio.get<List<dynamic>>('/api/categories');
      final data = response.data ?? [];
      return data
          .map((e) => CategoryModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  /// Search services by query string.
  Future<List<ServiceModel>> searchServices(String query) async {
    try {
      final response = await _dio.get<List<dynamic>>(
        '/api/services',
        queryParameters: {'search': query, 'limit': '50'},
      );
      final data = response.data ?? [];
      return data
          .map((e) => ServiceModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  /// Get services filtered by category.
  Future<List<ServiceModel>> getServicesByCategory(String categoryId) async {
    try {
      final response = await _dio.get<List<dynamic>>(
        '/api/services',
        queryParameters: {'category': categoryId, 'limit': '50'},
      );
      final data = response.data ?? [];
      return data
          .map((e) => ServiceModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }
}

/// Response wrapper for paginated feed.
class FeedResponse {
  final List<PostModel> posts;
  final int total;
  final int page;

  const FeedResponse({
    required this.posts,
    required this.total,
    required this.page,
  });

  bool get hasMore => posts.length < total;
}
