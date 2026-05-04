import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:video_player/video_player.dart';

/// Single Explorer feed cell: media + Instagram-style action row (like, comment, order, send, save).
class ExplorerFeedPostCard extends StatelessWidget {
  const ExplorerFeedPostCard({
    super.key,
    required this.post,
    required this.isSaved,
    required this.isLiked,
    required this.onLikeTap,
    required this.onCommentTap,
    required this.onOrderTap,
    required this.onSaveTap,
    required this.onProviderTap,
    required this.onMoreTap,
    required this.formatCount,
  });

  final Map<String, dynamic> post;
  final bool isSaved;
  final bool isLiked;
  final VoidCallback onLikeTap;
  final VoidCallback onCommentTap;
  final VoidCallback onOrderTap;
  final VoidCallback onSaveTap;
  final VoidCallback onProviderTap;
  final VoidCallback onMoreTap;
  final String Function(int n) formatCount;

  static String _providerName(Map<String, dynamic> post) {
    final p = post['provider'];
    if (p is Map && p['displayName'] != null) return p['displayName'].toString();
    return 'Provider';
  }

  static String? _avatarUrl(Map<String, dynamic> post) {
    final p = post['provider'];
    if (p is! Map) return null;
    final u = p['avatarUrl']?.toString();
    if (u == null || u.isEmpty) return null;
    return u;
  }

  static String _imageUrl(Map<String, dynamic> post) {
    final u = post['imageUrl']?.toString();
    return u ?? '';
  }

  static int _i(Map<String, dynamic> m, String k) {
    final v = m[k];
    if (v is int) return v;
    if (v is num) return v.toInt();
    return int.tryParse('$v') ?? 0;
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final name = _providerName(post);
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';
    final likes = _i(post, 'likeCount');
    final comments = _i(post, 'commentCount');
    final orders = _i(post, 'orderCount');
    final shares = _i(post, 'shareCount');
    final caption = post['caption']?.toString() ?? '';
    final created = post['createdAt']?.toString();
    final timeLabel = _relativeTime(created);

    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: cs.surface,
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: cs.outline.withValues(alpha: isDark ? 0.35 : 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(10, 10, 6, 8),
            child: Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: onProviderTap,
                    borderRadius: BorderRadius.circular(10),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 18,
                            backgroundColor: cs.surfaceContainerHighest,
                            backgroundImage: _avatarUrl(post) != null ? NetworkImage(_avatarUrl(post)!) : null,
                            child: _avatarUrl(post) == null
                                ? Text(initial, style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w800, fontSize: 14))
                                : null,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                letterSpacing: -0.2,
                                color: cs.onSurface,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                IconButton(
                  icon: Icon(LucideIcons.moreHorizontal, size: 22, color: cs.onSurface),
                  onPressed: onMoreTap,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
                ),
              ],
            ),
          ),
          ClipRect(
            child: AspectRatio(
              aspectRatio: 1,
              child: _PostMedia(url: _imageUrl(post), cs: cs),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 8, 8, 4),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Wrap(
                    spacing: 14,
                    runSpacing: 6,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      _ActionCount(
                        icon: LucideIcons.heart,
                        iconColor: isLiked ? const Color(0xFFE11D48) : cs.onSurface,
                        count: likes,
                        format: formatCount,
                        onTap: onLikeTap,
                        cs: cs,
                      ),
                      _ActionCount(
                        icon: LucideIcons.messageCircle,
                        iconColor: cs.onSurface,
                        count: comments,
                        format: formatCount,
                        onTap: onCommentTap,
                        cs: cs,
                      ),
                      _ActionCount(
                        icon: LucideIcons.clipboardList,
                        iconColor: cs.onSurface,
                        count: orders,
                        format: formatCount,
                        onTap: onOrderTap,
                        cs: cs,
                      ),
                      _ActionCount(
                        icon: LucideIcons.send,
                        iconColor: cs.onSurface,
                        count: shares,
                        format: formatCount,
                        onTap: () => _sharePost(context, post),
                        cs: cs,
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: Icon(
                    isSaved ? Icons.bookmark : Icons.bookmark_border,
                    size: 26,
                    color: cs.onSurface,
                  ),
                  onPressed: onSaveTap,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
                ),
              ],
            ),
          ),
          if (caption.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 4),
              child: RichText(
                text: TextSpan(
                  style: GoogleFonts.plusJakartaSans(fontSize: 14, height: 1.35, color: cs.onSurface),
                  children: [
                    TextSpan(text: '$name ', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w800)),
                    TextSpan(text: caption, style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w500)),
                  ],
                ),
              ),
            ),
          if (timeLabel.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: Text(
                timeLabel,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  color: cs.onSurface.withValues(alpha: 0.55),
                  letterSpacing: 0.1,
                ),
              ),
            ),
        ],
      ),
    );
  }

  static String _relativeTime(String? iso) {
    if (iso == null || iso.isEmpty) return '';
    final t = DateTime.tryParse(iso);
    if (t == null) return '';
    final d = DateTime.now().difference(t);
    if (d.inMinutes < 1) return 'Just now';
    if (d.inMinutes < 60) return '${d.inMinutes}m ago';
    if (d.inHours < 24) return '${d.inHours}h ago';
    if (d.inDays < 7) return '${d.inDays}d ago';
    return '${(d.inDays / 7).floor()}w ago';
  }

  static void _sharePost(BuildContext context, Map<String, dynamic> post) {
    final id = post['id']?.toString() ?? '';
    final link = '${Uri.base.origin}/services?post=$id';
    Clipboard.setData(ClipboardData(text: link));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Link copied', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w600))),
    );
  }
}

