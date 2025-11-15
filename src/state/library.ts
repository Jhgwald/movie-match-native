// In-memory library state for tracking seen, passed, and watchlist movies
// Optional persistence with AsyncStorage if available

let seenIds = new Set<string>();
let passedIds = new Set<string>();
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

const STORAGE_KEYS = {
  SEEN: '@moviematch:seen',
  PASSED: '@moviematch:passed',
  WATCHLIST: '@moviematch:watchlist',
};

async function loadFromStorage(): Promise<void> {
  const storage = getAsyncStorage();
  if (!storage) return;
  
  try {
    const [seen, passed, watchlist] = await Promise.all([
      storage.getItem(STORAGE_KEYS.SEEN),
      storage.getItem(STORAGE_KEYS.PASSED),
      storage.getItem(STORAGE_KEYS.WATCHLIST),
    ]);
    
    if (seen) seenIds = new Set(JSON.parse(seen));
    if (passed) passedIds = new Set(JSON.parse(passed));
    if (watchlist) watchlistIds = new Set(JSON.parse(watchlist));
  } catch (error) {
    console.warn('Failed to load library state from storage:', error);
  }
}

async function saveToStorage(): Promise<void> {
  const storage = getAsyncStorage();
  if (!storage) return;
  
  try {
    await Promise.all([
      storage.setItem(STORAGE_KEYS.SEEN, JSON.stringify(Array.from(seenIds))),
      storage.setItem(STORAGE_KEYS.PASSED, JSON.stringify(Array.from(passedIds))),
      storage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(Array.from(watchlistIds))),
    ]);
  } catch (error) {
    console.warn('Failed to save library state to storage:', error);
  }
}

// Initialize on first import (non-blocking)
loadFromStorage().catch(() => {
  // Silently fail if storage not available
});

export function markSeen(id: string): void {
  seenIds.add(id);
  passedIds.delete(id);
  watchlistIds.delete(id);
  saveToStorage();
}

export function markPassed(id: string): void {
  passedIds.add(id);
  seenIds.delete(id);
  watchlistIds.delete(id);
  saveToStorage();
}

export function markWatchlist(id: string): void {
  watchlistIds.add(id);
  passedIds.delete(id);
  // Don't remove from seen - you can watchlist something you've seen
  saveToStorage();
}

export function resetAll(): void {
  seenIds.clear();
  passedIds.clear();
  watchlistIds.clear();
  saveToStorage();
}

export function counts(): { seen: number; passed: number; watchlist: number } {
  return {
    seen: seenIds.size,
    passed: passedIds.size,
    watchlist: watchlistIds.size,
  };
}

export function isSeen(id: string): boolean {
  return seenIds.has(id);
}

export function isPassed(id: string): boolean {
  return passedIds.has(id);
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

export function getPassedIds(): string[] {
  return Array.from(passedIds);
}

