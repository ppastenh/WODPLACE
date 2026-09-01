/**
 * Origin of the box-admin dashboard, shown inside a WebView from the admin
 * screen. Set `EXPO_PUBLIC_DASHBOARD_URL` to the full origin, e.g.
 * `http://192.168.1.87:5002` for LAN testing from a phone, or the public
 * dashboard URL once it's deployed. Changing that env var is the only thing
 * needed to repoint it — no code change.
 *
 * Falls back to `EXPO_PUBLIC_API_URL`'s host on port 5002 is intentionally
 * NOT done: the dashboard and the API can live on different hosts, so the
 * dashboard URL must be configured explicitly.
 */
export function resolveDashboardUrl(): string | null {
  const raw = process.env.EXPO_PUBLIC_DASHBOARD_URL;
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}
