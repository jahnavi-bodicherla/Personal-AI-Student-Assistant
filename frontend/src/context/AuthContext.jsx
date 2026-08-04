import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  fetchCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
} from "../services/authService";
import { clearTokens, getStoredTokens, storeTokens } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // true while we check for an existing session

  // On first load, if tokens exist, try to hydrate the user from /me.
  useEffect(() => {
    const bootstrap = async () => {
      const tokens = getStoredTokens();
      if (!tokens?.access_token) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await fetchCurrentUser();
        setUser(me);
      } catch {
        clearTokens();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    bootstrap();
  }, []);

  const register = useCallback(async (payload) => {
    const { user: newUser, tokens } = await registerUser(payload);
    storeTokens(tokens);
    setUser(newUser);
    return newUser;
  }, []);

  const login = useCallback(async (payload) => {
    const { user: loggedInUser, tokens } = await loginUser(payload);
    storeTokens(tokens);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch {
      // Even if the server call fails (e.g. token already expired), clear locally.
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  const refreshCurrentUser = useCallback(async () => {
    const me = await fetchCurrentUser();
    setUser(me);
    return me;
  }, []);

  const value = {
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    register,
    login,
    logout,
    refreshCurrentUser,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
