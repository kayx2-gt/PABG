import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged, User, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../api/firebase';

// Add your specific admin Google emails here. 
// If this array is empty, anyone can log in.
const ALLOWED_ADMIN_EMAILS: string[] = [
  'appdevbsit@gmail.com',
  'kylematthewnnicor@gmail.com',
];

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithGoogle: async () => { },
  logout: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Check if user is allowed
      if (user && user.email && ALLOWED_ADMIN_EMAILS.length > 0 && !ALLOWED_ADMIN_EMAILS.includes(user.email)) {
        await signOut(auth);
        setUser(null);
      } else {
        setUser(user);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    try {
      const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      if (isMobile) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        const result = await signInWithPopup(auth, googleProvider);

        // Enforce allowlist immediately upon login
        if (ALLOWED_ADMIN_EMAILS.length > 0 && result.user.email && !ALLOWED_ADMIN_EMAILS.includes(result.user.email)) {
          await signOut(auth);
          throw new Error(`Unauthorized Account: ${result.user.email} is not an admin.`);
        }
      }
    } catch (error) {
      console.error("Google Login Error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
