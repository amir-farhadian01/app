import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';

class RatingBar extends StatelessWidget {
  final double rating;
  final int count;
  final double size;

  const RatingBar({
    super.key,
    required this.rating,
    this.count = 0,
    this.size = 14,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Row(
      children: [
        ...List.generate(5, (i) {
          final starValue = i + 1;
          IconData icon;
          if (rating >= starValue) {
            icon = Icons.star;
          } else if (rating >= starValue - 0.5) {
            icon = Icons.star_half;
          } else {
            icon = Icons.star_border;
          }
          return Icon(
            icon,
            size: size,
            color: AppColors.accent,
          );
        }),
        if (count > 0) ...[
          const SizedBox(width: 4),
          Text(
            '($count)',
            style: GoogleFonts.plusJakartaSans(
              fontSize: size - 2,
              fontWeight: FontWeight.w400,
              color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
            ),
          ),
        ],
      ],
    );
  }
}
