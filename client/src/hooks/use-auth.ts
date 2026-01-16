import { useState, useEffect, useCallback, useRef } from "react";

export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  activeRoleId: string | null;
  activeRoleName: string | null;
  isAdmin: boolean;
}

interface UseAuthReturn {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("token");
  });

  // Start with loading=true if there's a token to verify
  const [isLoading, setIsLoading] = useState(() => !!localStorage.getItem("token"));
  const hasVerified = useRef(false);

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const currentToken = localStorage.getItem("token");
    if (!currentToken) {
      setUser(null);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
      } else {
        logout();
      }
    } catch {
      console.error("Failed to refresh user");
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (hasVerified.current) return;
      hasVerified.current = true;

      const currentToken = localStorage.getItem("token");
      if (!currentToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          localStorage.setItem("user", JSON.stringify(data.user));
        } else {
          // Token invalid - clear auth state
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setToken(null);
          setUser(null);
        }
      } catch {
        console.error("Failed to verify token");
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "token") {
        setToken(e.newValue);
        if (!e.newValue) {
          setUser(null);
        }
      }
      if (e.key === "user") {
        if (e.newValue) {
          try {
            setUser(JSON.parse(e.newValue));
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !!token,
    isAdmin: user?.isAdmin ?? false,
    token,
    login,
    logout,
    refreshUser,
  };
}
