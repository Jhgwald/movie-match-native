// In-memory library state for tracking seen, skipped, and watchlist movies
// 
// DEVELOPMENT MODE: All buckets start empty on every app reload.
// - seenIds: Movies marked as "Seen" (empty by default)
// - skippedIds: Movies marked as "Skipped" (empty by default)
// - watchlistIds: Movies added to "Watchlist" (empty by default)
// - rankedMovies: Movies that have been ranked (empty by default)
//
// These are only populated by explicit user actions (swipes, ranking, etc.)
// No seeding or demo data is automatically added.

let seenIds = new Set<string>(); // Movies to Rank bucket - starts empty
let skippedIds = new Set<string>(); // Skipped bucket - starts empty
let watchlistIds = new Set<string>(); // Watchlist bucket - starts empty

/**
 * RANKING SYSTEM SUMMARY
 * 
 * Where ranked data is stored:
 * - Ranked movies are stored in the `rankedMovies` array in this file
 * - Persisted to AsyncStorage under key '@moviematch:rankings-v1'
 * - Each ranked movie stores: movieId, position (within session), score, sessionId, timestamp
 * 
 * How Movies to Rank works:
 * - When a movie is marked as "Seen" (markSeen), it goes into seenIds
 * - getUnrankedSeenIds() returns all seen movies that are NOT in rankedMovies
 * - Movies to Rank screen shows only unranked seen movies
 * 
 * How ranking session works:
 * - User taps "Rank Now" in Movies to Rank screen
 * - Navigates to ranking-session screen with movie IDs
 * - Pairwise comparison: shows two movies at a time, user picks preference
 * - Algorithm: win-based sorting - tracks wins for each movie, sorts by win count
 * - When all comparisons done (n*(n-1)/2 comparisons for n movies), session completes
 * 
 * How final ranking and score are computed:
 * - After session: movies sorted by win count (more wins = better)
 * - Position: 1-based within the session (1 = best in that session)
 * - Score: calculated using percentile formula based on GLOBAL ranking position
 *   - Formula: score = (n - x + 1) / n * 100
 *   - n = total number of movies in global ranking
 *   - x = movie's global position (1 = top, n = last)
 *   - Top movie always gets 100%
 *   - Last movie gets (1/n * 100)%
 *   - Smooth percentile distribution between 0 and 100
 * - saveRankingSession() stores results, recalculates global scores, removes from unranked list
 * 
 * How Rankings screen works:
 * - Shows all ranked movies from all sessions
 * - Sorted globally by score (descending), then by recency
 * - Global position assigned based on sorted order (1, 2, 3...)
 * - Displays: poster, title, year, global position, score
 */
export interface RankedMovie {
  movieId: string;
  position: number; // 1-based position within the ranking session
  score: number; // 0-100 score based on position
  sessionId: string; // Session identifier
  rankedAt: number; // Timestamp when ranked
}

let rankedMovies: RankedMovie[] = []; // Ranked movies - starts empty

// Try to import AsyncStorage (optional dependency) - lazy load to avoid blocking
let AsyncStorage: any = null;
const getAsyncStorage = () => {
  if (AsyncStorage === null) {
    try {
      AsyncStorage = require('@react-native-async-storage/async-storage').default;
    } catch {
      AsyncStorage = false; // Mark as unavailable
    }
  }
  return AsyncStorage || null;
};

// New versioned storage key - all buckets stored together
const LIBRARY_STORAGE_KEY = '@moviematch:library-v2';
const RANKING_STORAGE_KEY = '@moviematch:rankings-v1';

// ============================================================================
// DEV MODE FLAG - REMOVE BEFORE PRODUCTION
// ============================================================================
// Set to true during development to always start with empty buckets.
// Set to false (or remove this flag) to enable real persistence in production.
// In production, buckets should load from AsyncStorage or backend after login.
const DEV_MODE_EMPTY_BUCKETS = true;
// ============================================================================

// Old storage keys (deprecated - no longer used, kept for reference)
// These were used by earlier versions and are now ignored:
// '@moviematch:seen'
// '@moviematch:skipped'
// '@moviematch:watchlist'

