import { View, Text, StyleSheet, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function SearchScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>Search Movies</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Search for movies..."
        placeholderTextColor="#8e8e93"
      />
      <View style={styles.placeholderContent}>
        <Text style={styles.placeholderText}>Search functionality coming soon!</Text>
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
  searchInput: {
    backgroundColor: '#1c1c1e',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#fff',
    marginBottom: 24,
  },
  placeholderContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#8e8e93',
  },
});
