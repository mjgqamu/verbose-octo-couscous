// SitePilot AI — Auth State Management
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { UserRole } from "@sitepilot/shared";
import { api, setAccessToken, setTokenRefreshCallback } from "./api";

// ---- Types ----
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  orgId: string;
  orgName: string | null;
  permissions?: string[];
  emailVerified?: boolean;
  isActive?: boolean;
}

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (params: RegisterParams) => Promise<AuthResult>;
  logout: () => Promise<void>;
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

interface AuthResult {
  success: boolean;
  error?: string;
}

interface RegisterParams {
  orgName: string;
  ownerName: string;
  email: string;
  password: string;
}

interface LoginResponse {
  accessToken: string;
  user: UserProfile;
}

// ---- Context ----
const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Attempt to restore session on mount via /me endpoint
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        // First, try to refresh token if we have a cookie
        const refreshRes = await api.post<{ accessToken: string; user: UserProfile }>(
          "/api/v1/auth/refresh",
        );

        if (refreshRes.data?.accessToken) {
          setAccessToken(refreshRes.data.accessToken);
          if (!cancelled) {
            setUser(refreshRes.data.user);
          }
          return;
        }
      } catch {
        // No refresh token cookie or refresh failed — try /me with any lingering cookie
      }

      // Try /me directly (in case the cookie is still valid from a previous session)
      try {
        const meRes = await api.get<{ user: UserProfile }>("/api/v1/auth/me");
        if (meRes.data?.user && !cancelled) {
          setUser(meRes.data.user);
          return;
        }
      } catch {
        // Not authenticated
      }

      if (!cancelled) {
        setUser(null);
      }
    }

    restoreSession().finally(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Set up token refresh callback for the API client
  useEffect(() => {
    setTokenRefreshCallback(async () => {
      try {
        const res = await api.post<{ accessToken: string; user: UserProfile }>(
          "/api/v1/auth/refresh",
        );
        if (res.data?.accessToken) {
          setAccessToken(res.data.accessToken);
          if (res.data.user) setUser(res.data.user);
          return res.data.accessToken;
        }
        return null;
      } catch {
        // Refresh failed — clear state
        setAccessToken(null);
        setUser(null);
        return null;
      }
    });
  }, []);

  const loginFn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const res = await api.post<LoginResponse>("/api/v1/auth/login", { email, password });

    if (res.error) {
      return { success: false, error: res.error.message };
    }

    if (res.data) {
      setAccessToken(res.data.accessToken);
      setUser(res.data.user);
      return { success: true };
    }

    return { success: false, error: "Login failed" };
  }, []);

  const registerFn = useCallback(async (params: RegisterParams): Promise<AuthResult> => {
    const res = await api.post<LoginResponse>("/api/v1/auth/register", params);

    if (res.error) {
      return { success: false, error: res.error.message };
    }

    if (res.data) {
      setAccessToken(res.data.accessToken);
      setUser(res.data.user);
      return { success: true };
    }

    return { success: false, error: "Registration failed" };
  }, []);

  const logoutFn = useCallback(async () => {
    try {
      await api.post("/api/v1/auth/logout");
    } catch {
      // Even if the request fails, clear local state
    }

    setAccessToken(null);
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (role: UserRole | UserRole[]): boolean => {
      if (!user) return false;
      const roles = Array.isArray(role) ? role : [role];
      return roles.includes(user.role);
    },
    [user],
  );

  const value: AuthState = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login: loginFn,
    register: registerFn,
    logout: logoutFn,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
