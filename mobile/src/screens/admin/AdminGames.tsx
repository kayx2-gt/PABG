import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../utils/theme';
import { fetchManagedGames, fetchExternalGames, saveGame, deleteGame, updateGame } from '../../api/api';

const AdminGames = () => {
  const [view, setView] = useState<'managed' | 'import'>('managed');
  const [managedGames, setManagedGames] = useState<any[]>([]);
  const [externalGames, setExternalGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (view === 'managed') {
      loadManagedGames();
    } else {
      loadExternalGames();
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

  const loadExternalGames = async () => {
    setLoading(true);
    try {
      const games = await fetchExternalGames();
      setExternalGames(games);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch games from GameMonetize');
    }
    setLoading(false);
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
    // Example: toggle featured status as an update (customize as needed)
    const updatedData = { isFeatured: !game.isFeatured };
    const result = await updateGame(game.id, updatedData);
    // Assume API returns { success: true } on success or { error: "msg" } on failure
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
};;

  const renderGameItem = ({ item }: { item: any }) => (
    <View style={styles.gameCard}>
      <Image source={{ uri: item.thumbnail || item.thumb }} style={styles.thumbnail} />
      <View style={styles.gameInfo}>
        <Text style={styles.gameTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.gameCategory}>{item.category}</Text>
        <View style={styles.badgeContainer}>
          {item.isFeatured && <Text style={[styles.badge, styles.badgeFeatured]}>Featured</Text>}
          {item.isNew && <Text style={[styles.badge, styles.badgeNew]}>Hot</Text>}
        </View>
      </View>
      <View style={styles.actionContainer}>
        {view === 'managed' ? (
          <>
            <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(item)}>
              <Ionicons name="trash" size={20} color="#FF4B4B" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'rgba(212, 255, 0, 0.1)' }]} onPress={() => handleQuickUpdate(item)}>
              <Ionicons name="refresh" size={20} color={Theme.colors.lime} />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={[styles.actionBtn, styles.saveBtn]} onPress={() => handleSave(item)}>
            <Ionicons name="cloud-download" size={20} color={Theme.colors.lime} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Games</Text>
      </View>
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, view === 'managed' && styles.activeTab]} onPress={() => setView('managed')}>
          <Text style={[styles.tabText, view === 'managed' && styles.activeTabText]}>Managed</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, view === 'import' && styles.activeTab]} onPress={() => setView('import')}>
          <Text style={[styles.tabText, view === 'import' && styles.activeTabText]}>Import</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={Theme.colors.lime} style={styles.loader} />
      ) : (
        <FlatList
          data={view === 'managed' ? managedGames : externalGames}
          keyExtractor={(item, index) => item.id || index.toString()}
          renderItem={renderGameItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={<Text style={styles.emptyText}>No games found.</Text>}
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
    paddingBottom: 15,
  },
  headerTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: '900',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: Theme.colors.surface,
    borderRadius: 8,
    padding: 4,
    marginBottom: 15,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: Theme.colors.elevated,
  },
  tabText: {
    color: Theme.colors.textSecondary,
    fontWeight: '700',
  },
  activeTabText: {
    color: Theme.colors.lime,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  gameCard: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: Theme.colors.elevated,
  },
  gameInfo: {
    flex: 1,
    marginLeft: 15,
  },
  gameTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  gameCategory: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 6,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeFeatured: {
    backgroundColor: 'rgba(212, 255, 0, 0.1)',
    color: Theme.colors.lime,
  },
  badgeNew: {
    backgroundColor: 'rgba(255, 75, 75, 0.1)',
    color: '#FF4B4B',
  },
  actionContainer: {
    marginLeft: 10,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.colors.elevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  deleteBtn: {
    backgroundColor: 'rgba(255, 75, 75, 0.1)',
  },
  saveBtn: {
    backgroundColor: 'rgba(212, 255, 0, 0.1)',
  },
  loader: {
    marginTop: 50,
  },
  emptyText: {
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 50,
  },
});

export default AdminGames;
