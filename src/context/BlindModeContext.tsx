import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@movie_match:blind_mode';

export interface BlindModeSettings {
  hideImdb: boolean;
  hideRtCritics: boolean;
  hideRtAudience: boolean;
  hideTmdb: boolean;
  hideFriendsRating: boolean;
}

const DEFAULT_BLIND_MODE_SETTINGS: BlindModeSettings = {
  hideImdb: false,
  hideRtCritics: false,
  hideRtAudience: false,
  hideTmdb: false,
  hideFriendsRating: false,
};

interface BlindModeContextValue {
  blindModeSettings: BlindModeSettings;
  setBlindModeSettings: (settings: BlindModeSettings) => void;
  updateBlindModeSetting: <K extends keyof BlindModeSettings>(
    key: K,
    value: BlindModeSettings[K]
  ) => void;
  isLoading: boolean;
}

const BlindModeContext = createContext<BlindModeContextValue | undefined>(undefined);

export function BlindModeProvider({ children }: { children: ReactNode }) {
  const [blindModeSettings, setBlindModeSettingsState] = useState<BlindModeSettings>(
    DEFAULT_BLIND_MODE_SETTINGS
  );
  const [isLoading, setIsLoading] = useState(true);

  // Load unbiased mode preferences from AsyncStorage on mount
  useEffect(() => {
    loadBlindMode();
  }, []);

  const loadBlindMode = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        const parsed = JSON.parse(stored) as Partial<BlindModeSettings>;
        // Merge with defaults to handle missing keys
        setBlindModeSettingsState({ ...DEFAULT_BLIND_MODE_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load unbiased mode preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveBlindMode = async (settings: BlindModeSettings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save unbiased mode preferences:', error);
    }
  };

  const setBlindModeSettings = (settings: BlindModeSettings) => {
    setBlindModeSettingsState(settings);
    saveBlindMode(settings);
  };

  const updateBlindModeSetting = <K extends keyof BlindModeSettings>(
    key: K,
    value: BlindModeSettings[K]
  ) => {
    const newSettings = { ...blindModeSettings, [key]: value };
    setBlindModeSettings(newSettings);
  };

  return (
    <BlindModeContext.Provider
      value={{
        blindModeSettings,
        setBlindModeSettings,
        updateBlindModeSetting,
        isLoading,
      }}
    >
      {children}
    </BlindModeContext.Provider>
  );
}

export function useBlindMode() {
  const context = useContext(BlindModeContext);
  if (!context) {
    throw new Error('useBlindMode must be used within BlindModeProvider');
  }
  return context;
}

