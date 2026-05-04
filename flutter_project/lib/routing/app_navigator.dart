import 'package:flutter/material.dart';

import 'app_paths.dart';

/// [NeighborlyShell] is built in [MaterialApp.builder] *above* the [Navigator].
/// Shell actions (bottom bar, header) must use this key instead of [Navigator.of](shellContext).
final GlobalKey<NavigatorState> neighborlyNavigatorKey = GlobalKey<NavigatorState>();

/// Opens the create-order wizard with the "new offer" hint (`newOffer=1` query).
/// Uses `entryPoint=direct` so the wizard does not default to explorer-only flow.
void neighborlyPushNewOfferWizard() {
  neighborlyNavigatorKey.currentState?.pushNamed(
    '/orders/new?entryPoint=direct&newOffer=1',
  );
}

String _neighborlyNormalizedRouteName(String? raw) {
  if (raw == null || raw.isEmpty) return '/';
  var p = raw;
  if (p.contains('?')) p = p.split('?').first;
  return stripFlutterBase(p);
}

/// Tracks the visible named route so shell chrome (bottom bar) stays in sync with
/// [Navigator] — [Uri.base.path] alone can lag behind on Flutter Web after [pushNamed].
final ValueNotifier<String> neighborlyRoutePathNotifier = ValueNotifier<String>(
  _neighborlyNormalizedRouteName(Uri.base.path),
);

class NeighborlyRouteObserver extends NavigatorObserver {
  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    _apply(route);
  }

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    _apply(previousRoute);
  }

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) {
    _apply(newRoute);
  }

  @override
  void didRemove(Route<dynamic> route, Route<dynamic>? previousRoute) {
    _apply(previousRoute);
  }

  void _apply(Route<dynamic>? route) {
    final name = route?.settings.name;
    if (name == null || name.isEmpty) return;
    neighborlyRoutePathNotifier.value = _neighborlyNormalizedRouteName(name);
  }
}
