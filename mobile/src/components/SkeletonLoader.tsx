import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { Theme } from '../utils/theme';

const { width } = Dimensions.get('window');

const SkeletonCard = ({ horizontal = false }) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  if (horizontal) {
    return (
      <View style={styles.horizontalCard}>
        <Animated.View style={[styles.image, { opacity: pulseAnim }]} />
        <View style={styles.content}>
          <Animated.View style={[styles.titleLine, { opacity: pulseAnim, width: '70%' }]} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.listRow}>
      <Animated.View style={[styles.square, { opacity: pulseAnim }]} />
      <View style={{ flex: 1, marginLeft: 15 }}>
        <Animated.View style={[styles.titleLine, { opacity: pulseAnim, width: '60%' }]} />
        <Animated.View style={[styles.subLine, { opacity: pulseAnim, width: '40%' }]} />
      </View>
    </View>
  );
};

export const HomeSkeleton = () => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.rowJustify}>
          <View style={styles.rectShort} />
          <View style={styles.row}>
            <View style={styles.circle} />
            <View style={styles.circle} />
          </View>
        </View>
        <View style={[styles.rectShort, { width: 100, height: 25, borderRadius: 12, marginTop: 15 }]} />
        <View style={[styles.rectLong, { marginTop: 20 }]} />
        <View style={[styles.rectLong, { width: '60%' }]} />
      </View>

      {/* Categories */}
      <View style={styles.sectionHeader} />
      <View style={styles.row}>
        {[1, 2, 3, 4].map((i) => <View key={i} style={styles.chip} />)}
      </View>

      {/* Top Games */}
      <View style={styles.sectionHeader} />
      <View style={styles.row}>
        {[1, 2].map((i) => <SkeletonCard key={i} horizontal={true} />)}
      </View>

      {/* New Games */}
      <View style={styles.sectionHeader} />
      {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, marginBottom: 10 },
  row: { flexDirection: 'row' },
  rowJustify: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rectShort: { width: 150, height: 20, backgroundColor: Theme.colors.surface, borderRadius: 4 },
  rectLong: { width: '80%', height: 35, backgroundColor: Theme.colors.surface, borderRadius: 8, marginBottom: 10 },
  circle: { width: 24, height: 24, borderRadius: 12, backgroundColor: Theme.colors.surface, marginLeft: 15 },
  sectionHeader: { width: 100, height: 15, backgroundColor: Theme.colors.surface, borderRadius: 4, marginHorizontal: 20, marginBottom: 15, marginTop: 10 },
  chip: { width: 80, height: 35, borderRadius: 18, backgroundColor: Theme.colors.surface, marginLeft: 20 },
  horizontalCard: { width: width * 0.45, height: 180, backgroundColor: Theme.colors.surface, borderRadius: 20, marginLeft: 20 },
  image: { width: '100%', height: '100%', backgroundColor: '#2A2A2A', borderRadius: 20 },
  content: { position: 'absolute', bottom: 12, left: 12, right: 12 },
  titleLine: { height: 12, backgroundColor: '#2A2A2A', borderRadius: 6 },
  subLine: { height: 10, backgroundColor: '#2A2A2A', borderRadius: 5, marginTop: 8 },
  listRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.surface, marginHorizontal: 20, padding: 12, borderRadius: 16, marginBottom: 12 },
  square: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#2A2A2A' },
});

export default SkeletonCard;
