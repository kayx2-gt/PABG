import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  Alert, 
  Dimensions, 
  FlatList 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { Theme } from '../../utils/theme';
import { useAuth } from '../../context/AuthContext';
import { 
  fetchFeaturedGames, 
  fetchLeaderboard, 
  fetchExternalGames, 
  fetchManagedGames, 
  saveGame, 
  deleteGame 
} from '../../api/api';

const { width } = Dimensions.get('window');
const HERO_INTERVAL = 10000;
const EXTERNAL_PAGE_SIZE = 10;

// Medals config
const medals = ['🥇', '🥈', '🥉'];
const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

// ══════════════════════════════════════════════════════
// HERO CAROUSEL COMPONENT
// ══════════════════════════════════════════════════════
const HeroCarousel = ({ games }: { games: any[] }) => {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = useCallback(() => {
    setActive(prev => (prev + 1) % Math.max(games.length, 1));
  }, [games.length]);

  const startTimer = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(next, HERO_INTERVAL);
  }, [next]);

  useEffect(() => {
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

  if (!games.length) {
    return (
      <View style={styles.heroEmpty}>
        <Text style={styles.heroEmptyIcon}>🎮</Text>
        <Text style={styles.heroEmptyText}>No featured games in library yet</Text>
      </View>
    );
  }

  const game = games[active];

  // Map watch gameplay URLs to embed urls if they contain watch?v=
  let videoEmbedUrl = game.videoUrl;
  if (videoEmbedUrl && videoEmbedUrl.includes('youtube.com/watch?v=')) {
    videoEmbedUrl = videoEmbedUrl.replace('watch?v=', 'embed/');
  }

  return (
    <View style={[styles.heroCard, playing && styles.heroCardPlaying]}>
      {/* Backdrop Layer */}
      {playing && videoEmbedUrl ? (
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
            source={{ uri: game.thumbnail }} 
            style={styles.heroBgImage} 
            blurRadius={3}
          />
          <View style={styles.heroOverlay} />

          {/* Slide Content */}
          <View style={styles.heroContent}>
            <View style={styles.heroInfo}>
              <Text style={styles.heroRank}>#{active + 1} MOST PLAYED</Text>
              <Text style={styles.heroTitle} numberOfLines={2}>{game.title}</Text>
              
              <View style={styles.heroMetaRow}>
                <View style={styles.heroCategoryPill}>
                  <Text style={styles.heroCategoryText}>{game.category}</Text>
                </View>
                <Text style={styles.heroPlaysText}>▶ {game.playCount || 0} plays</Text>
              </View>

              {game.videoUrl ? (
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
              source={{ uri: game.thumbnail }} 
              style={styles.heroThumb}
            />
          </View>

          {/* Dots Indicator */}
          <View style={styles.dotsContainer}>
            {games.map((_, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.dot, i === active && styles.activeDot]}
                onPress={() => {
                  setActive(i);
                  setPlaying(false);
                }}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

// ══════════════════════════════════════════════════════
// TOP PLAYERS COMPONENT
// ══════════════════════════════════════════════════════
const TopPlayers = ({ players }: { players: any[] }) => (
  <View style={styles.playersCard}>
    <View style={styles.sectionHeader}>
      <View>
        <Text style={styles.sectionTitle}>🏆 Top Players</Text>
        <Text style={styles.sectionSub}>Leaderboard</Text>
      </View>
    </View>

    <View style={styles.playersList}>
      {players.length === 0 ? (
        <Text style={styles.emptyText}>No leaderboard data yet</Text>
      ) : (
        players.slice(0, 3).map((p, i) => (
          <View key={p.id || i} style={styles.playerRow}>
            <Text style={styles.playerMedal}>{medals[i] || '👤'}</Text>
            <View style={styles.playerAvatar}>
              <Text style={styles.playerAvatarText}>
                {(p.name || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.playerInfo}>
              <Text style={styles.playerName} numberOfLines={1}>{p.name || 'Unknown'}</Text>
              <Text style={styles.playerGames}>{p.gamesPlayed || 0} games played</Text>
            </View>
            <View style={styles.playerScoreContainer}>
              <Text style={[styles.playerScore, { color: medalColors[i] || Theme.colors.textPrimary }]}>
                {(p.totalScore || p.totalPoints || 0).toLocaleString()}
              </Text>
              <Text style={styles.playerScoreLabel}>pts</Text>
            </View>
          </View>
        ))
      )}
    </View>
  </View>
);

// ══════════════════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ══════════════════════════════════════════════════════
const AdminDashboard = ({ navigation }: any) => {
  const { user } = useAuth();
  const [topGames, setTopGames] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [appGames, setAppGames] = useState<any[]>([]);
  
  // External GameMonetize States
  const [externalGames, setExternalGames] = useState<any[]>([]);
  const [extPage, setExtPage] = useState(1);
  const [loadingExt, setLoadingExt] = useState(false);
  const [hasMoreExt, setHasMoreExt] = useState(true);

  const [savingId, setSavingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    loadExternalGames(1);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [top, lb, managed] = await Promise.all([
        fetchFeaturedGames(),
        fetchLeaderboard(),
        fetchManagedGames(),
      ]);
      setTopGames(Array.isArray(top) ? top.slice(0, 10) : []);
      setPlayers(Array.isArray(lb) ? lb : []);
      setAppGames(Array.isArray(managed) ? managed : []);
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadExternalGames = async (page: number) => {
    if (loadingExt) return;
    setLoadingExt(true);
    try {
      const data = await fetchExternalGames('0', EXTERNAL_PAGE_SIZE, page);
      const arr = Array.isArray(data) ? data : [];
      if (arr.length < EXTERNAL_PAGE_SIZE) setHasMoreExt(false);
      setExternalGames(prev => page === 1 ? arr : [...prev, ...arr]);
      setExtPage(page);
    } catch (e) {
      console.error('Error loading external games:', e);
    } finally {
      setLoadingExt(false);
    }
  };

  const savedIds = new Set(appGames.map((g: any) => g.gameMonetizeId));

  const handleSaveGame = async (game: any) => {
    setSavingId(game.gameMonetizeId || game.title);
    try {
      const result = await saveGame({ ...game, isNew: true, isFeatured: false });
      if (result.success || result.id) {
        Alert.alert('Success', `${game.title} has been added to your app library!`);
        await loadDashboardData();
      } else {
        Alert.alert('Error', result.error || 'Failed to save game.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to save game to database.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteGame = (id: string, title: string) => {
    Alert.alert(
      'Remove Game',
      `Are you sure you want to remove ${title} from the app library?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteGame(id);
              if (result.success) {
                Alert.alert('Removed', 'Game removed successfully.');
                await loadDashboardData();
              } else {
                Alert.alert('Error', result.error || 'Failed to delete game.');
              }
            } catch (e) {
              Alert.alert('Error', 'Failed to delete game.');
            }
          }
        }
      ]
    );
  };

  const handleLoadMoreExternal = () => {
    if (hasMoreExt && !loadingExt) {
      loadExternalGames(extPage + 1);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.lime} />
        <Text style={styles.loadingText}>Loading Dashboard…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>PABG Admin</Text>
          <Text style={styles.headerSubtitle}>Dashboard</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Profile')}
            style={styles.iconButton}
          >
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.profileAvatar} />
            ) : (
              <Ionicons name="person" size={18} color={Theme.colors.lime} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Row 1: Hero Carousel (Has margin inside component style) */}
        <HeroCarousel games={topGames} />

        {/* Row 2: Top Players List (Has margin inside component style) */}
        <TopPlayers players={players} />

        {/* Row 3: Available Games (GameMonetize Row) */}
        <View style={styles.section}>
          <View style={[styles.sectionTitleBlock, { marginHorizontal: 20 }]}>
            <View style={styles.indicatorBubble} />
            <View>
              <Text style={styles.sectionTitleText}>Available Games</Text>
              <Text style={styles.sectionSubtitleText}>From GameMonetize — swipe to explore</Text>
            </View>
          </View>

          <FlatList
            horizontal
            data={externalGames.filter(g => !savedIds.has(g.gameMonetizeId))}
            keyExtractor={(item, index) => item.gameMonetizeId || index.toString()}
            showsHorizontalScrollIndicator={false}
            onEndReached={handleLoadMoreExternal}
            onEndReachedThreshold={0.5}
            renderItem={({ item }) => (
              <View style={styles.extCard}>
                <View style={styles.extImageWrap}>
                  <Image source={{ uri: item.thumbnail }} style={styles.extImage} />
                  <View style={styles.extCategoryBadge}>
                    <Text style={styles.extCategoryText}>{item.category}</Text>
                  </View>
                </View>
                <View style={styles.extBody}>
                  <Text style={styles.extTitle} numberOfLines={1}>{item.title}</Text>
                  <TouchableOpacity
                    style={[
                      styles.extBtn,
                      savedIds.has(item.gameMonetizeId) && styles.extBtnSaved
                    ]}
                    onPress={() => handleSaveGame(item)}
                    disabled={savedIds.has(item.gameMonetizeId) || savingId === (item.gameMonetizeId || item.title)}
                  >
                    {savingId === (item.gameMonetizeId || item.title) ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : savedIds.has(item.gameMonetizeId) ? (
                      <Text style={styles.extBtnTextSaved}>✓ Added</Text>
                    ) : (
                      <Text style={styles.extBtnText}>+ Add to App</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListFooterComponent={
              loadingExt ? (
                <View style={styles.extLoadingFooter}>
                  <ActivityIndicator size="small" color={Theme.colors.lime} />
                </View>
              ) : null
            }
            contentContainerStyle={styles.extListContent}
          />
        </View>

        {/* Row 4: App Game Library (Horizontal scrollable Row) */}
        <View style={styles.section}>
          <View style={[styles.sectionTitleBlock, { marginHorizontal: 20 }]}>
            <Ionicons name="folder-open-outline" size={16} color={Theme.colors.lime} style={{ marginRight: 6 }} />
            <View>
              <Text style={styles.sectionTitleText}>App Game Library</Text>
              <Text style={styles.sectionSubtitleText}>{appGames.length} active games in the app</Text>
            </View>
          </View>

          {appGames.length === 0 ? (
            <View style={[styles.emptyLibraryBlock, { marginHorizontal: 20 }]}>
              <Text style={styles.emptyText}>No games saved yet. Add some from the GameMonetize feed above!</Text>
            </View>
          ) : (
            <FlatList
              horizontal
              data={appGames}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.libCard}>
                  <View style={styles.libImageWrap}>
                    <Image source={{ uri: item.thumbnail }} style={styles.libImage} />
                    <View style={styles.libBadgeRow}>
                      {item.isFeatured ? (
                        <View style={[styles.libBadge, styles.badgeLime]}>
                          <Text style={styles.libBadgeText}>★ Featured</Text>
                        </View>
                      ) : null}
                      {item.isNew ? (
                        <View style={[styles.libBadge, styles.badgeHot]}>
                          <Text style={styles.libBadgeText}>🔥 New</Text>
                        </View>
                      ) : null}
                    </View>
                    <TouchableOpacity 
                      style={styles.libDeleteBtn}
                      onPress={() => handleDeleteGame(item.id, item.title)}
                    >
                      <Ionicons name="close" size={14} color="#FF4B4B" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.libBody}>
                    <Text style={styles.libTitle} numberOfLines={1}>{item.title}</Text>
                    <View style={styles.libMeta}>
                      <View style={styles.libCatPill}>
                        <Text style={styles.libCatText}>{item.category}</Text>
                      </View>
                      <Text style={styles.libPlays}>▶ {item.playCount || 0}</Text>
                    </View>
                  </View>
                </View>
              )}
              contentContainerStyle={styles.libListContent}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  headerTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: Theme.colors.lime,
    fontSize: 14,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  profileAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Theme.colors.textSecondary,
    fontSize: 16,
    marginTop: 15,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 0,
    paddingBottom: 160,
    gap: 25,
  },
  // Hero Carousel Styling
  heroCard: {
    height: 220,
    borderRadius: 20,
    backgroundColor: '#0D0D1A',
    borderWidth: 1,
    borderColor: '#2A2A45',
    overflow: 'hidden',
    marginHorizontal: 20,
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
  // WebView Trailer container
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
  // Players Card Styling
  playersCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 16,
    marginHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSub: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  playersList: {
    gap: 10,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 10,
  },
  playerMedal: {
    fontSize: 18,
    marginRight: 8,
  },
  playerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Theme.colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  playerAvatarText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 14,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  playerGames: {
    color: Theme.colors.textSecondary,
    fontSize: 10,
    marginTop: 1,
  },
  playerScoreContainer: {
    alignItems: 'flex-end',
  },
  playerScore: {
    fontSize: 14,
    fontWeight: '900',
  },
  playerScoreLabel: {
    color: Theme.colors.textSecondary,
    fontSize: 9,
    marginTop: 1,
  },
  // Row sections
  section: {
    gap: 15,
  },
  sectionTitleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicatorBubble: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Theme.colors.lime,
    marginRight: 8,
  },
  sectionTitleText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSubtitleText: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  emptyText: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
  // External Feed Cards
  extListContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  extCard: {
    width: 160,
    backgroundColor: Theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    overflow: 'hidden',
  },
  extImageWrap: {
    position: 'relative',
    height: 90,
    width: '100%',
  },
  extImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  extCategoryBadge: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    backgroundColor: 'rgba(13,13,26,0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  extCategoryText: {
    color: Theme.colors.textSecondary,
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  extBody: {
    padding: 8,
    gap: 6,
  },
  extTitle: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  extBtn: {
    backgroundColor: Theme.colors.lime,
    borderRadius: 6,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extBtnSaved: {
    backgroundColor: 'rgba(200, 255, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(200, 255, 0, 0.2)',
  },
  extBtnText: {
    color: '#0D0D1A',
    fontSize: 10,
    fontWeight: '900',
  },
  extBtnTextSaved: {
    color: Theme.colors.lime,
    fontSize: 10,
    fontWeight: '700',
  },
  extLoadingFooter: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Library Grid Cards
  emptyLibraryBlock: {
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 30,
    alignItems: 'center',
  },
  libListContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  libCard: {
    width: 160,
    backgroundColor: Theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    overflow: 'hidden',
  },
  libImageWrap: {
    position: 'relative',
    height: 90,
    width: '100%',
  },
  libImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  libBadgeRow: {
    position: 'absolute',
    top: 5,
    left: 5,
    flexDirection: 'row',
    gap: 4,
  },
  libBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeLime: {
    backgroundColor: 'rgba(200, 255, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(200, 255, 0, 0.3)',
  },
  badgeHot: {
    backgroundColor: 'rgba(255, 75, 75, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 75, 75, 0.3)',
  },
  libBadgeText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '800',
  },
  libDeleteBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 75, 75, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 75, 75, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  libBody: {
    padding: 10,
    gap: 6,
  },
  libTitle: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  libMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  libCatPill: {
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  libCatText: {
    color: '#A78BFA',
    fontSize: 8,
    fontWeight: '700',
  },
  libPlays: {
    color: Theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
});

export default AdminDashboard;
