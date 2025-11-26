import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import MovieListItem from '../../src/components/MovieListItem';
import DetailsModal from '../../src/components/DetailsModal';
import {
  getMasterRankingsIds,
  getMasterRankingsRankedIds,
  getMasterRankingsWaitingIds,
} from '../../src/state/library';
import { getMoviesByIds } from '../../src/lib/movieHelpers';
import type { Movie, MovieBase } from '../../src/types/movie';

export default function MasterRankingsScreen() {
  const router = useRouter();
  const [rankedMovies, setRankedMovies] = useState<(Movie | MovieBase)[]>([]);
  const [waitingCount, setWaitingCount] = useState(0);
  const [selectedMovie, setSelectedMovie] = useState<Movie | MovieBase | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  // Reload Master Rankings data every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('[Master Rankings] Screen focused, loading data...');
      loadMasterRankingsData();
    }, [])
  );

  const loadMasterRankingsData = () => {
    // Get ranked and waiting movie IDs
    const rankedIds = getMasterRankingsRankedIds();
    const waitingIds = getMasterRankingsWaitingIds();
    
    // Convert to full movie objects
    const ranked = getMoviesByIds(rankedIds);
    
    console.log('[Master Rankings] Ranked movies:', ranked.map(m => ({ id: m.id, title: m.title })));
    console.log('[Master Rankings] Waiting count:', waitingIds.length);

    setRankedMovies(ranked);
    setWaitingCount(waitingIds.length);
  };

  const handleWaitingPress = () => {
    // Navigate to waiting to rank screen
    router.push({
      pathname: '/profile/waiting-to-rank',
      params: { isMasterRankings: 'true' },
    });
  };

  const handleCardPress = (movie: Movie | MovieBase) => {
    setSelectedMovie(movie);
    setDetailsVisible(true);
  };

  const totalMovies = rankedMovies.length + waitingCount;

  return (
    <>
      {/* Configure the header for this screen */}
      <Stack.Screen
        options={{
          title: 'Master Rankings',
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
        }}
      />

      <View style={styles.container}>
        <StatusBar style="light" />

        {totalMovies === 0 ? (
          // Empty state - no movies in Master Rankings yet
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" size={64} color="#8e8e93" />
            <Text style={styles.emptyTitle}>No movies yet</Text>
            <Text style={styles.emptyText}>
              Movies you log with Master Rankings selected will appear here.
            </Text>
          </View>
        ) : (
          // List of ranked movies + waiting folder
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Master Rankings</Text>
            <Text style={styles.subtitle}>
              {totalMovies} {totalMovies === 1 ? 'movie' : 'movies'}
            </Text>

            {/* Ranked Movies Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ranked</Text>
              {rankedMovies.length > 0 ? (
                <View style={styles.movieList}>
                  {rankedMovies.map((movie) => (
                    <MovieListItem
                      key={movie.id}
                      movie={movie}
                      onPress={() => handleCardPress(movie)}
                      borderColor="#4caf50"
                    />
                  ))}
                </View>
              ) : (
                <Text style={styles.emptySectionText}>No ranked movies yet</Text>
              )}
            </View>

            {/* Waiting to be Ranked Folder */}
            {waitingCount > 0 && (
              <TouchableOpacity
                style={styles.waitingFolder}
                onPress={handleWaitingPress}
                activeOpacity={0.7}
              >
                <Ionicons name="folder-outline" size={24} color="#FFFEAD" style={styles.folderIcon} />
                <View style={styles.folderContent}>
                  <Text style={styles.folderTitle}>Waiting to be ranked</Text>
                  <Text style={styles.folderSubtitle}>
                    {waitingCount} {waitingCount === 1 ? 'movie' : 'movies'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#C0C1C1" />
              </TouchableOpacity>
            )}
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  movieList: {
    paddingBottom: 16,
  },
  emptySectionText: {
    fontSize: 14,
    color: '#8e8e93',
    fontStyle: 'italic',
    paddingVertical: 16,
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
  backButton: {
    marginLeft: 16,
    padding: 4,
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
  waitingFolder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 254, 173, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 254, 173, 0.2)',
  },
  folderIcon: {
    marginRight: 12,
  },
  folderContent: {
    flex: 1,
  },
  folderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFEAD',
    marginBottom: 4,
  },
  folderSubtitle: {
    fontSize: 14,
    color: '#C0C1C1',
  },
});

