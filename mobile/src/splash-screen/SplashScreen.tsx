import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { Theme } from '../utils/theme';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onAnimationComplete?: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onAnimationComplete }) => {
  // Animation values
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const boxY = useRef(new Animated.Value(80)).current;
  const boxScale = useRef(new Animated.Value(0.5)).current;
  const boxRotateX = useRef(new Animated.Value(0.3)).current;
  const boxRotateY = useRef(new Animated.Value(0)).current;
  const boxRotateZ = useRef(new Animated.Value(0)).current;
  const lidAngle = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textScale = useRef(new Animated.Value(0.2)).current;
  const textY = useRef(new Animated.Value(40)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;
  const sparkles = useRef([...Array(8)].map(() => ({
    opacity: new Animated.Value(0),
    scale: new Animated.Value(0),
    x: new Animated.Value(0),
    y: new Animated.Value(0),
  }))).current;
  const boxShadow = useRef(new Animated.Value(0)).current;
  const vignetteOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Initial box entrance with 3D rotation
    const entranceAnimation = Animated.parallel([
      Animated.spring(boxY, {
        toValue: 0,
        friction: 5,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.spring(boxScale, {
        toValue: 1,
        friction: 5,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(boxRotateX, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]);

    // 3D floating and gentle rotation
    const floatAnimation = Animated.loop(
      Animated.sequence([
        // Float up and tilt
        Animated.parallel([
          Animated.timing(boxY, {
            toValue: -15,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(boxRotateY, {
            toValue: 0.2,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(boxRotateZ, {
            toValue: 0.05,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        // Float down and tilt back
        Animated.parallel([
          Animated.timing(boxY, {
            toValue: 0,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(boxRotateY, {
            toValue: -0.15,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(boxRotateZ, {
            toValue: -0.03,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ]),
      { iterations: 1 }
    );

    // Glow pulsing
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0.3,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // Start entrance
    entranceAnimation.start(() => {
      floatAnimation.start();
      glowAnimation.start();
    });

    // After floating phase, reveal text
    setTimeout(() => {
      floatAnimation.stop();
      
      // Settle box with satisfying landing
      Animated.parallel([
        Animated.spring(boxY, {
          toValue: 0,
          friction: 3,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.spring(boxRotateY, {
          toValue: 0,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.spring(boxRotateZ, {
          toValue: 0,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start();

      // Open lid with dramatic effect
      setTimeout(() => {
        // Lid springs open
        Animated.spring(lidAngle, {
          toValue: 1,
          friction: 4,
          tension: 50,
          useNativeDriver: true,
        }).start();

        // Box jumps slightly when opening
        Animated.sequence([
          Animated.timing(boxY, {
            toValue: -25,
            duration: 150,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.spring(boxY, {
            toValue: 0,
            friction: 3,
            tension: 100,
            useNativeDriver: true,
          }),
        ]).start();

        // Sparkles burst from box
        sparkles.forEach((sparkle, index) => {
          const angle = (index / sparkles.length) * Math.PI * 2;
          const radius = 50 + Math.random() * 40;
          
          Animated.sequence([
            Animated.delay(index * 40 + 100),
            Animated.parallel([
              Animated.timing(sparkle.opacity, {
                toValue: 1,
                duration: 500,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.timing(sparkle.scale, {
                toValue: 1,
                duration: 500,
                easing: Easing.out(Easing.back(2)),
                useNativeDriver: true,
              }),
              Animated.timing(sparkle.x, {
                toValue: Math.cos(angle) * radius,
                duration: 600,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.timing(sparkle.y, {
                toValue: Math.sin(angle) * radius - 20,
                duration: 600,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
            ]),
            Animated.parallel([
              Animated.timing(sparkle.opacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(sparkle.scale, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }),
            ]),
          ]).start();
        });

        // Shadow grows when lid opens
        Animated.timing(boxShadow, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();

        // Text emerges dramatically
        setTimeout(() => {
          Animated.parallel([
            Animated.spring(textScale, {
              toValue: 1,
              friction: 4,
              tension: 70,
              useNativeDriver: true,
            }),
            Animated.spring(textY, {
              toValue: -70,
              friction: 4,
              tension: 60,
              useNativeDriver: true,
            }),
            Animated.timing(textOpacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(glowPulse, {
              toValue: 2,
              duration: 400,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]).start();

          // Box fades after text appears
          setTimeout(() => {
            Animated.parallel([
              Animated.timing(boxScale, {
                toValue: 0.3,
                duration: 500,
                easing: Easing.back(3),
                useNativeDriver: true,
              }),
              Animated.timing(boxY, {
                toValue: -40,
                duration: 500,
                easing: Easing.in(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.timing(boxRotateX, {
                toValue: 0.5,
                duration: 500,
                useNativeDriver: true,
              }),
            ]).start();

            // Settle and display title for 1200ms, then cross-fade out the whole screen!
            setTimeout(() => {
              Animated.timing(containerOpacity, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
              }).start(() => {
                if (onAnimationComplete) {
                  onAnimationComplete();
                }
              });
            }, 1200);
          }, 400);
        }, 300);
      }, 400);
    }, 2000);
  }, []);

  // 3D Box transforms
  const box3DStyle = {
    transform: [
      { perspective: 800 },
      { translateY: boxY },
      { scale: boxScale },
      { rotateX: boxRotateX.interpolate({
        inputRange: [-0.5, 0.5],
        outputRange: ['-30deg', '30deg'],
      })},
      { rotateY: boxRotateY.interpolate({
        inputRange: [-0.5, 0.5],
        outputRange: ['-25deg', '25deg'],
      })},
      { rotateZ: boxRotateZ.interpolate({
        inputRange: [-0.1, 0.1],
        outputRange: ['-6deg', '6deg'],
      })},
    ] as any,
  };

  // Lid 3D rotation
  const lid3DStyle = {
    transform: [
      { perspective: 800 },
      { rotateX: lidAngle.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '-110deg'],
      })},
      { translateY: lidAngle.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, -2, -5],
      })},
    ] as any,
    transformOrigin: 'bottom center',
  };

  const textStyle = {
    opacity: textOpacity,
    transform: [
      { translateY: textY },
      { scale: textScale },
    ],
  };

  const shadowStyle = {
    transform: [
      { scale: boxShadow.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.8],
      })},
    ],
    opacity: boxShadow.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.8],
    }),
  };

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      {/* Vignette effect */}
      <Animated.View style={[styles.vignette, { opacity: vignetteOpacity }]} />
      
      {/* Ambient particles in background */}
      <View style={styles.ambientParticle1} />
      <View style={styles.ambientParticle2} />
      <View style={styles.ambientParticle3} />
      
      {/* Light rays from box */}
      <Animated.View style={[styles.lightRay, { 
        opacity: glowPulse.interpolate({
          inputRange: [0, 1, 2],
          outputRange: [0.1, 0.3, 0.6],
        }),
        transform: [{ scale: glowPulse.interpolate({
          inputRange: [0, 1, 2],
          outputRange: [0.8, 1.2, 1.5],
        })}],
      }]} />
      
      {/* Ground shadow */}
      <Animated.View style={[styles.groundShadow, shadowStyle]}>
        <View style={styles.shadowInner} />
      </Animated.View>
      
      {/* 3D Treasure Box */}
      <Animated.View style={[styles.box3DContainer, box3DStyle]}>
        {/* Back face of lid */}
        <Animated.View style={[styles.lidBackFace, lid3DStyle]}>
          <View style={styles.lidBackSurface} />
        </Animated.View>
        
        {/* Lid top */}
        <Animated.View style={[styles.lidTop, lid3DStyle]}>
          <View style={styles.lidTopSurface}>
            <View style={styles.lidHandleBase} />
            <View style={styles.lidHandle} />
          </View>
          <View style={styles.lidFrontSurface}>
            <View style={styles.lidEdgeHighlight} />
            <View style={styles.lidOrnament}>
              <View style={styles.ornamentDiamond} />
            </View>
          </View>
        </Animated.View>
        
        {/* Box body - front face */}
        <View style={styles.boxFront}>
          <View style={styles.boxFrontHighlight} />
          <View style={styles.boxLockPlate}>
            <View style={styles.lockOuter} />
            <View style={styles.lockInner} />
            <View style={styles.lockKeyhole}>
              <View style={styles.keyholeCircle} />
              <View style={styles.keyholeTriangle} />
            </View>
          </View>
          <View style={styles.boxBorderBottom} />
        </View>
        
        {/* Box body - side face (right) */}
        <View style={styles.boxSide}>
          <View style={styles.sidePanel} />
          <View style={styles.sideEdge} />
        </View>
        
        {/* Box body - side face (left) */}
        <View style={styles.boxSideLeft}>
          <View style={styles.sidePanelLeft} />
        </View>
        
        {/* Inner glow when lid opens */}
        <Animated.View style={[styles.innerGlow, {
          opacity: lidAngle.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0.8, 1],
          }),
        }]} />
      </Animated.View>
      
      {/* Sparkle particles */}
      {sparkles.map((sparkle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.sparkle,
            {
              opacity: sparkle.opacity,
              transform: [
                { translateX: sparkle.x },
                { translateY: sparkle.y },
                { scale: sparkle.scale },
                { rotate: sparkle.scale.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '180deg'],
                })},
              ],
            },
          ]}
        >
          <View style={[
            styles.sparkleDiamond,
            { backgroundColor: index % 2 === 0 ? Theme.colors.lime : Theme.colors.purple }
          ]} />
        </Animated.View>
      ))}
      
      {/* PABG Text */}
      <Animated.View style={[styles.textContainer, textStyle]}>
        <View style={styles.textWrapper}>
          <Text style={styles.titleText}>PABG</Text>
          <View style={styles.titleUnderline} />
        </View>
        <Text style={styles.subtitleText}>PRESS ANY BUTTON GAME</Text>
        <View style={styles.subtitleLine} />
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: Theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  vignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 100,
    elevation: 100,
  },
  ambientParticle1: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Theme.colors.lime,
    opacity: 0.2,
    top: '25%',
    left: '25%',
  },
  ambientParticle2: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Theme.colors.purple,
    opacity: 0.15,
    top: '30%',
    right: '30%',
  },
  ambientParticle3: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Theme.colors.lime,
    opacity: 0.1,
    bottom: '35%',
    left: '30%',
  },
  lightRay: {
    position: 'absolute',
    width: 200,
    height: 300,
    backgroundColor: Theme.colors.lime,
    opacity: 0.15,
    borderRadius: 100,
    top: '28%',
    transform: [{ scaleX: 1.5 }],
    filter: 'blur(20px)',
  },
  groundShadow: {
    position: 'absolute',
    width: 120,
    height: 30,
    bottom: '42%',
    alignItems: 'center',
  },
  shadowInner: {
    width: 100,
    height: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 50,
    transform: [{ scaleX: 1.4 }],
  },
  box3DContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 50,
    position: 'relative',
  },
  lidBackFace: {
    position: 'absolute',
    top: -45,
    width: 120,
    height: 45,
    zIndex: 1,
  },
  lidBackSurface: {
    width: 120,
    height: 45,
    backgroundColor: Theme.colors.elevated,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    opacity: 0.5,
  },
  lidTop: {
    position: 'absolute',
    top: -45,
    width: 120,
    zIndex: 3,
  },
  lidTopSurface: {
    width: 120,
    height: 25,
    backgroundColor: Theme.colors.elevated,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 3,
    borderColor: '#4A4A6A',
    borderBottomWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  lidHandleBase: {
    width: 50,
    height: 10,
    backgroundColor: Theme.colors.lime,
    borderRadius: 5,
    marginTop: 4,
    opacity: 0.9,
    shadowColor: Theme.colors.lime,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  lidHandle: {
    width: 30,
    height: 6,
    backgroundColor: '#A3CC00',
    borderRadius: 3,
    position: 'absolute',
    top: 8,
  },
  lidFrontSurface: {
    width: 120,
    height: 20,
    backgroundColor: '#2A2A40',
    borderWidth: 3,
    borderColor: '#4A4A6A',
    borderTopWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lidEdgeHighlight: {
    position: 'absolute',
    top: 0,
    width: 120,
    height: 2,
    backgroundColor: Theme.colors.lime,
    opacity: 0.3,
  },
  lidOrnament: {
    position: 'absolute',
    right: 20,
    top: -15,
    width: 16,
    height: 16,
  },
  ornamentDiamond: {
    width: 12,
    height: 12,
    backgroundColor: Theme.colors.purple,
    transform: [{ rotate: '45deg' }],
    borderWidth: 2,
    borderColor: Theme.colors.lime,
    borderRadius: 2,
    shadowColor: Theme.colors.lime,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  boxFront: {
    width: 120,
    height: 85,
    backgroundColor: Theme.colors.surface,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 3,
    borderColor: '#4A4A6A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
    zIndex: 2,
    position: 'relative',
  },
  boxFrontHighlight: {
    position: 'absolute',
    top: 0,
    width: 120,
    height: 3,
    backgroundColor: Theme.colors.lime,
    opacity: 0.3,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  boxLockPlate: {
    width: 40,
    height: 40,
    backgroundColor: '#2A2A40',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#5A5A7A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    marginTop: -10,
  },
  lockOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Theme.colors.purple,
    borderWidth: 2,
    borderColor: '#8B5CF6',
    shadowColor: Theme.colors.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#6D28D9',
    borderWidth: 2,
    borderColor: Theme.colors.lime,
    shadowColor: Theme.colors.lime,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
  },
  lockKeyhole: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyholeCircle: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.colors.lime,
    shadowColor: Theme.colors.lime,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
  keyholeTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Theme.colors.lime,
    marginTop: -1,
  },
  boxBorderBottom: {
    position: 'absolute',
    bottom: 0,
    width: 120,
    height: 4,
    backgroundColor: Theme.colors.purple,
    opacity: 0.3,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  boxSide: {
    position: 'absolute',
    right: -25,
    top: 0,
    width: 30,
    height: 85,
    backgroundColor: '#1A1A2E',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 12,
    borderWidth: 2,
    borderColor: '#4A4A6A',
    borderLeftWidth: 0,
    zIndex: 1,
    transform: [{ skewY: '5deg' }],
  },
  sidePanel: {
    width: 20,
    height: 60,
    backgroundColor: '#1E1E34',
    marginTop: 10,
    marginLeft: 5,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#5A5A7A',
  },
  sideEdge: {
    position: 'absolute',
    left: 0,
    width: 3,
    height: 85,
    backgroundColor: '#3A3A5A',
  },
  boxSideLeft: {
    position: 'absolute',
    left: -25,
    top: 0,
    width: 30,
    height: 85,
    backgroundColor: '#151525',
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 12,
    borderWidth: 2,
    borderColor: '#4A4A6A',
    borderRightWidth: 0,
    zIndex: 1,
    transform: [{ skewY: '-5deg' }],
  },
  sidePanelLeft: {
    width: 20,
    height: 60,
    backgroundColor: '#181830',
    marginTop: 10,
    marginLeft: 3,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#4A4A6A',
  },
  innerGlow: {
    position: 'absolute',
    top: -40,
    width: 100,
    height: 40,
    backgroundColor: Theme.colors.lime,
    opacity: 0,
    borderRadius: 50,
    filter: 'blur(10px)',
    zIndex: 4,
  },
  sparkle: {
    position: 'absolute',
    top: '38%',
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleDiamond: {
    width: 8,
    height: 8,
    transform: [{ rotate: '45deg' }],
    borderRadius: 1,
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: '30%',
  },
  textWrapper: {
    alignItems: 'center',
  },
  titleText: {
    fontSize: 52,
    fontWeight: '900',
    color: Theme.colors.textPrimary,
    letterSpacing: 8,
    textShadowColor: Theme.colors.lime,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 25,
    includeFontPadding: false,
  },
  titleUnderline: {
    width: 120,
    height: 3,
    backgroundColor: Theme.colors.lime,
    marginTop: 4,
    borderRadius: 1.5,
    shadowColor: Theme.colors.lime,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  subtitleText: {
    fontSize: 11,
    fontWeight: '800',
    color: Theme.colors.textSecondary,
    letterSpacing: 5,
    marginTop: 16,
    opacity: 0.8,
  },
  subtitleLine: {
    width: 40,
    height: 1,
    backgroundColor: Theme.colors.textMuted,
    marginTop: 8,
    opacity: 0.5,
  },
});

export default SplashScreen;