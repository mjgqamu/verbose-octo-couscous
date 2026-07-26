// SitePilot AI — API Client
// Thin fetch wrapper with auto-auth headers and token refresh

const API_BASE = ""; // Same origin, proxied to API by Vite in dev

let accessToken: string | null = null;
let onTokenRefresh: (() => Promise<string | null>) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setTokenRefreshCallback(cb: () => Promise<string | null>) {
  onTokenRefresh = cb;
}

async function refreshTokenIfNeeded(response: Response): Promise<boolean> {
  if (response.status !== 401) return false;

  if (onTokenRefresh) {
    const newToken = await onTokenRefresh();
    return !!newToken;
  }
  return false;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T = unknown> {
  data: T | null;
  error: ApiError | null;
  status: number;
}

async function request<T = unknown>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // Send httpOnly cookies
  });

  // Try token refresh on 401
  if (response.status === 401 && retry) {
    const refreshed = await refreshTokenIfNeeded(response);
    if (refreshed) {
      return request<T>(path, options, false); // retry once
    }
  }

  // Parse JSON
  let body: T | null = null;
  let error: ApiError | null = null;

  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    const json = await response.json();

    if (response.ok) {
      body = json as T;
    } else {
      error = json?.error ?? {
        code: "UNKNOWN",
        message: `Request failed with status ${response.status}`,
      };
    }
  } else if (!response.ok) {
    error = {
      code: "HTTP_ERROR",
      message: `Request failed with status ${response.status}`,
    };
  }

  return { data: body, error, status: response.status };
}

// Convenience methods
export const api = {
  get<T = unknown>(path: string): Promise<ApiResponse<T>> {
    return request<T>(path);
  },
  post<T = unknown>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  put<T = unknown>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  patch<T = unknown>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  delete<T = unknown>(path: string): Promise<ApiResponse<T>> {
    return request<T>(path, { method: "DELETE" });
  },
};
