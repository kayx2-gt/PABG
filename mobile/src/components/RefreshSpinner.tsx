import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';

const RefreshSpinner = ({ refreshing }: { refreshing: boolean }) => {
  const rotation = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (refreshing) {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 8,
      }).start();
      Animated.loop(
        Animated.timing(rotation, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.linear,
        })
      ).start();
    } else {
      Animated.timing(scale, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      rotation.stopAnimation();
      rotation.setValue(0);
    }
  }, [refreshing]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!refreshing) return null;

  return (
    <Animated.View
      style={[
        styles.refreshSpinner,
        { transform: [{ scale }, { rotate: spin }] },
      ]}
    >
      <Text style={{ fontSize: 24 }}>⚡</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  refreshSpinner: {
    position: 'absolute',
    alignSelf: 'center',
    top: 90,
    zIndex: 99,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(230,248,53,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(230,248,53,0.3)',
  },
});

export default RefreshSpinner;
