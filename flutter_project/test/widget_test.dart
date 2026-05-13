import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:neighborly/models/inbox_models.dart';
import 'package:neighborly/models/order_models.dart';
import 'package:neighborly/widgets/offer_card.dart';
import 'package:neighborly/widgets/order_card.dart';

OrderSummary _fakeOrder({
  String status = 'submitted',
  String serviceName = 'Plumbing Repair',
}) =>
    OrderSummary(
      id: 'ord-1',
      serviceCatalogId: 'sc-1',
      status: status,
      phase: 'offer',
      description: 'Fix the leak',
      address: '123 Main St',
      entryPoint: 'direct',
      updatedAt: DateTime.now().toIso8601String(),
      createdAt: DateTime.now().toIso8601String(),
      serviceName: serviceName,
      breadcrumb: const ['Home Services', 'Plumbing'],
    );

InboxAttempt _fakeAttempt({
  String status = 'awaiting',
  String serviceName = 'Deck Repair',
  String? expiresAt,
}) =>
    InboxAttempt(
      attemptId: 'att-1',
      orderId: 'ord-2',
      serviceName: serviceName,
      status: status,
      customerArea: 'Downtown, Toronto',
      budgetMin: 100,
      budgetMax: 500,
      expiresAt: expiresAt,
      createdAt: DateTime.now().toIso8601String(),
    );

void main() {
  testWidgets('Material smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: Center(child: Text('Neighborly')),
        ),
      ),
    );
    expect(find.text('Neighborly'), findsOneWidget);
  });

  testWidgets('OrderCard renders service title and status chip',
      (WidgetTester tester) async {
    final order = _fakeOrder(status: 'submitted', serviceName: 'Plumbing Repair');
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: OrderCard(order: order, onTap: () {}),
        ),
      ),
    );
    expect(find.text('Plumbing Repair'), findsOneWidget);
    expect(find.text('submitted'), findsOneWidget);
  });

  testWidgets('OrderCard shows completed status chip',
      (WidgetTester tester) async {
    final order = _fakeOrder(status: 'completed', serviceName: 'Lawn Mowing');
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: OrderCard(order: order, onTap: () {}),
        ),
      ),
    );
    expect(find.text('Lawn Mowing'), findsOneWidget);
    expect(find.text('completed'), findsOneWidget);
  });

  testWidgets('OfferCard renders service title and status chip',
      (WidgetTester tester) async {
    final attempt = _fakeAttempt(status: 'awaiting', serviceName: 'Deck Repair');
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: OfferCard(attempt: attempt, onTap: () {}),
        ),
      ),
    );
    expect(find.text('Deck Repair'), findsOneWidget);
    expect(find.text('awaiting'), findsOneWidget);
  });

  testWidgets('OfferCard shows expiry countdown when expiresAt is set',
      (WidgetTester tester) async {
    final future =
        DateTime.now().add(const Duration(hours: 3)).toIso8601String();
    final attempt = _fakeAttempt(
        status: 'awaiting', serviceName: 'Painting', expiresAt: future);
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: OfferCard(attempt: attempt, onTap: () {}),
        ),
      ),
    );
    expect(find.text('Painting'), findsOneWidget);
    // Countdown text contains 'left'
    expect(find.textContaining('left'), findsOneWidget);
  });

  testWidgets('OfferCard timer disposes without error',
      (WidgetTester tester) async {
    final future =
        DateTime.now().add(const Duration(seconds: 5)).toIso8601String();
    final attempt = _fakeAttempt(expiresAt: future);
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: OfferCard(attempt: attempt, onTap: () {}),
        ),
      ),
    );
    // Pump a second to tick the timer, then remove the widget.
    await tester.pump(const Duration(seconds: 1));
    await tester.pumpWidget(const MaterialApp(home: Scaffold()));
    // No setState-after-dispose errors thrown.
  });
}
