/**
 * Detects and talks to the app's WebView bridge. `react-native-webview`
 * injects `window.ReactNativeWebView` into every page it loads (nothing to
 * opt into on our side); box-admin is also opened directly in a normal
 * browser (desktop admins), where this is undefined.
 *
 * Message contracts, kept in sync with the native side
 * (`app/admin-dashboard.tsx`'s `handleWebViewMessage`):
 *   - `{ type: "copy-to-clipboard", text: string }` — see clipboard.ts.
 *   - `{ type: "admin-alerts-count", count: number }` — see NotificationsBell.tsx.
 *   - `{ type: "open-member-profile", userId: string, name: string }` — see
 *     members.tsx's "Ver perfil": inside the app, hand off to the native
 *     public profile screen instead of box-admin's own page.
 *
 * The native → web direction (opening the notifications drawer from the
 * native bell) has no message channel; the native side calls
 * `injectJavaScript` to invoke `window.__wodplaceOpenNotifications`
 * directly, which `NotificationsBell.tsx` registers.
 */

type RNWebViewBridge = { postMessage: (message: string) => void };

export function getRNBridge(): RNWebViewBridge | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { ReactNativeWebView?: RNWebViewBridge }).ReactNativeWebView;
}

export function isInsideAppWebView(): boolean {
  return !!getRNBridge();
}

/** Fire-and-forget: no-ops outside the app's WebView. */
export function postToNative(message: unknown): void {
  getRNBridge()?.postMessage(JSON.stringify(message));
}
