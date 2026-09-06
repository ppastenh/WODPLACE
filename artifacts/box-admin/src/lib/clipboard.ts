import { isInsideAppWebView, postToNative } from "./rnBridge";

/**
 * `navigator.clipboard.writeText` is unreliable inside the app's WebView
 * (neither WKWebView nor Android's embedded WebView implement the Clipboard
 * API consistently there, even on a real tap) even though it works fine in a
 * normal browser. When box-admin is opened from the app we instead post a
 * message and let the native side — which has guaranteed system clipboard
 * access — do the copy. Keep the message `type` in sync with
 * `handleWebViewMessage()` in the app's `app/admin-dashboard.tsx`.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (isInsideAppWebView()) {
    postToNative({ type: "copy-to-clipboard", text });
    return true;
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fall through to the legacy execCommand path below.
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
