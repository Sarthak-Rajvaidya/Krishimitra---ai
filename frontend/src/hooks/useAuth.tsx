import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../services/api";
import type { User } from "../types";

interface Ctx { user: User | null; loading: boolean; login: (e: string, p: string) => Promise<User>; logout: () => Promise<void>; can: (perm: string) => boolean }
const AuthCtx = createContext<Ctx>(null as never);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get<User>("/auth/me").then(setUser).catch(() => setUser(null)).finally(() => setLoading(false)); }, []);
  const login = useCallback(async (email: string, password: string) => {
    const r = await api.post<{ user: User }>("/auth/login", { email, password }); setUser(r.user); return r.user;
  }, []);
  const logout = useCallback(async () => { await api.post("/auth/logout"); setUser(null); }, []);
  // UI convenience only: the API enforces every permission independently.
  const can = useCallback((p: string) => !!user?.permissions.includes(p), [user]);
  return <AuthCtx.Provider value={{ user, loading, login, logout, can }}>{children}</AuthCtx.Provider>;
}
