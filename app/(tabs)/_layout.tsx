import { Tabs } from 'expo-router';
import React from 'react';

// import { FloatingPlayer } from '@/components/audio/FloatingPlayer';
import FloatingPlayer from '@/components/audio/FloatingPlayer';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import Entypo from '@expo/vector-icons/Entypo';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BottomTabBar } from "@react-navigation/bottom-tabs";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
        tabBar={(props)=> 
            <>
              <FloatingPlayer />
              <BottomTabBar {...props}/>
            </>
          }
        screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarStyle: {
          backgroundColor:"black",
          borderTopColor:"black"
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Offline',
          tabBarIcon: () => (
            <MaterialIcons name="download-for-offline" size={24} color="white" />
          ),
        }}
      />

      {/* <Tabs.Screen
        name="GoogleDriveScreen"
        options={{
          title: 'GoogleDrive',
          tabBarIcon: () => (
            <Entypo name="google-drive" size={24} color="white" />
          ),
        }}
      />                 */}
      <Tabs.Screen
        name="OneDriveScreen"
        options={{
          title: 'OneDrive',
          tabBarIcon: () => (
            <Entypo name="onedrive" size={24} color="white" />
          ),
        }}
      />         <Tabs.Screen
        name="LoginScreen"
        options={{
          title: 'Login',
          tabBarIcon: () => (
            <Entypo name="login" size={24} color="white" />
          ),
        }}
      />
       </Tabs>
  );
}