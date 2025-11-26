import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, ScrollView } from 'react-native';
import { Stack, useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { getMoviesByIds } from '../../src/lib/movieHelpers';
import {
  getRankedMovies,
  saveRankingSession,
  getUnrankedSeenIds,
  getCustomList,
  getCustomListRankedIds,
  getCustomListWaitingIds,
  updateCustomListRankedIds,
  getMasterRankingsRankedIds,
  getMasterRankingsWaitingIds,
  updateMasterRankingsRankedIds,
} from '../../src/state/library';
import type { Movie, MovieBase } from '../../src/types/movie';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Binary search insertion ranking: Insert movies from "To Be Ranked" into existing ranked list
 * 
 * Algorithm (Binary Search):
 * - Take one candidate movie from "To Be Ranked"
 * - Always compare against the middle movie of the current search range
 * - If user prefers candidate: search in the upper half (above middle)
 * - If user prefers ranked: search in the lower half (below middle)
 * - Repeat until exact insertion point is found
 * - If "Can't decide": place next to current comparison or skip
 */
function useInsertionRanking(
  candidateMovies: (Movie | MovieBase)[],
  existingRankedMovies: (Movie | MovieBase)[]
) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  // Binary search range: [searchStart, searchEnd)
  // searchStart is inclusive, searchEnd is exclusive
  const [searchStart, setSearchStart] = useState(0);
  const [searchEnd, setSearchEnd] = useState(0);
  // Initialize with existing ranked movies, or empty array if none exist
  const [insertedRankedMovies, setInsertedRankedMovies] = useState<(Movie | MovieBase)[]>([]);
  const [skippedMovies, setSkippedMovies] = useState<(Movie | MovieBase)[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const currentCandidate = candidateIndex < candidateMovies.length 
    ? candidateMovies[candidateIndex] 
    : null;

  // Calculate the middle index of the current search range
  const getMiddleIndex = (start: number, end: number): number => {
    return Math.floor((start + end) / 2);
  };

  // Get the movie at the middle of the current search range
  const currentRanked = (() => {
    if (!currentCandidate || insertedRankedMovies.length === 0) return null;
    
    const middleIndex = getMiddleIndex(searchStart, searchEnd);
    if (middleIndex >= 0 && middleIndex < insertedRankedMovies.length) {
      return insertedRankedMovies[middleIndex];
    }
    return null;
  })();

  const handleCandidateWins = () => {
    if (!currentCandidate) return;

    // User prefers candidate over the middle movie
    // Candidate belongs somewhere above (before) the middle
    // Narrow search to upper half: [searchStart, middleIndex)
    const middleIndex = getMiddleIndex(searchStart, searchEnd);
    const newEnd = middleIndex;

    console.log('[useInsertionRanking] Candidate wins:', {
      candidate: currentCandidate.title,
      comparedTo: insertedRankedMovies[middleIndex]?.title,
      currentRange: `[${searchStart}, ${searchEnd})`,
      middleIndex,
      newRange: `[${searchStart}, ${newEnd})`,
    });

    if (newEnd <= searchStart) {
      // Search range narrowed to a single position - insert here
      const newRanked = [...insertedRankedMovies];
      newRanked.splice(searchStart, 0, currentCandidate);
      setInsertedRankedMovies(newRanked);
      console.log('[useInsertionRanking] Inserted at position', searchStart);
      moveToNextCandidate();
    } else {
      // Continue searching in upper half
      setSearchEnd(newEnd);
    }
  };

  const handleRankedWins = () => {
    if (!currentCandidate) return;

    // User prefers the middle ranked movie over candidate
    // Candidate belongs somewhere below (after) the middle
    // Narrow search to lower half: [middleIndex + 1, searchEnd)
    const middleIndex = getMiddleIndex(searchStart, searchEnd);
    const newStart = middleIndex + 1;

    console.log('[useInsertionRanking] Ranked wins:', {
      candidate: currentCandidate.title,
      comparedTo: insertedRankedMovies[middleIndex]?.title,
      currentRange: `[${searchStart}, ${searchEnd})`,
      middleIndex,
      newRange: `[${newStart}, ${searchEnd})`,
    });

    if (newStart >= searchEnd) {
      // Search range narrowed to end - insert at the end
      const newRanked = [...insertedRankedMovies];
      newRanked.splice(searchEnd, 0, currentCandidate);
      setInsertedRankedMovies(newRanked);
      console.log('[useInsertionRanking] Inserted at end position', searchEnd);
      moveToNextCandidate();
    } else {
      // Continue searching in lower half
      setSearchStart(newStart);
    }
  };

  const handleCantDecide = () => {
    if (!currentCandidate) return;

    // Can't decide: place the candidate right next to the current comparison
    // Insert it right after the middle movie (neutral placement)
    const middleIndex = getMiddleIndex(searchStart, searchEnd);
    const newRanked = [...insertedRankedMovies];
    
    // Insert after the middle movie (or at end if middle is last)
    const insertIndex = Math.min(middleIndex + 1, insertedRankedMovies.length);
    newRanked.splice(insertIndex, 0, currentCandidate);
    setInsertedRankedMovies(newRanked);
    
    console.log('[useInsertionRanking] Can\'t decide - placed candidate at index', insertIndex);
    moveToNextCandidate();
  };

  const moveToNextCandidate = () => {
    const nextCandidateIndex = candidateIndex + 1;
    
    if (nextCandidateIndex >= candidateMovies.length) {
      // All candidates processed
      setIsComplete(true);
    } else {
      // Move to next candidate and reset search range
      setCandidateIndex(nextCandidateIndex);
      // Reset search range to full list for next candidate
      setInsertedRankedMovies(prev => {
        setSearchStart(0);
        setSearchEnd(prev.length);
        return prev;
      });
    }
  };

  // Initialize: Reset state and set up binary search range when movies change
  // This effect runs whenever candidateMovies or existingRankedMovies change (new session)
  useEffect(() => {
    console.log('[useInsertionRanking] Initialization effect running:', {
      existingRankedCount: existingRankedMovies.length,
      candidateCount: candidateMovies.length,
      insertedCount: insertedRankedMovies.length,
    });
    
    // Reset state for new session when movies change
    setCandidateIndex(0);
    setIsComplete(false);
    setSkippedMovies([]);
    
    // Re-initialize insertedRankedMovies with current existing ranked movies
    const newInsertedRanked = [...existingRankedMovies];
    setInsertedRankedMovies(newInsertedRanked);
    
    // Initialize binary search range for first candidate
    // Range is [0, listLength) - we'll search the entire list
    setSearchStart(0);
    setSearchEnd(newInsertedRanked.length);
    
    console.log('[useInsertionRanking] Reset state for new session:', {
      insertedRankedMovies: newInsertedRanked.length,
      searchRange: `[0, ${newInsertedRanked.length})`,
    });
    
    // Auto-insert first candidate if no existing ranked movies
    if (existingRankedMovies.length === 0 && candidateMovies.length > 0) {
      const firstCandidate = candidateMovies[0];
      if (firstCandidate) {
        console.log('[useInsertionRanking] Auto-inserting first candidate (no existing rankings):', firstCandidate.title);
        setInsertedRankedMovies([firstCandidate]);
        if (candidateMovies.length === 1) {
          console.log('[useInsertionRanking] Only one candidate, marking complete');
          setIsComplete(true);
        } else {
          console.log('[useInsertionRanking] Moving to next candidate (index 1)');
          setCandidateIndex(1);
          // Reset search range for next candidate (but list now has 1 movie)
          setSearchStart(0);
          setSearchEnd(1);
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
  const [listId, setListId] = useState<string | null>(null);
  const [isMasterRankings, setIsMasterRankings] = useState(false);

  /**
   * Initialize ranking session by loading current bucket state
   * This function is reusable and can be called multiple times for new sessions
   * Supports both global ranking and per-list ranking
   */
  const initializeRankingSession = useCallback(() => {
    console.log('[Ranking Session] Initializing ranking session...');
    setIsInitializing(true);
    setShowResults(false); // Reset results when starting new session
    
    try {
      // Check if this is a list-specific ranking session
      const listIdParam = params.listId as string | undefined;
      const isMasterRankingsParam = params.isMasterRankings === 'true';
      const singleMovieId = params.singleMovieId as string | undefined;
      
      setListId(listIdParam || null);
      setIsMasterRankings(isMasterRankingsParam);
      
      let candidateIds: string[] = [];
      let existingRankedIds: string[] = [];
      
      if (listIdParam || isMasterRankingsParam) {
        // Per-list ranking session
        if (isMasterRankingsParam) {
          // Master Rankings
          const waitingIds = getMasterRankingsWaitingIds();
          const rankedIds = getMasterRankingsRankedIds();
          
          if (singleMovieId) {
            // Single movie ranking - only rank this one movie
            candidateIds = [singleMovieId];
            existingRankedIds = rankedIds;
            console.log('[Ranking Session] Master Rankings single movie mode - movie:', singleMovieId, 'ranked:', rankedIds.length);
          } else {
            // Rank all waiting movies
            candidateIds = waitingIds;
            existingRankedIds = rankedIds;
            console.log('[Ranking Session] Master Rankings mode - waiting:', waitingIds.length, 'ranked:', rankedIds.length);
          }
        } else if (listIdParam) {
          // Custom list
          const list = getCustomList(listIdParam);
          if (!list) {
            console.error('[Ranking Session] List not found:', listIdParam);
            router.back();
            return;
          }
          const waitingIds = getCustomListWaitingIds(listIdParam);
          const rankedIds = getCustomListRankedIds(listIdParam);
          
          if (singleMovieId) {
            // Single movie ranking - only rank this one movie
            candidateIds = [singleMovieId];
            existingRankedIds = rankedIds;
            console.log('[Ranking Session] Custom list single movie mode - list:', list.name, 'movie:', singleMovieId, 'ranked:', rankedIds.length);
          } else {
            // Rank all waiting movies
            candidateIds = waitingIds;
            existingRankedIds = rankedIds;
            console.log('[Ranking Session] Custom list mode - list:', list.name, 'waiting:', waitingIds.length, 'ranked:', rankedIds.length);
          }
        }
      } else {
        // Global ranking session (original behavior)
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
        
        candidateIds = movieIds;
        
        // Get existing ranked movies (ordered from best to worst)
        const rankedData = getRankedMovies();
        existingRankedIds = rankedData.map(rm => rm.movieId);
      }

      const candidates = getMoviesByIds(candidateIds);
      const existingRanked = getMoviesByIds(existingRankedIds);
      
      setCandidateMovies(candidates);
      setExistingRankedMovies(existingRanked);
      
      console.log('[Ranking Session] Initialization complete:', {
        mode: listIdParam ? 'list' : isMasterRankingsParam ? 'master-rankings' : 'global',
        listId: listIdParam,
        candidatesCount: candidates.length,
        candidates: candidates.map(m => m.title),
        rankedCount: existingRanked.length,
        ranked: existingRanked.map(m => m.title),
      });
      
      // Mark initialization as complete - ALWAYS set to false, even if no candidates
      setIsInitializing(false);
    } catch (error) {
      console.error('[Ranking Session] Failed to load movies for ranking:', error);
      // ALWAYS set to false on error - don't leave it stuck
      setIsInitializing(false);
      router.back();
    }
  }, [params.movieIds, params.listId, params.isMasterRankings, router]);

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

    // Check if this is a per-list ranking session
    if (isMasterRankings) {
      // Update Master Rankings
      updateMasterRankingsRankedIds(finalOrderIds);
      console.log('[Ranking Session] Updated Master Rankings with', finalOrderIds.length, 'movies');
    } else if (listId) {
      // Update custom list
      updateCustomListRankedIds(listId, finalOrderIds);
      console.log('[Ranking Session] Updated custom list', listId, 'with', finalOrderIds.length, 'movies');
    } else {
      // Global ranking session (original behavior)
      const newlyRankedIds = candidateMovies
        .map(movie => movie.id)
        .filter(id => finalOrderSet.has(id) && !skippedIds.has(id));

      if (newlyRankedIds.length > 0) {
        saveRankingSession(newlyRankedIds, finalOrderIds, `session-${Date.now()}`);
      } else {
        console.log('[Ranking Session] No new movies were inserted. Skipping persistence.');
      }
    }

    // Navigate back
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

  // Special case: Single movie ranking with no existing ranked movies
  // The hook should have auto-inserted it and marked complete
  if (candidateMovies.length === 1 && existingRankedMovies.length === 0 && isComplete) {
    console.log('[Ranking Session] Single movie with no existing rankings - already complete');
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
  if (!hasExistingRankings && candidateMovie && !isComplete) {
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
  // But if it's complete, we should show results instead
  if (!rankedMovie && !hasExistingRankings && candidateMovie && !isComplete) {
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