/**
 * Remove duplicate ranked entries (keep the most recent one) while preserving order.
 */
function dedupeRankedMovies(): void {
  if (rankedMovies.length === 0) return;

  const seen = new Set<string>();
  const normalized: RankedMovie[] = [];

  for (let index = rankedMovies.length - 1; index >= 0; index -= 1) {
    const movie = rankedMovies[index];
    if (seen.has(movie.movieId)) continue;
    seen.add(movie.movieId);
    normalized.unshift(movie);
  }

  rankedMovies = normalized;
}

/**
 * Ensure ranked movies have a stable deterministic order and sequential positions.
 */
function normalizeRankedOrder(): void {
  if (rankedMovies.length === 0) return;

  dedupeRankedMovies();

  rankedMovies.sort((a, b) => {
    if (a.position !== b.position) {
      return a.position - b.position;
    }
    return a.rankedAt - b.rankedAt;
  });

  rankedMovies = rankedMovies.map((rm, index) => ({
    ...rm,
    position: index + 1,
  }));
}

/**
 * Apply bucket exclusivity rules:
 * - Ranked movies win over everything else
 * - Skipped movies are first-class: they stay skipped and never auto-move to seenIds
 * - Movies to Rank (seenIds) cannot include skipped or ranked entries
 * - Watchlist is independent and can coexist with other buckets
 */
function enforceBucketBoundaries(): void {
  normalizeRankedOrder();

  const rankedSet = new Set(rankedMovies.map(rm => rm.movieId));

  // Skipped movies cannot also live in the ranked list
  // But skipped movies are preserved - they stay skipped
  skippedIds = new Set(Array.from(skippedIds).filter(id => !rankedSet.has(id)));

  // Movies to Rank (seenIds) cannot include skipped or ranked entries
  // This ensures skipped movies NEVER appear in "Movies to Rank"
  seenIds = new Set(
    Array.from(seenIds).filter(id => !rankedSet.has(id) && !skippedIds.has(id))
  );
}

/**
 * Cleanup state after hydration
 * 
 * DEVELOPMENT MODE: Since we always start with empty buckets, this cleanup
 * just ensures Sets are properly wrapped and boundaries are enforced.
 * Does not add any movies - only cleans up structure.
 */
function cleanupStateAfterHydration(): void {
  // Re-wrap in Sets to drop accidental duplicates
  // Since we start with empty buckets, this just ensures proper Set structure
  seenIds = new Set(seenIds);
  skippedIds = new Set(skippedIds);
  watchlistIds = new Set(watchlistIds);

  // Enforce boundaries (ensures no overlaps between buckets)
  // With empty buckets, this is a no-op but keeps logic consistent
  enforceBucketBoundaries();

  console.log('[Library] Cleanup complete after hydration (all buckets empty):', {
    seen: Array.from(seenIds),
    skipped: Array.from(skippedIds),
    watchlist: Array.from(watchlistIds),
    ranked: rankedMovies.map(rm => rm.movieId),
  });
}

function removeFromRankings(movieId: string): void {
  const before = rankedMovies.length;
  rankedMovies = rankedMovies.filter(rm => rm.movieId !== movieId);

  if (rankedMovies.length !== before) {
    recalculateGlobalScores();
  }
}

/**
 * Load library state from AsyncStorage
 * 
 * PRODUCTION: Loads saved state from storage (seenIds, skippedIds, watchlistIds)
 * DEV MODE: Starts with empty buckets and clears storage (controlled by DEV_MODE_EMPTY_BUCKETS flag)
 */
