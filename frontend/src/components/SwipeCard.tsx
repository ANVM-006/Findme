import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { UserProfile } from '../types';

interface SwipeCardProps {
  profile: UserProfile;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isTop: boolean;
  index: number;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.65;
const SWIPE_THRESHOLD = 120;

const SwipeCard = ({
  profile,
  onSwipeLeft,
  onSwipeRight,
  isTop,
  index,
}: SwipeCardProps): JSX.Element => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const allPhotos = [
    ...(profile.profile_photo ? [{ id: 'main', photo_url: profile.profile_photo, order_index: -1 }] : []),
    ...profile.photos,
  ];
  const displayPhotos = allPhotos.length > 0 ? allPhotos : [];

  const handleTap = (side: 'left' | 'right') => {
    if (displayPhotos.length <= 1) return;
    if (side === 'right') {
      setCurrentPhotoIndex(prev => Math.min(prev + 1, displayPhotos.length - 1));
    } else {
      setCurrentPhotoIndex(prev => Math.max(prev - 1, 0));
    }
  };

  const panGesture = Gesture.Pan()
    .enabled(isTop)
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = startX.value + event.translationX;
      translateY.value = startY.value + event.translationY;
    })
    .onEnd(() => {
      if (translateX.value > SWIPE_THRESHOLD) {
        translateX.value = withSpring(SCREEN_WIDTH * 1.5, { velocity: 800 });
        translateY.value = withSpring(translateY.value);
        runOnJS(onSwipeRight)();
      } else if (translateX.value < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-SCREEN_WIDTH * 1.5, { velocity: 800 });
        translateY.value = withSpring(translateY.value);
        runOnJS(onSwipeLeft)();
      } else {
        translateX.value = withSpring(0, { damping: 12, stiffness: 100 });
        translateY.value = withSpring(0, { damping: 12, stiffness: 100 });
      }
    });

  const cardAnimStyle = useAnimatedStyle(() => {
    const rotate = interpolate(translateX.value, [-200, 0, 200], [-15, 0, 15], Extrapolation.CLAMP);
    const scale = index === 0 ? 1 : index === 1 ? 0.95 : 0.9;
    const yOffset = index === 0 ? 0 : index * -12;

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value + yOffset },
        { rotate: `${rotate}deg` },
        { scale },
      ],
    };
  });

  const likeOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, 60, 120], [0, 0.7, 1], Extrapolation.CLAMP),
  }));

  const nopeOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-120, -60, 0], [1, 0.7, 0], Extrapolation.CLAMP),
  }));

  const currentPhoto =
    displayPhotos.length > 0 ? displayPhotos[currentPhotoIndex]?.photo_url : null;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, cardAnimStyle]}>
        {/* Photo */}
        <View style={styles.imageContainer}>
          {currentPhoto ? (
            <Image source={{ uri: currentPhoto }} style={styles.photo} resizeMode="cover" />
          ) : (
            <View style={styles.noPhoto}>
              <Ionicons name="person" size={80} color={colors.textMuted} />
            </View>
          )}

          {/* Tap zones for photo navigation */}
          {isTop && displayPhotos.length > 1 && (
            <>
              <TouchableWithoutFeedback onPress={() => handleTap('left')}>
                <View style={styles.tapLeft} />
              </TouchableWithoutFeedback>
              <TouchableWithoutFeedback onPress={() => handleTap('right')}>
                <View style={styles.tapRight} />
              </TouchableWithoutFeedback>
            </>
          )}

          {/* Photo dots */}
          {displayPhotos.length > 1 && (
            <View style={styles.dotsContainer}>
              {displayPhotos.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    { backgroundColor: i === currentPhotoIndex ? colors.text : 'rgba(255,255,255,0.4)' },
                  ]}
                />
              ))}
            </View>
          )}

          {/* Compatibility Score */}
          {profile.compatibility_score !== undefined && (
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreText}>{profile.compatibility_score}% 💫</Text>
            </View>
          )}

          {/* LIKE overlay */}
          <Animated.View style={[styles.likeOverlay, likeOpacityStyle]} pointerEvents="none">
            <View style={styles.likeBox}>
              <Ionicons name="heart" size={32} color={colors.like} />
              <Text style={styles.likeText}>GUSTA</Text>
            </View>
          </Animated.View>

          {/* NOPE overlay */}
          <Animated.View style={[styles.nopeOverlay, nopeOpacityStyle]} pointerEvents="none">
            <View style={styles.nopeBox}>
              <Ionicons name="close" size={32} color={colors.pass} />
              <Text style={styles.nopeText}>PASS</Text>
            </View>
          </Animated.View>

          {/* Bottom gradient & info */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.85)', '#000']}
            locations={[0, 0.6, 1]}
            style={styles.bottomGradient}
          >
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{profile.name}</Text>
                {profile.age && <Text style={styles.age}>, {profile.age}</Text>}
                {profile.is_online === 1 && <View style={styles.onlineDot} />}
              </View>

              {profile.career && (
                <View style={styles.infoRow}>
                  <Ionicons name="school-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{profile.career}</Text>
                </View>
              )}

              {profile.semester && (
                <View style={styles.infoRow}>
                  <Ionicons name="bookmark-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>Semestre {profile.semester}</Text>
                </View>
              )}

              {profile.bio ? (
                <Text style={styles.bio} numberOfLines={2}>
                  {profile.bio}
                </Text>
              ) : null}

              {/* Interests */}
              {profile.interests && profile.interests.length > 0 && (
                <View style={styles.interestsRow}>
                  {profile.interests.slice(0, 3).map((interest, i) => (
                    <View key={i} style={styles.interestTag}>
                      <Text style={styles.interestTagText}>{interest}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </LinearGradient>
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.cardBg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  noPhoto: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '40%',
    height: '70%',
  },
  tapRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: '60%',
    height: '70%',
  },
  dotsContainer: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  dot: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    maxWidth: 40,
  },
  scoreBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  scoreText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  likeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: colors.like,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: 20,
  },
  likeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${colors.like}20`,
    borderWidth: 2,
    borderColor: colors.like,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    transform: [{ rotate: '15deg' }],
  },
  likeText: {
    color: colors.like,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },
  nopeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: colors.pass,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    padding: 20,
  },
  nopeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${colors.pass}20`,
    borderWidth: 2,
    borderColor: colors.pass,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    transform: [{ rotate: '-15deg' }],
  },
  nopeText: {
    color: colors.pass,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: CARD_HEIGHT * 0.55,
    justifyContent: 'flex-end',
  },
  profileInfo: {
    padding: 20,
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  name: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.text,
  },
  age: {
    fontSize: 22,
    fontWeight: '400',
    color: colors.text,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.online,
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  bio: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  interestTag: {
    backgroundColor: 'rgba(255,45,91,0.2)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,45,91,0.4)',
  },
  interestTagText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
});

export default SwipeCard;
