/// Matches web `WizardBookingMode` / Prisma `BookingMode` strings for order entry.
enum WizardBookingMode {
  autoAppointment,
  inheritFromCatalog,
  negotiation,
}

extension WizardBookingModeWire on WizardBookingMode {
  /// Wire value sent to APIs and stored in navigation JSON.
  String get wireValue {
    switch (this) {
      case WizardBookingMode.autoAppointment:
        return 'auto_appointment';
      case WizardBookingMode.inheritFromCatalog:
        return 'inherit_from_catalog';
      case WizardBookingMode.negotiation:
        return 'negotiation';
    }
  }

  static WizardBookingMode? tryParse(String? raw) {
    final s = raw?.trim();
    if (s == null || s.isEmpty) return null;
    switch (s) {
      case 'auto_appointment':
        return WizardBookingMode.autoAppointment;
      case 'inherit_from_catalog':
        return WizardBookingMode.inheritFromCatalog;
      case 'negotiation':
        return WizardBookingMode.negotiation;
      default:
        return null;
    }
  }
}

/// Web `DatePreference` (`lib/wizardStore.ts`).
enum WizardDatePreference { today, tomorrow, thisWeekend }

extension WizardDatePreferenceWire on WizardDatePreference {
  String get wireValue {
    switch (this) {
      case WizardDatePreference.today:
        return 'today';
      case WizardDatePreference.tomorrow:
        return 'tomorrow';
      case WizardDatePreference.thisWeekend:
        return 'this_weekend';
    }
  }

  static WizardDatePreference? tryParse(String? raw) {
    switch (raw?.trim()) {
      case 'today':
        return WizardDatePreference.today;
      case 'tomorrow':
        return WizardDatePreference.tomorrow;
      case 'this_weekend':
        return WizardDatePreference.thisWeekend;
      default:
        return null;
    }
  }
}

/// Web `TimeWindow`.
enum WizardTimeWindow { morning, afternoon, evening }

extension WizardTimeWindowWire on WizardTimeWindow {
  String get wireValue {
    switch (this) {
      case WizardTimeWindow.morning:
        return 'morning';
      case WizardTimeWindow.afternoon:
        return 'afternoon';
      case WizardTimeWindow.evening:
        return 'evening';
    }
  }

  static WizardTimeWindow? tryParse(String? raw) {
    switch (raw?.trim()) {
      case 'morning':
        return WizardTimeWindow.morning;
      case 'afternoon':
        return WizardTimeWindow.afternoon;
      case 'evening':
        return WizardTimeWindow.evening;
      default:
        return null;
    }
  }
}

/// Web `Urgency`.
enum WizardUrgency { immediate, thisWeek, noRush }

extension WizardUrgencyWire on WizardUrgency {
  String get wireValue {
    switch (this) {
      case WizardUrgency.immediate:
        return 'immediate';
      case WizardUrgency.thisWeek:
        return 'this_week';
      case WizardUrgency.noRush:
        return 'no_rush';
    }
  }

  static WizardUrgency? tryParse(String? raw) {
    switch (raw?.trim()) {
      case 'immediate':
        return WizardUrgency.immediate;
      case 'this_week':
        return WizardUrgency.thisWeek;
      case 'no_rush':
        return WizardUrgency.noRush;
      default:
        return null;
    }
  }
}

class _WizardBudgetMinUnset {
  const _WizardBudgetMinUnset();
}

class _WizardBudgetMaxUnset {
  const _WizardBudgetMaxUnset();
}

const Object _wizardBudgetMinUnset = _WizardBudgetMinUnset();
const Object _wizardBudgetMaxUnset = _WizardBudgetMaxUnset();

/// Order wizard Step 2 payload (wire strings for API / deep links).
class OrderWizardArgs {
  final String? bookingMode;
  final String? catalogName;
  final String? providerName;
  final String? bookingDate;
  final String? bookingTime;
  final String? datePreference;
  final String? timeWindow;
  final double? budgetMin;
  final double? budgetMax;
  final String? urgency;
  final String? contactPreference;
  final String? serviceCatalogId;
  final String? careerName;
  final String? notes;
  final String? accessNotes;
  final String? serviceAddress;
  final String? prefillProviderId;
  final String? prefillProviderName;

  const OrderWizardArgs({
    this.bookingMode,
    this.catalogName,
    this.providerName,
    this.bookingDate,
    this.bookingTime,
    this.datePreference,
    this.timeWindow,
    this.budgetMin,
    this.budgetMax,
    this.urgency,
    this.contactPreference,
    this.serviceCatalogId,
    this.careerName,
    this.notes,
    this.accessNotes,
    this.serviceAddress,
    this.prefillProviderId,
    this.prefillProviderName,
  });