async function loadFromStorage(): Promise<void> {
  const storage = getAsyncStorage();
  
  if (!storage) {
    console.log('[Library] AsyncStorage not available, starting with empty buckets');
    seenIds = new Set<string>();
    skippedIds = new Set<string>();
    watchlistIds = new Set<string>();
    return;
  }

  // ============================================================================
  // DEV ONLY: always start with empty buckets. Remove before production.
  // ============================================================================
  if (DEV_MODE_EMPTY_BUCKETS) {
    // Always start with empty buckets
    seenIds = new Set<string>();
    skippedIds = new Set<string>();
    watchlistIds = new Set<string>();
    
    try {
      // Clear storage keys on every startup for clean state
      await storage.removeItem(LIBRARY_STORAGE_KEY);
      console.log('[Library] DEV MODE: Cleared library storage key for clean start');
      console.log('[Library] DEV MODE: Starting with empty buckets (no persistence)');
    } catch (error) {
      console.warn('Failed to clear storage:', error);
    }
    return;
  }
  // ============================================================================
  // PRODUCTION: Load saved state from storage
  // ============================================================================
  
  try {
    console.log('[Library] Loading from key:', LIBRARY_STORAGE_KEY);
    
    const data = await storage.getItem(LIBRARY_STORAGE_KEY);
    if (data) {
      const libraryState = JSON.parse(data);
      seenIds = new Set(libraryState.seenIds || []);
      skippedIds = new Set(libraryState.skippedIds || []);
      watchlistIds = new Set(libraryState.watchlistIds || []);
      console.log('[Library] Loaded state from storage:', {
        seen: Array.from(seenIds),
        skipped: Array.from(skippedIds),
        watchlist: Array.from(watchlistIds),
      });
    } else {
      // No saved state - start with empty buckets
      seenIds = new Set<string>();
      skippedIds = new Set<string>();
      watchlistIds = new Set<string>();
      console.log('[Library] No saved state found, starting with empty buckets');
    }
  } catch (error) {
    console.warn('Failed to initialize library state:', error);
    // On error, start with empty buckets
    seenIds = new Set<string>();
    skippedIds = new Set<string>();
    watchlistIds = new Set<string>();
    console.log('[Library] Falling back to empty buckets after load failure');
  }
}

async function saveToStorage(): Promise<void> {
  const storage = getAsyncStorage();
  if (!storage) return;

  try {
    // Save all buckets together in a single object using the new versioned key
    const libraryState = {
      seenIds: Array.from(seenIds),
      skippedIds: Array.from(skippedIds),
      watchlistIds: Array.from(watchlistIds),
    };
    
    await storage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(libraryState));
    
    // Save rankings separately
    await storage.setItem(RANKING_STORAGE_KEY, JSON.stringify(rankedMovies));
  } catch (error) {
    console.warn('Failed to save library state to storage:', error);
  }
}

/**
 * Load rankings from AsyncStorage
 * 
 * PRODUCTION: Loads saved rankings from storage
 * DEV MODE: Starts with empty rankings and clears storage (controlled by DEV_MODE_EMPTY_BUCKETS flag)
 */
async function loadRankingsFromStorage(): Promise<void> {
  const storage = getAsyncStorage();
  
  if (!storage) {
    console.log('[Library] AsyncStorage not available, starting with empty rankings');
    rankedMovies = [];
    return;
  }

  // ============================================================================
  // DEV ONLY: always start with empty rankings. Remove before production.
  // ============================================================================
  if (DEV_MODE_EMPTY_BUCKETS) {
    // Always start with empty rankings
    rankedMovies = [];
    
    try {
      // Clear rankings storage key on every startup for clean state
      await storage.removeItem(RANKING_STORAGE_KEY);
      console.log('[Library] DEV MODE: Cleared rankings storage key for clean start');
      console.log('[Library] DEV MODE: Starting with empty rankings (no persistence)');
    } catch (error) {
      console.warn('Failed to clear rankings storage:', error);
    }
    return;
  }
  // ============================================================================
  // PRODUCTION: Load saved rankings from storage
  // ============================================================================
  
  try {
    const data = await storage.getItem(RANKING_STORAGE_KEY);
    if (data) {
      rankedMovies = JSON.parse(data);
      normalizeRankedOrder();
      console.log('[Library] Loaded rankings from storage:', rankedMovies.length, 'movies');
    } else {
      rankedMovies = [];
      console.log('[Library] No saved rankings found, starting with empty rankings');
    }
  } catch (error) {
    console.warn('Failed to load rankings from storage:', error);
    rankedMovies = [];
  }
  
  normalizeRankedOrder();
}

