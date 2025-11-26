import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import MovieListItem from '../../../src/components/MovieListItem';
import DetailsModal from '../../../src/components/DetailsModal';
import { getCustomList, getCustomListRankedIds, getCustomListWaitingIds } from '../../../src/state/library';
import { getMoviesByIds } from '../../../src/lib/movieHelpers';
import type { Movie, MovieBase } from '../../../src/types/movie';

export default function CustomListDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [list, setList] = useState(getCustomList(id || ''));
  const [rankedMovies, setRankedMovies] = useState<(Movie | MovieBase)[]>([]);
  const [waitingCount, setWaitingCount] = useState(0);
  const [selectedMovie, setSelectedMovie] = useState<Movie | MovieBase | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  // Reload list data every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('[Custom List] Screen focused, loading data...');
      loadListData();
    }, [id])
  );

  const loadListData = () => {
    if (!id) {
      console.warn('[Custom List] No list ID provided');
      return;
    }

    const customList = getCustomList(id);
    if (!customList) {
      console.warn('[Custom List] List not found:', id);
      router.back();
      return;
    }

    setList(customList);

    // Get ranked movie IDs
    const rankedIds = getCustomListRankedIds(id);
    const waitingIds = getCustomListWaitingIds(id);
    
    // Convert to full movie objects
    const ranked = getMoviesByIds(rankedIds);
    
    console.log('[Custom List] Ranked movies:', ranked.map(m => ({ id: m.id, title: m.title })));
    console.log('[Custom List] Waiting count:', waitingIds.length);

    setRankedMovies(ranked);
    setWaitingCount(waitingIds.length);
  };

  const handleWaitingPress = () => {
    if (!id) return;
    
    // Navigate to waiting to rank screen
    router.push({
      pathname: '/profile/waiting-to-rank',
      params: { listId: id },
    });
  };

  const handleCardPress = (movie: Movie | MovieBase) => {
    setSelectedMovie(movie);
    setDetailsVisible(true);
  };

  if (!list) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>List not found</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      {/* Configure the header for this screen */}
      <Stack.Screen
        options={{
          title: list.name,
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

        {rankedMovies.length === 0 && waitingCount === 0 ? (
          // Empty state - no movies in list yet
          <View style={styles.emptyContainer}>
            <Ionicons name="list-outline" size={64} color="#8e8e93" />
            <Text style={styles.emptyTitle}>No movies yet</Text>
            <Text style={styles.emptyText}>
              This list is empty. Movies will appear here once you add them.
            </Text>
          </View>
        ) : (
          // List of ranked movies + waiting folder
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{list.name}</Text>
            <Text style={styles.subtitle}>
              {rankedMovies.length + waitingCount} {rankedMovies.length + waitingCount === 1 ? 'movie' : 'movies'}
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

