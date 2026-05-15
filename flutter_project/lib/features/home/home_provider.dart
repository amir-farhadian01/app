/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Home Providers — Riverpod state for Home & Explore screens
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import 'home_repository.dart';
import 'models/category_model.dart';
import 'models/post_model.dart';
import 'models/service_model.dart';

// ── Repository Provider ───────────────────────────────────────────────

final homeRepositoryProvider = Provider<HomeRepository>((ref) {
  final dio = ref.watch(apiClientProvider);
  return HomeRepository(dio);
});

// ── Categories Provider ───────────────────────────────────────────────

final categoriesProvider = FutureProvider<List<CategoryModel>>((ref) async {
  final repo = ref.watch(homeRepositoryProvider);
  return repo.getCategories();
});

// ── Nearby Services Provider ──────────────────────────────────────────

final nearbyServicesProvider = FutureProvider<List<ServiceModel>>((ref) async {
  final repo = ref.watch(homeRepositoryProvider);
  return repo.getNearbyServices(limit: 6);
});

// ── Feed Provider (paginated) ─────────────────────────────────────────

/// Holds the feed state: list of posts, current page, and whether more exist.
class FeedState {
  final List<PostModel> posts;
  final int currentPage;
  final bool hasMore;
  final bool isLoadingMore;

  const FeedState({
    required this.posts,
    this.currentPage = 1,
    this.hasMore = true,
    this.isLoadingMore = false,
  });

  FeedState copyWith({
    List<PostModel>? posts,
    int? currentPage,
    bool? hasMore,
    bool? isLoadingMore,
  }) {
    return FeedState(
      posts: posts ?? this.posts,
      currentPage: currentPage ?? this.currentPage,
      hasMore: hasMore ?? this.hasMore,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
    );
  }
}

class FeedNotifier extends StateNotifier<AsyncValue<FeedState>> {
  final HomeRepository _repository;

  FeedNotifier(this._repository) : super(const AsyncValue.loading()) {
    loadInitial();
  }

  Future<void> loadInitial() async {
    state = const AsyncValue.loading();
    try {
      final response = await _repository.getFeed(page: 1, limit: 10);
      state = AsyncValue.data(
        FeedState(
          posts: response.posts,
          currentPage: 1,
          hasMore: response.hasMore,
        ),
      );
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> loadMore() async {
    final currentState = state.valueOrNull;
    if (currentState == null || !currentState.hasMore || currentState.isLoadingMore) return;

    state = AsyncValue.data(currentState.copyWith(isLoadingMore: true));
    try {
      final nextPage = currentState.currentPage + 1;
      final response = await _repository.getFeed(page: nextPage, limit: 10);
      final allPosts = [...currentState.posts, ...response.posts];
      state = AsyncValue.data(
        FeedState(
          posts: allPosts,
          currentPage: nextPage,
          hasMore: response.hasMore,
        ),
      );
    } catch (e, st) {
      // On error, revert isLoadingMore
      state = AsyncValue.data(currentState.copyWith(isLoadingMore: false));
      // Keep the error available
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> refresh() async {
    await loadInitial();
  }
}

final feedProvider =
    StateNotifierProvider<FeedNotifier, AsyncValue<FeedState>>((ref) {
  final repo = ref.watch(homeRepositoryProvider);
  return FeedNotifier(repo);
});

// ── Search Provider ───────────────────────────────────────────────────

class SearchNotifier extends StateNotifier<AsyncValue<List<ServiceModel>>> {
  final HomeRepository _repository;

  SearchNotifier(this._repository) : super(const AsyncValue.data([]));

  Future<void> search(String query) async {
    if (query.trim().isEmpty) {
      state = const AsyncValue.data([]);
      return;
    }
    state = const AsyncValue.loading();
    try {
      final results = await _repository.searchServices(query);
      state = AsyncValue.data(results);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  void clearResults() {
    state = const AsyncValue.data([]);
  }
}

final searchProvider =
    StateNotifierProvider<SearchNotifier, AsyncValue<List<ServiceModel>>>(
        (ref) {
  final repo = ref.watch(homeRepositoryProvider);
  return SearchNotifier(repo);
});