  OrderWizardArgs copyWith({
    String? bookingMode,
    String? catalogName,
    String? providerName,
    String? bookingDate,
    String? bookingTime,
    String? datePreference,
    String? timeWindow,
    Object? budgetMin = _wizardBudgetMinUnset,
    Object? budgetMax = _wizardBudgetMaxUnset,
    String? urgency,
    String? contactPreference,
    String? serviceCatalogId,
    String? careerName,
    String? notes,
    String? accessNotes,
    String? serviceAddress,
    String? prefillProviderId,
    String? prefillProviderName,
  }) {
    return OrderWizardArgs(
      bookingMode: bookingMode ?? this.bookingMode,
      catalogName: catalogName ?? this.catalogName,
      providerName: providerName ?? this.providerName,
      bookingDate: bookingDate ?? this.bookingDate,
      bookingTime: bookingTime ?? this.bookingTime,
      datePreference: datePreference ?? this.datePreference,
      timeWindow: timeWindow ?? this.timeWindow,
      budgetMin: identical(budgetMin, _wizardBudgetMinUnset) ? this.budgetMin : budgetMin as double?,
      budgetMax: identical(budgetMax, _wizardBudgetMaxUnset) ? this.budgetMax : budgetMax as double?,
      urgency: urgency ?? this.urgency,
      contactPreference: contactPreference ?? this.contactPreference,
      serviceCatalogId: serviceCatalogId ?? this.serviceCatalogId,
      careerName: careerName ?? this.careerName,
      notes: notes ?? this.notes,
      accessNotes: accessNotes ?? this.accessNotes,
      serviceAddress: serviceAddress ?? this.serviceAddress,
      prefillProviderId: prefillProviderId ?? this.prefillProviderId,
      prefillProviderName: prefillProviderName ?? this.prefillProviderName,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      if (bookingMode != null) 'bookingMode': bookingMode,
      if (catalogName != null) 'catalogName': catalogName,
      if (providerName != null) 'providerName': providerName,
      if (bookingDate != null) 'bookingDate': bookingDate,
      if (bookingTime != null) 'bookingTime': bookingTime,
      if (datePreference != null) 'datePreference': datePreference,
      if (timeWindow != null) 'timeWindow': timeWindow,
      if (budgetMin != null) 'budgetMin': budgetMin,
      if (budgetMax != null) 'budgetMax': budgetMax,
      if (urgency != null) 'urgency': urgency,
      if (contactPreference != null) 'contactPreference': contactPreference,
      if (serviceCatalogId != null) 'serviceCatalogId': serviceCatalogId,
      if (careerName != null) 'careerName': careerName,
      if (notes != null) 'notes': notes,
      if (accessNotes != null) 'accessNotes': accessNotes,
      if (serviceAddress != null) 'serviceAddress': serviceAddress,
      if (prefillProviderId != null) 'prefillProviderId': prefillProviderId,
      if (prefillProviderName != null) 'prefillProviderName': prefillProviderName,
    };
  }

  factory OrderWizardArgs.fromJson(Map<String, dynamic> map) {
    double? dbl(Object? o) {
      if (o is num) return o.toDouble();
      if (o is String && o.trim().isNotEmpty) return double.tryParse(o.trim());
      return null;
    }

    final cat = map['catalogName']?.toString() ?? map['serviceCatalogName']?.toString();
    return OrderWizardArgs(
      bookingMode: map['bookingMode']?.toString(),
      catalogName: cat,
      providerName: map['providerName']?.toString(),
      bookingDate: map['bookingDate']?.toString() ?? map['appointmentDate']?.toString(),
      bookingTime: map['bookingTime']?.toString() ?? map['appointmentTime']?.toString(),
      datePreference: map['datePreference']?.toString(),
      timeWindow: map['timeWindow']?.toString(),
      budgetMin: dbl(map['budgetMin']),
      budgetMax: dbl(map['budgetMax']),
      urgency: map['urgency']?.toString(),
      contactPreference: map['contactPreference']?.toString(),
      serviceCatalogId: map['serviceCatalogId']?.toString(),
      careerName: map['careerName']?.toString(),
      notes: map['notes']?.toString(),
      accessNotes: map['accessNotes']?.toString(),
      serviceAddress: map['serviceAddress']?.toString(),
      prefillProviderId: map['prefillProviderId']?.toString(),
      prefillProviderName: map['prefillProviderName']?.toString(),
    );
  }
}