class _PostMedia extends StatelessWidget {
  const _PostMedia({required this.url, required this.cs});

  final String url;
  final ColorScheme cs;

  @override
  Widget build(BuildContext context) {
    if (url.isEmpty) {
      return ColoredBox(
        color: cs.surfaceContainerHighest,
        child: Icon(LucideIcons.image, size: 48, color: cs.onSurface.withValues(alpha: 0.35)),
      );
    }
    if (_looksLikeVideo(url)) {
      return _VideoPostMedia(url: url, cs: cs);
    }
    return Image.network(
      url,
      fit: BoxFit.cover,
      width: double.infinity,
      errorBuilder: (_, __, ___) => ColoredBox(
        color: cs.surfaceContainerHighest,
        child: Icon(LucideIcons.imageOff, size: 48, color: cs.onSurface.withValues(alpha: 0.35)),
      ),
    );
  }

  bool _looksLikeVideo(String value) {
    final uri = Uri.tryParse(value);
    final rawPath = (uri?.path ?? value).toLowerCase();
    return rawPath.endsWith('.mp4') ||
        rawPath.endsWith('.mov') ||
        rawPath.endsWith('.webm') ||
        rawPath.endsWith('.m3u8');
  }
}

class _VideoPostMedia extends StatefulWidget {
  const _VideoPostMedia({required this.url, required this.cs});

  final String url;
  final ColorScheme cs;

  @override
  State<_VideoPostMedia> createState() => _VideoPostMediaState();
}

class _VideoPostMediaState extends State<_VideoPostMedia> {
  VideoPlayerController? _controller;
  Future<void>? _initializeFuture;

  @override
  void initState() {
    super.initState();
    _createController();
  }

  @override
  void didUpdateWidget(covariant _VideoPostMedia oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.url != widget.url) {
      _disposeController();
      _createController();
    }
  }

  void _createController() {
    final parsed = Uri.tryParse(widget.url);
    if (parsed == null) return;
    final controller = VideoPlayerController.networkUrl(parsed);
    _controller = controller;
    _initializeFuture = controller.initialize().then((_) {
      if (!mounted) return;
      controller
        ..setLooping(true)
        ..setVolume(0)
        ..play();
      setState(() {});
    }).catchError((_) {
      if (mounted) setState(() {});
    });
  }

  void _disposeController() {
    final c = _controller;
    _controller = null;
    _initializeFuture = null;
    c?.dispose();
  }

  @override
  void dispose() {
    _disposeController();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    if (controller == null || _initializeFuture == null) {
      return _fallback();
    }
    return FutureBuilder<void>(
      future: _initializeFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.done && controller.value.isInitialized) {
          final size = controller.value.size;
          if (size.width <= 0 || size.height <= 0) {
            return _fallback();
          }
          return ClipRect(
            child: FittedBox(
              fit: BoxFit.cover,
              clipBehavior: Clip.hardEdge,
              child: SizedBox(
                width: size.width,
                height: size.height,
                child: VideoPlayer(controller),
              ),
            ),
          );
        }
        if (snapshot.hasError) return _fallback();
        return ColoredBox(
          color: widget.cs.surfaceContainerHighest,
          child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
        );
      },
    );
  }

  Widget _fallback() {
    return ColoredBox(
      color: widget.cs.surfaceContainerHighest,
      child: Icon(LucideIcons.videoOff, size: 48, color: widget.cs.onSurface.withValues(alpha: 0.35)),
    );
  }
}

class _ActionCount extends StatelessWidget {
  const _ActionCount({
    required this.icon,
    required this.iconColor,
    required this.count,
    required this.format,
    required this.onTap,
    required this.cs,
  });

  final IconData icon;
  final Color iconColor;
  final int count;
  final String Function(int n) format;
  final VoidCallback onTap;
  final ColorScheme cs;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 4),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 26,
              color: iconColor,
            ),
            const SizedBox(width: 5),
            Text(
              format(count),
              style: GoogleFonts.plusJakartaSans(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.15,
                color: cs.onSurface,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
