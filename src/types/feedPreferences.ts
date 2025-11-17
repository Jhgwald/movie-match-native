export type TicketLayoutPreferences = {
  showScores: boolean;
  showDirector: boolean;
  showCast: boolean;
  showGenre: boolean;
  showYear: boolean;
  showPlot: boolean;
};

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
  ticketLayout: TicketLayoutPreferences;
  streaming: StreamingPreferences;
};

// Default preferences - show everything by default
export const DEFAULT_FEED_PREFERENCES: FeedPreferences = {
  ticketLayout: {
    showScores: true,
    showDirector: true,
    showCast: true,
    showGenre: true,
    showYear: true,
    showPlot: true,
  },
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
