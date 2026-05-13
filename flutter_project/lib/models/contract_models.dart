/// A single contract version row.
class ContractVersion {
  const ContractVersion({
    required this.id,
    required this.status,
    required this.title,
    required this.termsMarkdown,
    this.scopeSummary,
    this.policiesMarkdown,
    this.amount,
    this.currency = 'CAD',
    required this.createdAt,
  });

  final String id;
  /// draft | sent | approved | rejected
  final String status;
  final String title;
  final String termsMarkdown;
  final String? scopeSummary;
  final String? policiesMarkdown;
  final double? amount;
  final String currency;
  final String createdAt;

  bool get isSent => status == 'sent';
  bool get isApproved => status == 'approved';

  factory ContractVersion.fromJson(Map<String, dynamic> j) => ContractVersion(
        id: j['id']?.toString() ?? '',
        status: j['status']?.toString() ?? 'draft',
        title: j['title']?.toString() ?? 'Contract',
        termsMarkdown: j['termsMarkdown']?.toString() ?? '',
        scopeSummary: j['scopeSummary']?.toString(),
        policiesMarkdown: j['policiesMarkdown']?.toString(),
        amount: j['amount'] is num ? (j['amount'] as num).toDouble() : null,
        currency: j['currency']?.toString() ?? 'CAD',
        createdAt: j['createdAt']?.toString() ?? '',
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'status': status,
        'title': title,
        'termsMarkdown': termsMarkdown,
        if (scopeSummary != null) 'scopeSummary': scopeSummary,
        if (policiesMarkdown != null) 'policiesMarkdown': policiesMarkdown,
        if (amount != null) 'amount': amount,
        'currency': currency,
        'createdAt': createdAt,
      };
}

/// Envelope returned by GET /api/orders/:id/contracts.
class ContractsBundle {
  const ContractsBundle({
    required this.versions,
    required this.readOnly,
    this.lockReason,
  });

  final List<ContractVersion> versions;
  final bool readOnly;
  final String? lockReason;

  ContractVersion? get latestSent {
    for (final v in versions) {
      if (v.isSent) return v;
    }
    return null;
  }

  factory ContractsBundle.fromJson(Map<String, dynamic> j) {
    final raw = j['versions'];
    final versions = raw is List
        ? raw
            .whereType<Map>()
            .map((e) => ContractVersion.fromJson(Map<String, dynamic>.from(e)))
            .toList()
        : <ContractVersion>[];
    return ContractsBundle(
      versions: versions,
      readOnly: j['readOnly'] == true,
      lockReason: j['lockReason']?.toString(),
    );
  }
}
