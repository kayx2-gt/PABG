import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, ActivityIndicator, Dimensions, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '../../utils/theme';
import { fetchManagedGames, fetchExternalGames, saveGame, deleteGame, updateGame } from '../../api/api';
import RefreshSpinner from '../../components/RefreshSpinner';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 55) / 2;

const AdminGames = ({ route }: any) => {
  const [view, setView] = useState<'managed' | 'import'>(route?.params?.view || 'managed');
  const [managedGames, setManagedGames] = useState<any[]>([]);
  const [externalGames, setExternalGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination states for external games
  const [extPage, setExtPage] = useState(1);
  const [hasMoreExt, setHasMoreExt] = useState(true);
  const [loadingMoreExt, setLoadingMoreExt] = useState(false);

  useEffect(() => {
    if (route?.params?.view) {
      setView(route.params.view);
    }
  }, [route?.params?.view]);

  useEffect(() => {
    setSearchQuery(''); // Reset search when switching tabs
    if (view === 'managed') {
      loadManagedGames();
    } else {
      // Reset pagination when switching to import view
      setExtPage(1);
      setHasMoreExt(true);
      loadExternalGames(1);
    }
  }, [view]);

  const loadManagedGames = async () => {
    setLoading(true);
    try {
      const data = await fetchManagedGames();
      setManagedGames(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading managed games:', error);
    }
    setLoading(false);
  };

  const loadExternalGames = async (page: number) => {
    if (page === 1) setLoading(true);
    else setLoadingMoreExt(true);

    try {
      const games = await fetchExternalGames('0', 20, page);
      const arr = Array.isArray(games) ? games : [];
      
      if (arr.length < 20) {
        setHasMoreExt(false);
      }

      if (page === 1) {
        setExternalGames(arr);
      } else {
        setExternalGames(prev => [...prev, ...arr]);
      }
      setExtPage(page);
    } catch (error) {
      console.error('Error fetching external games:', error);
      Alert.alert('Error', 'Failed to fetch games from GameMonetize. Please check your connection or server status.');
    } finally {
      setLoading(false);
      setLoadingMoreExt(false);
    }
  };

  const handleLoadMoreExternal = () => {
    if (view === 'import' && hasMoreExt && !loading && !loadingMoreExt) {
      loadExternalGames(extPage + 1);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (view === 'managed') {
      await loadManagedGames();
    } else {
      await loadExternalGames(1);
    }
    setRefreshing(false);
  };

  const handleSave = async (game: any) => {
    try {
      const result = await saveGame({ ...game, isNew: true, isFeatured: false });
      if (result.success) {
        Alert.alert('Success', 'Game saved to Firestore!');
        loadManagedGames();
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save game');
    }
  };

  const handleDelete = async (game: any) => {
    Alert.alert('Delete Game', `Are you sure you want to delete "${game.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const result = await deleteGame(game.id);
            if (result.success) {
              Alert.alert('Success', 'Game deleted');
              loadManagedGames();
            } else {
              Alert.alert('Error', result.error || 'Failed to delete game');
            }
          } catch (e) {
            Alert.alert('Error', 'Failed to delete game');
          }
        },
      },
    ]);
  };

  const handleQuickUpdate = async (game: any) => {
    try {
      const updatedData = { isFeatured: !game.isFeatured };
      const result = await updateGame(game.id, updatedData);
      if (result && result.success) {
        Alert.alert('Success', 'Game updated');
        loadManagedGames();
      } else {
        const errMsg = result?.error || 'Update failed';
        Alert.alert('Error', errMsg);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to update game');
    }
  };

  const filteredGames = (view === 'managed' ? managedGames : externalGames).filter((game: any) =>
    game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (game.category && game.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderGameItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.thumbnail || item.thumb }} style={styles.thumbnail} />
      
      {/* Bottom Right Badge: Show only one (Hot prioritized) */}
      <View style={styles.bottomRightBadge}>
        {item.isNew ? (
          <View style={[styles.statusBadge, styles.badgeNew]}>
            <Text style={styles.statusBadgeText}>Hot</Text>
          </View>
        ) : item.isFeatured ? (
          <View style={[styles.statusBadge, styles.badgeFeatured]}>
            <Text style={styles.statusBadgeText}>Featured</Text>
          </View>
        ) : null}
      </View>

      {/* Action Buttons Overlay - Top Right */}
      <View style={styles.actionOverlay}>
        {view === 'managed' ? (
          <>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.deleteBtn]} 
              onPress={() => handleDelete(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="trash" size={16} color="#FF4B4B" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.updateBtn]} 
              onPress={() => handleQuickUpdate(item)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="refresh-outline" 
                size={18} 
                color={Theme.colors.lime} 
              />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity 
            style={[styles.actionBtn, styles.saveBtn]} 
            onPress={() => handleSave(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="cloud-download" size={20} color={Theme.colors.lime} />
          </TouchableOpacity>
        )}
      </View>

      <LinearGradient
        colors={['transparent', 'rgba(13, 13, 26, 0.95)']}
        style={styles.gradientOverlay}
      >
        <View style={styles.cardInfo}>
          <Text style={styles.gameTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.gameCategory} numberOfLines={1}>{item.category || 'General'}</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <RefreshSpinner refreshing={refreshing} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Games Management</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, view === 'managed' && styles.activeTab]} onPress={() => setView('managed')}>
          <Text style={[styles.tabText, view === 'managed' && styles.activeTabText]}>Managed</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, view === 'import' && styles.activeTab]} onPress={() => setView('import')}>
          <Text style={[styles.tabText, view === 'import' && styles.activeTabText]}>Import</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={20} color={Theme.colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          placeholder={`Search ${view === 'managed' ? 'managed' : 'external'} games...`}
          placeholderTextColor={Theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={Theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={Theme.colors.lime} />
          <Text style={styles.loadingText}>Loading games...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredGames}
          keyExtractor={(item, index) => item.id || item.gameMonetizeId || index.toString()}
          renderItem={renderGameItem}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMoreExternal}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor="transparent" 
              colors={['transparent']} 
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="game-controller-outline" size={60} color={Theme.colors.textMuted} />
              <Text style={styles.emptyText}>No games found.</Text>
            </View>
          }
          ListFooterComponent={
            loadingMoreExt ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={Theme.colors.lime} />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 5,
  },
  headerTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: '900',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#1E1E26',
    borderRadius: 12,
    padding: 4,
    marginTop: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: Theme.colors.lime,
  },
  tabText: {
    color: Theme.colors.textSecondary,
    fontWeight: '700',
    fontSize: 14,
  },
  activeTabText: {
    color: Theme.colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E26',
    marginHorizontal: 20,
    marginVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 12,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  grid: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.4,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1E1E26',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    position: 'relative',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  actionOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'column',
    gap: 6,
    zIndex: 20,
  },
  bottomRightBadge: {
    position: 'absolute',
    bottom: 50, // Above the info section
    right: 8,
    zIndex: 20,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(13, 13, 26, 0.85)',
    borderWidth: 1,
  },
  badgeFeatured: {
    borderColor: Theme.colors.lime,
  },
  badgeNew: {
    borderColor: '#FF4B4B',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: Theme.colors.textPrimary,
    textTransform: 'uppercase',
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(13, 13, 26, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  deleteBtn: {
    backgroundColor: 'rgba(13, 13, 26, 0.95)',
    borderColor: 'rgba(255, 75, 75, 0.4)',
  },
  updateBtn: {
    backgroundColor: 'rgba(13, 13, 26, 0.95)',
    borderColor: 'rgba(212, 255, 0, 0.4)',
  },
  saveBtn: {
    backgroundColor: 'rgba(13, 13, 26, 0.95)',
    borderColor: 'rgba(212, 255, 0, 0.4)',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
    justifyContent: 'flex-end',
  },
  cardInfo: {
    padding: 12,
  },
  gameTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gameCategory: {
    fontSize: 10,
    color: Theme.colors.textSecondary,
    fontWeight: '700',
    flex: 1,
    marginRight: 6,
    textTransform: 'uppercase',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  loadingText: {
    color: Theme.colors.textSecondary,
    marginTop: 10,
    fontWeight: '600',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyState: {
    paddingTop: 100,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Theme.colors.textSecondary,
    marginTop: 15,
    fontWeight: '700',
  },
});

export default AdminGames;
