import '../models/order_models.dart';
import 'neighborly_api_service.dart';

/// Thin facade over [NeighborlyApiService.fetchMyOrders] for customer order tabs.
class OrdersService {
  const OrdersService(this._api);

  final NeighborlyApiService _api;

  /// Maps a UI tab label to the phase/status query params used by the backend.
  static ({List<String> phases, List<String> statuses}) tabQuery(String phase) {
    switch (phase) {
      case 'offers':
        return (phases: ['offer'], statuses: ['submitted']);
      case 'active':
        return (phases: ['order', 'job'], statuses: []);
      case 'completed':
        return (phases: ['job'], statuses: ['completed']);
      case 'cancelled':
        return (phases: [], statuses: ['cancelled']);
      default:
        return (phases: [], statuses: []);
    }
  }

  Future<OrdersListResponse> getMyOrders(
    String phase, {
    int page = 1,
    int pageSize = 10,
  }) {
    final q = tabQuery(phase);
    return _api.fetchMyOrders(
      page: page,
      pageSize: pageSize,
      phases: q.phases,
      statuses: q.statuses,
      includeDrafts: false,
    );
  }
}
