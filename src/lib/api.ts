import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

import { API_BASE_URL } from "./config";
import { authStore } from "./auth";

export const api = axios.create({
  baseURL: API_BASE_URL,
  // Without a timeout a slow/hung response (busy server, stalled refresh) leaves every query
  // pending forever → the UI is stuck on a loading spinner until a manual logout. Fail fast
  // instead: a rejected request surfaces an error (or triggers the 401→refresh→login path).
  timeout: 20_000,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = authStore.getAccessToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  config.headers.set("ngrok-skip-browser-warning", "true");
  return config;
});

type RetriableConfig = AxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const refreshToken = authStore.getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken },
      {
        // A hung refresh must not block every queued 401 retry indefinitely.
        timeout: 15_000,
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
      },
    );
    const data = res.data as { accessToken: string; refreshToken: string };
    if (!data?.accessToken) return null;
    authStore.setTokens(data.accessToken, data.refreshToken ?? refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    if (status === 401 && original && !original._retry) {
      original._retry = true;
      if (!refreshPromise) refreshPromise = performRefresh();
      const newToken = await refreshPromise;
      refreshPromise = null;

      if (newToken) {
        original.headers = {
          ...(original.headers ?? {}),
          Authorization: `Bearer ${newToken}`,
        };
        return api.request(original);
      }

      authStore.clear();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }
    return Promise.reject(error);
  },
);

// Uzbek fallbacks by HTTP status, used when the server sent no readable detail (so users never
// see axios's English "Request failed with status code NNN").
const STATUS_UZ: Record<number, string> = {
  400: "So'rov noto'g'ri.",
  401: "Sessiya tugadi — qayta kiring.",
  403: "Ruxsat yo'q.",
  404: "Topilmadi.",
  409: "Ziddiyat: bu ma'lumot allaqachon mavjud.",
  422: "Ma'lumotlar noto'g'ri to'ldirilgan.",
  500: "Serverda xatolik yuz berdi.",
  502: "Server javob bermayapti — birozdan so'ng urinib ko'ring.",
  503: "Xizmat vaqtincha ishlamayapti.",
};

export function extractApiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { detail?: string; title?: string; message?: string }
      | undefined;
    const detail = data?.detail || data?.message || data?.title;
    if (detail) return detail;
    const status = err.response?.status;
    if (status && STATUS_UZ[status]) return STATUS_UZ[status];
    if (err.code === "ERR_NETWORK") return "Internetga ulanishda muammo.";
    return "Noma'lum xatolik yuz berdi.";
  }
  if (err instanceof Error && err.message) return err.message;
  return "Noma'lum xatolik yuz berdi.";
}