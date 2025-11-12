import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Animated } from 'react-native';

export interface ProfileIconPosition {
  x: number;
  y: number;
}

export type TabIconKey = 'party' | 'profile';

type IconPositionMap = Record<TabIconKey, ProfileIconPosition | null>;

interface ProfileTabAnimationContextValue {
  triggerProfileShake: () => void;
  profileShakeValue: Animated.Value;
  iconPositions: IconPositionMap;
  registerIconPosition: (tab: TabIconKey, position: ProfileIconPosition) => void;
}

const ProfileTabAnimationContext = createContext<ProfileTabAnimationContextValue | undefined>(
  undefined
);

export function ProfileTabAnimationProvider({ children }: { children: ReactNode }) {
  const shakeValue = useRef(new Animated.Value(0)).current;
  const [iconPositions, setIconPositions] = useState<IconPositionMap>({
    party: null,
    profile: null,
  });

  const triggerProfileShake = useCallback(() => {
    shakeValue.stopAnimation();
    shakeValue.setValue(0);

    const keyframes = [-10, 10, -8, 8, -4, 4, -2, 2, 0];
    Animated.sequence(
      keyframes.map((value, index) =>
        Animated.timing(shakeValue, {
          toValue: value,
          duration: index === keyframes.length - 1 ? 90 : 60,
          useNativeDriver: true,
        })
      )
    ).start();
  }, [shakeValue]);

  const registerIconPosition = useCallback((tab: TabIconKey, position: ProfileIconPosition) => {
    setIconPositions((prev) => {
      const current = prev[tab];
      if (current && current.x === position.x && current.y === position.y) {
        return prev;
      }
      return {
        ...prev,
        [tab]: position,
      };
    });
  }, []);

  const value = useMemo(
    () => ({
      triggerProfileShake,
      profileShakeValue: shakeValue,
      iconPositions,
      registerIconPosition,
    }),
    [triggerProfileShake, shakeValue, iconPositions, registerIconPosition]
  );

  return (
    <ProfileTabAnimationContext.Provider value={value}>
      {children}
    </ProfileTabAnimationContext.Provider>
  );
}

export function useProfileTabAnimation() {
  const context = useContext(ProfileTabAnimationContext);
  if (!context) {
    throw new Error('useProfileTabAnimation must be used within a ProfileTabAnimationProvider');
  }
  return context;
}
