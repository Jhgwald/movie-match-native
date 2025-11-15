import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import MovieCard from '../../src/components/MovieCard';
import DetailsModal from '../../src/components/DetailsModal';
import { getSeenIds } from '../../src/state/library';
import { getMoviesByIds } from '../../src/lib/movieHelpers';
import type { Movie, MovieBase } from '../../src/types/movie';

export default function MoviesToRankScreen() {
  const [movies, setMovies] = useState<(Movie | MovieBase)[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | MovieBase | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  // Load seen movies when the screen appears
  useEffect(() => {
    loadSeenMovies();
  }, []);

  const loadSeenMovies = () => {
    // Get the IDs of movies the user has marked as "seen"
    const seenIds = getSeenIds();
    // Convert those IDs into full movie objects
    const seenMovies = getMoviesByIds(seenIds);
    setMovies(seenMovies);
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
          title: 'Movies to Rank',
          headerStyle: { backgroundColor: '#7E1616' },
          headerTintColor: '#FFFEAD',
        }}
      />

      <View style={styles.container}>
        <StatusBar style="light" />

        {movies.length === 0 ? (
          // Empty state - no movies seen yet
          <View style={styles.emptyContainer}>
            <Ionicons name="film-outline" size={64} color="#8e8e93" />
            <Text style={styles.emptyTitle}>No Movies Yet</Text>
            <Text style={styles.emptyText}>
              Swipe up on movies in the Feed to mark them as seen.
            </Text>
            <Text style={styles.emptySubtext}>
              They'll appear here for ranking later!
            </Text>
          </View>
        ) : (
          // List of seen movies
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Movies to Rank</Text>
            <Text style={styles.subtitle}>
              {movies.length} {movies.length === 1 ? 'movie' : 'movies'} ready for ranking
            </Text>

            <View style={styles.movieList}>
              {movies.map((movie) => (
                <TouchableOpacity
                  key={movie.id}
                  onPress={() => handleCardPress(movie)}
                  activeOpacity={0.9}
                >
                  <View style={styles.cardWrapper}>
                    <MovieCard movie={movie} borderColor="#FFFEAD" />
                  </View>
                </TouchableOpacity>
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
    gap: 16,
    paddingBottom: 32,
  },
  cardWrapper: {
    marginBottom: 16,
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
