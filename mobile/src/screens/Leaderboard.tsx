import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Easing,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchLeaderboard, fetchUserProfile, upsertUser, claimMission } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { Theme } from '../utils/theme';

// ─── Mission Config ─────────────────────────────────────────────────
const MISSION_CONFIG: Record<string, { icon: string; iconBg: string; difficulty: 'easy' | 'medium' | 'hard' }> = {
  dailyLogin: { icon: '📅', iconBg: '#1a3a2a', difficulty: 'easy' },
  randomGame5: { icon: '🎯', iconBg: '#1a1a3a', difficulty: 'easy' },
  games10: { icon: '🎮', iconBg: '#1a2a1a', difficulty: 'easy' },
  games15: { icon: '⚔️', iconBg: '#2a1a1a', difficulty: 'medium' },
  games20: { icon: '🔥', iconBg: '#2a1a0a', difficulty: 'medium' },
  variety20: { icon: '🌈', iconBg: '#1a1a2a', difficulty: 'medium' },
  hours10: { icon: '⏱️', iconBg: '#1a2a2a', difficulty: 'hard' },
  streak7: { icon: '🔐', iconBg: '#2a2a1a', difficulty: 'hard' },
  favorites10: { icon: '⭐', iconBg: '#2a2a0a', difficulty: 'medium' },
  totalGames100: { icon: '🎲', iconBg: '#1a1a1a', difficulty: 'hard' },
  member30: { icon: '👑', iconBg: '#2a1a0a', difficulty: 'hard' },
};

const DIFFICULTY_COLORS = {
  easy: '#27C864',
  medium: '#E6F835',
  hard: '#FF5A5A',
};

// ─── Confetti Particle ──────────────────────────────────────────────
const ConfettiParticle = ({ color, delay }: { color: string; delay: number }) => {
  const y = useRef(new Animated.Value(0)).current;
  const x = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const randX = (Math.random() - 0.5) * 120;
    Animated.parallel([
      Animated.timing(y, { toValue: 80, duration: 700, delay, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      Animated.timing(x, { toValue: randX, duration: 700, delay, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 700, delay: delay + 200, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{
      position: 'absolute', width: 6, height: 6, borderRadius: 3,
      backgroundColor: color,
      transform: [{ translateY: y }, { translateX: x }],
      opacity,
    }} />
  );
};

// ─── Refresh Spinner ───────────────────────────────────────────────
const RefreshSpinner = ({ refreshing }: { refreshing: boolean }) => {
  const rotation = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (refreshing) {
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }).start();
      Animated.loop(
        Animated.timing(rotation, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.linear })
      ).start();
    } else {
      Animated.timing(scale, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      rotation.stopAnimation();
      rotation.setValue(0);
    }
  }, [refreshing]);
  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  if (!refreshing) return null;
  return (
    <Animated.View style={[styles.refreshSpinner, { transform: [{ scale }, { rotate: spin }] }]}>
      <Text style={{ fontSize: 24 }}>⚡</Text>
    </Animated.View>
  );
};

// ─── Skeleton Loader ───────────────────────────────────────────────
const SkeletonItem = ({ index }: { index: number }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, delay: index * 100, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[styles.skeletonRow, { opacity }]}>
      <View style={styles.skeletonRank} />
      <View style={styles.skeletonAvatar} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={styles.skeletonName} />
        <View style={styles.skeletonSub} />
      </View>
      <View style={styles.skeletonScore} />
    </Animated.View>
  );
};

// ─── Animated Row ──────────────────────────────────────────────────
const AnimatedRow = ({ children, index }: { children: React.ReactNode; index: number }) => {
  const translateY = useRef(new Animated.Value(30)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 400, delay: index * 60, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(opacity, { toValue: 1, duration: 400, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ transform: [{ translateY }], opacity }}>
      {children}
    </Animated.View>
  );
};

// ─── Mini Progress Bar ─────────────────────────────────────────────
const MiniProgressBar = ({ progress, total, color }: { progress: number; total: number; color: string }) => {
  const width = useRef(new Animated.Value(0)).current;
  const percent = total > 0 ? Math.min(progress / total, 1) : 0;
  useEffect(() => {
    Animated.timing(width, { toValue: percent, duration: 700, useNativeDriver: false, easing: Easing.out(Easing.ease) }).start();
  }, [percent]);
  return (
    <View style={styles.progressBarBg}>
      <Animated.View style={[styles.progressBarFill, {
        width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        backgroundColor: color,
      }]} />
    </View>
  );
};

