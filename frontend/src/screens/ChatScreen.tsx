import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { getSocket } from '../api/socket';
import { Message, UserProfile } from '../types';
import { MessagesStackParamList } from '../navigation/MainNavigator';

type ChatRouteProp = RouteProp<MessagesStackParamList, 'Chat'>;

const { width } = Dimensions.get('window');

const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
};

const TypingDots = (): JSX.Element => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -6, duration: 250, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.delay(500),
        ])
      );
    };

    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 200);
    const a3 = animate(dot3, 400);
    a1.start();
    a2.start();
    a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={typingStyles.container}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View
          key={i}
          style={[typingStyles.dot, { transform: [{ translateY: dot }] }]}
        />
      ))}
    </View>
  );
};

const typingStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceLight,
    borderRadius: 18,
    padding: 12,
    alignSelf: 'flex-start',
    marginLeft: 16,
    marginBottom: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.textSecondary,
  },
});

const ChatScreen = (): JSX.Element => {
  const navigation = useNavigation<any>();
  const route = useRoute<ChatRouteProp>();
  const { conversationId, otherUser } = route.params;
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef(getSocket());

  const fetchMessages = useCallback(async (pageNum: number, reset = false) => {
    try {
      const res = await apiClient.get(
        `/api/messages/conversations/${conversationId}`,
        { params: { page: pageNum, limit: 30 } }
      );
      const data: Message[] = res.data?.messages || res.data || [];

      if (reset) {
        setMessages(data);
      } else {
        setMessages(prev => [...data, ...prev]);
      }
      setHasMore(data.length === 30);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useFocusEffect(
    useCallback(() => {
      console.log('[ChatScreen] 👁️ PANTALLA GANÓ FOCUS - recargando mensajes:', conversationId);
      setLoading(true);
      fetchMessages(1, true);

      const socket = socketRef.current;
      if (socket) {
        // ✅ REGISTRAR LISTENERS PRIMERO, antes de join_conversation
        const handleNewMessage = (data: any) => {
          // Backend envía {message, sender}, extraer el mensaje
          const msg: Message = data.message || data;
          if (msg && msg.conversation_id === conversationId) {
            // Deduplicación: no agregar si ya existe
            setMessages(prev => {
              const exists = prev.some(m => m.id === msg.id);
              if (exists) {
                console.log('[ChatScreen] Mensaje duplicado, ignorando:', msg.id);
                return prev;
              }
              console.log('[ChatScreen] Nuevo mensaje recibido:', msg.id);
              return [...prev, msg];
            });
            // Scroll to bottom
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
            // Mark as read
            socket.emit('mark_read', { conversationId });
          }
        };

        const handleUserTyping = (data: { userId: string }) => {
          if (data.userId === otherUser.id) {
            setIsTyping(true);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
          }
        };

        const handleMessagesRead = (data: { conversationId: string }) => {
          if (data.conversationId === conversationId) {
            setMessages(prev =>
              prev.map(m => (m.sender_id === user?.id ? { ...m, is_read: 1 } : m))
            );
          }
        };

        const handleMessageSent = (data: { tempId?: string; messageId: string }) => {
          // Confirmación del servidor: reemplazar tempId con UUID real
          if (data.tempId && data.messageId) {
            console.log('[ChatScreen] Confirmación recibida, reemplazando:', data.tempId, '->', data.messageId);
            setMessages(prev =>
              prev.map(m =>
                m.id === data.tempId ? { ...m, id: data.messageId } : m
              )
            );
          }
        };

        // Registrar los listeners PRIMERO
        socket.on('new_message', handleNewMessage);
        socket.on('user_typing', handleUserTyping);
        socket.on('messages_read', handleMessagesRead);
        socket.on('message_sent', handleMessageSent);

        console.log('[ChatScreen] ✅ Listeners registrados para conversación:', conversationId);

        // Ahora emitir join_conversation DESPUÉS de registrar los listeners
        socket.emit('join_conversation', { conversationId });
        console.log('[ChatScreen] ✅ join_conversation emitido:', conversationId);

        return () => {
          socket.emit('leave_conversation', { conversationId });
          socket.off('new_message', handleNewMessage);
          socket.off('user_typing', handleUserTyping);
          socket.off('messages_read', handleMessagesRead);
          socket.off('message_sent', handleMessageSent);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          console.log('[ChatScreen] 👁️ PANTALLA PERDIÓ FOCUS - Cleanup ejecutado');
        };
      }
    }, [conversationId])
  );

  // Scroll to bottom when messages finish loading
  useEffect(() => {
    if (!loading && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 50);
    }
  }, [loading]);

  const handleInputChange = (text: string) => {
    setInputText(text);
    const socket = socketRef.current;
    if (socket) {
      socket.emit('typing', { conversationId });
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;
    const content = inputText.trim();
    setInputText('');
    setSending(true);

    // Optimistic add
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: user?.id || '',
      content,
      msg_type: 'text',
      is_read: 0,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const socket = socketRef.current;
      if (socket) {
        // Incluir tempId en el emit para que el backend pueda confirmarlo
        socket.emit('send_message', { conversationId, content, msgType: 'text', tempId }, (ack: any) => {
          // Callback de confirmación del servidor
          if (ack?.success && ack?.messageId) {
            console.log('[ChatScreen] Mensaje confirmado por servidor:', ack.messageId);
            // Reemplazar tempId con UUID real
            setMessages(prev =>
              prev.map(m =>
                m.id === tempId ? { ...m, id: ack.messageId } : m
              )
            );
          }
        });
      } else {
        // Fallback to HTTP
        await apiClient.post(`/api/messages/conversations/${conversationId}/messages`, {
          content,
          msgType: 'text',
        });
      }
    } catch (error) {
      console.error('[ChatScreen] Error enviando mensaje:', error);
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const handleLoadMore = () => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMessages(nextPage, false);
  };

  const photoUrl =
    otherUser.profile_photo ||
    (otherUser.photos?.length > 0 ? otherUser.photos[0].photo_url : null);

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.sender_id === user?.id;

    return (
      <View style={[styles.messageBubbleContainer, isOwn ? styles.ownContainer : styles.otherContainer]}>
        {isOwn ? (
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.bubble, styles.ownBubble]}
          >
            <Text style={styles.ownMessageText}>{item.content}</Text>
          </LinearGradient>
        ) : (
          <View style={[styles.bubble, styles.otherBubble]}>
            <Text style={styles.otherMessageText}>{item.content}</Text>
          </View>
        )}
        <View style={[styles.messageFooter, isOwn ? styles.footerRight : styles.footerLeft]}>
          <Text style={styles.timeStamp}>{formatTime(item.created_at)}</Text>
          {isOwn && (
            <Ionicons
              name={item.is_read ? 'checkmark-done' : 'checkmark'}
              size={12}
              color={item.is_read ? colors.primary : colors.textMuted}
            />
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerUserInfo}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, styles.headerAvatarFallback]}>
              <Ionicons name="person" size={18} color={colors.textMuted} />
            </View>
          )}
          <View>
            <Text style={styles.headerName}>{otherUser.name}</Text>
            <View style={styles.onlineStatusRow}>
              <View
                style={[
                  styles.onlineStatusDot,
                  { backgroundColor: otherUser.is_online === 1 ? colors.online : colors.offline },
                ]}
              />
              <Text style={styles.onlineStatusText}>
                {otherUser.is_online === 1 ? 'En línea' : 'Desconectado'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.headerAction}>
          <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messageList}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            removeClippedSubviews
            maxToRenderPerBatch={20}
            ListFooterComponent={isTyping ? <TypingDots /> : null}
            scrollEnabled={true}
          />
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.messageInput}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={handleInputChange}
            multiline
            maxLength={1000}
            returnKeyType="default"
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
            style={styles.sendButton}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={
                inputText.trim()
                  ? [colors.primary, colors.primaryLight]
                  : [colors.border, colors.border]
              }
              style={styles.sendGradient}
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Ionicons name="send" size={20} color={colors.text} />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerUserInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  headerAvatarFallback: {
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  onlineStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  onlineStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  onlineStatusText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  headerAction: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  messageBubbleContainer: {
    marginVertical: 3,
    maxWidth: width * 0.78,
  },
  ownContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  ownBubble: {
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: colors.surfaceLight,
    borderBottomLeftRadius: 4,
  },
  ownMessageText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
  },
  otherMessageText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    paddingHorizontal: 4,
  },
  footerRight: {
    justifyContent: 'flex-end',
  },
  footerLeft: {
    justifyContent: 'flex-start',
  },
  timeStamp: {
    fontSize: 11,
    color: colors.textMuted,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    gap: 10,
  },
  messageInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  sendGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatScreen;
