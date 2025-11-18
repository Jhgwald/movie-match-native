import { useCallback, useRef, type ReactNode } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Animated, View } from 'react-native';
import {
  ProfileTabAnimationProvider,
  useProfileTabAnimation,
  type TabIconKey,
} from '../../src/context/ProfileTabAnimationContext';

function TabIconTracker({
  tabKey,
  children,
  animatedStyle,
}: {
  tabKey: TabIconKey;
  children: ReactNode;
  animatedStyle?: any;
}) {
  const { registerIconPosition } = useProfileTabAnimation();
  const containerRef = useRef<View | null>(null);

  const handleLayout = useCallback(() => {
    requestAnimationFrame(() => {
      containerRef.current?.measureInWindow((x, y, width, height) => {
        registerIconPosition(tabKey, {
          x: x + width / 2,
          y: y + height / 2,
        });
      });
    });
  }, [registerIconPosition, tabKey]);

  const content = animatedStyle ? (
    <Animated.View style={animatedStyle}>{children}</Animated.View>
  ) : (
    children
  );

  return (
    <View ref={containerRef} onLayout={handleLayout} style={{ alignItems: 'center', justifyContent: 'center' }}>
      {content}
    </View>
  );
}

function PartyTabIcon({ color, size }: { color: string; size: number }) {
  return (
    <TabIconTracker tabKey="party">
      <Ionicons name="film" size={size} color={color} />
    </TabIconTracker>
  );
}

function ProfileTabIcon({ color, size }: { color: string; size: number }) {
  const { profileShakeValue } = useProfileTabAnimation();

  return (
    <TabIconTracker
      tabKey="profile"
      animatedStyle={{ transform: [{ translateX: profileShakeValue }] }}
    >
      <Ionicons name="person" size={size} color={color} />
    </TabIconTracker>
  );
}

export default function TabLayout() {
  return (
    <ProfileTabAnimationProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#DC2026', // Cinema TV Red
          tabBarInactiveTintColor: '#C0C1C1', // Light Gray
          headerStyle: {
            backgroundColor: '#7E1616', // Dark red - movie theater background
          },
          headerTintColor: '#FFFEAD', // Butter yellow
          tabBarStyle: {
            backgroundColor: '#7E1616', // Dark red - movie theater background
            borderTopColor: '#DC2026', // Red border
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Feed',
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="search" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="friends"
          options={{
            title: 'Friends',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="party"
          options={{
            title: 'Party',
            tabBarIcon: ({ color, size }) => (
              <PartyTabIcon color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <ProfileTabIcon color={color} size={size} />
            ),
          }}
        />
      </Tabs>
    </ProfileTabAnimationProvider>
  );
}
