import '../models/inbox_models.dart';
import 'neighborly_api_service.dart';

/// Segments shown in the Inbox TabBar.
enum InboxSegment { awaiting, acknowledged, declined, lost }

extension InboxSegmentX on InboxSegment {
  String get label {
    switch (this) {
      case InboxSegment.awaiting:
        return 'Awaiting';
      case InboxSegment.acknowledged:
        return 'Acknowledged';
      case InboxSegment.declined:
        return 'Declined';
      case InboxSegment.lost:
        return 'Lost';
    }
  }

  /// Status values sent to the API for this segment.
  List<String> get apiStatuses {
    switch (this) {
      case InboxSegment.awaiting:
        return ['awaiting'];
      case InboxSegment.acknowledged:
        return ['acknowledged'];
      case InboxSegment.declined:
        return ['declined'];
      case InboxSegment.lost:
        return ['lost', 'superseded', 'expired'];
    }
  }
}

/// Facade over [NeighborlyApiService] for provider inbox operations.
class ProviderInboxService {
  const ProviderInboxService(this._api);

  final NeighborlyApiService _api;

  Future<List<InboxAttempt>> fetchSegment(
    String workspaceId,
    InboxSegment segment, {
    int page = 1,
    int pageSize = 25,
  }) async {
    final raw = await _api.fetchProviderInbox(
      workspaceId: workspaceId,
      statuses: segment.apiStatuses,
      page: page,
      pageSize: pageSize,
    );
    final list = raw['items'] as List<dynamic>? ??
        raw['attempts'] as List<dynamic>? ??
        (raw.values.first is List ? raw.values.first as List<dynamic> : const []);
    return list
        .whereType<Map>()
        .map((e) => InboxAttempt.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<InboxAttempt> fetchDetail(
      String workspaceId, String attemptId) async {
    final raw = await _api.fetchProviderInboxAttemptDetail(
      workspaceId: workspaceId,
      attemptId: attemptId,
    );
    return InboxAttempt.fromJson(raw);
  }

  Future<void> acknowledge(String workspaceId, String attemptId) =>
      _api.acknowledgeProviderInboxAttempt(
        workspaceId: workspaceId,
        attemptId: attemptId,
      );

  Future<void> accept(String workspaceId, String attemptId) =>
      _api.acceptProviderInboxAttempt(
        workspaceId: workspaceId,
        attemptId: attemptId,
      );

  Future<void> decline(
    String workspaceId,
    String attemptId, {
    required String reason,
  }) =>
      _api.declineProviderInboxAttempt(
        workspaceId: workspaceId,
        attemptId: attemptId,
        reason: reason,
      );
}
