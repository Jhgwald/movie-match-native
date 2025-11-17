import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type FeedPreferences,
  type StreamingPreferences,
  DEFAULT_FEED_PREFERENCES,
} from '../types/feedPreferences';

const STORAGE_KEY = '@movie_match:feed_preferences';

interface FeedPreferencesContextValue {
  feedPreferences: FeedPreferences;
  setFeedPreferences: (preferences: FeedPreferences) => void;
  setStreamingPreferences: (streaming: StreamingPreferences) => void;
  isLoading: boolean;
}

const FeedPreferencesContext = createContext<FeedPreferencesContextValue | undefined>(undefined);

export function FeedPreferencesProvider({ children }: { children: ReactNode }) {
  const [feedPreferences, setFeedPreferencesState] = useState<FeedPreferences>(DEFAULT_FEED_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences from AsyncStorage on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as FeedPreferences;
        setFeedPreferencesState(parsed);
      }
    } catch (error) {
      console.error('Failed to load feed preferences:', error);
      // Use defaults if loading fails
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async (preferences: FeedPreferences) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save feed preferences:', error);
    }
  };

  const setFeedPreferences = (preferences: FeedPreferences) => {
    setFeedPreferencesState(preferences);
    savePreferences(preferences);
  };

  const setStreamingPreferences = (streaming: StreamingPreferences) => {
    const newPreferences = {
      ...feedPreferences,
      streaming,
    };
    setFeedPreferences(newPreferences);
  };

  return (
    <FeedPreferencesContext.Provider
      value={{
        feedPreferences,
        setFeedPreferences,
        setStreamingPreferences,
        isLoading,
      }}
    >
      {children}
    </FeedPreferencesContext.Provider>
  );
}

export function useFeedPreferences() {
  const context = useContext(FeedPreferencesContext);
  if (!context) {
    throw new Error('useFeedPreferences must be used within FeedPreferencesProvider');
  }
  return context;
}
