import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import SwipeDeck from '../../src/components/SwipeDeck';
import { movies } from '../../src/data/sample/movies';

export default function FeedScreen() {
  const handleSwipeRight = (movie: typeof movies[number]) => {
    console.log('Liked:', movie.title);
    // TODO: Add to liked movies list
  };

  const handleSwipeLeft = (movie: typeof movies[number]) => {
    console.log('Passed:', movie.title);
    // TODO: Add to passed movies list
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>Movie Feed</Text>
        <Text style={styles.subtitle}>Swipe right to like, left to pass</Text>
      </View>
      <SwipeDeck
        movies={movies}
        onSwipeRight={handleSwipeRight}
        onSwipeLeft={handleSwipeLeft}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    padding: 16,
    paddingTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8e8e93',
    marginBottom: 16,
  },
});