// ─── Mission Card ───────────────────────────────────────────────────
const MissionCard = ({ item, index, onClaim, claimingId }: any) => {
  const config = MISSION_CONFIG[item.id] || { icon: '🎯', iconBg: '#1a1a1a', difficulty: 'easy' };
  const diffColor = DIFFICULTY_COLORS[config.difficulty];
  const isClaimed = item.status === 'claimed';
  const isReady = item.status === 'ready';
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiColors = ['#E6F835', '#27C864', '#FF5A5A', '#5AF0FF', '#FF9F1C'];

  const handleClaim = async () => {
    setShowConfetti(true);
    await onClaim(item.id, item.points);
    setTimeout(() => setShowConfetti(false), 1000);
  };

  let progressNum = 0;
  let totalNum = 0;
  if (item.progress && typeof item.progress === 'string' && item.progress.includes('/')) {
    const parts = item.progress.split('/');
    progressNum = parseInt(parts[0]) || 0;
    totalNum = parseInt(parts[1]) || 0;
  }

  return (
    <AnimatedRow index={index}>
      <View style={[styles.missionCard, isClaimed && styles.missionCardClaimed, { borderLeftColor: diffColor, borderLeftWidth: 3 }]}>
        {showConfetti && confettiColors.map((c, i) => (
          <ConfettiParticle key={i} color={c} delay={i * 60} />
        ))}
        <View style={[styles.missionIconContainer, { backgroundColor: config.iconBg }]}>
          <Text style={styles.missionIcon}>{config.icon}</Text>
        </View>
        <View style={styles.missionInfo}>
          <View style={styles.titleRow}>
            <Text style={[styles.missionTitle, isClaimed && styles.missionTitleClaimed]} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={[styles.pointsBadge, { backgroundColor: `${diffColor}22` }]}>
              <Text style={[styles.pointsBadgeText, { color: diffColor }]}>+{item.points}</Text>
            </View>
          </View>
          <Text style={styles.missionDesc}>{item.desc}</Text>
          {totalNum > 0 && !isClaimed && (
            <View style={{ marginTop: 6 }}>
              <MiniProgressBar progress={progressNum} total={totalNum} color={diffColor} />
              <Text style={[styles.progressText, { color: diffColor }]}>{item.progress}</Text>
            </View>
          )}
        </View>
        <View style={styles.missionStatus}>
          {isClaimed ? (
            <View style={styles.claimedBadge}>
              <Text style={styles.claimedCheck}>✓</Text>
              <Text style={styles.claimedText}>Done</Text>
            </View>
          ) : isReady ? (
            <TouchableOpacity style={styles.claimBtn} onPress={handleClaim} disabled={claimingId === item.id}>
              {claimingId === item.id
                ? <ActivityIndicator size="small" color="#000" />
                : <Text style={styles.claimBtnText}>Claim</Text>}
            </TouchableOpacity>
          ) : (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>Pending</Text>
            </View>
          )}
        </View>
      </View>
    </AnimatedRow>
  );
};

