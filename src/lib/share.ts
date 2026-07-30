export interface SharePayload {
  title: string;
  text: string;
  url?: string;
}

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

/**
 * Share via the Web Share API where available (native sheet on mobile), else
 * fall back to copying a text + URL blob to the clipboard. Returns what
 * actually happened so the UI can show the right confirmation.
 */
export async function shareOrCopy(payload: SharePayload): Promise<ShareResult> {
  const url = payload.url ?? window.location.href;

  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      await navigator.share({ title: payload.title, text: payload.text, url });
      return "shared";
    } catch (err) {
      // User dismissing the native sheet throws AbortError — not a failure.
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
      // Fall through to clipboard on any other error.
    }
  }

  const blob = `${payload.title}\n\n${payload.text}\n${url}`;
  try {
    await navigator.clipboard.writeText(blob);
    return "copied";
  } catch {
    return "failed";
  }
}
