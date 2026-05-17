import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme } from '../utils/theme';
import { Game } from '../types/game';
import { useAuth } from '../context/AuthContext';
import { fetchFavorites } from '../api/api';

const Favorites = ({ navigation }: any) => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Game[]>([]);
  const [localLibrary, setLocalLibrary] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      let email: string | undefined;

      if (user?.isAnonymous) {
        email = await AsyncStorage.getItem('guestEmail') || undefined;
      } else if (user?.email) {
        email = user.email;
      }

      const favData = await fetchFavorites(email);
      const serverFavorites = Array.isArray(favData) ? favData : [];

      // load local library from AsyncStorage
      const libRaw = await AsyncStorage.getItem('libraryGames');
      const localLib = libRaw ? JSON.parse(libRaw) : [];
      setLocalLibrary(Array.isArray(localLib) ? localLib : []);

      // merge server favorites and local library (unique by id), prefer local library entries
      const mergedMap: Record<string, Game> = {};
      [...serverFavorites, ...(Array.isArray(localLib) ? localLib : [])].forEach((g: Game) => {
        mergedMap[g.id] = g;
      });
      const merged = Object.values(mergedMap) as Game[];
      setFavorites(merged);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const saveToLibrary = async (game: Game) => {
    try {
      const raw = await AsyncStorage.getItem('libraryGames');
      const lib = raw ? JSON.parse(raw) : [];
      if (!lib.find((g: Game) => g.id === game.id)) {
        lib.push(game);
        await AsyncStorage.setItem('libraryGames', JSON.stringify(lib));
        setLocalLibrary(lib);
        setFavorites(prev => (prev.find(p => p.id === game.id) ? prev : [game, ...prev]));
        Alert.alert('Saved', 'Game saved to your library');
      } else {
        Alert.alert('Info', 'Game already in your library');
      }
    } catch (e) { console.error(e); Alert.alert('Error', 'Failed to save to library'); }
  };

  const removeFromLibrary = async (gameId: string) => {
    try {
      const raw = await AsyncStorage.getItem('libraryGames');
      const lib = raw ? JSON.parse(raw) : [];
      const updated = (lib as Game[]).filter((g: Game) => g.id !== gameId);
      await AsyncStorage.setItem('libraryGames', JSON.stringify(updated));
      setLocalLibrary(updated);
      setFavorites(prev => prev.filter(p => p.id !== gameId));
      Alert.alert('Removed', 'Game removed from your library');
    } catch (e) { console.error(e); Alert.alert('Error', 'Failed to remove from library'); }
  };

  const isInLibrary = (gameId: string) => {
    return localLibrary.some(g => g.id === gameId);
  };

  const playGame = (game: Game) => {
    navigation.navigate('GamePlayer', { gameUrl: game.gameUrl, gameId: game.id });
  };

  const renderGameItem = ({ item }: { item: Game }) => {
    const inLib = isInLibrary(item.id);
    return (
      <View style={styles.gameCard}>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }} onPress={() => navigation.navigate('GameDetails', { game: item })}>
          <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
          <View style={styles.gameInfo}>
            <Text style={styles.gameTitle}>{item.title}</Text>
            <Text style={styles.gameCategory}>{item.category}</Text>
          </View>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => playGame(item)} style={styles.iconBtn}>
            <Ionicons name="play-circle" size={28} color={Theme.colors.lime} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => inLib ? removeFromLibrary(item.id) : saveToLibrary(item)} style={styles.iconBtn}>
            <Ionicons name={inLib ? 'bookmark' : 'bookmark-outline'} size={22} color={inLib ? Theme.colors.lime : Theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.title}>My Favorites</Text>
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

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Theme.colors.lime} />
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={80} color={Theme.colors.textMuted} />
          <Text style={styles.emptyText}>No favorite games yet.</Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.browseBtnText}>Browse Games</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          renderItem={renderGameItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: { padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: Theme.colors.textPrimary },
  list: { paddingHorizontal: 20, paddingBottom: 120 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
  },
  thumbnail: { width: 60, height: 60, borderRadius: 8 },
  gameInfo: { flex: 1, marginLeft: 15 },
  gameTitle: { fontSize: 16, fontWeight: 'bold', color: Theme.colors.textPrimary },
  gameCategory: { fontSize: 14, color: Theme.colors.textSecondary, marginTop: 4 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
  emptyText: { fontSize: 18, color: Theme.colors.textSecondary, marginTop: 20 },
  browseBtn: { marginTop: 30, backgroundColor: Theme.colors.lime, paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25 },
  browseBtnText: { color: Theme.colors.background, fontWeight: 'bold', fontSize: 16 },
  iconBtn: { padding: 8, marginLeft: 8 }
});

export default Favorites;