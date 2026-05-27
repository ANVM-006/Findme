import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import apiClient from '../api/client';

import DiscoverScreen from '../screens/DiscoverScreen';
import LikesScreen from '../screens/LikesScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import { UserProfile } from '../types';

export type MessagesStackParamList = {
  MessagesList: undefined;
  Chat: { conversationId: string; otherUser: UserProfile };
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  EditProfile: undefined;
};

export type MainTabParamList = {
  Discover: undefined;
  Likes: undefined;
  Messages: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const MessagesStack = createNativeStackNavigator<MessagesStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function MessagesNavigator(): JSX.Element {
  return (
    <MessagesStack.Navigator screenOptions={{ headerShown: false }}>
      <MessagesStack.Screen name="MessagesList" component={MessagesScreen} />
      <MessagesStack.Screen name="Chat" component={ChatScreen} />
    </MessagesStack.Navigator>
  );
}

function ProfileNavigator(): JSX.Element {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
    </ProfileStack.Navigator>
  );
}

function TabBarIcon({
  name,
  color,
  size,
  badgeCount,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  size: number;
  badgeCount?: number;
}): JSX.Element {
  return (
    <View style={styles.iconContainer}>
      <Ionicons name={name} size={size} color={color} />
      {badgeCount && badgeCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
        </View>
      ) : null}
    </View>
  );
}

const MainNavigator = (): JSX.Element => {
  const [likesCount, setLikesCount] = useState(0);

  useEffect(() => {
    const fetchLikesCount = async () => {
      try {
        const res = await apiClient.get('/api/likes/received');
        const data = res.data;
        if (Array.isArray(data)) {
          setLikesCount(data.length);
        } else if (data?.count !== undefined) {
          setLikesCount(data.count);
        }
      } catch {
        // silently fail
      }
    };
    fetchLikesCount();

    const interval = setInterval(fetchLikesCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: '#1A1A1A',
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="compass" color={color} size={size + 2} />
          ),
        }}
      />
      <Tab.Screen
        name="Likes"
        component={LikesScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="heart" color={color} size={size + 2} badgeCount={likesCount} />
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="chatbubbles" color={color} size={size + 2} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="person" color={color} size={size + 2} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '700',
  },
});

export default MainNavigator;
