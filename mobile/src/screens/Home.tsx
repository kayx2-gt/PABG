import React, { useEffect, useState, useRef, memo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchGames, fetchFeaturedGames, fetchNewGames, fetchGamesByCategory } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { auth } from '../api/firebase';
import { Game } from '../types/game';
import { Theme } from '../utils/theme';
import { HomeSkeleton } from '../components/SkeletonLoader';

const Home = ({ navigation }: any) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [featuredGames, setFeaturedGames] = useState<Game[]>([]);
  const [newGames, setNewGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const featuredListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadData();
    // Reset scroll position when category changes
    featuredListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [selectedCategory]);

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

      <Text style={styles.greeting}>
        Hi, {user?.displayName ? user.displayName.split(' ')[0] : (user?.email?.split('@')[0] || 'Gamer')}!{"\n"}Ready to play?
      </Text>

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
      <FlatList
        data={newGames}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NewGameRow item={item} />}
        ListHeaderComponent={renderHeader}
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
  greeting: { fontSize: Theme.typography.greeting.size, fontWeight: Theme.typography.greeting.weight, color: Theme.colors.textPrimary, marginTop: 10, marginBottom: 20, lineHeight: 28 * 1.15, paddingHorizontal: 20 },
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
  badgeText: { color: Theme.colors.background, fontSize: 9, fontWeight: '900' }
});

export default Home;