enum OrderEntryPoint { explorer, aiSuggestion, direct }

extension OrderEntryPointWire on OrderEntryPoint {
  String get wireValue {
    switch (this) {
      case OrderEntryPoint.explorer:
        return 'explorer';
      case OrderEntryPoint.aiSuggestion:
        return 'ai_suggestion';
      case OrderEntryPoint.direct:
        return 'direct';
    }
  }
}

class OrderPhaseFacets {
  final int offer;
  final int order;
  final int job;
  final int cancelledOffer;
  final int cancelledOrder;
  final int cancelledJob;

  const OrderPhaseFacets({
    required this.offer,
    required this.order,
    required this.job,
    required this.cancelledOffer,
    required this.cancelledOrder,
    required this.cancelledJob,
  });

  factory OrderPhaseFacets.fromMap(Map<String, dynamic> map) {
    int value(String key) {
      final raw = map[key];
      if (raw is int) return raw;
      if (raw is num) return raw.toInt();
      return 0;
    }

    return OrderPhaseFacets(
      offer: value('offer'),
      order: value('order'),
      job: value('job'),
      cancelledOffer: value('cancelledOffer'),
      cancelledOrder: value('cancelledOrder'),
      cancelledJob: value('cancelledJob'),
    );
  }
}

class OrderSummary {
  final String id;
  final String serviceCatalogId;
  final String status;
  final String? phase;
  final String description;
  final String address;
  final String entryPoint;
  final String updatedAt;
  final String createdAt;
  final String serviceName;
  final List<String> breadcrumb;

  const OrderSummary({
    required this.id,
    required this.serviceCatalogId,
    required this.status,
    required this.phase,
    required this.description,
    required this.address,
    required this.entryPoint,
    required this.updatedAt,
    required this.createdAt,
    required this.serviceName,
    required this.breadcrumb,
  });

  factory OrderSummary.fromMap(Map<String, dynamic> map) {
    final sc = map['serviceCatalog'];
    final scMap = sc is Map ? Map<String, dynamic>.from(sc) : const <String, dynamic>{};
    final rawBreadcrumb = scMap['breadcrumb'];
    final crumbs = <String>[];
    if (rawBreadcrumb is List) {
      for (final item in rawBreadcrumb) {
        if (item is Map && item['name'] is String) {
          crumbs.add(item['name'] as String);
        }
      }
    }

    return OrderSummary(
      id: map['id']?.toString() ?? '',
      serviceCatalogId: map['serviceCatalogId']?.toString() ?? '',
      status: map['status']?.toString() ?? 'draft',
      phase: map['phase']?.toString(),
      description: map['description']?.toString() ?? '',
      address: map['address']?.toString() ?? '',
      entryPoint: map['entryPoint']?.toString() ?? '',
      updatedAt: map['updatedAt']?.toString() ?? '',
      createdAt: map['createdAt']?.toString() ?? '',
      serviceName: scMap['name']?.toString() ?? 'Service',
      breadcrumb: crumbs,
    );
  }
}

class OrderDetail {
  final String id;
  final String serviceCatalogId;
  final String status;
  final String? phase;
  final String description;
  final bool descriptionAiAssisted;
  final String address;
  final String entryPoint;
  final String scheduleFlexibility;
  final String? scheduledAt;
  final String createdAt;
  final String updatedAt;
  final Map<String, dynamic> answers;
  final List<dynamic> photos;
  final Map<String, dynamic>? schema;
  final bool staleSnapshot;
  final Map<String, dynamic>? payment;

  const OrderDetail({
    required this.id,
    required this.serviceCatalogId,
    required this.status,
    required this.phase,
    required this.description,
    required this.descriptionAiAssisted,
    required this.address,
    required this.entryPoint,
    required this.scheduleFlexibility,
    required this.scheduledAt,
    required this.createdAt,
    required this.updatedAt,
    required this.answers,
    required this.photos,
    required this.schema,
    required this.staleSnapshot,
    required this.payment,
  });

