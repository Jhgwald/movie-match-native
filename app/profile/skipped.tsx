import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import MovieListItem from '../../src/components/MovieListItem';
import DetailsModal from '../../src/components/DetailsModal';
import { getSkippedIds } from '../../src/state/library';
import { getMoviesByIds } from '../../src/lib/movieHelpers';
import type { Movie, MovieBase } from '../../src/types/movie';

export default function SkippedScreen() {
  const [movies, setMovies] = useState<(Movie | MovieBase)[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | MovieBase | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  // Reload skipped movies every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('[Skipped] Screen focused, loading data...');
      loadSkippedMovies();
    }, [])
  );

  const loadSkippedMovies = () => {
    // Get the IDs of movies the user has skipped
    const skippedIds = getSkippedIds();
    console.log('[Skipped] Skipped IDs from library:', skippedIds);

    // Convert those IDs into full movie objects
    const skippedMovies = getMoviesByIds(skippedIds);
    console.log('[Skipped] Loaded movies:', skippedMovies.map(m => ({ id: m.id, title: m.title })));

    setMovies(skippedMovies);
  };

  const handleCardPress = (movie: Movie | MovieBase) => {
    setSelectedMovie(movie);
    setDetailsVisible(true);
  };

  return (
    <>
      {/* Configure the header for this screen */}
      <Stack.Screen
        options={{
          title: 'Skipped Movies',
          headerStyle: { backgroundColor: '#7E1616' },
          headerTintColor: '#FFFEAD',
        }}
      />

      <View style={styles.container}>
        <StatusBar style="light" />

        {movies.length === 0 ? (
          // Empty state - no skipped movies yet
          <View style={styles.emptyContainer}>
            <Ionicons name="close-circle-outline" size={64} color="#8e8e93" />
            <Text style={styles.emptyTitle}>No Skipped Movies</Text>
            <Text style={styles.emptyText}>
              Movies you swipe left on will appear here.
            </Text>
            <Text style={styles.emptySubtext}>
              Keep track of movies you're not interested in!
            </Text>
          </View>
        ) : (
          // List of skipped movies
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Skipped Movies</Text>
            <Text style={styles.subtitle}>
              {movies.length} {movies.length === 1 ? 'movie' : 'movies'} skipped
            </Text>

            <View style={styles.movieList}>
              {movies.map((movie) => (
                <MovieListItem
                  key={movie.id}
                  movie={movie}
                  onPress={() => handleCardPress(movie)}
                  borderColor="#DC2026"
                />
              ))}
            </View>
          </ScrollView>
        )}

        {/* Details Modal */}
        {selectedMovie && (
          <DetailsModal
            visible={detailsVisible}
            movie={selectedMovie}
            onClose={() => {
              setDetailsVisible(false);
              setSelectedMovie(null);
            }}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
    padding: 16,
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
    marginBottom: 24,
  },
  movieList: {
    paddingBottom: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8e8e93',
    textAlign: 'center',
  },
});
