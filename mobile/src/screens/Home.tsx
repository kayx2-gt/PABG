import React, { useEffect, useState, useRef, memo, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, Dimensions, Animated, ImageBackground } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { fetchGames, fetchFeaturedGames, fetchNewGames, fetchGamesByCategory } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { auth } from '../api/firebase';
import { Game } from '../types/game';
import { Theme } from '../utils/theme';
import { HomeSkeleton } from '../components/SkeletonLoader';
import RefreshSpinner from '../components/RefreshSpinner';
import { RefreshControl } from 'react-native';

const { width } = Dimensions.get('window');
const HERO_INTERVAL = 10000;

// ══════════════════════════════════════════════════════
// HERO CAROUSEL COMPONENT (from AdminDashboard)
// ══════════════════════════════════════════════════════
const HeroCarousel = ({ games, user, navigation }: { games: any[], user?: any, navigation: any }) => {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const listRef = useRef<FlatList>(null);

  // Prepend welcome item if user is provided
  const carouselData = user ? [{ id: 'welcome', type: 'welcome' }, ...games] : games;

  const next = useCallback(() => {
    // Only auto-loop if we are on a game slide or moving from welcome to first game
    // We want to loop games: 1 -> 2 -> 3 -> 1 (skipping index 0 which is welcome)
    let nextIndex;
    if (active === 0) {
      nextIndex = 1;
    } else {
      nextIndex = active + 1;
      if (nextIndex >= carouselData.length) {
        nextIndex = 1; // Loop back to the first game, skipping welcome
      }
    }
    
    if (carouselData.length > 1) {
      setActive(nextIndex);
      listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }
  }, [carouselData.length, active]);

  const startTimer = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    // Only start timer if we have games to loop
    if (games.length > 0) {
      timer.current = setInterval(next, HERO_INTERVAL);
    }
  }, [next, games.length]);

  useEffect(() => {
    // Stop timer if playing video or no games
    if (!games.length || playing) {
      if (timer.current) clearInterval(timer.current);
      return;
    }
    
    startTimer();
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [games.length, startTimer, playing]);

  // Reset playing state when slide changes
  useEffect(() => {
    setPlaying(false);
  }, [active]);

  const handleScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const offset = event.nativeEvent.contentOffset.x;
    const index = Math.round(offset / slideSize);
    if (index !== active && index >= 0 && index < carouselData.length) {
      setActive(index);
      setPlaying(false);
    }
  };

  if (!carouselData.length) {
    return (
      <View style={styles.heroEmpty}>
        <Text style={styles.heroEmptyIcon}>🎮</Text>
        <Text style={styles.heroEmptyText}>No featured games in library yet</Text>
      </View>
    );
  }

  const renderItem = ({ item, index }: { item: any, index: number }) => {
    // Render WelcomeCard for the first item if it's the welcome type
    if (item.type === 'welcome') {
      return (
        <View style={{ width: width - 40, height: 220, marginHorizontal: 20 }}>
          <WelcomeCard user={user} navigation={navigation} />
        </View>
      );
    }

    // Map watch gameplay URLs to embed urls if they contain watch?v=
    let videoEmbedUrl = item.videoUrl;
    if (videoEmbedUrl && videoEmbedUrl.includes('youtube.com/watch?v=')) {
      videoEmbedUrl = videoEmbedUrl.replace('watch?v=', 'embed/');
    }

    return (
      <View style={[styles.heroCard, { width: width - 40, marginHorizontal: 20 }, playing && active === index && styles.heroCardPlaying]}>
        {/* Backdrop Layer */}
        {playing && active === index && videoEmbedUrl ? (
          <View style={styles.webViewContainer}>
            <WebView
              source={{ uri: `${videoEmbedUrl}?autoplay=1&controls=1&modestbranding=1` }}
              style={styles.heroWebView}
              allowsFullscreenVideo={true}
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled={true}
              domStorageEnabled={true}
            />
            <TouchableOpacity 
              style={styles.closeVideoButton} 
              onPress={() => setPlaying(false)}
            >
              <Ionicons name="close" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.heroWrapper}>
            <Image 
              source={{ uri: item.thumbnail }} 
              style={styles.heroBgImage} 
              blurRadius={3}
            />
            <View style={styles.heroOverlay} />

            {/* Slide Content */}
            <View style={styles.heroContent}>
              <View style={styles.heroInfo}>
                <Text style={styles.heroRank}>#{index} TOP GAMES</Text>
                <Text style={styles.heroTitle} numberOfLines={2}>{item.title}</Text>
                
                <View style={styles.heroMetaRow}>
                  <View style={styles.heroCategoryPill}>
                    <Text style={styles.heroCategoryText}>{item.category}</Text>
                  </View>
                  <Text style={styles.heroPlaysText}>▶ {item.playCount || 0} plays</Text>
                </View>

                {item.videoUrl ? (
                  <TouchableOpacity 
                    style={styles.watchButton}
                    onPress={() => setPlaying(true)}
                  >
                    <Ionicons name="play" size={14} color="#0D0D1A" style={{ marginRight: 6 }} />
                    <Text style={styles.watchButtonText}>Watch Gameplay</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Float Thumbnail Right */}
              <Image 
                source={{ uri: item.thumbnail }} 
                style={styles.heroThumb}
              />
            </View>

            {/* Dots Indicator */}
            <View style={styles.dotsContainer}>
              {carouselData.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === active && styles.activeDot]}
                />
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <FlatList
      ref={listRef}
      data={carouselData}
      renderItem={renderItem}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      onMomentumScrollEnd={handleScroll}
      keyExtractor={(item, index) => item.id || index.toString()}
      getItemLayout={(_, index) => ({
        length: width,
        offset: width * index,
        index,
      })}
    />
  );
};

// ══════════════════════════════════════════════════════
// WELCOME CARD COMPONENT
// ══════════════════════════════════════════════════════
const WelcomeCard = ({ user, navigation }: { user: any, navigation: any }) => {
  const firstName = user?.displayName ? user.displayName.split(' ')[0] : (user?.email?.split('@')[0] || 'Gamer');
  
  return (
    <View style={styles.welcomeCard}>
      <ImageBackground
        source={require('../assets/login-backdrop.png')}
        style={styles.welcomeBgImage}
        imageStyle={{ opacity: 0.9 }}
      >
        <LinearGradient
          colors={['rgba(13, 13, 26, 0.4)', 'rgba(13, 13, 26, 0.9)']}
          style={styles.welcomeOverlay}
        >
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeTitle}>Hi {firstName},</Text>
            <Text style={styles.welcomeBrand}>welcome to PABG</Text>
            <Text style={styles.welcomeDescription}>
              {user?.isAnonymous 
                ? 'Sign in with Google to start earning points, finish tasks, and appear in the leaderboards!'
                : 'Select your favorite game, finish tasks to collect points, and appear in the leaderboards!'}
            </Text>
            
            <TouchableOpacity 
              style={styles.welcomeBadge}
              onPress={() => navigation.navigate(user?.isAnonymous ? 'Profile' : 'Leaderboard')}
            >
              <Ionicons 
                name={user?.isAnonymous ? "log-in" : "trophy"} 
                size={14} 
                color={Theme.colors.lime} 
                style={{ marginRight: 6 }} 
              />
              <Text style={styles.welcomeBadgeText}>
                {user?.isAnonymous ? 'Login to earn points' : 'Start earning points'}
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
};

const Home = ({ navigation }: any) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [featuredGames, setFeaturedGames] = useState<Game[]>([]);
  const [newGames, setNewGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const featuredListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadData();
    // Reset scroll position when category changes
    featuredListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [selectedCategory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleProfilePress = () => {
    if (user?.isAnonymous) {
      Alert.alert("Guest Mode", "Do you want to sign in with Google to save your progress?", [
        { text: "Cancel", style: "cancel" },
        { text: "Log In", onPress: () => auth.signOut() }
      ]);
    } else {
      Alert.alert("Log Out", "Are you sure you want to log out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Log Out", onPress: () => auth.signOut() }
      ]);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [featured, newG] = await Promise.all([
        fetchFeaturedGames(),
        fetchNewGames()
      ]);

      const allFeatured = Array.isArray(featured) ? featured : [];
      const allNew = Array.isArray(newG) ? newG : [];

      // Count unique categories and tags
      const counts: Record<string, number> = {};
      allNew.forEach(g => {
        const tags: string[] = [];
        if (g.category) tags.push(g.category);
        if (g.tags) {
          g.tags.split(',').forEach((t: string) => {
            const trimmed = t.trim();
            if (trimmed) tags.push(trimmed);
          });
        }

        // Count each unique tag only once per game
        const uniqueGameTags = Array.from(new Set(tags));
        uniqueGameTags.forEach(tag => {
          counts[tag] = (counts[tag] || 0) + 1;
        });
      });

      // Sort categories by count (descending)
      const sortedCats = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
      setCategories(['All', ...sortedCats]);

      if (selectedCategory === 'All') {
        setFeaturedGames(allFeatured);
      } else {
        // Filter featured by category OR tag and sort by playCount
        const filtered = allNew
          .filter(g =>
            g.category === selectedCategory ||
            (g.tags && g.tags.split(',').map((t: string) => t.trim()).includes(selectedCategory))
          )
          .sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
        setFeaturedGames(filtered);
      }

      setNewGames(allNew);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const GameCard = memo(({ item }: { item: Game }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('GameDetails', { game: item })}
    >
      <Image source={{ uri: item.thumbnail }} style={styles.cardThumbnail} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.cardGradient}
      />
      <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
    </TouchableOpacity>
  ));

  const NewGameRow = memo(({ item }: { item: Game }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => navigation.navigate('GameDetails', { game: item })}
    >
      <Image source={{ uri: item.thumbnail }} style={styles.rowThumbnail} />
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle}>{item.title}</Text>
        <Text style={styles.rowCategory}>{item.category}</Text>
      </View>
      <View style={styles.badge}><Text style={styles.badgeText}>HOT</Text></View>
    </TouchableOpacity>
  ));

  if (loading && categories.length <= 1) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <HomeSkeleton />
      </View>
    );
  }

  const renderHeader = () => (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>PABG</Text>
        <View style={[styles.headerIcons, { alignItems: 'center' }]}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Favorites')}
            style={{ marginRight: 15 }}
          >
            <Ionicons name="heart-outline" size={28} color={Theme.colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
          >
            {user?.photoURL ? (
              <Image
                source={{ uri: user.photoURL }}
                style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: Theme.colors.lime }}
              />
            ) : (
              <Ionicons name="person-circle-outline" size={26} color={Theme.colors.textPrimary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* User Pill */}
      <TouchableOpacity style={styles.userPill} onPress={handleProfilePress}>
        <Text style={styles.userName}>
          @{user?.displayName || user?.email?.split('@')[0] || 'gamer'}
        </Text>
      </TouchableOpacity>

      {/* Hero Carousel Section with Welcome Card as first slide */}
      <View style={styles.swapContainer}>
        <HeroCarousel games={featuredGames} user={user} navigation={navigation} />
      </View>

      {/* Categories Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Categories</Text>
      </View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={categories}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.categoryChip, selectedCategory === item && styles.selectedChip]}
            onPress={() => setSelectedCategory(item)}
          >
            <Text style={[styles.categoryText, selectedCategory === item && styles.selectedText]}>{item}</Text>
          </TouchableOpacity>
        )}
        style={styles.categoryList}
        contentContainerStyle={{ paddingHorizontal: 20 }}
      />

      {/* Top Games Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Top games</Text>
        <TouchableOpacity onPress={() => navigation.navigate('GamesList', { title: 'Top Games', games: featuredGames })}>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        ref={featuredListRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        data={featuredGames}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <GameCard item={item} />}
        style={styles.featuredList}
        contentContainerStyle={{ paddingHorizontal: 20 }}
        ItemSeparatorComponent={() => <View style={{ width: 15 }} />}
      />

      {/* New Games Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>New games</Text>
        <TouchableOpacity onPress={() => navigation.navigate('GamesList', { title: 'New Games', games: newGames })}>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <RefreshSpinner refreshing={refreshing} />
      <FlatList
        data={newGames.slice(0, 5)}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NewGameRow item={item} />}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={
          newGames.length > 5 ? (
            <TouchableOpacity 
              style={styles.viewAllFooter}
              onPress={() => navigation.navigate('GamesList', { title: 'New Games', games: newGames })}
            >
              <Text style={styles.viewAllFooterText}>View All New Games</Text>
              <Ionicons name="arrow-forward" size={16} color={Theme.colors.lime} />
            </TouchableOpacity>
          ) : null
        }
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor="transparent" // Hide default spinner
            colors={['transparent']} 
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={10}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingHorizontal: 20 },
  logo: { fontSize: Theme.typography.logo.size, fontWeight: Theme.typography.logo.weight, color: '#FFFFFF' },
  headerIcons: { flexDirection: 'row' },
  userPill: { backgroundColor: Theme.colors.lime, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 15, marginLeft: 20, flexDirection: 'row', alignItems: 'center' },
  userName: { fontWeight: '800', fontSize: 11, color: Theme.colors.background },
  swapContainer: { height: 220, marginTop: 10, marginBottom: 20, justifyContent: 'center' },
  welcomeCard: { flex: 1, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: Theme.colors.border },
  welcomeBgImage: { flex: 1, width: '100%', height: '100%' },
  welcomeOverlay: { flex: 1, padding: 24, justifyContent: 'center' },
  welcomeContent: { zIndex: 1 },
  welcomeTitle: { fontSize: 24, fontWeight: '900', color: Theme.colors.textPrimary, letterSpacing: -0.5 },
  welcomeBrand: { fontSize: 28, fontWeight: '900', color: Theme.colors.lime, marginTop: -2, marginBottom: 10 },
  welcomeDescription: { fontSize: 13, color: '#FFFFFF', fontWeight: '600', lineHeight: 18, opacity: 0.9 },
  welcomeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(200, 255, 0, 0.2)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginTop: 15 },
  welcomeBadgeText: { color: Theme.colors.lime, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  viewAllFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    marginTop: 10,
    marginBottom: 40,
    backgroundColor: 'rgba(230, 248, 53, 0.05)',
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(230, 248, 53, 0.1)',
    gap: 8,
  },
  viewAllFooterText: {
    color: Theme.colors.lime,
    fontSize: 14,
    fontWeight: '800',
  },
  greeting: { fontSize: Theme.typography.greeting.size, fontWeight: Theme.typography.greeting.weight, color: Theme.colors.textPrimary, lineHeight: 28 * 1.15, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 20 },
  sectionTitle: { fontSize: Theme.typography.sectionTitle.size, fontWeight: Theme.typography.sectionTitle.weight, color: Theme.colors.textPrimary },
  viewAll: { fontSize: Theme.typography.viewAll.size, fontWeight: Theme.typography.viewAll.weight, color: Theme.colors.lime },
  categoryList: { marginBottom: 25 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#2A2A35', marginRight: 10 },
  selectedChip: { backgroundColor: '#4A4A5A' },
  categoryText: { fontSize: 12, fontWeight: '700', color: '#CCCCCC' },
  selectedText: { color: '#FFFFFF' },
  featuredList: { marginBottom: 25 },
  card: { width: 160, height: 220, borderRadius: 20, overflow: 'hidden', position: 'relative' },
  cardThumbnail: { width: '100%', height: '100%' },
  cardGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 },
  cardTitle: { position: 'absolute', bottom: 12, left: 12, right: 12, fontSize: 12, fontWeight: '800', color: Theme.colors.textPrimary },
  row: { flexDirection: 'row', marginBottom: 12, alignItems: 'center', backgroundColor: Theme.colors.surface, borderRadius: 16, padding: 12, marginHorizontal: 20 },
  rowThumbnail: { width: 50, height: 50, borderRadius: 12 },
  rowInfo: { marginLeft: 15, flex: 1 },
  rowTitle: { fontSize: 13, fontWeight: '800', color: Theme.colors.textPrimary },
  rowCategory: { fontSize: 11, color: Theme.colors.textSecondary, marginTop: 2 },
  badge: { backgroundColor: Theme.colors.lime, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { color: Theme.colors.background, fontSize: 9, fontWeight: '900' },

  // Hero Carousel Styling (from AdminDashboard)
  heroCard: {
    height: 220,
    borderRadius: 20,
    backgroundColor: '#0D0D1A',
    borderWidth: 1,
    borderColor: '#2A2A45',
    overflow: 'hidden',
  },
  heroCardPlaying: {
    height: 240,
  },
  heroWrapper: {
    flex: 1,
    position: 'relative',
  },
  heroBgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.35,
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(13, 13, 26, 0.4)',
  },
  heroContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroInfo: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 10,
  },
  heroRank: {
    color: Theme.colors.lime,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  heroTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  heroCategoryPill: {
    backgroundColor: 'rgba(124, 58, 237, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  heroCategoryText: {
    color: '#C4B5FD',
    fontSize: 10,
    fontWeight: '700',
  },
  heroPlaysText: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  watchButton: {
    backgroundColor: Theme.colors.lime,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    width: '70%',
  },
  watchButtonText: {
    color: '#0D0D1A',
    fontWeight: '900',
    fontSize: 12,
  },
  heroThumb: {
    width: 90,
    height: 130,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  activeDot: {
    width: 18,
    backgroundColor: Theme.colors.lime,
  },
  heroEmpty: {
    height: 200,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  heroEmptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  heroEmptyText: {
    color: Theme.colors.textSecondary,
    fontSize: 14,
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
  },
  heroWebView: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeVideoButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
});

export default Home;
