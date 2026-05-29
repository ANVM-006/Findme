import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import apiClient from '../api/client';
import { getSocket } from '../api/socket';
import { Conversation, Message } from '../types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MessagesStackParamList } from '../navigation/MainNavigator';

type MessagesNavProp = NativeStackNavigationProp<MessagesStackParamList, 'MessagesList'>;

const timeAgo = (dateStr: string | null): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return 'Ahora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
};

const MessagesScreen = (): JSX.Element => {
  const navigation = useNavigation<MessagesNavProp>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const socketRef = useRef(getSocket());

  const fetchConversations = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/messages/conversations');
      const data: Conversation[] = res.data?.conversations || res.data || [];
      setConversations(data);
      setFilteredConversations(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.log('[MessagesScreen] 👁️ PANTALLA GANÓ FOCUS - recargando conversaciones');
      setLoading(true);
      fetchConversations();

      const socket = socketRef.current;
      if (socket) {
        const handleNewMessage = (data: any) => {
          // Backend envía el mensaje directamente, pero mantener compatibilidad si viene como {message, sender}
          const message: Message = data.message || data;
          if (!message || !message.conversation_id) {
            console.warn('[MessagesScreen] Mensaje inválido recibido:', data);
            return;
          }

          console.log('[MessagesScreen] Nuevo mensaje recibido:', message.id, 'para conversación:', message.conversation_id);

          setConversations(prev =>
            prev.map(conv =>
              conv.id === message.conversation_id
                ? {
                    ...conv,
                    last_message: message,
                    last_message_at: message.created_at,
                    unread_count: conv.unread_count + 1,
                  }
                : conv
            ).sort((a, b) => {
              const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
              const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
              return bTime - aTime;
            })
          );
        };

        socket.on('new_message', handleNewMessage);
        return () => {
          socket.off('new_message', handleNewMessage);
          console.log('[MessagesScreen] 👁️ PANTALLA PERDIÓ FOCUS - Cleanup ejecutado');
        };
      }
    }, [fetchConversations])
  );

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredConversations(conversations);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredConversations(
        conversations.filter(conv =>
          conv.other_user.name.toLowerCase().includes(q)
        )
      );
    }
  }, [searchQuery, conversations]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const photoUrl =
      item.other_user.profile_photo ||
      (item.other_user.photos?.length > 0 ? item.other_user.photos[0].photo_url : null);

    return (
      <TouchableOpacity
        style={styles.conversationRow}
        onPress={() =>
          navigation.navigate('Chat', {
            conversationId: item.id,
            otherUser: item.other_user,
          })
        }
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Ionicons name="person" size={26} color={colors.textMuted} />
            </View>
          )}
          {item.other_user.is_online === 1 && <View style={styles.onlineDot} />}
        </View>

        {/* Info */}
        <View style={styles.conversationInfo}>
          <Text style={styles.conversationName}>{item.other_user.name}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.last_message
              ? item.last_message.content
              : 'Inicia la conversación...'}
          </Text>
        </View>

        {/* Meta */}
        <View style={styles.conversationMeta}>
          <Text style={styles.timeText}>
            {timeAgo(item.last_message_at)}
          </Text>
          {item.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {item.unread_count > 99 ? '99+' : item.unread_count}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mensajes</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar conversaciones..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          renderItem={renderConversation}
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
          maxToRenderPerBatch={15}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={70} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No tienes conversaciones</Text>
              <Text style={styles.emptySubtitle}>
                Haz un match y empieza a chatear 💬
              </Text>
            </View>
          }
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    height: '100%',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  avatarFallback: {
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: colors.online,
    borderWidth: 2,
    borderColor: colors.background,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  lastMessage: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  conversationMeta: {
    alignItems: 'flex-end',
    gap: 6,
  },
  timeText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  unreadText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 72,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    gap: 12,
    paddingHorizontal: 32,
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

export default MessagesScreen;
