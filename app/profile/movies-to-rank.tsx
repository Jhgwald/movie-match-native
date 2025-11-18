import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import MovieListItem from '../../src/components/MovieListItem';
import DetailsModal from '../../src/components/DetailsModal';
import { getUnrankedSeenIds, getSeenIds, getRankedIds } from '../../src/state/library';
import { getMoviesByIds } from '../../src/lib/movieHelpers';
import type { Movie, MovieBase } from '../../src/types/movie';

export default function MoviesToRankScreen() {
  const router = useRouter();
  const [movies, setMovies] = useState<(Movie | MovieBase)[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | MovieBase | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  // Reload unranked seen movies every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('[Movies to Rank] Screen focused, loading data...');
      loadUnrankedMovies();
    }, [])
  );

  const loadUnrankedMovies = () => {
    // Get the IDs of movies that are seen but not yet ranked
    const unrankedIds = getUnrankedSeenIds();
    console.log('[Movies to Rank] Unranked IDs from library:', unrankedIds);
    
    // Debug: Check if specific movies are seen or ranked
    const seenIds = getSeenIds();
    const rankedIds = getRankedIds();
    console.log('[Movies to Rank] All seen IDs:', seenIds);
    console.log('[Movies to Rank] All ranked IDs:', rankedIds);
    console.log('[Movies to Rank] Checking specific movies:');
    console.log('  - Movie 1 (Oppenheimer): seen=', seenIds.includes('1'), 'ranked=', rankedIds.includes('1'));
    console.log('  - Movie 2 (Dune): seen=', seenIds.includes('2'), 'ranked=', rankedIds.includes('2'));
    console.log('  - Movie 3 (Everything Everywhere): seen=', seenIds.includes('3'), 'ranked=', rankedIds.includes('3'));

    // Convert those IDs into full movie objects
    const unrankedMovies = getMoviesByIds(unrankedIds);
    console.log('[Movies to Rank] Loaded movies:', unrankedMovies.map(m => ({ id: m.id, title: m.title })));

    setMovies(unrankedMovies);
  };

  const handleRankNow = () => {
    if (movies.length === 0) {
      Alert.alert(
        'No Movies to Rank',
        'You need to mark some movies as seen first. Swipe up on movies in the Feed to mark them as seen.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Navigate to ranking session with movie IDs
    // Note: With insertion-based ranking, we can rank even a single movie
    // by inserting it into existing rankings
    const movieIds = movies.map(m => m.id);
    router.push({
      pathname: '/profile/ranking-session',
      params: { movieIds: JSON.stringify(movieIds) },
    });
  };

  const handleCardPress = (movie: Movie | MovieBase) => {
    console.log('[Movies to Rank] Opening details for:', movie.id, movie.title);
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
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFEAD" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={handleRankNow}
              style={styles.rankNowButton}
              activeOpacity={0.7}
            >
              <Text style={styles.rankNowText}>Rank Now</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.container}>
        <StatusBar style="light" />

        {movies.length === 0 ? (
          // Empty state - no unranked movies
          <View style={styles.emptyContainer}>
            <Ionicons name="film-outline" size={64} color="#8e8e93" />
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptyText}>
              You don't have any unranked movies right now.
            </Text>
            <Text style={styles.emptySubtext}>
              Swipe up on movies in the Feed to mark them as seen, and they'll appear here for ranking.
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
                <MovieListItem
                  key={movie.id}
                  movie={movie}
                  onPress={() => handleCardPress(movie)}
                  borderColor="#FFFEAD"
                />
              ))}
            </View>
          </ScrollView>
        )}

        {/* Details Modal */}
        {selectedMovie && (
          <DetailsModal
            key={selectedMovie.id}
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
  rankNowButton: {
    marginRight: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#DC2026',
    borderRadius: 8,
  },
  rankNowText: {
    color: '#FFFEAD',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginLeft: 16,
    padding: 4,
  },
});
