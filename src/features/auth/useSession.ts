import { useSyncExternalStore } from "react";

import { authStore } from "@/lib/auth";
import type { Organization, User } from "@/lib/types";

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener("ss-auth-change", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("ss-auth-change", handler);
    window.removeEventListener("storage", handler);
  };
}

function getSnapshot(): string {
  if (typeof window === "undefined") return "ssr";
  return (
    (localStorage.getItem("ss_access_token") ?? "") +
    "|" +
    (localStorage.getItem("ss_user") ?? "")
  );
}

function getServerSnapshot(): string {
  return "ssr";
}

export function useSession(): {
  isAuthenticated: boolean;
  user: User | null;
  organization: Organization | null;
} {
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    isAuthenticated: authStore.isAuthenticated(),
    user: authStore.getUser(),
    organization: authStore.getOrganization(),
  };
}