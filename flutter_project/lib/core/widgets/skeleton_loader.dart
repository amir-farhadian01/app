/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Skeleton Loader — Animated shimmer placeholders
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import 'package:flutter/material.dart';

/// A single animated shimmer box.
class SkeletonBox extends StatefulWidget {
  final double width;
  final double height;
  final double borderRadius;

  const SkeletonBox({
    super.key,
    required this.width,
    required this.height,
    this.borderRadius = 8,
  });

  @override
  State<SkeletonBox> createState() => _SkeletonBoxState();
}

class _SkeletonBoxState extends State<SkeletonBox>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);
    _animation = Tween<double>(begin: 0.4, end: 0.8).animate(_controller);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            color: Colors.grey.withValues(alpha: _animation.value),
            borderRadius: BorderRadius.circular(widget.borderRadius),
          ),
        );
      },
    );
  }
}

/// Mimics the ServiceCard layout: image block + 3 text lines.
class ServiceCardSkeleton extends StatelessWidget {
  const ServiceCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 180,
      decoration: BoxDecoration(
        color: Theme.of(context).brightness == Brightness.dark
            ? const Color(0xFF1E1E1E)
            : Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Image placeholder
          const SkeletonBox(
            width: 180,
            height: 80,
            borderRadius: 0,
          ),
          // Content padding
          const Padding(
            padding: EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Title line
                SkeletonBox(width: 120, height: 14, borderRadius: 4),
                SizedBox(height: 8),
                // Provider line
                SkeletonBox(width: 80, height: 10, borderRadius: 4),
                SizedBox(height: 8),
                // Price line
                SkeletonBox(width: 60, height: 14, borderRadius: 4),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Mimics the PostCard layout: avatar + 2 text lines + image + action row.
class PostCardSkeleton extends StatelessWidget {
  const PostCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).brightness == Brightness.dark
            ? const Color(0xFF1E1E1E)
            : Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: avatar + name + time
          const Row(
            children: [
              SkeletonBox(width: 40, height: 40, borderRadius: 20),
              SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SkeletonBox(width: 100, height: 12, borderRadius: 4),
                    SizedBox(height: 4),
                    SkeletonBox(width: 60, height: 10, borderRadius: 4),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Content lines
          const SkeletonBox(width: double.infinity, height: 10, borderRadius: 4),
          const SizedBox(height: 4),
          const SkeletonBox(width: 150, height: 10, borderRadius: 4),
          const SizedBox(height: 12),
          // Image placeholder
          const SkeletonBox(
            width: double.infinity,
            height: 160,
            borderRadius: 8,
          ),
          const SizedBox(height: 12),
          // Action row
          const Row(
            children: [
              SkeletonBox(width: 40, height: 14, borderRadius: 4),
              SizedBox(width: 16),
              SkeletonBox(width: 40, height: 14, borderRadius: 4),
              SizedBox(width: 16),
              SkeletonBox(width: 40, height: 14, borderRadius: 4),
            ],
          ),
        ],
      ),
    );
  }
}
