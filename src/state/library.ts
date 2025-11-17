// In-memory library state for tracking seen, skipped, and watchlist movies
// Optional persistence with AsyncStorage if available

let seenIds = new Set<string>();
let skippedIds = new Set<string>();
let watchlistIds = new Set<string>();

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

// Old storage keys (deprecated - no longer used, kept for reference)
// These were used by earlier versions and are now ignored:
// '@moviematch:seen'
// '@moviematch:skipped'
// '@moviematch:watchlist'

/**
 * Enforces that each movie ID can only exist in exactly one bucket.
 * Priority: skippedIds > seenIds > watchlistIds
 * 
 * - If ID is in skippedIds → remove it from seenIds and watchlistIds
 * - Else if ID is in seenIds → remove it from watchlistIds
 * - Else if ID is only in watchlistIds → leave it there
 */
function enforceExclusiveBuckets(): void {
  // Create working copies
  const skipped = new Set(skippedIds);
  const seen = new Set(seenIds);
  const watchlist = new Set(watchlistIds);

  // 1) Skipped wins: remove from other sets
  skipped.forEach(id => {
    seen.delete(id);
    watchlist.delete(id);
  });

  // 2) Seen next: remove from watchlist
  seen.forEach(id => {
    watchlist.delete(id);
  });

  // Update the global state
  seenIds = seen;
  skippedIds = skipped;
  watchlistIds = watchlist;
}

async function loadFromStorage(): Promise<void> {
  const storage = getAsyncStorage();
  if (!storage) {
    console.log('[Library] AsyncStorage not available, starting with empty buckets');
    // Initialize with empty buckets even if storage is unavailable
    seenIds = new Set<string>();
    skippedIds = new Set<string>();
    watchlistIds = new Set<string>();
    return;
  }

  try {
    // Log which key we are using
    console.log('[Library] Loading from key:', LIBRARY_STORAGE_KEY);
    
    // DEVELOPMENT MODE: Always clear the key on startup to start fresh
    // This ensures each app launch starts with an empty library
    await storage.removeItem(LIBRARY_STORAGE_KEY);
    console.log('[Library] Cleared storage key for fresh start');
    
    // Always start with empty buckets (no saved state loaded)
    seenIds = new Set<string>();
    skippedIds = new Set<string>();
    watchlistIds = new Set<string>();
    
    // Enforce exclusivity (no-op on empty sets, but keeps code consistent)
    enforceExclusiveBuckets();
    
    // Log the final loaded state (always empty on startup)
    const finalState = {
      seenIds: Array.from(seenIds),
      skippedIds: Array.from(skippedIds),
      watchlistIds: Array.from(watchlistIds),
    };
    console.log('[Library] Final loaded state (fresh start):', JSON.stringify(finalState));
    
    // Save the empty state to storage (ensures clean state is persisted)
    await saveToStorage();
  } catch (error) {
    console.warn('Failed to initialize library state:', error);
    // On error, start with empty buckets
    seenIds = new Set<string>();
    skippedIds = new Set<string>();
    watchlistIds = new Set<string>();
    
    // Log the final loaded state (empty due to error)
    const finalState = {
      seenIds: Array.from(seenIds),
      skippedIds: Array.from(skippedIds),
      watchlistIds: Array.from(watchlistIds),
    };
    console.log('[Library] Final loaded state (after error):', JSON.stringify(finalState));
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
  } catch (error) {
    console.warn('Failed to save library state to storage:', error);
  }
}

// Initialize on first import (non-blocking)
loadFromStorage().catch(() => {
  // Silently fail if storage not available
});

export function markSeen(id: string): void {
  // Add to seenIds and remove from other buckets
  seenIds.add(id);
  skippedIds.delete(id);
  watchlistIds.delete(id);
  
  // Enforce exclusivity (defensive - ensures no overlaps)
  enforceExclusiveBuckets();
  
  console.log(`[Library] markSeen('${id}') - seenIds now:`, Array.from(seenIds));
  saveToStorage();
}

export function markSkipped(id: string): void {
  // Add to skippedIds and remove from other buckets
  skippedIds.add(id);
  seenIds.delete(id);
  watchlistIds.delete(id);
  
  // Enforce exclusivity (defensive - ensures no overlaps)
  enforceExclusiveBuckets();
  
  console.log(`[Library] markSkipped('${id}') - skippedIds now:`, Array.from(skippedIds));
  saveToStorage();
}

export function markWatchlist(id: string): void {
  // Add to watchlistIds and remove from other buckets
  watchlistIds.add(id);
  skippedIds.delete(id);
  seenIds.delete(id);
  
  // Enforce exclusivity (defensive - ensures no overlaps)
  enforceExclusiveBuckets();
  
  console.log(`[Library] markWatchlist('${id}') - watchlistIds now:`, Array.from(watchlistIds));
  saveToStorage();
}

export function resetAll(): void {
  seenIds.clear();
  skippedIds.clear();
  watchlistIds.clear();
  saveToStorage();
}

export function counts(): { seen: number; skipped: number; watchlist: number } {
  return {
    seen: seenIds.size,
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

