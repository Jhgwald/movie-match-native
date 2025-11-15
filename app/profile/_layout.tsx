import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#7E1616',
        },
        headerTintColor: '#FFFEAD',
        headerBackTitle: 'Back',
      }}
    />
  );
}
