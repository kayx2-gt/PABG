import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Alert } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../api/firebase';
import { fetchUserProfile } from '../api/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isAllowedAdmin: boolean; // New: indicates if the user HAS admin privileges (even if currently in user mode)
  setIsAdmin: (isAdmin: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  isAdmin: false,
  isAllowedAdmin: false,
  setIsAdmin: () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAllowedAdmin, setIsAllowedAdmin] = useState(false);

  useEffect(() => {
    // Configure Google Sign-In globally on app boot
    try {
      if (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
        GoogleSignin.configure({
          webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
          offlineAccess: true,
        });
      } else {
        console.warn('Google Sign-In: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not defined');
      }
    } catch (error) {
      console.error('Failed to configure Google Sign-In:', error);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Attempt to fetch profile to trigger suspension verification and get role
          const profile = await fetchUserProfile();
          
          const isAllowed = profile.role === 'admin';
          setIsAllowedAdmin(isAllowed);

          let roleIsAdmin = false;
          if (isAllowed) {
            const savedRole = await AsyncStorage.getItem('activeRole');
            roleIsAdmin = savedRole === 'user' ? false : true;
          }
          
          setIsAdmin(roleIsAdmin);
          setUser(firebaseUser);
        } catch (error: any) {
          // If the user is not found, it's likely a new user (Google or Guest) being created
          if (error.status === 404) {
            console.log('New user detected (Google or Guest). Role will be verified after profile creation.');
            setUser(firebaseUser);
            setIsAllowedAdmin(false);
            setIsAdmin(false);
          } else if (error.status === 403 || error.message.includes('suspended')) {
            // ... rest of error handling
            console.error('Account suspended:', error.message);
            Alert.alert(
              'Account Suspended',
              error.message || 'Your account has been suspended.',
              [{ text: 'OK' }]
            );
            
            try {
              await GoogleSignin.signOut();
            } catch (e) {
              console.warn('Google SignOut error during suspension handling:', e);
            }
            await auth.signOut();
            setUser(null);
            setIsAdmin(false);
          } else {
            console.error('Suspension verification check error:', error);
            console.warn('Profile fetch error, allowing session as regular user:', error.message);
            
            setIsAdmin(false);
            setIsAllowedAdmin(false);
            setUser(firebaseUser);
          }
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        setIsAllowedAdmin(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, isAllowedAdmin, setIsAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
