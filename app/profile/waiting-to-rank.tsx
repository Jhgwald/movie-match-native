import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { Stack, useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import DetailsModal from '../../src/components/DetailsModal';
import {
  getMasterRankingsWaitingIds,
  getCustomListWaitingIds,
  getCustomList,
  getMasterRankingsRankedIds,
  getCustomListRankedIds,
} from '../../src/state/library';
import { getMoviesByIds } from '../../src/lib/movieHelpers';
import type { Movie, MovieBase } from '../../src/types/movie';

export default function WaitingToRankScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const listId = params.listId as string | undefined;
  const isMasterRankings = params.isMasterRankings === 'true';
  
  const [listName, setListName] = useState<string>('');
  const [movies, setMovies] = useState<(Movie | MovieBase)[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | MovieBase | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  // Reload waiting movies every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('[Waiting to Rank] Screen focused, loading data...');
      loadWaitingMovies();
    }, [listId, isMasterRankings])
  );

  const loadWaitingMovies = () => {
    let waitingIds: string[] = [];
    let name = '';

    if (isMasterRankings) {
      waitingIds = getMasterRankingsWaitingIds();
      name = 'Master Rankings';
      console.log('[Waiting to Rank] Master Rankings waiting IDs:', waitingIds);
    } else if (listId) {
      const list = getCustomList(listId);
      if (!list) {
        console.warn('[Waiting to Rank] List not found:', listId);
        router.back();
        return;
      }
      waitingIds = getCustomListWaitingIds(listId);
      name = list.name;
      console.log('[Waiting to Rank] Custom list waiting IDs:', waitingIds);
    } else {
      console.warn('[Waiting to Rank] No list ID or Master Rankings flag provided');
      router.back();
      return;
    }

    setListName(name);
    
    // Convert to full movie objects
    const waitingMovies = getMoviesByIds(waitingIds);
    console.log('[Waiting to Rank] Loaded movies:', waitingMovies.map(m => ({ id: m.id, title: m.title })));

    setMovies(waitingMovies);
  };

  const handleMenuPress = (movie: Movie | MovieBase) => {
    // Show action sheet with options
    Alert.alert(
      movie.title,
      'Choose an action',
      [
        {
          text: 'Rank now',
          onPress: () => handleRankSingleMovie(movie),
        },
        {
          text: 'Details',
          onPress: () => {
            setSelectedMovie(movie);
            setDetailsVisible(true);
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const handleRankAll = () => {
    if (movies.length === 0) return;
    
    // Navigate to ranking session for all waiting movies
    if (isMasterRankings) {
      router.push({
        pathname: '/profile/ranking-session',
        params: { isMasterRankings: 'true' },
      });
    } else if (listId) {
      router.push({
        pathname: '/profile/ranking-session',
        params: { listId },
      });
    }
  };

  const handleRankSingleMovie = (movie: Movie | MovieBase) => {
    // Navigate to ranking session for just this one movie
    if (isMasterRankings) {
      router.push({
        pathname: '/profile/ranking-session',
        params: { 
          isMasterRankings: 'true',
          singleMovieId: movie.id,
        },
      });
    } else if (listId) {
      router.push({
        pathname: '/profile/ranking-session',
        params: { 
          listId,
          singleMovieId: movie.id,
        },
      });
    }
  };

  return (
    <>
      {/* Configure the header for this screen */}
      <Stack.Screen
        options={{
          title: 'Waiting to be Ranked',
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
            movies.length > 0 ? (
              <TouchableOpacity
                onPress={handleRankAll}
                style={styles.rankNowButton}
                activeOpacity={0.7}
              >
                <Text style={styles.rankNowText}>Rank now</Text>
              </TouchableOpacity>
            ) : null
          ),
        }}
      />

      <View style={styles.container}>
        <StatusBar style="light" />

        {movies.length === 0 ? (
          // Empty state - no waiting movies
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#8e8e93" />
            <Text style={styles.emptyTitle}>All movies ranked</Text>
            <Text style={styles.emptyText}>
              All movies in {listName} have been ranked.
            </Text>
          </View>
        ) : (
          // List of waiting movies
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Waiting to be Ranked</Text>
            <Text style={styles.subtitle}>
              {listName}
            </Text>
            <Text style={styles.countText}>
              {movies.length} {movies.length === 1 ? 'movie' : 'movies'} waiting
            </Text>

            <View style={styles.movieList}>
              {movies.map((movie) => (
                <View key={movie.id} style={[styles.movieRow, { borderLeftColor: '#FFFEAD' }]}>
                  {/* Movie Poster Thumbnail */}
                  <View style={styles.thumbnailContainer}>
                    {movie.poster ? (
                      <Image
                        source={{ uri: movie.poster }}
                        style={styles.thumbnail}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
                        <Ionicons name="film-outline" size={24} color="#8e8e93" />
                      </View>
                    )}
                  </View>

                  {/* Movie Info */}
                  <View style={styles.info}>
                    <Text style={styles.title} numberOfLines={2}>
                      {movie.title}
                    </Text>
                    <Text style={styles.metadata}>
                      {movie.year} • {movie.genres.slice(0, 2).join(', ')}
                    </Text>
                    {movie.tmdbRating && (
                      <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={14} color="#FFD700" />
                        <Text style={styles.rating}>{movie.tmdbRating.toFixed(1)}</Text>
                      </View>
                    )}
                  </View>

                  {/* Three dots menu */}
                  <TouchableOpacity
                    onPress={() => handleMenuPress(movie)}
                    style={styles.menuButton}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="ellipsis-horizontal" size={24} color="#8e8e93" />
                  </TouchableOpacity>
                </View>
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
    fontSize: 18,
    color: '#FFFEAD',
    fontWeight: '600',
    marginBottom: 4,
  },
  countText: {
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
  movieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    gap: 12,
  },
  thumbnailContainer: {
    width: 60,
    height: 90,
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    backgroundColor: '#2c2c2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 20,
  },
  metadata: {
    fontSize: 13,
    color: '#8e8e93',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  rating: {
    fontSize: 13,
    color: '#FFD700',
    fontWeight: '500',
  },
  menuButton: {
    padding: 8,
  },
});