async function hydrateLibraryState(): Promise<void> {
  try {
    await loadFromStorage();
    await loadRankingsFromStorage();
    cleanupStateAfterHydration();
    await saveToStorage();
  } catch (error) {
    console.warn('[Library] Hydration failed:', error);
  }
}

// Initialize on first import (non-blocking)
hydrateLibraryState().catch(() => {
  // Silently fail if storage not available
});

export function markSeen(id: string): void {
  // Add to seenIds and remove from other buckets
  seenIds.add(id);
  skippedIds.delete(id);
  
  enforceBucketBoundaries();
  
  console.log(`[Library] markSeen('${id}') - seenIds now:`, Array.from(seenIds));
  saveToStorage();
}

export function markSkipped(id: string): void {
  // Add to skippedIds and remove from other buckets
  skippedIds.add(id);
  seenIds.delete(id);

  // Remove from ranked movies if it was previously ranked
  removeFromRankings(id);
  enforceBucketBoundaries();
  
  console.log(`[Library] markSkipped('${id}') - skippedIds now:`, Array.from(skippedIds));
  saveToStorage();
}

export function unskipMovie(id: string, returnToRankingQueue: boolean = true): void {
  if (!skippedIds.has(id)) return;

  skippedIds.delete(id);

  // By default we place the movie back into the Movies to Rank bucket
  // so the user can compare it again later.
  if (returnToRankingQueue) {
    seenIds.add(id);
  }

  enforceBucketBoundaries();
  console.log(`[Library] unskipMovie('${id}') - skippedIds now:`, Array.from(skippedIds));
  saveToStorage();
}

export function markWatchlist(id: string): void {
  // Add to watchlistIds but leave other buckets untouched so
  // a movie can be both watchlisted and seen/ranked.
  watchlistIds.add(id);
  
  console.log(`[Library] markWatchlist('${id}') - watchlistIds now:`, Array.from(watchlistIds));
  saveToStorage();
}

export function resetAll(): void {
  seenIds.clear();
  skippedIds.clear();
  watchlistIds.clear();
  saveToStorage();
}

/**
 * Clear all library data including rankings (for debugging/testing)
 */
export async function clearAllData(): Promise<void> {
  seenIds.clear();
  skippedIds.clear();
  watchlistIds.clear();
  rankedMovies = [];
  
  const storage = getAsyncStorage();
  if (storage) {
    try {
      await storage.removeItem(LIBRARY_STORAGE_KEY);
      await storage.removeItem(RANKING_STORAGE_KEY);
      console.log('[Library] Cleared all data from storage');
    } catch (error) {
      console.warn('Failed to clear storage:', error);
    }
  }
}

export function counts(): { seen: number; skipped: number; watchlist: number } {
  // Movies Watched = seen movies + ranked movies
  // Ranked movies are still considered "watched" even though they're removed from seenIds
  const rankedIds = new Set(rankedMovies.map(rm => rm.movieId));
  const seenAndRanked = new Set([...seenIds, ...rankedIds]);
  
  return {
    seen: seenAndRanked.size, // Includes both unranked seen movies and ranked movies
    skipped: skippedIds.size,
    watchlist: watchlistIds.size,
  };
}

export function isSeen(id: string): boolean {
  return seenIds.has(id);
}

export function isSkipped(id: string): boolean {
  return skippedIds.has(id);
}

export function isWatchlist(id: string): boolean {
  return watchlistIds.has(id);
}

// Get all IDs as arrays (for displaying in lists)
export function getSeenIds(): string[] {
  return Array.from(seenIds);
}

export function getWatchlistIds(): string[] {
  return Array.from(watchlistIds);
}

export function getSkippedIds(): string[] {
  return Array.from(skippedIds);
}

// Ranking functions

/**
 * Get all unranked seen movie IDs (seen but not yet ranked)
 * Excludes movies that are in the skipped bucket
 */
export function getUnrankedSeenIds(): string[] {
  enforceBucketBoundaries();
  const rankedIds = new Set(rankedMovies.map(rm => rm.movieId));
  // Return seen movies that are not ranked AND not skipped
  return Array.from(seenIds).filter(id => !rankedIds.has(id) && !skippedIds.has(id));
}

