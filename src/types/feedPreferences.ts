export type CardLayoutPreset = 'minimal' | 'standard' | 'detailed';

export type StreamingService =
  | 'Netflix'
  | 'Prime Video'
  | 'Disney+'
  | 'Max'
  | 'Hulu'
  | 'Apple TV+'
  | 'Peacock'
  | 'Paramount+';

export type StreamingPreferences = {
  onlyShowMyServices: boolean;
  services: Record<StreamingService, boolean>;
};

export type FeedPreferences = {
  cardLayoutPreset: CardLayoutPreset;
  streaming: StreamingPreferences;
};

// Default preferences - Standard preset
export const DEFAULT_FEED_PREFERENCES: FeedPreferences = {
  cardLayoutPreset: 'standard',
  streaming: {
    onlyShowMyServices: false,
    services: {
      'Netflix': false,
      'Prime Video': false,
      'Disney+': false,
      'Max': false,
      'Hulu': false,
      'Apple TV+': false,
      'Peacock': false,
      'Paramount+': false,
    },
  },
};
