import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../utils/theme';
import { Game } from '../types/game';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 55) / 2;

const GamesList = ({ route, navigation }: any) => {
  const { title, games } = route.params || { title: 'Games', games: [] };
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGames = games.filter((game: Game) =>
    game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (game.category && game.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderGameCard = ({ item }: { item: Game }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('GameDetails', { game: item })}
    >
      <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
      <View style={styles.gradientOverlay}>
        <View style={styles.cardInfo}>
          <Text style={styles.gameTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.gameCategory} numberOfLines={1}>{item.category || 'General'}</Text>
            {item.playCount !== undefined && (
              <View style={styles.playBadge}>
                <Ionicons name="play" size={8} color={Theme.colors.background} />
                <Text style={styles.playCountText}>{item.playCount}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={{ width: 40 }} /> {/* Spacer to center title */}
      </View>

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={20} color={Theme.colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          placeholder={`Search in ${title.toLowerCase()}...`}
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

      {/* Grid List */}
      {filteredGames.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={60} color={Theme.colors.textMuted} />
          <Text style={styles.emptyText}>No games found.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredGames}
          keyExtractor={(item) => item.id}
          renderItem={renderGameCard}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E1E26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: Theme.colors.textPrimary,
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
    paddingBottom: 40,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.35,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1E1E26',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    position: 'relative',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    object-fit: 'cover',
  },
  gradientOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(13, 13, 26, 0.4)',
    justifyContent: 'flex-end',
  },
  cardInfo: {
    padding: 10,
    background: 'linear-gradient(180deg, rgba(13,13,26,0) 0%, rgba(13,13,26,0.95) 100%)',
    backgroundColor: 'rgba(13, 13, 26, 0.85)',
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
  },
  playBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.lime,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  playCountText: {
    fontSize: 8,
    fontWeight: '900',
    color: Theme.colors.background,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  emptyText: {
    fontSize: 16,
    color: Theme.colors.textSecondary,
    marginTop: 15,
    fontWeight: '700',
  },
});

export default GamesList;
