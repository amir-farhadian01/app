import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/app_theme.dart';

/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// BusinessAvatarChip — Avatar + name + follow badge for business row
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class BusinessAvatarChip extends StatelessWidget {
  final String name;
  final String? avatarUrl;
  final bool isFollowing;
  final VoidCallback onTap;

  const BusinessAvatarChip({
    super.key,
    required this.name,
    this.avatarUrl,
    required this.isFollowing,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Avatar with gradient ring
          Container(
            width: 60,
            height: 60,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                colors: [NeighborlyColors.accent, NeighborlyColors.accent],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            padding: const EdgeInsets.all(2),
            child: CircleAvatar(
              radius: 28,
              backgroundColor: NeighborlyColors.bgCard,
              backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl!) : null,
              child: avatarUrl == null
                  ? Text(
                      name.isNotEmpty ? name[0].toUpperCase() : '?',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        color: NeighborlyColors.accent,
                      ),
                    )
                  : null,
            ),
          ),
          const SizedBox(height: 6),
          // Name
          Text(
            name,
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.w500,
              color: NeighborlyColors.textSecondary,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 4),
          // Follow badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              gradient: isFollowing
                  ? const LinearGradient(
                      colors: [NeighborlyColors.success, Color(0xFF5DD69B)],
                      begin: Alignment.centerLeft,
                      end: Alignment.centerRight,
                    )
                  : const LinearGradient(
                      colors: [NeighborlyColors.accent, NeighborlyColors.accent],
                      begin: Alignment.centerLeft,
                      end: Alignment.centerRight,
                    ),
              borderRadius: BorderRadius.circular(NeighborlyRadius.xl),
            ),
            child: Text(
              isFollowing ? 'Following' : 'Follow',
              style: GoogleFonts.inter(
                fontSize: 9,
                fontWeight: FontWeight.w600,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
