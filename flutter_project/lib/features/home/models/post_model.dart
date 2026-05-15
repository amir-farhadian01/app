/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Home Feed Post Model — for the Home screen social feed
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
///
/// Backend shape (GET /api/feed):
/// {
///   "data": [{
///     "id": "string",
///     "caption": "string?",
///     "mediaUrl": "string?",
///     "thumbnailUrl": "string?",
///     "type": "TEXT|PHOTO|VIDEO",
///     "createdAt": "ISO8601",
///     "author": { "id": "string", "displayName": "string", "avatarUrl": "string?" },
///     "reactions": [{ "id": "string", "type": "like", "userId": "string" }],
///     "comments": [{ ... }],
///     "_count": { "reactions": int, "comments": int }
///   }],
///   "total": int,
///   "page": int,
///   "pageSize": int
/// }
///
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class PostModel {
  final String id;
  final String authorName;
  final String? authorAvatarUrl;
  final String content;
  final String? imageUrl;
  final int likes;
  final int comments;
  final DateTime createdAt;
  final bool isLiked;

  const PostModel({
    required this.id,
    required this.authorName,
    this.authorAvatarUrl,
    required this.content,
    this.imageUrl,
    required this.likes,
    required this.comments,
    required this.createdAt,
    this.isLiked = false,
  });

  factory PostModel.fromJson(Map<String, dynamic> json) {
    // Extract author info
    final author = json['author'] as Map<String, dynamic>?;
    final authorName = author?['displayName'] as String? ?? 'Unknown';
    final authorAvatarUrl = author?['avatarUrl'] as String?;

    // Extract content — backend uses 'caption' field
    final content = json['caption'] as String? ?? '';

    // Extract image
    final imageUrl =
        json['mediaUrl'] as String? ?? json['thumbnailUrl'] as String?;

    // Extract counts from _count object
    final counts = json['_count'] as Map<String, dynamic>?;
    final likes = counts?['reactions'] as int? ?? 0;
    final comments = counts?['comments'] as int? ?? 0;

    // Parse createdAt
    DateTime createdAt;
    try {
      createdAt = DateTime.parse(json['createdAt'] as String);
    } catch (_) {
      createdAt = DateTime.now();
    }

    // Check if current user has liked
    bool isLiked = false;
    final reactions = json['reactions'] as List<dynamic>?;
    if (reactions != null) {
      for (final r in reactions) {
        if (r is Map<String, dynamic> && r['type'] == 'like') {
          isLiked = true;
          break;
        }
      }
    }

    return PostModel(
      id: json['id'] as String? ?? '',
      authorName: authorName,
      authorAvatarUrl: authorAvatarUrl,
      content: content,
      imageUrl: imageUrl,
      likes: likes,
      comments: comments,
      createdAt: createdAt,
      isLiked: isLiked,
    );
  }

  /// Returns a copy with updated [isLiked] and [likes] count.
  PostModel copyWith({
    bool? isLiked,
    int? likes,
  }) {
    return PostModel(
      id: id,
      authorName: authorName,
      authorAvatarUrl: authorAvatarUrl,
      content: content,
      imageUrl: imageUrl,
      likes: likes ?? this.likes,
      comments: comments,
      createdAt: createdAt,
      isLiked: isLiked ?? this.isLiked,
    );
  }

  /// Human-readable relative time string.
  String get relativeTime {
    final diff = DateTime.now().difference(createdAt);

    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';

    final months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    final day = createdAt.day.toString().padLeft(2, '0');
    final month = months[createdAt.month - 1];
    return '$day $month';
  }
}
