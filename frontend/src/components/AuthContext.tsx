"use client";

import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { auth, googleAuthProvider } from "@/lib/firebase";

type AuthState = {
  user: User | null;
  idToken: string | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  getFreshToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  idToken: null,
  loading: true,
  loginWithGoogle: async () => {},
  logout: async () => {},
  getFreshToken: async () => null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        try {
          const token = await nextUser.getIdToken();
          setIdToken(token);
        } catch {
          setIdToken(null);
        }
      } else {
        setIdToken(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  async function loginWithGoogle() {
    const cred = await signInWithPopup(auth, googleAuthProvider);
    const token = await cred.user.getIdToken();
    setIdToken(token);
  }

  async function logout() {
    await signOut(auth);
    setIdToken(null);
  }

  async function getFreshToken(): Promise<string | null> {
    if (!auth.currentUser) return idToken;
    try {
      const token = await auth.currentUser.getIdToken();
      setIdToken(token);
      return token;
    } catch {
      return idToken;
    }
  }

  return (
    <AuthContext.Provider value={{ user, idToken, loading, loginWithGoogle, logout, getFreshToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export function HeaderAuthStatus() {
  const { user, loading, loginWithGoogle, logout } = useAuth();
  const [busy, setBusy] = useState(false);

  if (loading) {
    return <span className="ml-auto font-mono text-xs text-muted">...</span>;
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={async () => {
          setBusy(true);
          try {
            await loginWithGoogle();
          } catch {
            // Popup closed by user
          } finally {
            setBusy(false);
          }
        }}
        disabled={busy}
        className="ml-auto rounded-lg border border-line bg-surface px-3 py-1.5 font-mono text-xs font-medium text-foreground transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-50"
      >
        {busy ? "Connexion..." : "Connexion Google"}
      </button>
    );
  }

  return (
    <div className="ml-auto flex items-center gap-2 text-xs">
      <span className="hidden max-w-[180px] truncate font-mono text-muted sm:inline">
        {user.email ?? user.displayName}
      </span>
      <button
        type="button"
        onClick={() => logout()}
        className="rounded-lg border border-line bg-surface px-2.5 py-1 font-mono text-[11px] text-muted transition-colors hover:border-danger/40 hover:text-danger"
      >
        Déconnexion
      </button>
    </div>
  );
}
