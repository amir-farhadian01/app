import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/app_theme.dart';
import '../core/models/post_model.dart';

/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// PostCard — Renders a single social feed post
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class PostCard extends StatefulWidget {
  final PostModel post;
  final VoidCallback onLike;

  const PostCard({
    super.key,
    required this.post,
    required this.onLike,
  });

  @override
  State<PostCard> createState() => _PostCardState();
}

class _PostCardState extends State<PostCard> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final post = widget.post;

    return Container(
      padding: const EdgeInsets.all(NeighborlySpacing.s16),
      decoration: BoxDecoration(
        color: NeighborlyColors.bgCard,
        borderRadius: BorderRadius.circular(NeighborlyRadius.lg),
        boxShadow: [
          BoxShadow(
            color: NeighborlyColors.textFaint.withValues(alpha: 0.15),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ── Header Row ──────────────────────────────────────────────
          _buildHeader(post),
          // ── Business Name Pill ──────────────────────────────────────
          if (post.businessName != null) ...[
            const SizedBox(height: NeighborlySpacing.s8),
            _buildBusinessPill(post.businessName!),
          ],
          const SizedBox(height: NeighborlySpacing.s8 + 4),
          // ── Content Text ────────────────────────────────────────────
          _buildContent(post),
          // ── Image ───────────────────────────────────────────────────
          if (post.imageUrl != null) ...[
            const SizedBox(height: NeighborlySpacing.s8 + 4),
            _buildImage(post.imageUrl!),
          ],
          const SizedBox(height: NeighborlySpacing.s8 + 4),
          // ── Action Row ──────────────────────────────────────────────
          _buildActionRow(post),
        ],
      ),
    );
  }

  Widget _buildHeader(PostModel post) {
    return Row(
      children: [
        // Avatar
        CircleAvatar(
          radius: 20,
          backgroundColor: NeighborlyColors.accent.withValues(alpha: 0.2),
          backgroundImage: post.authorAvatarUrl != null
              ? NetworkImage(post.authorAvatarUrl!)
              : null,
          child: post.authorAvatarUrl == null
              ? Text(
                  post.authorName.isNotEmpty
                      ? post.authorName[0].toUpperCase()
                      : '?',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: NeighborlyColors.accent,
                  ),
                )
              : null,
        ),
        const SizedBox(width: NeighborlySpacing.s8 + 4),
        // Name + time
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                post.authorName,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: NeighborlyColors.textPrimary,
                ),
              ),
              Text(
                post.relativeTime,
                style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: FontWeight.w400,
                  color: NeighborlyColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
        // More button
        const Icon(
          Icons.more_horiz,
          color: NeighborlyColors.textSecondary,
          size: 20,
        ),
      ],
    );
  }

  Widget _buildBusinessPill(String name) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [NeighborlyColors.accent, NeighborlyColors.accent],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
        borderRadius: BorderRadius.circular(NeighborlyRadius.xl),
      ),
      child: Text(
        name,
        style: GoogleFonts.inter(
          fontSize: 11,
          fontWeight: FontWeight.w500,
          color: Colors.white,
        ),
      ),
    );
  }

  Widget _buildContent(PostModel post) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          post.content,
          style: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: FontWeight.w400,
            color: NeighborlyColors.textPrimary,
            height: 1.4,
          ),
          maxLines: _expanded ? null : 3,
          overflow: _expanded ? null : TextOverflow.ellipsis,
        ),
        if (post.content.length > 120 && !_expanded)
          InkWell(
            onTap: () => setState(() => _expanded = true),
            child: Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                'See more',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: NeighborlyColors.accent,
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildImage(String imageUrl) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(NeighborlyRadius.md),
      child: AspectRatio(
        aspectRatio: 16 / 9,
        child: Image.network(
          imageUrl,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Container(
            color: NeighborlyColors.bgCard,
            child: const Center(
              child: Icon(
                Icons.broken_image_outlined,
                color: NeighborlyColors.textFaint,
              ),
            ),
          ),
          loadingBuilder: (_, child, progress) {
            if (progress == null) return child;
            return Container(
              color: NeighborlyColors.bgCard,
              child: const Center(
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildActionRow(PostModel post) {
    return Row(
      children: [
        // Like button
        GestureDetector(
          onTap: widget.onLike,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                post.isLiked ? Icons.favorite : Icons.favorite_outline,
                size: 16,
                color: post.isLiked
                    ? NeighborlyColors.accentTeal
                    : NeighborlyColors.textSecondary,
              ),
              const SizedBox(width: 4),
              Text(
                '${post.likes}',
                style: GoogleFonts.jetBrainsMono(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: post.isLiked
                      ? NeighborlyColors.accentTeal
                      : NeighborlyColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: NeighborlySpacing.s16),
        // Comment button
        GestureDetector(
          onTap: () {},
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.chat_bubble_outline,
                size: 16,
                color: NeighborlyColors.textSecondary,
              ),
              const SizedBox(width: 4),
              Text(
                '${post.comments}',
                style: GoogleFonts.jetBrainsMono(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: NeighborlyColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: NeighborlySpacing.s16),
        // Share button
        GestureDetector(
          onTap: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Share coming soon'),
                duration: Duration(seconds: 2),
              ),
            );
          },
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.share_outlined,
                size: 16,
                color: NeighborlyColors.textSecondary,
              ),
              const SizedBox(width: 4),
              Text(
                'Share',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: NeighborlyColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
