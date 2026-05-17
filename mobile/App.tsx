import React, { useState } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SplashScreen from './src/splash-screen/SplashScreen';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
        <StatusBar style="light" />
        {showSplash && (
          <SplashScreen onAnimationComplete={() => setShowSplash(false)} />
        )}
      </AuthProvider>
    </SafeAreaProvider>
  );
}
