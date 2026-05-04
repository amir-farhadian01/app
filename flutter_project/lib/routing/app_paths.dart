/// Browser path may be `/flutter/...` when served behind Traefik with `--base-href /flutter/`.
String stripFlutterBase(String raw) {
  var p = raw;
  if (p.length > 1 && p.endsWith('/')) {
    p = p.substring(0, p.length - 1);
  }
  if (p.startsWith('/flutter/')) {
    return p.substring('/flutter'.length);
  }
  if (p == '/flutter') {
    return '/';
  }
  if (p.isEmpty) {
    return '/';
  }
  return p;
}
