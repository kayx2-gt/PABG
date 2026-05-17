import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../utils/theme';
import { Game } from '../types/game';
import { fetchGames } from '../api/api';
import { useAuth } from '../context/AuthContext';

const Search = ({ navigation }: any) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      const games = await fetchGames();
      setAllGames(Array.isArray(games) ? games : []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim().length === 0) {
      setFilteredGames([]);
    } else {
      const filtered = allGames.filter(game => 
        game.title.toLowerCase().includes(text.toLowerCase()) ||
        game.category.toLowerCase().includes(text.toLowerCase()) ||
        (game.tags && game.tags.toLowerCase().includes(text.toLowerCase()))
      );
      setFilteredGames(filtered);
    }
  };

  const renderGameItem = ({ item }: { item: Game }) => (
    <TouchableOpacity
      style={styles.gameCard}
      onPress={() => navigation.navigate('GameDetails', { game: item })}
    >
      <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
      <View style={styles.gameInfo}>
        <Text style={styles.gameTitle}>{item.title}</Text>
        <Text style={styles.gameCategory}>{item.category}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.searchHeader}>
        {/* Header Top Row */}
        <View style={styles.headerTopRow}>
          <Text style={styles.logo}>Moba Launcher</Text>
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

        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Theme.colors.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder="Search games, tags, categories..."
            placeholderTextColor={Theme.colors.textMuted}
            value={searchQuery}
            onChangeText={handleSearch}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color={Theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {searchQuery.length === 0 ? (
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>🔥 Recommended Games</Text>
          <FlatList
            data={allGames.slice(0, 5)}
            keyExtractor={(item) => `rec-${item.id}`}
            renderItem={renderGameItem}
            contentContainerStyle={[styles.list, { paddingBottom: 120 }]}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={60} color={Theme.colors.textMuted} />
                <Text style={styles.emptyText}>Find your next favorite game</Text>
              </View>
            }
          />
        </View>
      ) : filteredGames.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No games found for "{searchQuery}"</Text>
        </View>
      ) : (
        <FlatList
          data={filteredGames}
          keyExtractor={(item) => item.id}
          renderItem={renderGameItem}
          contentContainerStyle={[styles.list, { paddingBottom: 120 }]}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 5,
  },
  searchHeader: { padding: 20 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  logo: { fontSize: Theme.typography.logo.size, fontWeight: Theme.typography.logo.weight, color: '#FFFFFF' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 50,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    color: Theme.colors.textPrimary,
    fontSize: 16,
  },
  list: { padding: 20 },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
  },
  thumbnail: { width: 50, height: 50, borderRadius: 8 },
  gameInfo: { flex: 1, marginLeft: 15 },
  gameTitle: { fontSize: 16, fontWeight: 'bold', color: Theme.colors.textPrimary },
  gameCategory: { fontSize: 14, color: Theme.colors.textSecondary, marginTop: 2 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
  emptyText: { fontSize: 16, color: Theme.colors.textSecondary, marginTop: 20 },
});

export default Search;
