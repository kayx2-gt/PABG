import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useAuth } from '../context/AuthContext';
import { auth } from '../api/firebase';
import { Theme } from '../utils/theme';
import { Game } from '../types/game';
import { fetchRecentGames, fetchUserProfile } from '../api/api';

const Profile = ({ navigation }: any) => {
  const { user, isAdmin } = useAuth();

  // Profile state
  const [recentGames, setRecentGames] = useState<Game[]>([]);
  const [userStats, setUserStats] = useState({
    totalPoints: 0,
    totalGamesPlayed: 0,
    totalMissionsCompleted: 0,
    name: '',
    photoURL: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recentData, profileData] = await Promise.all([
        fetchRecentGames(),
        fetchUserProfile()
      ]);

      setRecentGames(Array.isArray(recentData) ? recentData : []);

      if (profileData && !profileData.error) {
        setUserStats({
          totalPoints: profileData.totalPoints || 0,
          totalGamesPlayed: profileData.totalGamesPlayed || 0,
          totalMissionsCompleted: profileData.totalMissionsCompleted || 0,
          name: profileData.name || (user?.isAnonymous ? 'Guest' : user?.displayName || 'Gamer'),
          photoURL: profileData.photoURL || user?.photoURL || ''
        });
      }
    } catch (error) {
      console.error("Error loading profile data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        onPress: async () => {
          try {
            await GoogleSignin.signOut();
          } catch (error) {
            console.error("Google sign out error", error);
          }
          await auth.signOut();
        }
      }
    ]);
  };

  const renderRecentItem = ({ item }: { item: Game }) => (
    <TouchableOpacity
      style={styles.recentCard}
      onPress={() => navigation.navigate('GameDetails', { game: item })}
      disabled={isAdmin}
      activeOpacity={isAdmin ? 1 : 0.7}
    >
      <Image source={{ uri: item.thumbnail }} style={styles.recentThumbnail} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.9)']}
        style={styles.cardGradient}
      />
      <Text style={styles.recentTitle} numberOfLines={1}>{item.title}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#2A2A35' }]} edges={['top', 'left', 'right']}>
      {/* Custom Top Navigation / Back button */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate(isAdmin ? 'AdminMain' : 'Main');
            }
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ backgroundColor: Theme.colors.background }} contentContainerStyle={{ paddingBottom: 45 }}>
        {/* Profile Header */}
        <LinearGradient
          colors={['#2A2A35', Theme.colors.background]}
          style={styles.profileHeader}
        >
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {userStats.photoURL ? (
                <Image source={{ uri: userStats.photoURL }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {userStats.name.substring(0, 1).toUpperCase() || 'G'}
                </Text>
              )}
            </View>
          </View>

          <Text style={styles.userName}>{userStats.name}</Text>
          <Text style={styles.userEmail}>{user?.email || (user?.isAnonymous ? 'Guest Account' : '')}</Text>

          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userStats.totalPoints}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userStats.totalMissionsCompleted}</Text>
              <Text style={styles.statLabel}>Missions</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userStats.totalGamesPlayed}</Text>
              <Text style={styles.statLabel}>Played</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Recently Played Section */}
        <View style={[styles.section, { paddingHorizontal: 0 }]}>
          <View style={[styles.sectionHeader, { paddingHorizontal: 20 }]}>
            <Text style={styles.sectionTitle}>Recently Played</Text>
            <TouchableOpacity onPress={() => loadData()}>
              <Ionicons name="refresh-outline" size={18} color={Theme.colors.lime} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={Theme.colors.lime} style={{ marginVertical: 40 }} />
          ) : recentGames.length > 0 ? (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={recentGames}
              keyExtractor={(item) => `recent-profile-${item.id}`}
              renderItem={renderRecentItem}
              style={styles.recentList}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            />
          ) : (
            <View style={styles.emptyRecent}>
              <Ionicons name="play-circle-outline" size={40} color={Theme.colors.textMuted} />
              <Text style={styles.emptyText}>No games played yet</Text>
            </View>
          )}
        </View>

        {/* Account Options & Navigation to Settings / Logout */}
        <View style={[styles.section, { marginBottom: 40 }]}>
          <Text style={styles.settingsSectionTitle}>OPTIONS</Text>
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.7}
            >
              <View style={styles.optionLeft}>
                <Ionicons name="settings-outline" size={22} color={Theme.colors.lime} />
                <Text style={styles.optionText}>Settings</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Theme.colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionRow}
              onPress={handleSignOut}
              activeOpacity={0.7}
            >
              <View style={styles.optionLeft}>
                <Ionicons name="log-out-outline" size={22} color="#FF4B4B" />
                <Text style={[styles.optionText, { color: '#FF4B4B' }]}>Log Out</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255, 75, 75, 0.4)" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2A2A35',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
  },
  profileHeader: { alignItems: 'center', paddingVertical: 35, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  avatarContainer: { position: 'relative', marginBottom: 15 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: Theme.colors.lime, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 45 },
  avatarText: { fontSize: 36, fontWeight: '800', color: Theme.colors.background },
  userName: { fontSize: 24, fontWeight: '800', color: Theme.colors.textPrimary },
  userEmail: { fontSize: 14, color: Theme.colors.textSecondary, marginTop: 4 },
  statsBar: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, marginTop: 25, paddingVertical: 15, paddingHorizontal: 20, alignItems: 'center' },
  statItem: { alignItems: 'center', paddingHorizontal: 15 },
  statValue: { fontSize: 18, fontWeight: '800', color: Theme.colors.textPrimary },
  statLabel: { fontSize: 10, color: Theme.colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, height: 25, backgroundColor: 'rgba(255,255,255,0.1)' },
  section: { marginTop: 25, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Theme.colors.textPrimary },
  settingsSectionTitle: { fontSize: 12, fontWeight: '700', color: Theme.colors.textMuted, marginBottom: 10, letterSpacing: 0.5 },
  optionsContainer: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 15, overflow: 'hidden' },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
    marginLeft: 15,
  },
  recentList: { paddingBottom: 10 },
  recentCard: { width: 140, height: 180, borderRadius: 15, overflow: 'hidden', backgroundColor: Theme.colors.surface },
  recentThumbnail: { width: '100%', height: '100%' },
  cardGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 },
  recentTitle: { position: 'absolute', bottom: 12, left: 12, right: 12, fontSize: 13, fontWeight: 'bold', color: Theme.colors.textPrimary },
  emptyRecent: { alignItems: 'center', paddingVertical: 40, backgroundColor: 'rgba(255,255,255,0.02)', marginHorizontal: 20, borderRadius: 20 },
  emptyText: { color: Theme.colors.textMuted, marginTop: 10, fontSize: 14 },
});

export default Profile;