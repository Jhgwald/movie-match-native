import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@movie_match:profile';

export interface ProfileData {
  name: string;
  username: string;
  profilePictureUri: string | null;
  bio: string; // User bio, max ~120 characters
}

const DEFAULT_PROFILE: ProfileData = {
  name: 'Josh Greenwald',
  username: 'jhg', // Stored without @ prefix
  profilePictureUri: null,
  bio: '', // Empty by default
};

interface ProfileContextValue {
  profile: ProfileData;
  updateProfile: (updates: Partial<ProfileData>) => void;
  isLoading: boolean;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<ProfileData>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(true);

  // Load profile from AsyncStorage on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<ProfileData>;
        // Ensure username doesn't have @ prefix (strip if present for backward compatibility)
        if (parsed.username && parsed.username.startsWith('@')) {
          parsed.username = parsed.username.substring(1);
        }
        // Merge with defaults to handle missing fields (e.g., bio for backward compatibility)
        setProfileState({ ...DEFAULT_PROFILE, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProfile = async (profileData: ProfileData) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profileData));
      // TODO: In production, sync profile data to backend after user login
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  };

  const updateProfile = (updates: Partial<ProfileData>) => {
    // Strip @ prefix from username if present (shouldn't be, but safety check)
    if (updates.username && updates.username.startsWith('@')) {
      updates.username = updates.username.substring(1);
    }
    const newProfile = { ...profile, ...updates };
    setProfileState(newProfile);
    saveProfile(newProfile);
  };

  return (
    <ProfileContext.Provider
      value={{
        profile,
        updateProfile,
        isLoading,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within ProfileProvider');
  }
  return context;
}

