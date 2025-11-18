import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, ScrollView } from 'react-native';
import { Stack, useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { getMoviesByIds } from '../../src/lib/movieHelpers';
import { getRankedMovies, saveRankingSession, getUnrankedSeenIds } from '../../src/state/library';
import type { Movie, MovieBase } from '../../src/types/movie';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Insertion-based ranking: Insert movies from "To Be Ranked" into existing ranked list
 * 
 * Algorithm:
 * - Take one candidate movie from "To Be Ranked"
 * - Compare it against ranked movies one-by-one (top to bottom)
 * - If user prefers candidate: insert above current ranked movie
 * - If user prefers ranked: move to next ranked movie
 * - If "Can't decide" for all: skip this movie (keep in To Be Ranked)
 */
function useInsertionRanking(
  candidateMovies: (Movie | MovieBase)[],
  existingRankedMovies: (Movie | MovieBase)[]
) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [rankedIndex, setRankedIndex] = useState(0);
  // Initialize with existing ranked movies, or empty array if none exist
  // Note: This initial state is set once, but the useEffect will update it when movies change
  const [insertedRankedMovies, setInsertedRankedMovies] = useState<(Movie | MovieBase)[]>([]);
  const [skippedMovies, setSkippedMovies] = useState<(Movie | MovieBase)[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const currentCandidate = candidateIndex < candidateMovies.length 
    ? candidateMovies[candidateIndex] 
    : null;
  const currentRanked = rankedIndex < insertedRankedMovies.length 
    ? insertedRankedMovies[rankedIndex] 
    : null;

  const handleCandidateWins = () => {
    if (!currentCandidate) return;

    // Insert candidate above current ranked movie
    const newRanked = [...insertedRankedMovies];
    newRanked.splice(rankedIndex, 0, currentCandidate);
    setInsertedRankedMovies(newRanked);

    // Move to next candidate
    moveToNextCandidate();
  };

  const handleRankedWins = () => {
    if (!currentCandidate) return;

    // Move to next ranked movie
    const nextRankedIndex = rankedIndex + 1;
    
    if (nextRankedIndex >= insertedRankedMovies.length) {
      // Reached the bottom - insert candidate at the end
      const newRanked = [...insertedRankedMovies, currentCandidate];
      setInsertedRankedMovies(newRanked);
      moveToNextCandidate();
    } else {
      // Continue comparing with next ranked movie
      setRankedIndex(nextRankedIndex);
    }
  };

  const handleCantDecide = () => {
    if (!currentCandidate) return;

    // Move to next ranked movie without inserting
    const nextRankedIndex = rankedIndex + 1;
    
    if (nextRankedIndex >= insertedRankedMovies.length) {
      // Reached the bottom and user couldn't decide on any
      // Skip this movie (don't insert it) so it stays in the
      // Movies to Rank queue for a future session.
      setSkippedMovies(prev => [...prev, currentCandidate]);
      moveToNextCandidate();
    } else {
      // Continue comparing with next ranked movie
      setRankedIndex(nextRankedIndex);
    }
  };

  const moveToNextCandidate = () => {
    const nextCandidateIndex = candidateIndex + 1;
    
    if (nextCandidateIndex >= candidateMovies.length) {
      // All candidates processed
      setIsComplete(true);
    } else {
      // Move to next candidate and reset ranked index
      setCandidateIndex(nextCandidateIndex);
      setRankedIndex(0);
    }
  };

  // Initialize: Reset state and auto-insert first candidate when movies change
  // This effect runs whenever candidateMovies or existingRankedMovies change (new session)
  useEffect(() => {
    console.log('[useInsertionRanking] Initialization effect running:', {
      existingRankedCount: existingRankedMovies.length,
      candidateCount: candidateMovies.length,
      insertedCount: insertedRankedMovies.length,
    });
    
    // Reset state for new session when movies change
    // Reset indices and completion state
    setCandidateIndex(0);
    setRankedIndex(0);
    setIsComplete(false);
    setSkippedMovies([]);
    
    // Re-initialize insertedRankedMovies with current existing ranked movies
    const newInsertedRanked = [...existingRankedMovies];
    setInsertedRankedMovies(newInsertedRanked);
    
    console.log('[useInsertionRanking] Reset state for new session, insertedRankedMovies:', newInsertedRanked.length);
    
    // Auto-insert first candidate if no existing ranked movies
    // This happens after we've reset insertedRankedMovies to match existingRankedMovies
    if (existingRankedMovies.length === 0 && candidateMovies.length > 0) {
      const firstCandidate = candidateMovies[0];
      if (firstCandidate) {
        console.log('[useInsertionRanking] Auto-inserting first candidate:', firstCandidate.title);
        // Use functional update to ensure we're working with the latest state
        setInsertedRankedMovies([firstCandidate]);
        if (candidateMovies.length === 1) {
          console.log('[useInsertionRanking] Only one candidate, marking complete');
          setIsComplete(true);
        } else {
          console.log('[useInsertionRanking] Moving to next candidate (index 1)');
          setCandidateIndex(1);
        }
      }
    }
  }, [existingRankedMovies.length, candidateMovies.length]);

  return {
    candidateMovie: currentCandidate,
    rankedMovie: currentRanked,
    progress: candidateIndex + 1,
    totalCandidates: candidateMovies.length,
    isComplete,
    finalRankedMovies: insertedRankedMovies,
    skippedMovies,
    handleCandidateWins,
    handleRankedWins,
    handleCantDecide,
    hasExistingRankings: insertedRankedMovies.length > 0,
  };
}

export default function RankingSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [candidateMovies, setCandidateMovies] = useState<(Movie | MovieBase)[]>([]);
  const [existingRankedMovies, setExistingRankedMovies] = useState<(Movie | MovieBase)[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  /**
   * Initialize ranking session by loading current bucket state
   * This function is reusable and can be called multiple times for new sessions
   */
  const initializeRankingSession = useCallback(() => {
    console.log('[Ranking Session] Initializing ranking session...');
    setIsInitializing(true);
    setShowResults(false); // Reset results when starting new session
    
    try {
      // Get candidate movies from "Movies to Rank" bucket (unranked seen movies)
      // This excludes skipped movies and already-ranked movies
      let movieIds: string[] = [];
      
      if (params.movieIds) {
        // Use movie IDs passed from "Rank Now" button
        movieIds = JSON.parse(params.movieIds as string);
        console.log('[Ranking Session] Using movieIds from params:', movieIds);
      } else {
        // Fallback: get from unranked seen movies (excludes skipped)
        movieIds = getUnrankedSeenIds();
        console.log('[Ranking Session] Using unranked seen IDs:', movieIds);
      }

      const candidates = getMoviesByIds(movieIds);
      setCandidateMovies(candidates);

      // Get existing ranked movies (ordered from best to worst)
      // getRankedMovies() already excludes skipped movies
      // IMPORTANT: This is reactive - it will get the latest ranked movies each time
      const rankedData = getRankedMovies();
      const rankedIds = rankedData.map(rm => rm.movieId);
      const ranked = getMoviesByIds(rankedIds);
      setExistingRankedMovies(ranked);
      
      console.log('[Ranking Session] Initialization complete:', {
        candidatesCount: candidates.length,
        candidates: candidates.map(m => m.title),
        rankedCount: ranked.length,
        ranked: ranked.map(m => m.title),
      });
      
      // Mark initialization as complete - ALWAYS set to false, even if no candidates
      setIsInitializing(false);
    } catch (error) {
      console.error('[Ranking Session] Failed to load movies for ranking:', error);
      // ALWAYS set to false on error - don't leave it stuck
      setIsInitializing(false);
      router.back();
    }
  }, [params.movieIds, router]);

  // Run initialization when screen is focused (handles returning to screen)
  useFocusEffect(
    useCallback(() => {
      console.log('[Ranking Session] Screen focused, initializing...');
      initializeRankingSession();
    }, [initializeRankingSession])
  );

  // Also run on mount and when params change (backup for initial mount)
  useEffect(() => {
    console.log('[Ranking Session] Effect triggered (mount or params change)');
    initializeRankingSession();
  }, [initializeRankingSession]);

  const {
    candidateMovie,
    rankedMovie,
    progress,
    totalCandidates,
    isComplete,
    finalRankedMovies,
    skippedMovies,
    handleCandidateWins,
    handleRankedWins,
    handleCantDecide,
    hasExistingRankings,
  } = useInsertionRanking(candidateMovies, existingRankedMovies);

  useEffect(() => {
    if (isComplete && finalRankedMovies.length > 0 && !showResults) {
      setShowResults(true);
    }
  }, [isComplete, finalRankedMovies, showResults]);

  const handleFinish = () => {
    if (finalRankedMovies.length === 0) {
      router.back();
      return;
    }

    const skippedIds = new Set(skippedMovies.map(movie => movie.id));
    const finalOrderIds = finalRankedMovies.map(movie => movie.id);
    const finalOrderSet = new Set(finalOrderIds);

    const newlyRankedIds = candidateMovies
      .map(movie => movie.id)
      .filter(id => finalOrderSet.has(id) && !skippedIds.has(id));

    if (newlyRankedIds.length > 0) {
      saveRankingSession(newlyRankedIds, finalOrderIds, `session-${Date.now()}`);
    } else {
      console.log('[Ranking Session] No new movies were inserted. Skipping persistence.');
    }

    // Navigate back to movies to rank
    router.back();
  };

  // Show loading state while initializing
  if (isInitializing) {
    console.log('[Ranking Session] Still initializing, showing loading...');
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Setting up ranking...</Text>
      </View>
    );
  }

  // Show empty state if there are no movies to rank
  if (candidateMovies.length === 0) {
    console.log('[Ranking Session] No candidate movies, showing empty state');
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Ranking',
            headerStyle: { backgroundColor: '#7E1616' },
            headerTintColor: '#FFFEAD',
          }}
        />
        <View style={styles.container}>
          <StatusBar style="light" />
          <View style={styles.emptyStateContainer}>
            <Ionicons name="film-outline" size={64} color="#C0C1C1" />
            <Text style={styles.emptyStateTitle}>No movies to rank yet</Text>
            <Text style={styles.emptyStateText}>
              Add some movies to your "Seen" list to start ranking.
            </Text>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  if (showResults) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Ranking Complete',
            headerStyle: { backgroundColor: '#7E1616' },
            headerTintColor: '#FFFEAD',
          }}
        />
        <View style={styles.container}>
          <StatusBar style="light" />
          <ScrollView style={styles.resultsScrollView} contentContainerStyle={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Your Ranking</Text>
            <Text style={styles.resultsSubtitle}>
              {finalRankedMovies.length} {finalRankedMovies.length === 1 ? 'movie' : 'movies'} ranked
              {skippedMovies.length > 0 && `, ${skippedMovies.length} skipped`}
            </Text>

            <View style={styles.resultsList}>
              {finalRankedMovies.map((movie, index) => {
                const position = index + 1;
                const total = finalRankedMovies.length;
                // Preview score using percentile formula
                const score = Math.round(((total - position + 1) / total) * 100);

                return (
                  <View key={movie.id} style={styles.resultItem}>
                    <View style={styles.resultRank}>
                      <Text style={styles.resultRankNumber}>#{position}</Text>
                      <Text style={styles.resultScore}>{score}%</Text>
                    </View>
                    {movie.poster ? (
                      <Image
                        source={{ uri: movie.poster }}
                        style={styles.resultPoster}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.resultPoster, styles.resultPosterPlaceholder]}>
                        <Ionicons name="film" size={24} color="#C0C1C1" />
                      </View>
                    )}
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultTitle}>{movie.title}</Text>
                      <Text style={styles.resultYear}>({movie.year})</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
              <Text style={styles.finishButtonText}>Done</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </>
    );
  }

  // If no candidate, show results
  if (!candidateMovie) {
    console.log('[Ranking Session] No candidate movie, showing results');
    if (!showResults) {
      setShowResults(true);
    }
    return null;
  }

  // If no existing ranked movies, the hook should auto-insert the first candidate
  // The hook's useEffect should handle this automatically when candidateMovies are loaded
  // If hasExistingRankings is still false after initialization, it means either:
  // 1. The hook hasn't run yet (should be very brief)
  // 2. There's an issue with the hook initialization
  // In either case, we should show a brief loading state
  if (!hasExistingRankings && candidateMovie) {
    console.log('[Ranking Session] No existing rankings yet, candidate exists:', candidateMovie.title);
    console.log('[Ranking Session] Waiting for hook to auto-insert first candidate...');
    // The hook's useEffect should handle this, but give it a moment
    // This should only happen briefly during state initialization
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Setting up ranking...</Text>
      </View>
    );
  }

  // If we have existing rankings but no rankedMovie for comparison,
  // it means we're at the end of the ranked list or there's a state issue
  if (!rankedMovie && hasExistingRankings) {
    console.log('[Ranking Session] Has existing rankings but no rankedMovie for comparison');
    // This shouldn't normally happen, but if it does, show loading
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Preparing comparison...</Text>
      </View>
    );
  }
  
  // If no rankedMovie and no existing rankings, but we have a candidate,
  // the hook should have inserted it by now. If not, there might be an issue.
  if (!rankedMovie && !hasExistingRankings && candidateMovie) {
    console.log('[Ranking Session] WARNING: Candidate exists but no rankedMovie and no existing rankings');
    // Fall back to showing loading - the hook should fix this
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Setting up ranking...</Text>
      </View>
    );
  }
  
  console.log('[Ranking Session] Showing comparison UI:', {
    candidate: candidateMovie.title,
    ranked: rankedMovie.title,
    progress: `${progress}/${totalCandidates}`,
  });

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Ranking',
          headerStyle: { backgroundColor: '#7E1616' },
          headerTintColor: '#FFFEAD',
        }}
      />
      <View style={styles.container}>
        <StatusBar style="light" />

        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Movie {progress} of {totalCandidates}
          </Text>
        </View>

        {/* Question */}
        <Text style={styles.questionText}>Which do you prefer?</Text>

        {/* Two movie cards side by side */}
        <View style={styles.comparisonContainer}>
          {/* Candidate Movie (Left) */}
          <TouchableOpacity
            style={styles.movieCard}
            onPress={handleCandidateWins}
            activeOpacity={0.8}
          >
            {candidateMovie.poster ? (
              <Image
                source={{ uri: candidateMovie.poster }}
                style={styles.moviePoster}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.moviePoster, styles.moviePosterPlaceholder]}>
                <Ionicons name="film" size={48} color="#C0C1C1" />
              </View>
            )}
            <Text style={styles.movieTitle}>{candidateMovie.title}</Text>
            <Text style={styles.movieYear}>({candidateMovie.year})</Text>
          </TouchableOpacity>

          {/* VS divider */}
          <View style={styles.vsContainer}>
            <Text style={styles.vsText}>VS</Text>
          </View>

          {/* Ranked Movie (Right) */}
          <TouchableOpacity
            style={styles.movieCard}
            onPress={handleRankedWins}
            activeOpacity={0.8}
          >
            {rankedMovie.poster ? (
              <Image
                source={{ uri: rankedMovie.poster }}
                style={styles.moviePoster}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.moviePoster, styles.moviePosterPlaceholder]}>
                <Ionicons name="film" size={48} color="#C0C1C1" />
              </View>
            )}
            <Text style={styles.movieTitle}>{rankedMovie.title}</Text>
            <Text style={styles.movieYear}>({rankedMovie.year})</Text>
          </TouchableOpacity>
        </View>

        {/* Can't Decide Button */}
        <TouchableOpacity
          style={styles.cantDecideButton}
          onPress={handleCantDecide}
          activeOpacity={0.7}
        >
          <Text style={styles.cantDecideText}>Can't decide</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  loadingText: {
    color: '#FFFEAD',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  progressText: {
    color: '#C0C1C1',
    fontSize: 16,
    fontWeight: '500',
  },
  questionText: {
    color: '#FFFEAD',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 32,
  },
  comparisonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    marginBottom: 32,
  },
  movieCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 16,
    maxHeight: SCREEN_HEIGHT * 0.5,
  },
  moviePoster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#DC2026',
  },
  moviePosterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(192, 193, 193, 0.2)',
  },
  movieTitle: {
    color: '#FFFEAD',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  movieYear: {
    color: '#C0C1C1',
    fontSize: 14,
    textAlign: 'center',
  },
  vsContainer: {
    alignItems: 'center',
    minWidth: 50,
  },
  vsText: {
    color: '#DC2026',
    fontSize: 18,
    fontWeight: '700',
    backgroundColor: '#1c1c1e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cantDecideButton: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C0C1C1',
  },
  cantDecideText: {
    color: '#C0C1C1',
    fontSize: 16,
    fontWeight: '500',
  },
  resultsScrollView: {
    flex: 1,
  },
  resultsContainer: {
    paddingTop: 20,
    paddingBottom: 32,
  },
  resultsTitle: {
    color: '#FFFEAD',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  resultsSubtitle: {
    color: '#C0C1C1',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  resultsList: {
    gap: 12,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  resultRank: {
    alignItems: 'center',
    minWidth: 60,
  },
  resultRankNumber: {
    color: '#DC2026',
    fontSize: 20,
    fontWeight: '700',
  },
  resultScore: {
    color: '#C0C1C1',
    fontSize: 12,
    fontWeight: '500',
  },
  resultPoster: {
    width: 50,
    height: 75,
    borderRadius: 6,
    backgroundColor: '#DC2026',
  },
  resultPosterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(192, 193, 193, 0.2)',
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    color: '#FFFEAD',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultYear: {
    color: '#C0C1C1',
    fontSize: 14,
  },
  finishButton: {
    backgroundColor: '#DC2026',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  finishButtonText: {
    color: '#FFFEAD',
    fontSize: 18,
    fontWeight: '700',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateTitle: {
    color: '#FFFEAD',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  emptyStateText: {
    color: '#C0C1C1',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  backButton: {
    backgroundColor: '#DC2026',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#FFFEAD',
    fontSize: 16,
    fontWeight: '600',
  },
});
