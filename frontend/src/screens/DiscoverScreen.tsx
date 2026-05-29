import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Modal,
  TextInput,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import SwipeCard from '../components/SwipeCard';
import MatchModal from '../components/MatchModal';
import { UserProfile } from '../types';

const { width } = Dimensions.get('window');

const DiscoverScreen = (): JSX.Element => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [matchedUser, setMatchedUser] = useState<UserProfile | null>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [careerFilter, setCareerFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const passButtonScale = useRef(new Animated.Value(1)).current;
  const likeButtonScale = useRef(new Animated.Value(1)).current;

  const fetchProfiles = useCallback(async (reset = false) => {
    if (!hasMore && !reset) return;
    const currentPage = reset ? 1 : page;
    setLoading(reset || currentPage === 1);

    try {
      const params: Record<string, string | number> = { page: currentPage, limit: 10 };
      if (careerFilter) params.career = careerFilter;
      if (semesterFilter) params.semester = semesterFilter;

      const res = await apiClient.get('/api/discover', { params });
      const data: UserProfile[] = res.data?.users || res.data?.profiles || (Array.isArray(res.data) ? res.data : []);

      if (reset) {
        setProfiles(data);
        setCurrentIndex(0);
        setPage(2);
      } else {
        setProfiles(prev => [...prev, ...data]);
        setPage(p => p + 1);
      }

      setHasMore(data.length === 10);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, [careerFilter, semesterFilter, page, hasMore]);

  useEffect(() => {
    fetchProfiles(true);
  }, []);

  const remaining = profiles.length - currentIndex;

  useEffect(() => {
    if (remaining < 3 && hasMore && !loading) {
      fetchProfiles(false);
    }
  }, [remaining]);

  const handleSwipeRight = useCallback(async () => {
    if (currentIndex >= profiles.length) return;
    const target = profiles[currentIndex];
    setActionLoading(true);
    try {
      const res = await apiClient.post(`/api/likes/${target.id}`);
      if (res.data?.isMatch) {
        try {
          const profileRes = await apiClient.get(`/api/users/${target.id}`);
          setMatchedUser(profileRes.data || target);
        } catch {
          setMatchedUser(target);
        }
        setShowMatchModal(true);
      }
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
    setCurrentIndex(prev => prev + 1);
  }, [currentIndex, profiles]);

  const handleSwipeLeft = useCallback(async () => {
    if (currentIndex >= profiles.length) return;
    const target = profiles[currentIndex];
    try {
      await apiClient.post(`/api/likes/pass/${target.id}`);
    } catch {
      // ignore
    }
    setCurrentIndex(prev => prev + 1);
  }, [currentIndex, profiles]);

  const animateButton = (anim: Animated.Value, callback: () => void) => {
    Animated.sequence([
      Animated.spring(anim, { toValue: 0.85, useNativeDriver: true, friction: 5 }),
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 5 }),
    ]).start(callback);
  };

  const handleLikePress = () => {
    animateButton(likeButtonScale, handleSwipeRight);
  };

  const handlePassPress = () => {
    animateButton(passButtonScale, handleSwipeLeft);
  };

  const handleSendMessage = async () => {
    setShowMatchModal(false);
    if (!matchedUser) return;
    try {
      const res = await apiClient.post('/api/messages/conversations', {
        userId: matchedUser.id,
      });
      const conversationId = res.data?.id || res.data?.conversationId;
      if (conversationId) {
        navigation.navigate('Messages', {
          screen: 'Chat',
          params: { conversationId, otherUser: matchedUser },
        });
      }
    } catch {
      // ignore
    }
  };

  const applyFilters = () => {
    setShowFilters(false);
    setPage(1);
    setHasMore(true);
    fetchProfiles(true);
  };

  const visibleProfiles = profiles.slice(currentIndex, currentIndex + 3).reverse();
  const isEmpty = !loading && currentIndex >= profiles.length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>FINDME</Text>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="options-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Card Stack */}
      <View style={styles.cardContainer}>
        {loading && currentIndex === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loadingText}>Buscando perfiles...</Text>
          </View>
        ) : isEmpty ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="compass-outline" size={80} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Sin más perfiles</Text>
            <Text style={styles.emptySubtitle}>
              Has visto todos los perfiles disponibles. ¡Vuelve pronto!
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => fetchProfiles(true)}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.emptyButtonGradient}
              >
                <Text style={styles.emptyButtonText}>Ajustar filtros</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          visibleProfiles.map((profile, i) => {
            const actualIndex = currentIndex + (visibleProfiles.length - 1 - i);
            const isTop = actualIndex === currentIndex;
            const stackIndex = actualIndex - currentIndex;

            return (
              <SwipeCard
                key={profile.id}
                profile={profile}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
                isTop={isTop}
                index={stackIndex}
              />
            );
          })
        )}
      </View>

      {/* Action Buttons */}
      {!isEmpty && !loading && (
        <View style={styles.actionsContainer}>
          {/* Pass Button */}
          <Animated.View style={{ transform: [{ scale: passButtonScale }] }}>
            <TouchableOpacity
              style={[styles.actionButton, styles.passButton]}
              onPress={handlePassPress}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={32} color={colors.pass} />
            </TouchableOpacity>
          </Animated.View>

          {/* Info Button */}
          <TouchableOpacity style={styles.infoButton}>
            <Ionicons name="information-circle-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Like Button */}
          <Animated.View style={{ transform: [{ scale: likeButtonScale }] }}>
            <TouchableOpacity
              style={[styles.actionButton, styles.likeButton]}
              onPress={handleLikePress}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              <Ionicons name="heart" size={32} color={colors.like} />
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* Filter Modal */}
      <Modal visible={showFilters} transparent animationType="slide">
        <View style={styles.filterOverlay}>
          <View style={styles.filterSheet}>
            <View style={styles.filterHandle} />
            <Text style={styles.filterTitle}>Filtros</Text>

            <Text style={styles.filterLabel}>Carrera</Text>
            <TextInput
              style={styles.filterInput}
              placeholder="Ej: Ingeniería de Sistemas"
              placeholderTextColor={colors.textMuted}
              value={careerFilter}
              onChangeText={setCareerFilter}
            />

            <Text style={styles.filterLabel}>Semestre</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.semesterScroll}>
              <View style={styles.semesterRow}>
                {['', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.semesterChip,
                      semesterFilter === s && styles.semesterChipActive,
                    ]}
                    onPress={() => setSemesterFilter(s)}
                  >
                    <Text
                      style={[
                        styles.semesterChipText,
                        semesterFilter === s && styles.semesterChipTextActive,
                      ]}
                    >
                      {s === '' ? 'Todos' : `${s}°`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.filterButtons}>
              <TouchableOpacity
                style={styles.cancelFilterBtn}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.cancelFilterText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={applyFilters} style={styles.applyFilterBtn}>
                <LinearGradient
                  colors={[colors.primary, colors.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.applyFilterGradient}
                >
                  <Text style={styles.applyFilterText}>Aplicar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Match Modal */}
      {showMatchModal && matchedUser && user && (
        <MatchModal
          visible={showMatchModal}
          onClose={() => setShowMatchModal(false)}
          onSendMessage={handleSendMessage}
          matchedUser={matchedUser}
          currentUser={user}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  logo: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 3,
  },
  filterBtn: {
    width: 42,
    height: 42,
    backgroundColor: colors.surface,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  emptyContainer: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 12,
    width: 200,
  },
  emptyButtonGradient: {
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 16,
  },
  actionButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  passButton: {
    borderColor: colors.pass,
    backgroundColor: `${colors.pass}10`,
    shadowColor: colors.pass,
  },
  likeButton: {
    borderColor: colors.like,
    backgroundColor: `${colors.like}10`,
    shadowColor: colors.like,
  },
  infoButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  filterSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
  },
  filterHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  filterInput: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: 15,
    marginBottom: 20,
  },
  semesterScroll: {
    marginBottom: 28,
  },
  semesterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  semesterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  semesterChipActive: {
    backgroundColor: `${colors.primary}20`,
    borderColor: colors.primary,
  },
  semesterChipText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  semesterChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelFilterBtn: {
    flex: 1,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 26,
  },
  cancelFilterText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  applyFilterBtn: {
    flex: 1,
  },
  applyFilterGradient: {
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyFilterText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default DiscoverScreen;
