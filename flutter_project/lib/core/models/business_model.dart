/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Business Model — Neighborly
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
///
/// Backend Routes Discovered (all prefixed with /api):
///
///   Companies (routes/companies.ts):
///     GET  /api/companies/:id          — Get company by ID (no auth)
///       Response shape:
///         {
///           id, name, slug, type, about, phone, address, website,
///           socialLinks, ownerId, kycStatus, createdAt, updatedAt,
///           owner: { id, displayName, email, avatarUrl },
///           members: [{ user: { id, displayName, email, avatarUrl, role } }]
///         }
///
///   Services (routes/services.ts):
///     GET  /api/services?providerId=:id — Get services by provider ID (no auth)
///       Response shape:
///         [{
///           id, title, category, price, description, providerId,
///           createdAt, updatedAt,
///           provider: { id, displayName, avatarUrl, companyId }
///         }]
///
///   Orders (routes/orders.ts):
///     POST /api/orders                  — Create order (requires auth)
///       Body: { serviceId, scheduledAt, notes }
///       Response: { id, status, ... }
///     GET  /api/orders/me               — My orders (requires auth)
///     GET  /api/orders/provider/me      — Provider pipeline (requires auth)
///
///   NOTE: No /api/companies/:id/services or /api/companies/:id/stats
///         endpoints exist yet. These will be mocked gracefully.
///
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/// Represents a business (company) profile on Neighborly.
class BusinessModel {
  final String id;
  final String name;
  final String? avatarUrl;
  final bool isVerified;
  final int followerCount;
  final int followingCount;
  final int postCount;
  final String? bio;
  final String? category;
  final double rating;
  final int reviewCount;

  const BusinessModel({
    required this.id,
    required this.name,
    this.avatarUrl,
    this.isVerified = false,
    this.followerCount = 0,
    this.followingCount = 0,
    this.postCount = 0,
    this.bio,
    this.category,
    this.rating = 0.0,
    this.reviewCount = 0,
  });

  factory BusinessModel.fromJson(Map<String, dynamic> json) {
    return BusinessModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? json['displayName'] as String? ?? '',
      avatarUrl: json['avatarUrl'] as String?,
      isVerified: json['kycStatus'] == 'verified' || json['isVerified'] == true,
      followerCount: json['followerCount'] as int? ?? 0,
      followingCount: json['followingCount'] as int? ?? 0,
      postCount: json['postCount'] as int? ?? 0,
      bio: json['about'] as String? ?? json['bio'] as String?,
      category: json['category'] as String? ?? json['type'] as String?,
      rating: (json['rating'] as num?)?.toDouble() ?? 0.0,
      reviewCount: json['reviewCount'] as int? ?? 0,
    );
  }

  /// Returns a realistic mock business for development/testing.
  factory BusinessModel.mock() {
    return const BusinessModel(
      id: 'mock-biz-001',
      name: 'AutoFix Vaughan',
      avatarUrl: null,
      isVerified: true,
      followerCount: 1240,
      followingCount: 89,
      postCount: 47,
      bio: 'Full-service auto repair shop serving Vaughan since 2012. '
          'Specializing in diagnostics, oil changes, brake repair, and winter prep.',
      category: 'Auto Repair & Service',
      rating: 4.9,
      reviewCount: 184,
    );
  }
}
