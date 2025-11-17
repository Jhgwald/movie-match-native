import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>Profile</Text>
      <View style={styles.profileHeader}>
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person" size={48} color="#8e8e93" />
        </View>
        <Text style={styles.userName}>Movie Lover</Text>
        <Text style={styles.userEmail}>user@example.com</Text>
      </View>
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Movies Watched</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Friends</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Parties</Text>
        </View>
      </View>

      {/* Navigation Menu Items */}
      <View style={styles.menuSection}>
        <Link href="/profile/movies-to-rank" asChild>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="film-outline" size={24} color="#fff" />
            <Text style={styles.menuItemText}>Movies to Rank</Text>
            <Ionicons name="chevron-forward" size={24} color="#8e8e93" />
          </TouchableOpacity>
        </Link>

        <Link href="/profile/watchlist" asChild>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="bookmark-outline" size={24} color="#fff" />
            <Text style={styles.menuItemText}>Your Watchlist</Text>
            <Ionicons name="chevron-forward" size={24} color="#8e8e93" />
          </TouchableOpacity>
        </Link>

        <Link href="/profile/skipped" asChild>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="close-circle-outline" size={24} color="#8e8e93" />
            <Text style={styles.menuItemText}>Skipped Movies</Text>
            <Ionicons name="chevron-forward" size={24} color="#8e8e93" />
          </TouchableOpacity>
        </Link>

        <Link href="/profile/ranking" asChild>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="trophy-outline" size={24} color="#fff" />
            <Text style={styles.menuItemText}>Ranking</Text>
            <Ionicons name="chevron-forward" size={24} color="#8e8e93" />
          </TouchableOpacity>
        </Link>
      </View>

      {/* Settings */}
      <TouchableOpacity style={styles.menuItem}>
        <Ionicons name="settings-outline" size={24} color="#fff" />
        <Text style={styles.menuItemText}>Settings</Text>
        <Ionicons name="chevron-forward" size={24} color="#8e8e93" />
      </TouchableOpacity>
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
    marginBottom: 24,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1c1c1e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#8e8e93',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e50914',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8e8e93',
  },
  menuSection: {
    gap: 12,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
});
