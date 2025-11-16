import { Tabs } from 'expo-router';
import React from 'react';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors[colorScheme ?? 'light'].background,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Google Drive',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "logo-google" : "logo-google"} 
              size={28} 
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="Microsoft"
        options={{
          title: 'OneDrive',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "logo-microsoft" : "logo-microsoft"} 
              size={28} 
              color={color}
            />),
        }}
      />
      <Tabs.Screen
        name="GoTo"
        options={{
          title: 'Music',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={"musical-notes"} 
              size={28} 
              color={color}
            />),
        }}
      />    </Tabs>
  );
}