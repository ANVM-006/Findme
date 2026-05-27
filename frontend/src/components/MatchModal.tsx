import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { UserProfile } from '../types';

interface MatchModalProps {
  visible: boolean;
  onClose: () => void;
  onSendMessage: () => void;
  matchedUser: UserProfile;
  currentUser: UserProfile;
}

const { width, height } = Dimensions.get('window');
const NUM_PARTICLES = 16;

const MatchModal = ({
  visible,
  onClose,
  onSendMessage,
  matchedUser,
  currentUser,
}: MatchModalProps): JSX.Element => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const particleAnims = useRef(
    Array.from({ length: NUM_PARTICLES }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (visible) {
      // Reset
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      particleAnims.forEach(p => {
        p.x.setValue(0);
        p.y.setValue(0);
        p.opacity.setValue(0);
        p.scale.setValue(0);
      });

      // Main entrance
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();

      // Particles burst
      const particleAnimations = particleAnims.map((p, i) => {
        const angle = (i / NUM_PARTICLES) * Math.PI * 2;
        const radius = 80 + Math.random() * 80;
        const targetX = Math.cos(angle) * radius;
        const targetY = Math.sin(angle) * radius;

        return Animated.sequence([
          Animated.delay(200 + i * 30),
          Animated.parallel([
            Animated.timing(p.opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.spring(p.scale, {
              toValue: 1,
              friction: 4,
              useNativeDriver: true,
            }),
            Animated.timing(p.x, {
              toValue: targetX,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(p.y, {
              toValue: targetY,
              duration: 600,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(p.opacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]);
      });

      Animated.stagger(20, particleAnimations).start();
    }
  }, [visible]);

  const currentPhotoUrl =
    currentUser.profile_photo ||
    (currentUser.photos && currentUser.photos.length > 0
      ? currentUser.photos[0].photo_url
      : null);

  const matchedPhotoUrl =
    matchedUser.profile_photo ||
    (matchedUser.photos && matchedUser.photos.length > 0
      ? matchedUser.photos[0].photo_url
      : null);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={styles.overlay}>
        {/* Particles */}
        <View style={styles.particlesContainer} pointerEvents="none">
          {particleAnims.map((p, i) => (
            <Animated.View
              key={i}
              style={[
                styles.particle,
                {
                  opacity: p.opacity,
                  transform: [
                    { translateX: p.x },
                    { translateY: p.y },
                    { scale: p.scale },
                  ],
                  backgroundColor: i % 3 === 0 ? colors.primary : i % 3 === 1 ? colors.primaryLight : colors.match,
                  width: 6 + (i % 4) * 2,
                  height: 6 + (i % 4) * 2,
                  borderRadius: 4 + (i % 4),
                },
              ]}
            />
          ))}
        </View>

        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Title */}
          <Text style={styles.matchEmoji}>🎉</Text>
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.titleGradient}
          >
            <Text style={styles.matchTitle}>¡Es un Match!</Text>
          </LinearGradient>
          <Text style={styles.matchSubtitle}>
            Tú y{' '}
            <Text style={styles.matchName}>{matchedUser.name}</Text>
            {'\n'}se gustaron mutuamente
          </Text>

          {/* Photos */}
          <View style={styles.photosRow}>
            {/* Current user */}
            <View style={styles.photoWrapper}>
              {currentPhotoUrl ? (
                <Image source={{ uri: currentPhotoUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Ionicons name="person" size={36} color={colors.textMuted} />
                </View>
              )}
              <View style={styles.photoBorder} />
            </View>

            {/* Heart */}
            <View style={styles.heartContainer}>
              <LinearGradient
                colors={[colors.primary, colors.primaryLight]}
                style={styles.heartBg}
              >
                <Ionicons name="heart" size={28} color={colors.text} />
              </LinearGradient>
            </View>

            {/* Matched user */}
            <View style={styles.photoWrapper}>
              {matchedPhotoUrl ? (
                <Image source={{ uri: matchedPhotoUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Ionicons name="person" size={36} color={colors.textMuted} />
                </View>
              )}
              <View style={styles.photoBorder} />
            </View>
          </View>

          {/* Buttons */}
          <TouchableOpacity onPress={onSendMessage} activeOpacity={0.85}>
            <LinearGradient
              colors={[colors.primary, colors.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.messageButton}
            >
              <Ionicons name="chatbubble-ellipses" size={20} color={colors.text} />
              <Text style={styles.messageButtonText}>Enviar Mensaje</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.continueButton} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.continueText}>Seguir Explorando</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  particlesContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 1,
    height: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  particle: {
    position: 'absolute',
  },
  card: {
    width: width * 0.88,
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  matchEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  titleGradient: {
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 6,
    marginBottom: 12,
  },
  matchTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 1,
  },
  matchSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  matchName: {
    color: colors.text,
    fontWeight: '700',
  },
  photosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 36,
    gap: 0,
  },
  photoWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarFallback: {
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoBorder: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 51,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  heartContainer: {
    zIndex: 1,
    marginHorizontal: -12,
  },
  heartBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  messageButton: {
    width: width * 0.7,
    height: 54,
    borderRadius: 27,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  messageButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  continueButton: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 24,
    width: width * 0.7,
  },
  continueText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default MatchModal;
