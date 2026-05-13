/// A single provider inbox attempt (offer sent to workspace).
class InboxAttempt {
  const InboxAttempt({
    required this.attemptId,
    required this.orderId,
    required this.serviceName,
    required this.status,
    required this.customerArea,
    this.budgetMin,
    this.budgetMax,
    this.expiresAt,
    this.lostReason,
    required this.createdAt,
    this.answers = const {},
    this.description = '',
  });

  final String attemptId;
  final String orderId;
  final String serviceName;

  /// awaiting | acknowledged | accepted | declined | lost | superseded | expired
  final String status;

  /// Masked customer area (e.g. "Downtown, Toronto").
  final String customerArea;
  final double? budgetMin;
  final double? budgetMax;

  /// ISO-8601 string; null when no expiry set.
  final String? expiresAt;

  /// Populated for lost/superseded/expired attempts.
  final String? lostReason;
  final String createdAt;
  final Map<String, dynamic> answers;
  final String description;

  bool get isAwaiting => status == 'awaiting';
  bool get isAcknowledged => status == 'acknowledged';
  bool get isLost =>
      status == 'lost' || status == 'superseded' || status == 'expired';

  /// Returns remaining duration until expiry, or null if no expiry / already expired.
  Duration? get timeUntilExpiry {
    if (expiresAt == null) return null;
    final dt = DateTime.tryParse(expiresAt!)?.toLocal();
    if (dt == null) return null;
    final diff = dt.difference(DateTime.now());
    return diff.isNegative ? Duration.zero : diff;
  }

  factory InboxAttempt.fromJson(Map<String, dynamic> j) {
    double? dbl(Object? o) {
      if (o is num) return o.toDouble();
      if (o is String) return double.tryParse(o);
      return null;
    }

    final order = j['order'] is Map
        ? Map<String, dynamic>.from(j['order'] as Map)
        : const <String, dynamic>{};
    final sc = order['serviceCatalog'] is Map
        ? Map<String, dynamic>.from(order['serviceCatalog'] as Map)
        : const <String, dynamic>{};

    return InboxAttempt(
      attemptId: j['id']?.toString() ?? j['attemptId']?.toString() ?? '',
      orderId: j['orderId']?.toString() ?? order['id']?.toString() ?? '',
      serviceName: sc['name']?.toString() ??
          order['serviceName']?.toString() ??
          j['serviceName']?.toString() ??
          'Service',
      status: j['status']?.toString() ?? 'awaiting',
      customerArea: j['customerArea']?.toString() ??
          order['address']?.toString() ??
          'Area not disclosed',
      budgetMin: dbl(j['budgetMin'] ?? order['budgetMin']),
      budgetMax: dbl(j['budgetMax'] ?? order['budgetMax']),
      expiresAt: j['expiresAt']?.toString() ?? j['expiredAt']?.toString(),
      lostReason: j['lostReason']?.toString() ?? j['declineReason']?.toString(),
      createdAt: j['createdAt']?.toString() ?? '',
      answers: order['answers'] is Map
          ? Map<String, dynamic>.from(order['answers'] as Map)
          : const {},
      description: order['description']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': attemptId,
        'orderId': orderId,
        'serviceName': serviceName,
        'status': status,
        'customerArea': customerArea,
        if (budgetMin != null) 'budgetMin': budgetMin,
        if (budgetMax != null) 'budgetMax': budgetMax,
        if (expiresAt != null) 'expiresAt': expiresAt,
        if (lostReason != null) 'lostReason': lostReason,
        'createdAt': createdAt,
        'answers': answers,
        'description': description,
      };
}
