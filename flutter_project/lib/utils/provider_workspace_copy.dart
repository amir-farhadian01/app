import '../services/neighborly_api_service.dart';

/// Maps known API errors for order-scoped chat/contracts to non-alarming copy.
String friendlyPreMatchOrderMessage(NeighborlyApiException e, {required bool contracts}) {
  if (e.code == 'NO_MATCHED_PROVIDER') {
    return contracts
        ? 'A contract will be available once this order has a matched provider.'
        : 'Conversation opens once a provider is invited or matched on this order.';
  }
  if (e.code == 'ORDER_STATE') {
    return 'Contracts are not available for this order yet.';
  }
  final lower = e.message.toLowerCase();
  if (e.statusCode == 400) {
    if (lower.contains('matched provider') ||
        lower.contains('after provider matching') ||
        lower.contains('no matched provider')) {
      return contracts
          ? 'Contracts appear after a provider is matched.'
          : 'Chat appears after a provider is invited or matched.';
    }
    if (lower.contains('not available for this order state')) {
      return contracts
          ? 'Contracts are not available in this phase.'
          : 'Chat is not available in this phase.';
    }
  }
  return e.message;
}
