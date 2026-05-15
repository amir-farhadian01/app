import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../theme/app_theme.dart';

class AppAvatar extends StatelessWidget {
  final String imageUrl;
  final double radius;
  final Widget? badge;
  final bool isActive;

  const AppAvatar({
    super.key,
    required this.imageUrl,
    this.radius = 20,
    this.badge,
    this.isActive = false,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        CircleAvatar(
          radius: radius,
          backgroundColor: AppColors.divider,
          backgroundImage: CachedNetworkImageProvider(imageUrl),
          child: ClipOval(
            child: CachedNetworkImage(
              imageUrl: imageUrl,
              width: radius * 2,
              height: radius * 2,
              fit: BoxFit.cover,
              placeholder: (_, __) => Icon(
                Icons.person,
                size: radius,
                color: AppColors.textMuted,
              ),
              errorWidget: (_, __, ___) => Icon(
                Icons.person,
                size: radius,
                color: AppColors.textMuted,
              ),
            ),
          ),
        ),
        if (badge != null)
          Positioned(
            bottom: -2,
            right: -2,
            child: badge!,
          ),
        if (isActive)
          Positioned(
            bottom: 0,
            right: 0,
            child: Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                color: AppColors.success,
                shape: BoxShape.circle,
                border: Border.all(
                  color: Theme.of(context).scaffoldBackgroundColor,
                  width: 2,
                ),
              ),
            ),
          ),
      ],
    );
  }
}
