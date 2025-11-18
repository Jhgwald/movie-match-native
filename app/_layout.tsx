import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { FeedPreferencesProvider } from '../src/context/FeedPreferencesContext';
import { BlindModeProvider } from '../src/context/BlindModeContext';
import { ProfileProvider } from '../src/context/ProfileContext';
import { SettingsProvider } from '../src/context/SettingsContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.container}>
        <FeedPreferencesProvider>
          <BlindModeProvider>
            <ProfileProvider>
              <SettingsProvider>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" />
                </Stack>
              </SettingsProvider>
            </ProfileProvider>
          </BlindModeProvider>
        </FeedPreferencesProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
