import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Alert } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../api/firebase';
import { fetchUserProfile } from '../api/api';

const ALLOWED_ADMIN_EMAILS: string[] = [
  'appdevbsit@gmail.com',
  'kylematthewnnicor@gmail.com',
];

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  isAdmin: false,
  setIsAdmin: () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Configure Google Sign-In globally on app boot
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      offlineAccess: true,
    });
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Attempt to fetch profile to trigger suspension verification
          await fetchUserProfile();
          
          const isAllowed = firebaseUser.email ? ALLOWED_ADMIN_EMAILS.includes(firebaseUser.email) : false;
          let roleIsAdmin = false;
          if (isAllowed) {
            const savedRole = await AsyncStorage.getItem('activeRole');
            roleIsAdmin = savedRole === 'user' ? false : true;
          }
          
          setIsAdmin(roleIsAdmin);
          setUser(firebaseUser);
        } catch (error: any) {
          console.error('Suspension verification check error:', error);
          if (error.status === 403 || error.message.includes('suspended')) {
            Alert.alert(
              'Account Suspended',
              error.message || 'Your account has been suspended.',
              [{ text: 'OK' }]
            );
          } else {
            console.warn('Profile fetch error, allowing session:', error.message);
            
            const isAllowed = firebaseUser.email ? ALLOWED_ADMIN_EMAILS.includes(firebaseUser.email) : false;
            let roleIsAdmin = false;
            if (isAllowed) {
              const savedRole = await AsyncStorage.getItem('activeRole');
              roleIsAdmin = savedRole === 'user' ? false : true;
            }
            setIsAdmin(roleIsAdmin);
            setUser(firebaseUser); // Allow login if it's a transient network issue
          }
          if (error.status === 403 || error.message.includes('suspended')) {
            await auth.signOut();
            setUser(null);
            setIsAdmin(false);
          }
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, setIsAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
