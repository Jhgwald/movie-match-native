import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

export default function FriendsScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>Friends</Text>
      <View style={styles.placeholderContent}>
        <Ionicons name="people-outline" size={64} color="#8e8e93" />
        <Text style={styles.placeholderText}>Connect with friends to share movie recommendations</Text>
        <Text style={styles.subText}>Friends list coming soon!</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  placeholderContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  placeholderText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  subText: {
    fontSize: 14,
    color: '#8e8e93',
  },
});
