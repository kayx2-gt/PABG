import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { GoogleAuthProvider, signInWithCredential, signInAnonymously, updateProfile } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { auth } from '../api/firebase';
import { Theme } from '../utils/theme';
import { upsertUser } from '../api/api';

const LoginScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      offlineAccess: true,
    });
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;

      if (!idToken) throw new Error('No ID Token found');

      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;

      if (user.displayName && user.email) {
        const photo = userInfo.data?.user?.photo || user.photoURL || undefined;
        await upsertUser(user.displayName, user.email, photo);
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled the login flow
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // Operation (e.g. sign in) is in progress already
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Error', 'Google Play Services not available or outdated');
      } else {
        Alert.alert('Google Login Error', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    try {
      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;

      let guestName = await AsyncStorage.getItem('guestName');
      let guestEmail = await AsyncStorage.getItem('guestEmail');

      if (!guestName || !guestEmail) {
        const randomNum = Math.floor(10000 + Math.random() * 90000);
        guestName = `Guest${randomNum}`;
        guestEmail = `${guestName.toLowerCase()}@mobalauncher.com`;

        await AsyncStorage.setItem('guestName', guestName);
        await AsyncStorage.setItem('guestEmail', guestEmail);
      }

      // Update the anonymous Firebase user's profile with the stored guest name
      await updateProfile(user, { displayName: guestName });

      // Register or fetch the existing guest user in the backend
      await upsertUser(guestName, guestEmail);

      Alert.alert(
        'Playing as Guest',
        'Your stats will not be saved. We recommend logging in with Google to appear on the leaderboards!',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Guest Login Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>PABG</Text>
      <Text style={styles.title}>Welcome Back!</Text>

      <TouchableOpacity
        style={styles.googleButton}
        onPress={handleGoogleLogin}
        disabled={loading}
      >
        <Ionicons name="logo-google" size={20} color={Theme.colors.background} style={{ marginRight: 10 }} />
        <Text style={styles.googleButtonText}>Sign in with Google</Text>
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.line} />
      </View>

      <TouchableOpacity style={styles.guestButton} onPress={handleGuestLogin} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={Theme.colors.textPrimary} />
        ) : (
          <Text style={styles.guestButtonText}>Play as Guest</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: Theme.colors.background },
  logo: { fontSize: 32, fontWeight: '900', textAlign: 'center', marginBottom: 20, color: Theme.colors.lime },
  title: { fontSize: 24, marginBottom: 40, textAlign: 'center', color: Theme.colors.textPrimary, fontWeight: '800' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: Theme.colors.border },
  dividerText: { marginHorizontal: 10, color: Theme.colors.textMuted, fontSize: 12 },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.lime,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10
  },
  googleButtonText: { fontWeight: 'bold', color: Theme.colors.background, fontSize: 16 },
  guestButton: {
    backgroundColor: '#ffffff10',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border
  },
  guestButtonText: { fontWeight: 'bold', color: Theme.colors.textPrimary, fontSize: 16 }
});

export default LoginScreen;
