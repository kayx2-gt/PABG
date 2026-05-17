import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, BackHandler, StatusBar, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme } from '../utils/theme';
import { recordGamePlay } from '../api/api';
import { auth } from '../api/firebase';

const GamePlayer = ({ route, navigation }: any) => {
  const { gameUrl, gameId } = route.params;

  useEffect(() => {
    // Force the screen to landscape immediately for gameplay
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => { });

    // Hide status bar & system navigation bar for fullscreen immersive gameplay
    StatusBar.setHidden(true, 'fade');
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden').catch(() => { });
      NavigationBar.setBehaviorAsync('immersive').catch(() => { });
    }

    // Anti-spam timer: Only record game play after 15 seconds
    const playTimer = setTimeout(async () => {
      if (gameId) {
        let email = auth.currentUser?.email;
        if (auth.currentUser?.isAnonymous) {
          email = await AsyncStorage.getItem('guestEmail');
        }
        await recordGamePlay(gameId, email || undefined);
        console.log('Game recorded for missions after 15 seconds of play.');
      }
    }, 15000);

    const backAction = () => {
      handleExit();
      return true;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);

    return () => {
      clearTimeout(playTimer); // Cancel if they leave before 15 seconds
      backHandler.remove();

      // Restore status bar & system navigation bar when leaving the game
      StatusBar.setHidden(false, 'fade');
      if (Platform.OS === 'android') {
        NavigationBar.setVisibilityAsync('visible').catch(() => { });
      }

      // Force back to portrait when leaving the game
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => { });
    };
  }, []);

  const handleExit = async () => {
    try {
      StatusBar.setHidden(false, 'fade');
      if (Platform.OS === 'android') {
        await NavigationBar.setVisibilityAsync('visible');
      }
    } catch (e) { }
    try {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    } catch (e) { }
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: gameUrl }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mixedContentMode="always"
        scalesPageToFit={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={Theme.colors.lime} />
          </View>
        )}
        originWhitelist={['*']}
        userAgent="Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36"
        androidLayerType="hardware"
        scrollEnabled={false}
        onError={(e) => console.warn('WebView error:', e)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1 },
  loading: { position: 'absolute', height: '100%', width: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }
});

export default GamePlayer;
