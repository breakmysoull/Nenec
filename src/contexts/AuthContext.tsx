import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  authLoading: boolean;
  authError: Error | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  authLoading: true,
  authError: null,
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    const safetyTimeout = setTimeout(() => {
      if (!cancelled && authLoading) {
        setAuthLoading(false);
      }
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, 
      (currentUser) => {
        if (!cancelled) {
          setUser(currentUser);
          setAuthLoading(false);
        }
      },
      (error) => {
        if (!cancelled) {
          console.error("AuthContext: Error getting session:", error);
          setAuthError(error);
          setAuthLoading(false);
        }
      }
    );

    return () => {
      cancelled = true;
      clearTimeout(safetyTimeout);
      unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error: any) {
      setAuthError(error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, authLoading, authError, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
};
