import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';

enum AppButtonVariant { primary, outline, ghost }

class AppButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final double? width;
  final IconData? icon;

  const AppButton({
    super.key,
    required this.label,
    this.onPressed,
    this.variant = AppButtonVariant.primary,
    this.width,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    switch (variant) {
      case AppButtonVariant.primary:
        return SizedBox(
          width: width ?? double.infinity,
          height: 48,
          child: ElevatedButton(
            onPressed: onPressed,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.accent,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppRadius.button),
              ),
              textStyle: GoogleFonts.plusJakartaSans(
                fontSize: 16, fontWeight: FontWeight.w600,
              ),
            ),
            child: icon != null
                ? Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(icon, size: 20),
                      const SizedBox(width: 8),
                      Text(label),
                    ],
                  )
                : Text(label),
          ),
        );
      case AppButtonVariant.outline:
        return SizedBox(
          width: width ?? double.infinity,
          height: 48,
          child: OutlinedButton(
            onPressed: onPressed,
            style: OutlinedButton.styleFrom(
              foregroundColor: isDark ? AppColors.primaryLight : AppColors.primary,
              side: BorderSide(color: isDark ? AppColors.primaryLight : AppColors.primary),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppRadius.button),
              ),
              textStyle: GoogleFonts.plusJakartaSans(
                fontSize: 16, fontWeight: FontWeight.w600,
              ),
            ),
            child: icon != null
                ? Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(icon, size: 20),
                      const SizedBox(width: 8),
                      Text(label),
                    ],
                  )
                : Text(label),
          ),
        );
      case AppButtonVariant.ghost:
        return TextButton(
          onPressed: onPressed,
          style: TextButton.styleFrom(
            foregroundColor: isDark ? AppColors.primaryLight : AppColors.primary,
            textStyle: GoogleFonts.plusJakartaSans(
              fontSize: 14, fontWeight: FontWeight.w600,
            ),
          ),
          child: Text(label),
        );
    }
  }
}
