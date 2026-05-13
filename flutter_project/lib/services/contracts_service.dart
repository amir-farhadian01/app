import '../models/contract_models.dart';
import 'neighborly_api_service.dart';

/// Facade over [NeighborlyApiService] for order contract operations.
class ContractsService {
  const ContractsService(this._api);

  final NeighborlyApiService _api;

  Future<ContractsBundle> getContracts(String orderId) async {
    final raw = await _api.fetchOrderContracts(orderId);
    return ContractsBundle.fromJson(raw);
  }

  Future<void> approveContract(String orderId, String versionId) =>
      _api.approveContractVersion(orderId: orderId, versionId: versionId);

  Future<void> rejectContract(
    String orderId,
    String versionId, {
    required String note,
  }) =>
      _api.rejectContractVersion(
        orderId: orderId,
        versionId: versionId,
        note: note,
      );
}
