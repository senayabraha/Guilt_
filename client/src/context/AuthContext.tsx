import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import type { User, UserRole } from "../types";
import { supabase } from "../lib/supabase";
import { getProfile } from "../lib/db/profiles";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, redirectTo?: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    role?: UserRole,
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    try {
      const profile = await getProfile(userId);
      setUser(profile);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data.session?.user) {
          return loadProfile(data.session.user.id);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (
    email: string,
    password: string,
    redirectTo: string = "/",
  ) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.user) await loadProfile(data.user.id);
    toast.success("Login successful");
    navigate(redirectTo.startsWith("/") ? redirectTo : "/", { replace: true });
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: UserRole = "CUSTOMER",
  ) => {
    // Public registration may only create CUSTOMER or VENDOR accounts.
    const safeRole: UserRole = role === "VENDOR" ? "VENDOR" : "CUSTOMER";
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password,
      options: { data: { name, role: safeRole } },
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      toast.success("Check your email to confirm your account");
      return;
    }
    toast.success("Registration successful");
    navigate("/");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const updateUser = (userData: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...userData } : prev));
  };

  const refreshProfile = async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (authUser) await loadProfile(authUser.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateUser,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
