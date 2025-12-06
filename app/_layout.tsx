import PlayerProvider from "@/provider/PlayerProvider";
import "../global.css";

import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import 'react-native-reanimated';


export default function RootLayout() {

  return (
    <ThemeProvider value={DarkTheme} >
      <PlayerProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          {/* <Stack.Screen name="(player)" options={{ headerShown: false }} /> */}
        </Stack>
      </PlayerProvider>
    </ThemeProvider>
  );
}