/**
 * Get all ranked movie IDs
 */
export function getRankedIds(): string[] {
  recalculateGlobalScores();
  return rankedMovies.map(rm => rm.movieId);
}

/**
 * Check if a movie has been ranked
 */
export function isRanked(movieId: string): boolean {
  return rankedMovies.some(rm => rm.movieId === movieId);
}

/**
 * Persist ranking changes after an insertion session.
 * @param newlyRankedIds Movies that were inserted during this session
 * @param finalOrderedIds Final ordered list (best → worst) after the insertions
 */
export function saveRankingSession(
  newlyRankedIds: string[],
  finalOrderedIds: string[],
  sessionId: string = `session-${Date.now()}`
): void {
  if (finalOrderedIds.length === 0) {
    console.log('[Library] saveRankingSession called with empty order. Skipping.');
    return;
  }

  const orderSeen = new Set<string>();
  const uniqueOrder: string[] = [];

  finalOrderedIds.forEach(id => {
    if (id && !orderSeen.has(id)) {
      orderSeen.add(id);
      uniqueOrder.push(id);
    }
  });

  // Ensure previously ranked movies that were not part of this order are appended
  rankedMovies.forEach(rm => {
    if (!orderSeen.has(rm.movieId)) {
      orderSeen.add(rm.movieId);
      uniqueOrder.push(rm.movieId);
    }
  });

  const now = Date.now();
  const newIds = new Set(newlyRankedIds);
  const previousMap = new Map(rankedMovies.map(rm => [rm.movieId, rm]));

  rankedMovies = uniqueOrder.map((movieId, index) => {
    const existing = previousMap.get(movieId);
    const baseData: RankedMovie = existing
      ? { ...existing }
      : {
          movieId,
          position: index + 1,
          score: 0,
          sessionId,
          rankedAt: now,
        };

    if (newIds.has(movieId)) {
      return {
        ...baseData,
        position: index + 1,
        sessionId,
        rankedAt: now,
      };
    }

    return {
      ...baseData,
      position: index + 1,
    };
  });

  // Remove any new rankings from Movies to Rank and Skipped buckets
  newIds.forEach(id => {
    seenIds.delete(id);
    skippedIds.delete(id);
  });

  enforceBucketBoundaries();
  recalculateGlobalScores();

  console.log(
    `[Library] Updated rankings with ${newIds.size} newly ranked movies. Current order:`,
    uniqueOrder
  );
  saveToStorage();
}

/**
 * Recalculate scores for all ranked movies based on their global ranking position
 * Uses percentile formula: score = (n - x + 1) / n * 100
 * where n = total movies, x = global position (1 = top, n = last)
 */
export function recalculateGlobalScores(): void {
  if (rankedMovies.length === 0) return;

  rankedMovies.sort((a, b) => {
    if (a.position !== b.position) {
      return a.position - b.position;
    }
    return a.rankedAt - b.rankedAt;
  });

  const total = rankedMovies.length;

  rankedMovies = rankedMovies.map((rm, index) => {
    const score = Math.round(((total - index) / total) * 100);
    return {
      ...rm,
      position: index + 1,
      score,
    };
  });
}

/**
 * Get all ranked movies sorted by score (best first)
 * Scores are based on global ranking position using percentile formula
 * Excludes movies that are in the skipped bucket
 */
export function getRankedMovies(): RankedMovie[] {
  // Ensure scores are up-to-date
  recalculateGlobalScores();
  
  let activeRankedMovies = rankedMovies.filter(rm => !skippedIds.has(rm.movieId));

  if (activeRankedMovies.length !== rankedMovies.length) {
    rankedMovies = activeRankedMovies;
    recalculateGlobalScores();
    activeRankedMovies = rankedMovies;
  }

  return [...activeRankedMovies];
}

/**
 * Get ranked movie data for a specific movie ID
 */
export function getRankedMovie(movieId: string): RankedMovie | undefined {
  return rankedMovies.find(rm => rm.movieId === movieId);
}
