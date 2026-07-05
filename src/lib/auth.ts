import type { AuthResponse, Organization, User } from "./types";

const ACCESS = "ss_access_token";
const REFRESH = "ss_refresh_token";
const USER = "ss_user";
const ORG = "ss_org";

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export const authStore = {
  getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACCESS);
  },
  getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH);
  },
  getUser(): User | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(USER);
    return raw ? safe(() => JSON.parse(raw) as User, null) : null;
  },
  getOrganization(): Organization | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(ORG);
    return raw ? safe(() => JSON.parse(raw) as Organization, null) : null;
  },
  setSession(data: AuthResponse) {
    localStorage.setItem(ACCESS, data.accessToken);
    localStorage.setItem(REFRESH, data.refreshToken);
    if (data.user) localStorage.setItem(USER, JSON.stringify(data.user));
    if (data.organization) localStorage.setItem(ORG, JSON.stringify(data.organization));
    window.dispatchEvent(new Event("ss-auth-change"));
  },
  setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem(ACCESS, accessToken);
    localStorage.setItem(REFRESH, refreshToken);
  },
  clear() {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
    localStorage.removeItem(USER);
    localStorage.removeItem(ORG);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("ss-auth-change"));
    }
  },
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  },
};