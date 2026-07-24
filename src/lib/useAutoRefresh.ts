import { useEffect } from "react";

import { getRefreshedToken, tokenExpMs } from "./api";
import { authStore } from "./auth";

// Refresh this many ms before the access token expires, so a request never races an expiry.
const SKEW_MS = 90_000;

// useAutoRefresh proactively renews the access token shortly before it expires. Without it the app
// relies on a 401 to trigger a refresh mid-request — the window where a stalled refresh left the UI
// stuck on a loading spinner (fixed by logout+relogin). Here the token is always fresh in advance.
export function useAutoRefresh() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const schedule = () => {
      if (timer) clearTimeout(timer);
      if (cancelled) return;
      const token = authStore.getAccessToken();
      const exp = token ? tokenExpMs(token) : null;
      if (!token || exp == null) return;
      const delay = Math.max(0, exp - Date.now() - SKEW_MS);
      timer = setTimeout(async () => {
        await getRefreshedToken();
        schedule(); // reschedule off the new token's expiry
      }, delay);
    };

    // Backgrounded tabs throttle timers; on refocus, refresh immediately if we're near expiry.
    const onFocus = () => {
      const token = authStore.getAccessToken();
      const exp = token ? tokenExpMs(token) : null;
      if (exp != null && exp - Date.now() < SKEW_MS) {
        void getRefreshedToken().then(schedule);
      }
    };

    schedule();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);
}
