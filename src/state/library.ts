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
let sceneIds = new Set<string>(); // Scene bucket - starts empty
let moviesToBeRanked = new Set<string>(); // Movies to be Logged inbox - starts empty
let masterRankingsIds = new Set<string>(); // Master Rankings list - all movie IDs
let masterRankingsRankedIds: string[] = []; // Master Rankings - ranked movie IDs in order

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

export interface ActivityItem {
  id: string; // Unique ID for the activity
  action: 'watched_now' | 'logged_watched' | 'ranked' | 'watchlist' | 'skipped' | 'added_to_list' | 'ranked_in_list';
  movieId: string;
  listId?: string; // Optional: ID of the list (for list-related activities)
  listName?: string; // Optional: Name of the list (for display)
  timestamp: number; // Unix timestamp in milliseconds
}

export interface CustomList {
  id: string; // Unique ID for the list
  name: string; // User-provided name
  movieIds: string[]; // Array of movie IDs in this list
  rankedMovieIds: string[]; // Array of movie IDs in ranked order (subset of movieIds)
  createdAt: number; // Unix timestamp in milliseconds
  updatedAt: number; // Unix timestamp in milliseconds
}

let rankedMovies: RankedMovie[] = []; // Ranked movies - starts empty
let activityItems: ActivityItem[] = []; // Activity timeline - starts empty
let customLists: CustomList[] = []; // Custom lists - starts empty

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
const ACTIVITY_STORAGE_KEY = '@moviematch:activity-v1';
const CUSTOM_LISTS_STORAGE_KEY = '@moviematch:custom-lists-v1';

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
  sceneIds = new Set(sceneIds);
  moviesToBeRanked = new Set(moviesToBeRanked);
  masterRankingsIds = new Set(masterRankingsIds);

  // Enforce boundaries (ensures no overlaps between buckets)
  // With empty buckets, this is a no-op but keeps logic consistent
  enforceBucketBoundaries();

  console.log('[Library] Cleanup complete after hydration (all buckets empty):', {
    seen: Array.from(seenIds),
    skipped: Array.from(skippedIds),
    watchlist: Array.from(watchlistIds),
    scene: Array.from(sceneIds),
    moviesToBeRanked: Array.from(moviesToBeRanked),
    masterRankings: Array.from(masterRankingsIds),
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
 * Create an activity item and add it to the timeline
 */
function addActivityItem(
  action: ActivityItem['action'],
  movieId: string,
  listId?: string,
  listName?: string
): void {
  const activity: ActivityItem = {
    id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    action,
    movieId,
    listId,
    listName,
    timestamp: Date.now(),
  };
  
  activityItems.push(activity);
  
  // Keep only the most recent 1000 activities to prevent storage bloat
  if (activityItems.length > 1000) {
    activityItems = activityItems.slice(-1000);
  }
  
  // Sort by timestamp (newest first)
  activityItems.sort((a, b) => b.timestamp - a.timestamp);
  
  saveActivityToStorage();
}

/**
 * Get all activity items sorted by timestamp (newest first)
 */
export function getActivityItems(): ActivityItem[] {
  return [...activityItems];
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
    sceneIds = new Set<string>();
    moviesToBeRanked = new Set<string>();
      masterRankingsIds = new Set<string>();
      masterRankingsRankedIds = [];
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
    sceneIds = new Set<string>();
    moviesToBeRanked = new Set<string>();
      masterRankingsIds = new Set<string>();
      masterRankingsRankedIds = [];
      
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
      sceneIds = new Set(libraryState.sceneIds || []);
      moviesToBeRanked = new Set(libraryState.moviesToBeRanked || []);
      masterRankingsIds = new Set(libraryState.masterRankingsIds || []);
      masterRankingsRankedIds = libraryState.masterRankingsRankedIds || [];
      console.log('[Library] Loaded state from storage:', {
        seen: Array.from(seenIds),
        skipped: Array.from(skippedIds),
        watchlist: Array.from(watchlistIds),
        scene: Array.from(sceneIds),
        moviesToBeRanked: Array.from(moviesToBeRanked),
        masterRankings: Array.from(masterRankingsIds),
        masterRankingsRanked: masterRankingsRankedIds,
      });
    } else {
      // No saved state - start with empty buckets
      seenIds = new Set<string>();
      skippedIds = new Set<string>();
      watchlistIds = new Set<string>();
      sceneIds = new Set<string>();
      moviesToBeRanked = new Set<string>();
      masterRankingsIds = new Set<string>();
      masterRankingsRankedIds = [];
      console.log('[Library] No saved state found, starting with empty buckets');
    }
  } catch (error) {
    console.warn('Failed to initialize library state:', error);
    // On error, start with empty buckets
    seenIds = new Set<string>();
    skippedIds = new Set<string>();
    watchlistIds = new Set<string>();
    sceneIds = new Set<string>();
    moviesToBeRanked = new Set<string>();
      masterRankingsIds = new Set<string>();
      masterRankingsRankedIds = [];
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
      sceneIds: Array.from(sceneIds),
      moviesToBeRanked: Array.from(moviesToBeRanked),
      masterRankingsIds: Array.from(masterRankingsIds),
      masterRankingsRankedIds: masterRankingsRankedIds,
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

async function loadActivityFromStorage(): Promise<void> {
  const storage = getAsyncStorage();
  
  if (!storage) {
    console.log('[Library] AsyncStorage not available, starting with empty activity');
    activityItems = [];
    return;
  }

  if (DEV_MODE_EMPTY_BUCKETS) {
    activityItems = [];
    try {
      await storage.removeItem(ACTIVITY_STORAGE_KEY);
      console.log('[Library] DEV MODE: Cleared activity storage key for clean start');
    } catch (error) {
      console.warn('Failed to clear activity storage:', error);
    }
    return;
  }

  try {
    const data = await storage.getItem(ACTIVITY_STORAGE_KEY);
    if (data) {
      activityItems = JSON.parse(data);
      // Sort by timestamp (newest first)
      activityItems.sort((a, b) => b.timestamp - a.timestamp);
      console.log('[Library] Loaded activity from storage:', activityItems.length, 'items');
    } else {
      activityItems = [];
      console.log('[Library] No saved activity found, starting with empty activity');
    }
  } catch (error) {
    console.warn('Failed to load activity from storage:', error);
    activityItems = [];
  }
}

async function saveActivityToStorage(): Promise<void> {
  const storage = getAsyncStorage();
  if (!storage) return;

  try {
    await storage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(activityItems));
  } catch (error) {
    console.warn('Failed to save activity to storage:', error);
  }
}

async function loadCustomListsFromStorage(): Promise<void> {
  const storage = getAsyncStorage();
  
  if (!storage) {
    console.log('[Library] AsyncStorage not available, starting with empty custom lists');
    customLists = [];
    return;
  }

  if (DEV_MODE_EMPTY_BUCKETS) {
    customLists = [];
    try {
      await storage.removeItem(CUSTOM_LISTS_STORAGE_KEY);
      console.log('[Library] DEV MODE: Cleared custom lists storage key for clean start');
    } catch (error) {
      console.warn('Failed to clear custom lists storage:', error);
    }
    return;
  }

  try {
    const data = await storage.getItem(CUSTOM_LISTS_STORAGE_KEY);
    if (data) {
      const loadedLists = JSON.parse(data);
      // Migrate old lists that don't have rankedMovieIds
      customLists = loadedLists.map((list: any) => ({
        ...list,
        rankedMovieIds: list.rankedMovieIds || [],
      }));
      console.log('[Library] Loaded custom lists from storage:', customLists.length, 'lists');
    } else {
      customLists = [];
      console.log('[Library] No saved custom lists found, starting with empty lists');
    }
  } catch (error) {
    console.warn('Failed to load custom lists from storage:', error);
    customLists = [];
  }
}

async function saveCustomListsToStorage(): Promise<void> {
  const storage = getAsyncStorage();
  if (!storage) return;

  try {
    await storage.setItem(CUSTOM_LISTS_STORAGE_KEY, JSON.stringify(customLists));
  } catch (error) {
    console.warn('Failed to save custom lists to storage:', error);
  }
}

async function hydrateLibraryState(): Promise<void> {
  try {
    await loadFromStorage();
    await loadRankingsFromStorage();
    await loadActivityFromStorage();
    await loadCustomListsFromStorage();
    cleanupStateAfterHydration();
    await saveToStorage();
    await saveActivityToStorage();
  } catch (error) {
    console.warn('[Library] Hydration failed:', error);
  }
}

// Initialize on first import (non-blocking)
hydrateLibraryState().catch(() => {
  // Silently fail if storage not available
});

export function markSeen(id: string, justWatchedNow: boolean = false): void {
  // Add to seenIds and remove from other buckets
  seenIds.add(id);
  skippedIds.delete(id);
  // Remove from moviesToBeRanked if it was there (Log now processes it)
  moviesToBeRanked.delete(id);
  
  enforceBucketBoundaries();
  
  // Create activity item
  addActivityItem(justWatchedNow ? 'watched_now' : 'logged_watched', id);
  
  console.log(`[Library] markSeen('${id}', justWatchedNow: ${justWatchedNow}) - seenIds now:`, Array.from(seenIds));
  saveToStorage();
}

/**
 * Mark a movie as seen and add it to the "Movies to be Logged" inbox
 * This is used when user chooses "Log later"
 */
export function markSeenForLaterRanking(id: string): void {
  // Mark as seen
  seenIds.add(id);
  skippedIds.delete(id);
  
  // Add to moviesToBeRanked inbox (Movies to be Logged)
  moviesToBeRanked.add(id);
  
  enforceBucketBoundaries();
  
  // Create activity item (logged_watched since it's not "just watched now")
  addActivityItem('logged_watched', id);
  
  console.log(`[Library] markSeenForLaterRanking('${id}') - seenIds:`, Array.from(seenIds), 'moviesToBeRanked:', Array.from(moviesToBeRanked));
  saveToStorage();
}

/**
 * Mark a movie as seen and add it to Master Rankings list
 * This is used when user chooses "Log now" and selects Master Rankings
 */
export function markSeenAndAddToMasterRankings(id: string): void {
  // Mark as seen
  seenIds.add(id);
  skippedIds.delete(id);
  
  // Remove from Movies to be Ranked if it was there
  moviesToBeRanked.delete(id);
  
  // Add to Master Rankings
  masterRankingsIds.add(id);
  
  enforceBucketBoundaries();
  
  // Create activity item
  addActivityItem('logged_watched', id);
  
  console.log(`[Library] markSeenAndAddToMasterRankings('${id}') - seenIds:`, Array.from(seenIds), 'masterRankings:', Array.from(masterRankingsIds));
  saveToStorage();
}

/**
 * Get all movie IDs in Master Rankings
 */
export function getMasterRankingsIds(): string[] {
  return Array.from(masterRankingsIds);
}

/**
 * Get ranked movie IDs in Master Rankings (in order)
 */
export function getMasterRankingsRankedIds(): string[] {
  return [...masterRankingsRankedIds];
}

/**
 * Get waiting to be ranked movie IDs in Master Rankings
 * (movies in the list that are not yet ranked)
 */
export function getMasterRankingsWaitingIds(): string[] {
  const rankedSet = new Set(masterRankingsRankedIds);
  return Array.from(masterRankingsIds).filter(id => !rankedSet.has(id));
}

/**
 * Check if a movie is in Master Rankings
 */
export function isInMasterRankings(id: string): boolean {
  return masterRankingsIds.has(id);
}

/**
 * Get ranked movie IDs for a custom list (in order)
 */
export function getCustomListRankedIds(listId: string): string[] {
  const list = customLists.find(l => l.id === listId);
  return list ? [...list.rankedMovieIds] : [];
}

/**
 * Get waiting to be ranked movie IDs for a custom list
 * (movies in the list that are not yet ranked)
 */
export function getCustomListWaitingIds(listId: string): string[] {
  const list = customLists.find(l => l.id === listId);
  if (!list) return [];
  const rankedSet = new Set(list.rankedMovieIds);
  return list.movieIds.filter(id => !rankedSet.has(id));
}

/**
 * Update a custom list's ranked movie IDs after a ranking session
 */
export function updateCustomListRankedIds(listId: string, rankedMovieIds: string[]): void {
  const list = customLists.find(l => l.id === listId);
  if (!list) {
    console.warn(`[Library] Custom list ${listId} not found`);
    return;
  }
  
  // Find movies that transitioned from waiting to ranked
  const previousRankedSet = new Set(list.rankedMovieIds);
  const newlyRankedIds = rankedMovieIds.filter(id => !previousRankedSet.has(id) && list.movieIds.includes(id));
  
  // Ensure all ranked IDs are actually in the list's movieIds
  const validRankedIds = rankedMovieIds.filter(id => list.movieIds.includes(id));
  
  // Update rankedMovieIds
  list.rankedMovieIds = validRankedIds;
  list.updatedAt = Date.now();
  
  // Create activity items for newly ranked movies
  for (const movieId of newlyRankedIds) {
    addActivityItem('ranked_in_list', movieId, listId, list.name);
  }
  
  saveCustomListsToStorage();
  console.log(`[Library] Updated custom list ${listId} ranked IDs:`, validRankedIds.length, 'movies');
}

/**
 * Update Master Rankings' ranked movie IDs after a ranking session
 */
export function updateMasterRankingsRankedIds(rankedMovieIds: string[]): void {
  // Find movies that transitioned from waiting to ranked
  const previousRankedSet = new Set(masterRankingsRankedIds);
  const newlyRankedIds = rankedMovieIds.filter(id => !previousRankedSet.has(id) && masterRankingsIds.has(id));
  
  // Ensure all ranked IDs are actually in Master Rankings
  const validRankedIds = rankedMovieIds.filter(id => masterRankingsIds.has(id));
  
  // Update masterRankingsRankedIds
  masterRankingsRankedIds = validRankedIds;
  
  // Create activity items for newly ranked movies
  for (const movieId of newlyRankedIds) {
    addActivityItem('ranked_in_list', movieId, 'master-rankings', 'Master Rankings');
  }
  
  saveToStorage();
  console.log(`[Library] Updated Master Rankings ranked IDs:`, validRankedIds.length, 'movies');
}

export function markSkipped(id: string): void {
  // Add to skippedIds and remove from other buckets
  skippedIds.add(id);
  seenIds.delete(id);

  // Remove from ranked movies if it was previously ranked
  removeFromRankings(id);
  enforceBucketBoundaries();
  
  // Create activity item
  addActivityItem('skipped', id);
  
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
  
  // Create activity item
  addActivityItem('watchlist', id);
  
  console.log(`[Library] markWatchlist('${id}') - watchlistIds now:`, Array.from(watchlistIds));
  saveToStorage();
}

export function markScene(id: string): void {
  // Add to sceneIds but leave other buckets untouched so
  // a movie can be both in Scene and in other buckets.
  sceneIds.add(id);
  
  // Create activity item (using 'watchlist' type for now, or we could add 'scene' to ActivityItem)
  // For now, we'll use a generic activity or add 'scene' type
  console.log(`[Library] markScene('${id}') - sceneIds now:`, Array.from(sceneIds));
  saveToStorage();
}

export function resetAll(): void {
  seenIds.clear();
  skippedIds.clear();
  watchlistIds.clear();
  sceneIds.clear();
  moviesToBeRanked.clear();
  saveToStorage();
}

/**
 * Clear all library data including rankings (for debugging/testing)
 */
export async function clearAllData(): Promise<void> {
  seenIds.clear();
  skippedIds.clear();
  watchlistIds.clear();
  sceneIds.clear();
  moviesToBeRanked.clear();
  masterRankingsIds.clear();
  masterRankingsRankedIds = [];
  rankedMovies = [];
  activityItems = [];
  customLists = [];
  
  const storage = getAsyncStorage();
  if (storage) {
    try {
      await storage.removeItem(LIBRARY_STORAGE_KEY);
      await storage.removeItem(RANKING_STORAGE_KEY);
      await storage.removeItem(ACTIVITY_STORAGE_KEY);
      await storage.removeItem(CUSTOM_LISTS_STORAGE_KEY);
      console.log('[Library] Cleared all data from storage');
    } catch (error) {
      console.warn('Failed to clear storage:', error);
    }
  }
}

export function counts(): { seen: number; skipped: number; watchlist: number; scene: number } {
  // Movies Watched = seen movies + ranked movies
  // Ranked movies are still considered "watched" even though they're removed from seenIds
  const rankedIds = new Set(rankedMovies.map(rm => rm.movieId));
  const seenAndRanked = new Set([...seenIds, ...rankedIds]);
  
  return {
    seen: seenAndRanked.size, // Includes both unranked seen movies and ranked movies
    skipped: skippedIds.size,
    watchlist: watchlistIds.size,
    scene: sceneIds.size,
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

/**
 * Get movies that should appear in "Movies to be Logged" inbox
 * These are movies that are:
 * - Seen
 * - Not in Master Rankings
 * - Not in any custom list
 */
export function getMoviesToBeRankedIds(): string[] {
  // Get all seen movie IDs
  const seenIdsArray = Array.from(seenIds);
  
  // Get movies in Master Rankings
  const masterRankingsSet = new Set(masterRankingsIds);
  
  // Get movies in any custom list
  const customListMovieIds = new Set<string>();
  customLists.forEach(list => {
    list.movieIds.forEach(id => customListMovieIds.add(id));
  });
  
  // Movies to be Logged = Seen AND NOT in Master Rankings AND NOT in any custom list
  const moviesToBeRanked = seenIdsArray.filter(id => {
    return !masterRankingsSet.has(id) && !customListMovieIds.has(id);
  });
  
  return moviesToBeRanked;
}

export function isMovieToBeRanked(id: string): boolean {
  // Check if movie is seen and not in any list
  if (!seenIds.has(id)) return false;
  if (masterRankingsIds.has(id)) return false;
  
  // Check if movie is in any custom list
  for (const list of customLists) {
    if (list.movieIds.includes(id)) return false;
  }
  
  return true;
}

/**
 * Assign a movie (that's already seen) to one or more lists
 * Removes the movie from "Movies to be Logged" if it was there
 */
export function assignMovieToLists(
  movieId: string,
  addToMasterRankings: boolean,
  customListIds: string[]
): void {
  // Ensure movie is marked as seen
  if (!seenIds.has(movieId)) {
    seenIds.add(movieId);
  }
  
  // Add to Master Rankings if selected
  if (addToMasterRankings) {
    if (!masterRankingsIds.has(movieId)) {
      masterRankingsIds.add(movieId);
      // Do NOT add to masterRankingsRankedIds - it goes to "waiting to be ranked" bucket
      // Create activity item for adding to Master Rankings
      addActivityItem('added_to_list', movieId, 'master-rankings', 'Master Rankings');
    }
  }
  
  // Add to selected custom lists
  for (const listId of customListIds) {
    addMovieToCustomList(listId, movieId);
  }
  
  // Remove from moviesToBeRanked Set (if it was there from old logic)
  moviesToBeRanked.delete(movieId);
  
  enforceBucketBoundaries();
  
  console.log(`[Library] assignMovieToLists('${movieId}') - masterRankings: ${addToMasterRankings}, customLists: ${customListIds.length}`);
  saveToStorage();
}

// Custom Lists functions

/**
 * Create a new custom list
 */
export function createCustomList(name: string): CustomList {
  const now = Date.now();
  const newList: CustomList = {
    id: `list-${now}-${Math.random().toString(36).substr(2, 9)}`,
    name: name.trim(),
    movieIds: [],
    rankedMovieIds: [],
    createdAt: now,
    updatedAt: now,
  };
  
  customLists.push(newList);
  saveCustomListsToStorage();
  
  console.log(`[Library] Created custom list: ${newList.name} (${newList.id})`);
  return newList;
}

/**
 * Get all custom lists
 */
export function getCustomLists(): CustomList[] {
  return [...customLists];
}

/**
 * Get a custom list by ID
 */
export function getCustomList(id: string): CustomList | undefined {
  return customLists.find(list => list.id === id);
}

/**
 * Delete a custom list
 */
export function deleteCustomList(id: string): void {
  const index = customLists.findIndex(list => list.id === id);
  if (index !== -1) {
    customLists.splice(index, 1);
    saveCustomListsToStorage();
    console.log(`[Library] Deleted custom list: ${id}`);
  }
}

/**
 * Update a custom list's name
 */
export function updateCustomListName(id: string, newName: string): void {
  const list = customLists.find(l => l.id === id);
  if (list) {
    list.name = newName.trim();
    list.updatedAt = Date.now();
    saveCustomListsToStorage();
    console.log(`[Library] Updated custom list name: ${id} -> ${newName}`);
  }
}

/**
 * Add a movie to a custom list
 * The movie is added to movieIds but NOT to rankedMovieIds (goes to waiting bucket)
 */
export function addMovieToCustomList(listId: string, movieId: string): void {
  const list = customLists.find(l => l.id === listId);
  if (list) {
    // Avoid duplicates
    if (!list.movieIds.includes(movieId)) {
      list.movieIds.push(movieId);
      // Do NOT add to rankedMovieIds - it goes to "waiting to be ranked" bucket
      list.updatedAt = Date.now();
      saveCustomListsToStorage();
      
      // Create activity item
      addActivityItem('added_to_list', movieId, listId, list.name);
      
      console.log(`[Library] Added movie ${movieId} to custom list ${listId} (waiting to be ranked)`);
    } else {
      console.log(`[Library] Movie ${movieId} already in custom list ${listId}`);
    }
  } else {
    console.warn(`[Library] Custom list ${listId} not found`);
  }
}

/**
 * Remove a movie from a custom list
 */
export function removeMovieFromCustomList(listId: string, movieId: string): void {
  const list = customLists.find(l => l.id === listId);
  if (list) {
    const index = list.movieIds.indexOf(movieId);
    if (index !== -1) {
      list.movieIds.splice(index, 1);
      list.updatedAt = Date.now();
      saveCustomListsToStorage();
      console.log(`[Library] Removed movie ${movieId} from custom list ${listId}`);
    }
  }
}

/**
 * Mark a movie as seen and add it to selected lists (Master Rankings and/or custom lists)
 * Also removes the movie from "Movies to be Logged" inbox
 * Movies are added to lists but NOT to rankedMovieIds (they go to waiting bucket)
 */
export function markSeenAndAddToLists(
  movieId: string,
  addToMasterRankings: boolean,
  customListIds: string[]
): void {
  // 1. Mark as seen
  seenIds.add(movieId);
  skippedIds.delete(movieId);
  
  // 2. Remove from Movies to be Logged (inbox)
  moviesToBeRanked.delete(movieId);
  
  // 3. Add to Master Rankings if selected
  // Add to masterRankingsIds but NOT to masterRankingsRankedIds (goes to waiting bucket)
  if (addToMasterRankings) {
    if (!masterRankingsIds.has(movieId)) {
      masterRankingsIds.add(movieId);
      // Do NOT add to masterRankingsRankedIds - it goes to "waiting to be ranked" bucket
      // Create activity item for adding to Master Rankings
      addActivityItem('added_to_list', movieId, 'master-rankings', 'Master Rankings');
    }
  }
  
  // 4. Add to selected custom lists
  for (const listId of customListIds) {
    addMovieToCustomList(listId, movieId);
  }
  
  enforceBucketBoundaries();
  
  // Create activity item for logging the movie
  addActivityItem('logged_watched', movieId);
  
  console.log(`[Library] markSeenAndAddToLists('${movieId}') - masterRankings: ${addToMasterRankings}, customLists: ${customListIds.length}`);
  saveToStorage();
}

export function getSkippedIds(): string[] {
  return Array.from(skippedIds);
}

export function getSceneIds(): string[] {
  return Array.from(sceneIds);
}

export function isScene(id: string): boolean {
  return sceneIds.has(id);
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

  // Create activity items for newly ranked movies
  newIds.forEach(id => {
    addActivityItem('ranked', id);
  });

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
