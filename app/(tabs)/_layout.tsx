import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useConversations } from '@/hooks/useConversations';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text, View } from 'react-native';

function ChatTabIcon({ color, focused }: { color: string; focused: boolean }) {
  const { totalUnreadCount } = useConversations();

  return (
    <View style={{ position: 'relative' }}>
      <Ionicons
        name={focused ? "chatbubbles" : "chatbubbles-outline"}
        size={24}
        color={color}
      />
      {totalUnreadCount > 0 && (
        <View style={{
          position: 'absolute',
          top: -4,
          right: -8,
          backgroundColor: '#FF3B30',
          borderRadius: 10,
          minWidth: 18,
          height: 18,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 4,
        }}>
          <Text style={{
            color: 'white',
            fontSize: 11,
            fontWeight: '700',
          }}>
            {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function TabLayout() {
  const activeTintColor = useThemeColor({}, 'tint');
  const inactiveTintColor = useThemeColor({}, 'tabIconDefault');
  const backgroundColor = useThemeColor({}, 'background');

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeTintColor,
        tabBarInactiveTintColor: inactiveTintColor,
        tabBarStyle: {
          backgroundColor,
          borderTopWidth: 0,
          elevation: 0,
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => <FontAwesome name="search" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, focused }) => <ChatTabIcon color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: 'Post',
          tabBarIcon: ({ color }) => <MaterialIcons name="add" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="listings"
        options={{
          title: 'Listings',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="account-file-text" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favorites',
          tabBarIcon: ({ color }) => <MaterialIcons name="favorite-outline" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}