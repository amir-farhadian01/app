import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:neighborly/models/inbox_models.dart';
import 'package:neighborly/models/order_models.dart';
import 'package:neighborly/models/user_model.dart';
import 'package:neighborly/screens/customer_home_screen.dart';
import 'package:neighborly/screens/my_orders_screen.dart';
import 'package:neighborly/screens/order_detail_screen.dart';
import 'package:neighborly/screens/provider_dashboard_screen.dart';
import 'package:neighborly/services/neighborly_api_service.dart';
import 'package:neighborly/widgets/offer_card.dart';
import 'package:provider/provider.dart';

class _MockNeighborlyApi extends Mock implements NeighborlyApiService {}

UserModel _smokeUser({String role = 'customer', String? companyId}) => UserModel(
      uid: 'u-smoke',
      email: 'smoke@test.local',
      displayName: 'Smoke Tester',
      firstName: 'Smoke',
      lastName: 'Tester',
      role: role,
      companyId: companyId,
      createdAt: DateTime.utc(2026, 1, 1),
    );

OrdersListResponse _emptyOrders({required int pageSize}) => OrdersListResponse(
      items: const [],
      total: 0,
      page: 1,
      pageSize: pageSize,
      facets: null,
    );

void main() {
  setUpAll(() {
    registerFallbackValue(<String>[]);
  });

  testWidgets('CustomerHomeScreen renders greeting', (tester) async {
    final api = _MockNeighborlyApi();
    when(() => api.user).thenReturn(_smokeUser());
    when(
      () => api.fetchMyOrders(
        page: any(named: 'page'),
        pageSize: any(named: 'pageSize'),
        phases: any(named: 'phases'),
        statuses: any(named: 'statuses'),
        includeDrafts: any(named: 'includeDrafts'),
      ),
    ).thenAnswer((_) async => _emptyOrders(pageSize: 3));

    await tester.pumpWidget(
      MaterialApp(
        home: ChangeNotifierProvider<NeighborlyApiService>.value(
          value: api,
          child: const CustomerHomeScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('Hello, Smoke'), findsOneWidget);
  });

  testWidgets('MyOrdersScreen renders four tabs', (tester) async {
    final api = _MockNeighborlyApi();
    when(() => api.user).thenReturn(_smokeUser());
    when(
      () => api.fetchMyOrders(
        page: any(named: 'page'),
        pageSize: any(named: 'pageSize'),
        phases: any(named: 'phases'),
        statuses: any(named: 'statuses'),
        includeDrafts: any(named: 'includeDrafts'),
      ),
    ).thenAnswer((_) async => _emptyOrders(pageSize: 10));

    await tester.pumpWidget(
      MaterialApp(
        home: ChangeNotifierProvider<NeighborlyApiService>.value(
          value: api,
          child: const MyOrdersScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Offers'), findsOneWidget);
    expect(find.text('Active'), findsOneWidget);
    expect(find.text('Completed'), findsOneWidget);
    expect(find.text('Cancelled'), findsOneWidget);
  });

  testWidgets('OrderDetailScreen renders Chat Thread, Contract, and Payment sections', (tester) async {
    final api = _MockNeighborlyApi();
    when(() => api.user).thenReturn(_smokeUser());

    const order = OrderDetail(
      id: 'ord-smoke-1',
      serviceCatalogId: 'sc-1',
      status: 'submitted',
      phase: 'offer',
      description: 'Smoke',
      descriptionAiAssisted: false,
      address: '1 Test St',
      entryPoint: 'direct',
      scheduleFlexibility: 'asap',
      scheduledAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      answers: {},
      photos: [],
      schema: null,
      staleSnapshot: false,
      payment: null,
    );

    when(() => api.fetchOrderById('ord-smoke-1')).thenAnswer((_) async => order);
    when(() => api.fetchOrderCandidates('ord-smoke-1')).thenThrow(Exception('no candidates'));
    when(() => api.fetchOrderChatThread('ord-smoke-1')).thenAnswer(
      (_) async => {'messages': <dynamic>[], 'readOnly': false},
    );
    when(() => api.fetchOrderContracts('ord-smoke-1')).thenAnswer(
      (_) async => {'versions': <dynamic>[]},
    );
    when(() => api.fetchOrderPaymentStatus('ord-smoke-1')).thenAnswer(
      (_) async => {
        'orderId': 'ord-smoke-1',
        'orderStatus': 'submitted',
        'approvedContractVersionId': null,
        'payment': null,
      },
    );
    when(() => api.fetchFinanceHistory()).thenAnswer((_) async => []);

    await tester.pumpWidget(
      MaterialApp(
        home: ChangeNotifierProvider<NeighborlyApiService>.value(
          value: api,
          child: const OrderDetailScreen(orderId: 'ord-smoke-1'),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Chat Thread', skipOffstage: false), findsOneWidget);
    expect(find.text('Contract', skipOffstage: false), findsOneWidget);
    expect(find.text('Payment', skipOffstage: false), findsOneWidget);
  });

  testWidgets('ProviderDashboardScreen renders Inbox and Schedule navigation', (tester) async {
    final api = _MockNeighborlyApi();
    when(() => api.user).thenReturn(_smokeUser(role: 'provider', companyId: 'ws-smoke-1'));
    when(
      () => api.fetchProviderInbox(
        workspaceId: any(named: 'workspaceId'),
        statuses: any(named: 'statuses'),
        page: any(named: 'page'),
        pageSize: any(named: 'pageSize'),
      ),
    ).thenAnswer((_) async => {'items': <dynamic>[], 'total': 0, 'page': 1, 'pageSize': 25});
    when(
      () => api.fetchProviderMyOrders(
        page: any(named: 'page'),
        pageSize: any(named: 'pageSize'),
        phases: any(named: 'phases'),
        statuses: any(named: 'statuses'),
      ),
    ).thenAnswer((_) async => _emptyOrders(pageSize: 50));

    await tester.pumpWidget(
      MaterialApp(
        home: ChangeNotifierProvider<NeighborlyApiService>.value(
          value: api,
          child: const ProviderDashboardScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.text('Inbox'), findsWidgets);
    expect(find.text('Schedule'), findsWidgets);
  });

  testWidgets('OfferCard shows expiry countdown', (tester) async {
    final expires = DateTime.now().toUtc().add(const Duration(hours: 5)).toIso8601String();
    final attempt = InboxAttempt(
      attemptId: 'a1',
      orderId: 'o1',
      serviceName: 'Lawn trim',
      status: 'awaiting',
      customerArea: 'Toronto',
      expiresAt: expires,
      createdAt: '2026-01-01T00:00:00.000Z',
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: OfferCard(
            attempt: attempt,
            onTap: () {},
          ),
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));

    expect(find.textContaining('left'), findsOneWidget);
  });
}
