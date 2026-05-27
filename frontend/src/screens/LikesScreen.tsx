import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import MatchModal from '../components/MatchModal';
import { UserProfile } from '../types';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 48) / 2;

const LikesScreen = (): JSX.Element => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [activeTab, setActiveTab] = useState<'received' | 'matches'>('received');
  const [receivedLikes, setReceivedLikes] = useState<UserProfile[]>([]);
  const [matches, setMatches] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [matchedUser, setMatchedUser] = useState<UserProfile | null>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [receivedRes, matchesRes] = await Promise.all([
        apiClient.get('/api/likes/received'),
        apiClient.get('/api/likes/matches'),
      ]);
      setReceivedLikes(receivedRes.data?.received || receivedRes.data?.likes || (Array.isArray(receivedRes.data) ? receivedRes.data : []));
      setMatches(matchesRes.data?.matches || (Array.isArray(matchesRes.data) ? matchesRes.data : []));
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleLikeBack = async (targetUser: UserProfile) => {
    try {
      const res = await apiClient.post(`/api/likes/${targetUser.id}`);
      if (res.data?.isMatch) {
        setMatchedUser(targetUser);
        setShowMatchModal(true);
        // Move from received to matches
        setReceivedLikes(prev => prev.filter(u => u.id !== targetUser.id));
        setMatches(prev => [...prev, targetUser]);
      }
    } catch {
      // ignore
    }
  };

  const handlePass = async (targetUser: UserProfile) => {
    try {
      await apiClient.post(`/api/likes/pass/${targetUser.id}`);
      setReceivedLikes(prev => prev.filter(u => u.id !== targetUser.id));
    } catch {
      // ignore
    }
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

  const handleChatMatch = async (matchUser: UserProfile) => {
    try {
      const res = await apiClient.post('/api/messages/conversations', {
        userId: matchUser.id,
      });
      const conversationId = res.data?.id || res.data?.conversationId;
      if (conversationId) {
        navigation.navigate('Messages', {
          screen: 'Chat',
          params: { conversationId, otherUser: matchUser },
        });
      }
    } catch {
      // ignore
    }
  };

  const getPhotoUrl = (profile: UserProfile) => {
    return (
      profile.profile_photo ||
      (profile.photos?.length > 0 ? profile.photos[0].photo_url : null)
    );
  };

  const renderReceivedItem = ({ item }: { item: UserProfile }) => (
    <View style={styles.likeCard}>
      {getPhotoUrl(item) ? (
        <Image source={{ uri: getPhotoUrl(item)! }} style={styles.likePhoto} />
      ) : (
        <View style={[styles.likePhoto, styles.noPhoto]}>
          <Ionicons name="person" size={40} color={colors.textMuted} />
        </View>
      )}

      {/* Gradient overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.9)']}
        style={styles.likeCardOverlay}
      >
        <Text style={styles.likeCardName} numberOfLines={1}>
          {item.name}
          {item.age ? `, ${item.age}` : ''}
        </Text>
        {item.career && (
          <Text style={styles.likeCardCareer} numberOfLines={1}>
            {item.career}
          </Text>
        )}
      </LinearGradient>

      {/* Action buttons */}
      <View style={styles.likeCardActions}>
        <TouchableOpacity
          style={styles.likeActionPass}
          onPress={() => handlePass(item)}
        >
          <Ionicons name="close" size={18} color={colors.pass} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.likeActionLike}
          onPress={() => handleLikeBack(item)}
        >
          <Ionicons name="heart" size={18} color={colors.like} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMatchItem = ({ item }: { item: UserProfile }) => (
    <View style={styles.matchRow}>
      <View style={styles.matchAvatarContainer}>
        {getPhotoUrl(item) ? (
          <Image source={{ uri: getPhotoUrl(item)! }} style={styles.matchAvatar} />
        ) : (
          <View style={[styles.matchAvatar, styles.noAvatarBg]}>
            <Ionicons name="person" size={30} color={colors.textMuted} />
          </View>
        )}
        {item.is_online === 1 && <View style={styles.onlineIndicator} />}
      </View>

      <View style={styles.matchInfo}>
        <Text style={styles.matchName}>{item.name}</Text>
        {item.career && (
          <Text style={styles.matchCareer} numberOfLines={1}>
            {item.career}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.messageMatchBtn}
        onPress={() => handleChatMatch(item)}
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.messageMatchGradient}
        >
          <Ionicons name="chatbubble-ellipses" size={16} color={colors.text} />
          <Text style={styles.messageMatchText}>Mensaje</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {activeTab === 'received' ? '❤️ Te gustan' : '🔥 Matches'}
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && styles.tabActive]}
          onPress={() => setActiveTab('received')}
        >
          <Text style={[styles.tabText, activeTab === 'received' && styles.tabTextActive]}>
            Te gustan
          </Text>
          {receivedLikes.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{receivedLikes.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'matches' && styles.tabActive]}
          onPress={() => setActiveTab('matches')}
        >
          <Text style={[styles.tabText, activeTab === 'matches' && styles.tabTextActive]}>
            Matches
          </Text>
          {matches.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{matches.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : activeTab === 'received' ? (
        <FlatList
          data={receivedLikes}
          renderItem={renderReceivedItem}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          removeClippedSubviews
          maxToRenderPerBatch={10}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="heart-outline" size={64} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Nadie te ha dado like aún</Text>
              <Text style={styles.emptySubtitle}>
                Sigue explorando y espera que alguien te guste primero
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={matches}
          renderItem={renderMatchItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          removeClippedSubviews
          maxToRenderPerBatch={10}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="heart-dislike-outline" size={64} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Todavía no tienes matches</Text>
              <Text style={styles.emptySubtitle}>
                ¡Sigue explorando! Tu match perfecto está por ahí 🚀
              </Text>
            </View>
          }
        />
      )}

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
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.text,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 4,
  },
  tab: {
    flex: 1,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 6,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.text,
  },
  tabBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  tabBadgeText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  likeCard: {
    width: CARD_SIZE,
    height: CARD_SIZE * 1.35,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  likePhoto: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  noPhoto: {
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeCardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    justifyContent: 'flex-end',
    padding: 12,
    paddingBottom: 48,
  },
  likeCardName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  likeCardCareer: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  likeCardActions: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  likeActionPass: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${colors.pass}20`,
    borderWidth: 1.5,
    borderColor: colors.pass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeActionLike: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${colors.like}20`,
    borderWidth: 1.5,
    borderColor: colors.like,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  matchAvatarContainer: {
    position: 'relative',
  },
  matchAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  noAvatarBg: {
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.online,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  matchInfo: {
    flex: 1,
  },
  matchName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  matchCareer: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  messageMatchBtn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  messageMatchGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  messageMatchText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default LikesScreen;
