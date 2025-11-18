import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { getRankedMovies } from '../../src/state/library';
import { getMoviesByIds } from '../../src/lib/movieHelpers';
import type { Movie, MovieBase } from '../../src/types/movie';
import type { RankedMovie } from '../../src/state/library';

interface RankedMovieWithData extends RankedMovie {
  movie: Movie | MovieBase;
  globalPosition: number;
}

export default function RankingScreen() {
  const router = useRouter();
  const [rankedMovies, setRankedMovies] = useState<RankedMovieWithData[]>([]);

  // Reload ranked movies every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('[Ranking] Screen focused, loading ranked movies...');
      loadRankedMovies();
    }, [])
  );

  const loadRankedMovies = () => {
    // getRankedMovies() already sorts by score and recalculates scores based on global position
    const rankings = getRankedMovies();
    console.log('[Ranking] Loaded rankings:', rankings.length);

    // Get movie objects for each ranked movie
    const movieIds = rankings.map(rm => rm.movieId);
    const movies = getMoviesByIds(movieIds);
    const movieMap = new Map(movies.map(m => [m.id, m]));

    // Combine rankings with movie data
    // Rankings are already sorted by score (descending), so index + 1 = global position
    const rankedWithMovies: RankedMovieWithData[] = rankings
      .map((rm, index) => {
        const movie = movieMap.get(rm.movieId);
        if (!movie) return null;
        return {
          ...rm,
          movie,
          globalPosition: index + 1, // Global position based on sorted order
        };
      })
      .filter((rm): rm is RankedMovieWithData => rm !== null);

    setRankedMovies(rankedWithMovies);
  };

  return (
    <>
      {/* Configure the header for this screen */}
      <Stack.Screen
        options={{
          title: 'Ranking',
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

        {rankedMovies.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" size={80} color="#8e8e93" />
            <Text style={styles.emptyTitle}>No Rankings Yet</Text>
            <Text style={styles.emptyText}>
              Rank your movies to see them here.
            </Text>
            <Text style={styles.emptySubtext}>
              Go to "Movies to Rank" and tap "Rank Now" to get started.
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Your Rankings</Text>
            <Text style={styles.subtitle}>
              {rankedMovies.length} {rankedMovies.length === 1 ? 'movie' : 'movies'} ranked
            </Text>

            <View style={styles.rankingsList}>
              {rankedMovies.map((rankedMovie) => (
                <View key={rankedMovie.movieId} style={styles.rankingItem}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankNumber}>#{rankedMovie.globalPosition}</Text>
                    <Text style={styles.rankScore}>{rankedMovie.score}%</Text>
                  </View>

                  {rankedMovie.movie.poster ? (
                    <Image
                      source={{ uri: rankedMovie.movie.poster }}
                      style={styles.moviePoster}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.moviePoster, styles.moviePosterPlaceholder]}>
                      <Ionicons name="film" size={24} color="#C0C1C1" />
                    </View>
                  )}

                  <View style={styles.movieInfo}>
                    <Text style={styles.movieTitle}>{rankedMovie.movie.title}</Text>
                    <Text style={styles.movieYear}>({rankedMovie.movie.year})</Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
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
  rankingsList: {
    gap: 12,
    paddingBottom: 32,
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  rankBadge: {
    alignItems: 'center',
    minWidth: 60,
  },
  rankNumber: {
    color: '#DC2026',
    fontSize: 20,
    fontWeight: '700',
  },
  rankScore: {
    color: '#C0C1C1',
    fontSize: 12,
    fontWeight: '500',
  },
  moviePoster: {
    width: 50,
    height: 75,
    borderRadius: 6,
    backgroundColor: '#DC2026',
  },
  moviePosterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(192, 193, 193, 0.2)',
  },
  movieInfo: {
    flex: 1,
  },
  movieTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  movieYear: {
    color: '#8e8e93',
    fontSize: 14,
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
  backButton: {
    marginLeft: 16,
    padding: 4,
  },
});
