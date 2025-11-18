import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@movie_match:app_settings';

export type StreamingService = 'Netflix' | 'Hulu' | 'Prime Video' | 'Max' | 'Disney+' | 'Apple TV+' | 'Peacock' | 'Paramount+';

export interface AppSettings {
  streamingServices: Record<StreamingService, boolean>;
  notifications: {
    allowNotifications: boolean;
    newMoviesToRank: boolean;
    friendActivity: boolean;
    watchPartyInvites: boolean;
  };
  privacy: {
    makeProfilePrivate: boolean;
    hideActivityFromFriends: boolean;
  };
  contentPreferences: {
    hideAdultContent: boolean; // true = hide adult content, false = show adult content
    preferredLanguages: string[]; // Placeholder - will be populated later
    preferredRegions: string[]; // Placeholder - will be populated later
    favoriteGenres: string[]; // Placeholder - will be populated later
  };
}

const DEFAULT_SETTINGS: AppSettings = {
  streamingServices: {
    'Netflix': false,
    'Hulu': false,
    'Prime Video': false,
    'Max': false,
    'Disney+': false,
    'Apple TV+': false,
    'Peacock': false,
    'Paramount+': false,
  },
  notifications: {
    allowNotifications: false,
    newMoviesToRank: false,
    friendActivity: false,
    watchPartyInvites: false,
  },
  privacy: {
    makeProfilePrivate: false,
    hideActivityFromFriends: false,
  },
  contentPreferences: {
    hideAdultContent: true, // Hide adult content by default
    preferredLanguages: [],
    preferredRegions: [],
    favoriteGenres: [],
  },
};

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  updateStreamingService: (service: StreamingService, enabled: boolean) => void;
  updateNotification: (key: keyof AppSettings['notifications'], value: boolean) => void;
  updatePrivacy: (key: keyof AppSettings['privacy'], value: boolean) => void;
  updateContentPreference: (key: keyof AppSettings['contentPreferences'], value: any) => void;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from AsyncStorage on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AppSettings>;
        // Merge with defaults to handle missing keys
        setSettingsState({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load app settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings: AppSettings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      // TODO: In production, sync settings to backend after user login
    } catch (error) {
      console.error('Failed to save app settings:', error);
    }
  };

  const updateSettings = (updates: Partial<AppSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettingsState(newSettings);
    saveSettings(newSettings);
  };

  const updateStreamingService = (service: StreamingService, enabled: boolean) => {
    const newServices = { ...settings.streamingServices, [service]: enabled };
    updateSettings({ streamingServices: newServices });
  };

  const updateNotification = (key: keyof AppSettings['notifications'], value: boolean) => {
    const newNotifications = { ...settings.notifications, [key]: value };
    updateSettings({ notifications: newNotifications });
  };

  const updatePrivacy = (key: keyof AppSettings['privacy'], value: boolean) => {
    const newPrivacy = { ...settings.privacy, [key]: value };
    updateSettings({ privacy: newPrivacy });
  };

  const updateContentPreference = (key: keyof AppSettings['contentPreferences'], value: any) => {
    const newContentPrefs = { ...settings.contentPreferences, [key]: value };
    updateSettings({ contentPreferences: newContentPrefs });
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        updateStreamingService,
        updateNotification,
        updatePrivacy,
        updateContentPreference,
        isLoading,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within SettingsProvider');
  }
  return context;
}

