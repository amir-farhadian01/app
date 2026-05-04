/// Optional arguments when opening [AuthScreen] from a gated Explorer action.
class AuthRouteArgs {
  const AuthRouteArgs({
    this.resumeAfterAuth = false,
    this.returnToPath,
    this.postId,
  });

  /// When true, successful login/register pops back to the previous route
  /// instead of resetting the stack to `/dashboard`.
  final bool resumeAfterAuth;

  /// Optional fallback route when auth cannot pop back.
  final String? returnToPath;

  /// Optional post hint used for resume flows in Explorer.
  final String? postId;
}
