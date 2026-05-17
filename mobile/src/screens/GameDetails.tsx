import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Game } from '../types/game';
import { Theme } from '../utils/theme';
import { checkFavorite, toggleFavorite, recordGamePlay } from '../api/api';
import { auth } from '../api/firebase';

const { width } = Dimensions.get('window');

const GameDetails = ({ route, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { game }: { game: Game } = route.params;
  const [isFavorite, setIsFavorite] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [videoY, setVideoY] = useState(0);
  const webViewRef = useRef<WebView>(null);

  React.useEffect(() => {
    loadStatus();
  }, [game.id]);

  const loadStatus = async () => {
    const user = auth.currentUser;
    if (user) {
      let email = user.email;
      if (user.isAnonymous) {
        email = await AsyncStorage.getItem('guestEmail');
      }
      if (!email) {
        email = `${user.displayName?.toLowerCase().replace(/\s/g, '')}@mobalauncher.com`;
      }
      const res = await checkFavorite(game.id, email);
      setIsFavorite(res.isFavorite);
    }
  };

  const handleToggleFavorite = async () => {
    const user = auth.currentUser;
    if (user) {
      let email = user.email;
      if (user.isAnonymous) {
        email = await AsyncStorage.getItem('guestEmail');
      }
      if (!email) {
        email = `${user.displayName?.toLowerCase().replace(/\s/g, '')}@mobalauncher.com`;
      }
      const res = await toggleFavorite(game, email);
      setIsFavorite(res.isFavorite);
      
      // Add notification
      Alert.alert(
        res.isFavorite ? 'Added to Favorites' : 'Removed from Favorites',
        `${game.title} has been ${res.isFavorite ? 'added to' : 'removed from'} your favorites.`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleScroll = (event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const screenHeight = event.nativeEvent.layoutMeasurement.height;
    
    // Check if the video section is roughly in the middle of the screen
    const isVisible = videoY > scrollY - 100 && videoY < scrollY + screenHeight;
    
    if (!isVisible) {
      webViewRef.current?.injectJavaScript('document.querySelector("video")?.pause(); true;');
    } else {
      webViewRef.current?.injectJavaScript('document.querySelector("video")?.play(); true;');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Hero Section */}
        <View style={styles.heroContainer}>
          <Image source={{ uri: game.thumbnail }} style={styles.heroImage} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', Theme.colors.background]}
            style={styles.gradient}
          />
        </View>

        <View style={styles.mainContent}>
          {/* Title and Category */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{game.title}</Text>
              <Text style={styles.publisher}>{game.category}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.favoriteBtn, isFavorite && styles.favoriteBtnActive]}
              onPress={handleToggleFavorite}
            >
              <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={24} color={isFavorite ? "#FF4B4B" : "white"} />
            </TouchableOpacity>
          </View>

          {/* Download (Play) Button */}
          <TouchableOpacity 
            style={styles.playBtn}
            onPress={async () => {
              navigation.navigate('GamePlayer', { gameUrl: game.gameUrl, gameId: game.id });
            }}
          >
            <Text style={styles.playBtnText}>Play</Text>
          </TouchableOpacity>

          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text 
              style={styles.description}
              numberOfLines={showFullDesc ? undefined : 3}
            >
              {game.description}
            </Text>
            <TouchableOpacity onPress={() => setShowFullDesc(!showFullDesc)}>
              <Text style={styles.readMore}>{showFullDesc ? 'Show Less' : 'Read More'}</Text>
            </TouchableOpacity>
          </View>

          {/* Screenshots */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Screenshots</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.screenshotsRow}>
              <Image source={{ uri: game.thumbnail }} style={styles.screenshot} />
              <Image source={{ uri: game.thumbnail }} style={styles.screenshot} />
            </ScrollView>
          </View>

          {/* Gameplay Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gameplay</Text>
            <View 
              style={styles.videoPlaceholder}
              onLayout={(e) => setVideoY(e.nativeEvent.layout.y + 400)} // Adding offset for header height
            >
              {game.videoUrl ? (
                <WebView 
                  ref={webViewRef}
                  source={{ uri: game.videoUrl }} 
                  style={{ width: '100%', height: 180, backgroundColor: '#000' }}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  allowsFullscreenVideo={true}
                  allowsInlineMediaPlayback={true}
                  mediaPlaybackRequiresUserAction={false}
                  scrollEnabled={false}
                  originWhitelist={['*']}
                  userAgent="Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36"
                  androidLayerType="hardware"
                  mixedContentMode="always"
                  injectedJavaScript={`
                    (function() {
                      setInterval(function() {
                        var v = document.querySelector('video');
                        if (v && v.paused && !document.getElementById('imaContainer')) {
                          v.play().catch(function(e) {});
                        }
                      }, 1000);
                    })();
                    true;
                  `}
                />
              ) : (
                <>
                  <Image source={{ uri: game.thumbnail }} style={styles.videoThumb} />
                  <View style={styles.playIconContainer}>
                    <Ionicons name="play" size={40} color="white" />
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Back Button */}
      <TouchableOpacity 
        style={[styles.backBtn, { top: insets.top + 10 }]}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="chevron-back" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  heroContainer: { height: 350, width: '100%', position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  gradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 200 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { color: Theme.colors.textPrimary, fontSize: 28, fontWeight: '800' },
  publisher: { color: Theme.colors.textSecondary, fontSize: 13, marginTop: 4 },
  favoriteBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    justifyContent: 'center', 
    alignItems: 'center'
  },
  favoriteBtnActive: {
    backgroundColor: 'rgba(230, 248, 53, 0.2)',
  },
  backBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  mainContent: { paddingHorizontal: 20, paddingTop: 10, marginTop: -40 },
  playBtn: { backgroundColor: Theme.colors.lime, paddingVertical: 16, borderRadius: 30, alignItems: 'center', marginBottom: 30 },
  playBtnText: { fontSize: 16, fontWeight: '800', color: '#000000' },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: Theme.typography.sectionTitle.size, fontWeight: Theme.typography.sectionTitle.weight, color: Theme.colors.textPrimary, marginBottom: 10, textTransform: 'uppercase' },
  description: { fontSize: Theme.typography.body.size, color: Theme.colors.textSecondary, lineHeight: 18 },
  readMore: { color: Theme.colors.lime, fontWeight: '600', fontSize: 11, marginTop: 5 },
  screenshotsRow: { flexDirection: 'row' },
  screenshot: { width: width * 0.45, height: 120, borderRadius: 12, marginRight: 15 },
  videoPlaceholder: { width: '100%', height: 180, borderRadius: 12, overflow: 'hidden', position: 'relative', backgroundColor: Theme.colors.surface },
  videoThumb: { width: '100%', height: '100%', opacity: 0.6 },
  playIconContainer: { position: 'absolute', top: '50%', left: '50%', marginLeft: -30, marginTop: -30, width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }
});

export default GameDetails;
