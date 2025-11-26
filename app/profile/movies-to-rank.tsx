import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import MovieListItem from '../../src/components/MovieListItem';
import DetailsModal from '../../src/components/DetailsModal';
import AssignToListSheet from '../../src/components/AssignToListSheet';
import { getMoviesToBeRankedIds, assignMovieToLists } from '../../src/state/library';
import { getMoviesByIds } from '../../src/lib/movieHelpers';
import type { Movie, MovieBase } from '../../src/types/movie';

export default function MoviesToRankScreen() {
  const router = useRouter();
  const [movies, setMovies] = useState<(Movie | MovieBase)[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | MovieBase | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [assignSheetVisible, setAssignSheetVisible] = useState(false);
  const [movieToAssign, setMovieToAssign] = useState<Movie | MovieBase | null>(null);

  // Reload unranked seen movies every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('[Movies to be Logged] Screen focused, loading data...');
      loadUnrankedMovies();
    }, [])
  );

  const loadUnrankedMovies = () => {
    // Get the IDs of movies in the "Movies to be Logged" inbox bucket
    const moviesToBeRankedIds = getMoviesToBeRankedIds();
    console.log('[Movies to be Logged] Movies to be Logged IDs from library:', moviesToBeRankedIds);

    // Convert those IDs into full movie objects
    const moviesToRank = getMoviesByIds(moviesToBeRankedIds);
    console.log('[Movies to be Logged] Loaded movies:', moviesToRank.map(m => ({ id: m.id, title: m.title })));

    setMovies(moviesToRank);
  };

  const handleRankNow = () => {
    if (movies.length === 0) {
      Alert.alert(
        'No Movies to Log',
        'You need to mark some movies as seen first. Swipe down on movies in the Feed to mark them as seen.',
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
    console.log('[Movies to be Logged] Opening assign sheet for:', movie.id, movie.title);
    setMovieToAssign(movie);
    setAssignSheetVisible(true);
  };

  const handleAssignDone = (addToMasterRankings: boolean, customListIds: string[]) => {
    if (!movieToAssign) {
      console.log('[Movies to be Logged] handleAssignDone called but movieToAssign is null');
      return;
    }
    
    console.log('[Movies to be Logged] Assigning movie to lists:', {
      movie: movieToAssign.id,
      masterRankings: addToMasterRankings,
      customLists: customListIds.length,
    });
    
    // Assign movie to selected lists
    assignMovieToLists(movieToAssign.id, addToMasterRankings, customListIds);
    
    // Close the sheet and refresh the list
    setAssignSheetVisible(false);
    setMovieToAssign(null);
    
    // Reload movies to reflect the removal from inbox
    loadUnrankedMovies();
  };

  return (
    <>
      {/* Configure the header for this screen */}
      <Stack.Screen
        options={{
          title: 'Movies to be Logged',
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
              You don't have any movies waiting to be logged.
            </Text>
            <Text style={styles.emptySubtext}>
              Movies you mark as seen will appear here until you assign them to a list.
            </Text>
          </View>
        ) : (
          // List of seen movies
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Movies to be Logged</Text>
            <Text style={styles.subtitle}>
              {movies.length} {movies.length === 1 ? 'movie' : 'movies'} waiting to be assigned to lists
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

        {/* Assign to List Sheet */}
        <AssignToListSheet
          visible={assignSheetVisible}
          movie={movieToAssign}
          onDone={handleAssignDone}
          onClose={() => {
            setAssignSheetVisible(false);
            setMovieToAssign(null);
          }}
        />
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