  factory OrderDetail.fromMap(Map<String, dynamic> map) {
    return OrderDetail(
      id: map['id']?.toString() ?? '',
      serviceCatalogId: map['serviceCatalogId']?.toString() ?? '',
      status: map['status']?.toString() ?? 'draft',
      phase: map['phase']?.toString(),
      description: map['description']?.toString() ?? '',
      descriptionAiAssisted: map['descriptionAiAssisted'] == true,
      address: map['address']?.toString() ?? '',
      entryPoint: map['entryPoint']?.toString() ?? '',
      scheduleFlexibility: map['scheduleFlexibility']?.toString() ?? 'asap',
      scheduledAt: map['scheduledAt']?.toString(),
      createdAt: map['createdAt']?.toString() ?? '',
      updatedAt: map['updatedAt']?.toString() ?? '',
      answers: map['answers'] is Map ? Map<String, dynamic>.from(map['answers'] as Map) : const <String, dynamic>{},
      photos: map['photos'] is List ? List<dynamic>.from(map['photos'] as List) : const <dynamic>[],
      schema: map['schema'] is Map ? Map<String, dynamic>.from(map['schema'] as Map) : null,
      staleSnapshot: map['staleSnapshot'] == true,
      payment: map['payment'] is Map ? Map<String, dynamic>.from(map['payment'] as Map) : null,
    );
  }
}

class OrdersListResponse {
  final List<OrderSummary> items;
  final int total;
  final int page;
  final int pageSize;
  final OrderPhaseFacets? facets;

  const OrdersListResponse({
    required this.items,
    required this.total,
    required this.page,
    required this.pageSize,
    required this.facets,
  });
}

/// Row from GET /api/service-catalog/by-category/:id (wizard tiles).
class ServiceCatalogTile {
  final String id;
  final String name;
  final String? slug;
  final String? categoryId;
  final String? lockedBookingMode;

  const ServiceCatalogTile({
    required this.id,
    required this.name,
    required this.slug,
    required this.categoryId,
    required this.lockedBookingMode,
  });

  factory ServiceCatalogTile.fromMap(Map<String, dynamic> map) {
    return ServiceCatalogTile(
      id: map['id']?.toString() ?? '',
      name: map['name']?.toString() ?? 'Service',
      slug: map['slug']?.toString(),
      categoryId: map['categoryId']?.toString(),
      lockedBookingMode: map['lockedBookingMode']?.toString(),
    );
  }

  /// Parity with web `effectiveWizardBookingMode` (`src/lib/bookingModeWizard.ts`).
  WizardBookingMode resolvedBookingMode() {
    final lock = lockedBookingMode?.trim();
    if (lock == 'auto_appointment') return WizardBookingMode.autoAppointment;
    if (lock == 'negotiation') return WizardBookingMode.negotiation;
    final slugLc = (slug ?? '').toLowerCase();
    final nameLc = name.toLowerCase();
    if (slugLc.contains('haircut') || nameLc.contains('haircut')) {
      return WizardBookingMode.autoAppointment;
    }
    if (slugLc.contains('oil') ||
        slugLc.contains('maintenance-bundle') ||
        nameLc.contains('oil change') ||
        nameLc.contains('maintenance bundle')) {
      return WizardBookingMode.negotiation;
    }
    return WizardBookingMode.inheritFromCatalog;
  }
}

class ServiceCatalogSearchHit {
  final String id;
  final String name;
  final String? categoryId;
  final List<String> breadcrumb;

  const ServiceCatalogSearchHit({
    required this.id,
    required this.name,
    required this.categoryId,
    required this.breadcrumb,
  });

  factory ServiceCatalogSearchHit.fromMap(Map<String, dynamic> map) {
    final crumbs = <String>[];
    final raw = map['breadcrumb'];
    if (raw is List) {
      for (final item in raw) {
        if (item is String) crumbs.add(item);
      }
    }
    return ServiceCatalogSearchHit(
      id: map['id']?.toString() ?? '',
      name: map['name']?.toString() ?? 'Service',
      categoryId: map['categoryId']?.toString(),
      breadcrumb: crumbs,
    );
  }
}

/// Row from GET /api/categories/search `categories` array (pathIds for tree pre-select).
class CategorySearchHit {
  final String id;
  final String name;
  final List<String> pathIds;
  /// Root → leaf display names from the API (first entry is the taxonomy root).
  final List<String> breadcrumb;

  const CategorySearchHit({
    required this.id,
    required this.name,
    required this.pathIds,
    this.breadcrumb = const [],
  });

  factory CategorySearchHit.fromMap(Map<String, dynamic> map) {
    final ids = <String>[];
    final raw = map['pathIds'];
    if (raw is List) {
      for (final x in raw) {
        ids.add(x.toString());
      }
    }
    final crumbs = <String>[];
    final rawBc = map['breadcrumb'];
    if (rawBc is List) {
      for (final x in rawBc) {
        crumbs.add(x.toString());
      }
    }
    return CategorySearchHit(
      id: map['id']?.toString() ?? '',
      name: map['name']?.toString() ?? '',
      pathIds: ids,
      breadcrumb: crumbs,
    );
  }
}