// ─── Podium Component ──────────────────────────────────────────────
const Podium = ({ top3, currentUid }: { top3: any[]; currentUid: string }) => {
  // Order: 2nd (left), 1st (center), 3rd (right)
  const podiumOrder = [top3[1], top3[0], top3[2]];
  const podiumHeights = [90, 130, 70]; // 2nd, 1st, 3rd
  const avatarSizes = [64, 88, 56];  // 2nd, 1st, 3rd
  const rankColors = ['#C0C0C0', '#FFD700', '#CD7F32'];
  const ranks = [2, 1, 3];

  const gradients: [string, string][] = [
    ['rgba(192,192,192,0.2)', 'rgba(192,192,192,0.05)'],
    ['rgba(255,215,0,0.25)', 'rgba(255,215,0,0.06)'],
    ['rgba(205,127,50,0.2)', 'rgba(205,127,50,0.05)'],
  ];

  return (
    <View style={styles.podiumWrapper}>
      {/* Players row - avatars aligned to bottom of their column */}
      <View style={styles.podiumPlayersRow}>
        {podiumOrder.map((item, i) => {
          if (!item) return <View key={i} style={{ flex: 1 }} />;
          const isMe = item.id === currentUid;
          const size = avatarSizes[i];
          const displayName = item.name || (item.email ? item.email.split('@')[0] : 'Gamer');

          return (
            <View key={item.id || i} style={styles.podiumCol}>
              {/* Crown only for #1 */}
              {ranks[i] === 1 && <Text style={styles.crownEmoji}>👑</Text>}
              {ranks[i] !== 1 && <View style={{ height: 36 }} />}

              {/* Avatar */}
              <View style={[
                styles.podiumAvatar,
                {
                  width: size, height: size, borderRadius: size / 2,
                  borderColor: rankColors[i],
                  borderWidth: ranks[i] === 1 ? 3 : 2,
                }
              ]}>
                {item.photoURL
                  ? <Image source={{ uri: item.photoURL }} style={{ width: '100%', height: '100%', borderRadius: size / 2 }} />
                  : <Text style={[styles.podiumAvatarText, { fontSize: ranks[i] === 1 ? 28 : 20 }]}>
                    {displayName.substring(0, 1).toUpperCase()}
                  </Text>}
                {isMe && (
                  <View style={styles.podiumYouBadge}>
                    <Text style={styles.youBadgeText}>YOU</Text>
                  </View>
                )}
              </View>

              {/* Name */}
              <Text style={[styles.podiumName, { color: rankColors[i] }]} numberOfLines={1}>
                {displayName}
              </Text>

              {/* Score */}
              <Text style={[styles.podiumScore, {
                color: rankColors[i],
                fontSize: ranks[i] === 1 ? 24 : 18,
              }]}>
                {item.totalPoints || 0}
              </Text>
              <Text style={[styles.podiumPts, { color: rankColors[i] + '99' }]}>pts</Text>

              {/* Podium Block */}
              <LinearGradient
                colors={gradients[i]}
                style={[
                  styles.podiumBlock,
                  {
                    height: podiumHeights[i],
                    borderColor: rankColors[i],
                    borderTopWidth: 2,
                  }
                ]}
              >
                <Text style={[styles.podiumBlockRank, { color: rankColors[i] }]}>#{ranks[i]}</Text>
              </LinearGradient>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// ─── Main Component ────────────────────────────────────────────────
const Leaderboard = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimingAll, setClaimingAll] = useState(false);
  const [activeTab, setActiveTab] = useState<'rankings' | 'missions'>('rankings');

  const tabAnim = useRef(new Animated.Value(0)).current;

  const switchTab = (tab: 'rankings' | 'missions') => {
    setActiveTab(tab);
    Animated.spring(tabAnim, { toValue: tab === 'rankings' ? 0 : 1, useNativeDriver: false, tension: 60, friction: 10 }).start();
  };

  const loadData = async (forceUpsert = false) => {
    try {
      let profileRes = await fetchUserProfile().catch(() => null);
      if (!profileRes || !profileRes.missions || forceUpsert) {
        if (user) {
          await upsertUser(user.displayName || 'Gamer', user.email || '', user.photoURL || undefined);
          profileRes = await fetchUserProfile().catch(() => null);
        }
      }
      const leaderboardRes = await fetchLeaderboard().catch(() => []);
      const sortedData = [...leaderboardRes].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
      setData(sortedData);
      setMyProfile(profileRes);
    } catch (e) {
      console.error('Error loading leaderboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const handleClaim = async (missionId: string, points: number) => {
    setClaimingId(missionId);
    try {
      await claimMission(missionId);
      Alert.alert('🎉 Claimed!', `You received ${points} points!`);
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to claim mission. Try again later.');
    } finally {
      setClaimingId(null);
    }
  };

  const handleClaimAll = async () => {
    if (!myData?.missions) return;
    const m = myData.missions;
    const allMissions = [
      { id: 'dailyLogin', points: 1 }, { id: 'randomGame5', points: 3 },
      { id: 'games10', points: 5 }, { id: 'games15', points: 7 },
      { id: 'games20', points: 10 }, { id: 'variety20', points: 15 },
      { id: 'hours10', points: 20 }, { id: 'streak7', points: 25 },
      { id: 'favorites10', points: 10 }, { id: 'totalGames100', points: 30 },
      { id: 'member30', points: 50 },
    ];
    const readyMissions = allMissions.filter(mission => m[mission.id]?.status === 'ready');
    if (readyMissions.length === 0) { Alert.alert('No missions ready', 'Complete more missions first!'); return; }
    setClaimingAll(true);
    let totalClaimed = 0;
    for (const mission of readyMissions) {
      try { await claimMission(mission.id); totalClaimed += mission.points; } catch (e) { }
    }
    await loadData();
    setClaimingAll(false);
    Alert.alert('🎉 All Claimed!', `You received ${totalClaimed} points total!`);
  };

  const currentUid = user?.uid;
  const myRank = data.findIndex(item => item.id === currentUid) + 1;
  const myData = myProfile || data.find(item => item.id === currentUid);
  const totalMissionPoints = myData?.totalPoints || 0;
  const readyCount = myData?.missions
    ? Object.values(myData.missions).filter((m: any) => m?.status === 'ready').length
    : 0;

  const top3 = data.slice(0, 3);
  const restData = data.slice(3);

  // ─── Render Rank Item (4th+) ──────────────────────────────────────
  const renderRankItem = ({ item, index }: any) => {
    const isMe = item.id === currentUid;
    const rank = index + 4;
    const displayName = item.name || (item.email ? item.email.split('@')[0] : 'Gamer');

    return (
      <AnimatedRow index={index} key={item.id}>
        <View style={[styles.row, isMe && styles.myRow]}>
          <View style={styles.rankContainer}>
            <Text style={styles.rank}>#{rank}</Text>
          </View>
          <View style={{ position: 'relative', marginLeft: 4 }}>
            <View style={styles.avatarMini}>
              {item.photoURL
                ? <Image source={{ uri: item.photoURL }} style={styles.avatarMiniImage} />
                : <Text style={styles.avatarMiniText}>{displayName.substring(0, 1).toUpperCase()}</Text>}
            </View>
            {isMe && <View style={styles.youBadgeMini}><Text style={styles.youBadgeText}>YOU</Text></View>}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.gamesPlayed}>{item.totalMissionsCompleted || 0} missions • {item.formattedTime || '0m'}</Text>
          </View>
          <View style={styles.missionScoreContainer}>
            <Text style={styles.score}>{item.totalPoints || 0}</Text>
            <Text style={styles.ptsLabel}>pts</Text>
          </View>
        </View>
      </AnimatedRow>
    );
  };

  // ─── Render Missions Tab ──────────────────────────────────────────
  const renderMissions = () => {
    if (!myData || !myData.missions) return renderEmpty();
    const m = myData.missions;

    const daily = [
      { id: 'dailyLogin', title: 'Daily Login', desc: 'Open the app today', points: 1, status: m.dailyLogin?.status || 'pending' },
      { id: 'randomGame5', title: `Specialist: ${myData.dailyRandomGameTitle || 'Random Pick'}`, desc: 'Play 5 games of this pick', points: 3, progress: `${m.randomGame5?.progress || 0}/5`, status: m.randomGame5?.status || 'pending' },
      { id: 'games10', title: 'Gamer', desc: 'Play 10 games today', points: 5, progress: `${Math.min(myData.dailyGamesCount || 0, 10)}/10`, status: m.games10?.status || 'pending' },
      { id: 'games15', title: 'Pro Gamer', desc: 'Play 15 games today', points: 7, progress: `${Math.min(myData.dailyGamesCount || 0, 15)}/15`, status: m.games15?.status || 'pending' },
      { id: 'games20', title: 'Hardcore', desc: 'Play 20 games today', points: 10, progress: `${Math.min(myData.dailyGamesCount || 0, 20)}/20`, status: m.games20?.status || 'pending' },
    ];

    const accumulative = [
      { id: 'variety20', title: 'Variety King', desc: 'Play 20 different games', points: 15, progress: `${Math.min(myData.totalUniqueGames || 0, 20)}/20`, status: m.variety20?.status || 'pending' },
      { id: 'hours10', title: 'Time Warrior', desc: 'Reach 10 hours play time', points: 20, status: m.hours10?.status || 'pending' },
      { id: 'streak7', title: 'Loyal Fan', desc: '7-day login streak', points: 25, progress: `${Math.min(myData.loginStreak || 0, 7)}/7`, status: m.streak7?.status || 'pending' },
      { id: 'favorites10', title: 'Social Star', desc: 'Add 10 favorite games', points: 10, status: m.favorites10?.status || 'pending' },
      { id: 'totalGames100', title: 'High Roller', desc: 'Play 100 games total', points: 30, progress: `${Math.min(myData.totalGamesPlayed || 0, 100)}/100`, status: m.totalGames100?.status || 'pending' },
      { id: 'member30', title: 'Legend', desc: 'Member for 30 days', points: 50, status: m.member30?.status || 'pending' },
    ];

    return (
      <View style={styles.missionsList}>
        <LinearGradient colors={['rgba(230,248,53,0.15)', 'rgba(230,248,53,0.04)']} style={styles.totalPointsBanner}>
          <View>
            <Text style={styles.totalPointsLabel}>Total Points Earned</Text>
            <Text style={styles.totalPointsNum}>{totalMissionPoints} pts</Text>
          </View>
          <Text style={styles.totalPointsEmoji}>🏅</Text>
        </LinearGradient>

        {readyCount > 0 && (
          <TouchableOpacity style={styles.claimAllBtn} onPress={handleClaimAll} disabled={claimingAll}>
            {claimingAll
              ? <ActivityIndicator size="small" color="#000" />
              : <>
                <Text style={styles.claimAllText}>⚡ Claim All</Text>
                <View style={styles.claimAllBadge}>
                  <Text style={styles.claimAllBadgeText}>{readyCount}</Text>
                </View>
              </>}
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>Daily Tasks</Text>
        {daily.map((item, i) => (
          <MissionCard key={item.id} item={item} index={i} onClaim={handleClaim} claimingId={claimingId} />
        ))}

        <View style={styles.sectionDivider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ACHIEVEMENTS</Text>
          <View style={styles.dividerLine} />
        </View>

        {accumulative.map((item, i) => (
          <MissionCard key={item.id} item={item} index={i + daily.length} onClaim={handleClaim} claimingId={claimingId} />
        ))}
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🎯</Text>
      <Text style={styles.emptyTitle}>No players yet</Text>
      <Text style={styles.emptySubtitle}>Be the first on the leaderboard!</Text>
    </View>
  );

  const tabIndicatorLeft = tabAnim.interpolate({ inputRange: [0, 1], outputRange: ['2%', '52%'] });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Leaderboard</Text>
            <Text style={styles.subtitle}>Ranked by total points earned</Text>
          </View>
          {activeTab === 'rankings' && data.length > 0 && (
            <View style={styles.playerCountBadge}>
              <Text style={styles.playerCountNum}>{data.length}</Text>
              <Text style={styles.playerCountLabel}>players</Text>
            </View>
          )}
        </View>
      </View>

      <RefreshSpinner refreshing={refreshing} />

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <Animated.View style={[styles.tabIndicator, { left: tabIndicatorLeft }]} />
        <TouchableOpacity style={styles.tab} onPress={() => switchTab('rankings')}>
          <Text style={[styles.tabText, activeTab === 'rankings' && styles.tabTextActive]}>🏆 Rankings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => switchTab('missions')}>
          <Text style={[styles.tabText, activeTab === 'missions' && styles.tabTextActive]}>🎯 Missions</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={{ padding: 20 }}>
            {[...Array(6)].map((_, i) => <SkeletonItem key={i} index={i} />)}
          </View>
        ) : activeTab === 'rankings' ? (
          <FlatList
            data={restData}
            renderItem={renderRankItem}
            keyExtractor={(item, index) => index.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.lime} colors={[Theme.colors.lime]} />
            }
            ListHeaderComponent={
              top3.length > 0
                ? <Podium top3={top3} currentUid={currentUid || ''} />
                : undefined
            }
            ListEmptyComponent={top3.length === 0 ? renderEmpty() : <View style={{ height: 20 }} />}
            contentContainerStyle={{ padding: 20, paddingBottom: 200 }}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <FlatList
            data={[1]}
            renderItem={() => renderMissions()}
            keyExtractor={(_, index) => index.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.lime} colors={[Theme.colors.lime]} />
            }
            contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Sticky Rank Card */}
        {!loading && activeTab === 'rankings' && myData && (
          <View style={[styles.stickyContainer, { bottom: insets.bottom > 0 ? insets.bottom + 80 : 100 }]}>
            <View style={styles.myRankCard}>
              <View style={styles.avatarMini}>
                {myData.photoURL
                  ? <Image source={{ uri: myData.photoURL }} style={styles.avatarMiniImage} />
                  : <Text style={styles.avatarMiniText}>{(myData.name || 'G').substring(0, 1).toUpperCase()}</Text>}
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.myRankLabel}>YOUR STANDING</Text>
                <Text style={styles.name} numberOfLines={1}>{myData.name || 'You'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.myRankValue}>#{myRank > 0 ? myRank : '--'}</Text>
                <Text style={styles.myPointsValue}>{myData.totalPoints || 0} pts</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

// ─── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 30, fontWeight: '900', color: Theme.colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: Theme.colors.textSecondary, marginTop: 2 },

  playerCountBadge: {
    backgroundColor: 'rgba(230,248,53,0.1)', borderWidth: 1,
    borderColor: 'rgba(230,248,53,0.3)', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center',
  },
  playerCountNum: { fontSize: 22, fontWeight: '900', color: Theme.colors.lime },
  playerCountLabel: { fontSize: 10, color: Theme.colors.textSecondary, fontWeight: '600' },

  refreshSpinner: {
    position: 'absolute', alignSelf: 'center', top: 90, zIndex: 99,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(230,248,53,0.15)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(230,248,53,0.3)',
  },

  tabContainer: {
    flexDirection: 'row', marginHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, padding: 4, marginBottom: 16,
    position: 'relative', height: 44,
  },
  tabIndicator: { position: 'absolute', width: '46%', height: 36, backgroundColor: Theme.colors.lime, borderRadius: 13, top: 4 },
  tab: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '700', color: Theme.colors.textSecondary },
  tabTextActive: { color: Theme.colors.background },

  // ─── Podium ───────────────────────────────────────────────────────
  podiumWrapper: {
    marginBottom: 28,
    paddingHorizontal: 4,
  },
  podiumPlayersRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
  },
  podiumCol: {
    flex: 1,
    alignItems: 'center',
  },
  crownEmoji: { fontSize: 32, marginBottom: 2 },
  podiumAvatar: {
    backgroundColor: Theme.colors.lime,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'visible', marginBottom: 6,
  },
  podiumAvatarText: { color: Theme.colors.background, fontWeight: '900' },
  podiumYouBadge: {
    position: 'absolute', top: -6, right: -8,
    backgroundColor: Theme.colors.lime,
    paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: 5, borderWidth: 1.5, borderColor: Theme.colors.background,
  },
  podiumName: { fontSize: 11, fontWeight: '800', textAlign: 'center', marginBottom: 2, paddingHorizontal: 2 },
  podiumScore: { fontWeight: '900', textAlign: 'center' },
  podiumPts: { fontSize: 10, fontWeight: '600', marginBottom: 8 },
  podiumBlock: {
    width: '100%', borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
  },
  podiumBlockRank: { fontSize: 20, fontWeight: '900', paddingVertical: 10 },

  // ─── Rank Row (4th+) ──────────────────────────────────────────────
  row: {
    flexDirection: 'row', padding: 14,
    backgroundColor: '#1E1E26',
    borderRadius: 20, marginBottom: 10, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  myRow: {
    borderColor: Theme.colors.lime, borderWidth: 1.5,
    backgroundColor: '#212C12',
  },
  rankContainer: { width: 40, alignItems: 'center' },
  rank: { fontSize: 16, fontWeight: '900', color: Theme.colors.textSecondary },
  avatarMini: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Theme.colors.lime,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)',
  },
  avatarMiniImage: { width: '100%', height: '100%', borderRadius: 20 },
  avatarMiniText: { color: Theme.colors.background, fontSize: 15, fontWeight: '900' },
  youBadgeMini: {
    position: 'absolute', top: -5, right: -8,
    backgroundColor: Theme.colors.lime,
    paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: 5, borderWidth: 1.5, borderColor: Theme.colors.background,
  },
  youBadgeText: { color: Theme.colors.background, fontSize: 8, fontWeight: '900' },
  userInfo: { flex: 1, marginLeft: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: Theme.colors.textPrimary },
  gamesPlayed: { fontSize: 11, color: Theme.colors.textSecondary, marginTop: 2 },
  missionScoreContainer: { alignItems: 'center', minWidth: 50 },
  score: { fontSize: 20, fontWeight: '900', color: Theme.colors.lime },
  ptsLabel: { fontSize: 9, color: Theme.colors.textSecondary, fontWeight: '600' },

  // ─── Missions ─────────────────────────────────────────────────────
  missionsList: { paddingBottom: 20 },
  totalPointsBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderRadius: 18, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(230,248,53,0.25)',
  },
  totalPointsLabel: { fontSize: 11, color: Theme.colors.lime, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  totalPointsNum: { fontSize: 28, fontWeight: '900', color: Theme.colors.textPrimary },
  totalPointsEmoji: { fontSize: 36 },
  claimAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Theme.colors.lime, borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 20, marginBottom: 16,
    shadowColor: Theme.colors.lime, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  claimAllText: { fontSize: 15, fontWeight: '900', color: '#000' },
  claimAllBadge: { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 },
  claimAllBadgeText: { fontSize: 12, fontWeight: '900', color: '#000' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Theme.colors.textPrimary, marginBottom: 12 },
  sectionDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dividerText: { fontSize: 11, fontWeight: '800', color: Theme.colors.textSecondary, marginHorizontal: 12, letterSpacing: 1.5 },
  missionCard: {
    flexDirection: 'row', padding: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18, marginBottom: 10, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden',
  },
  missionCardClaimed: { backgroundColor: 'rgba(39,200,100,0.07)', borderColor: 'rgba(39,200,100,0.2)' },
  missionIconContainer: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  missionIcon: { fontSize: 24 },
  missionInfo: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2, flexWrap: 'wrap' },
  missionTitle: { fontSize: 14, fontWeight: '700', color: Theme.colors.textPrimary },
  missionTitleClaimed: { color: 'rgba(39,200,100,0.9)' },
  pointsBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8 },
  pointsBadgeText: { fontSize: 10, fontWeight: '900' },
  missionDesc: { fontSize: 11, color: Theme.colors.textSecondary, marginTop: 1 },
  progressBarBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden', marginTop: 6 },
  progressBarFill: { height: 4, borderRadius: 2 },
  progressText: { fontSize: 10, fontWeight: '700', marginTop: 3 },
  missionStatus: { alignItems: 'flex-end', minWidth: 72, marginLeft: 8 },
  claimBtn: {
    backgroundColor: Theme.colors.lime, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12,
    shadowColor: Theme.colors.lime, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },
  claimBtnText: { color: '#000', fontSize: 12, fontWeight: '900' },
  claimedBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(39,200,100,0.15)', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(39,200,100,0.4)',
  },
  claimedCheck: { color: 'rgba(39,200,100,1)', fontSize: 12, fontWeight: '900', marginRight: 3 },
  claimedText: { color: 'rgba(39,200,100,0.9)', fontSize: 11, fontWeight: '700' },
  pendingBadge: { backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  pendingText: { color: Theme.colors.textSecondary, fontSize: 11, fontWeight: '600' },

  // Skeleton
  skeletonRow: { flexDirection: 'row', padding: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, marginBottom: 10, alignItems: 'center' },
  skeletonRank: { width: 36, height: 20, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 6 },
  skeletonAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', marginLeft: 8 },
  skeletonName: { width: 120, height: 14, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 6, marginBottom: 6 },
  skeletonSub: { width: 70, height: 10, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 6 },
  skeletonScore: { width: 55, height: 18, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 6 },

  // Empty
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: Theme.colors.textPrimary, marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: Theme.colors.textSecondary, textAlign: 'center' },

  // Sticky Rank Card
  stickyContainer: { position: 'absolute', left: 0, right: 0 },
  myRankCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A1A22', marginHorizontal: 15, padding: 16, paddingBottom: 10, paddingTop: 10,
    borderRadius: 24, borderWidth: 2, borderColor: Theme.colors.lime,
    elevation: 20, shadowColor: Theme.colors.lime,
    shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.5, shadowRadius: 20,
  },
  myRankLabel: { fontSize: 10, fontWeight: '800', color: Theme.colors.lime, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  myRankValue: { fontSize: 26, fontWeight: '900', color: Theme.colors.lime },
  myPointsValue: { fontSize: 12, fontWeight: '700', color: Theme.colors.textSecondary },
});

export default Leaderboard;