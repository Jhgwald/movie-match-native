import { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SwipeDeck from '../../src/components/SwipeDeck';
import DetailsModal from '../../src/components/DetailsModal';
import FeedSettingsModal from '../../src/components/FeedSettingsModal';
import { movies as sampleMovies } from '../../src/data/sample/movies';
import { getTrendingMovies } from '../../src/services/tmdb';
import { HAS_TMDB } from '../../src/config/env';
import {
  markSeen,
  markSkipped,
  markWatchlist,
  getSeenIds,
  getWatchlistIds,
} from '../../src/state/library';
import type { Movie, MovieBase } from '../../src/types/movie';
import { useProfileTabAnimation } from '../../src/context/ProfileTabAnimationContext';
import { FeedPreferencesProvider, useFeedPreferences } from '../../src/context/FeedPreferencesContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

function FeedContent() {
  const insets = useSafeAreaInsets();
  const [movies, setMovies] = useState<readonly (MovieBase | Movie)[]>(sampleMovies);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<MovieBase | Movie | null>(null);
  const { triggerProfileShake, iconPositions } = useProfileTabAnimation();
  const { feedPreferences } = useFeedPreferences();

  useEffect(() => {
    // Load movies in background, don't block UI
    loadMovies().catch(() => {
      // Already using sample data as fallback
    });
  }, []);

  const loadMovies = async () => {
    if (HAS_TMDB) {
      try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 5000)
        );
        
        const fetchPromise = Promise.all([
          getTrendingMovies(1),
          getTrendingMovies(2),
        ]);
        
        const [page1, page2] = await Promise.race([fetchPromise, timeoutPromise]) as any;
        const allMovies = [...page1, ...page2];
        if (allMovies.length > 0) {
          setMovies(allMovies);
        }
      } catch (error) {
        console.error('Failed to load movies from TMDb:', error);
        // Fallback to sample data - already set as default
      }
    }
  };

  const handleSwipeRight = (movie: MovieBase | Movie) => {
    // Right = Watchlist 🔖
    console.log('[Feed] handleSwipeRight → Watchlist for movie:', movie.id, movie.title);
    markWatchlist(movie.id);
    console.log('[Feed] watchlistIds now:', getWatchlistIds());
  };

  const handleSwipeLeft = (movie: MovieBase | Movie) => {
    // Left = Skipped 🚫
    console.log('[Feed] handleSwipeLeft RECEIVED movie:', movie.id, movie.title);
    console.log('[Feed] handleSwipeLeft movie object:', JSON.stringify({ id: movie.id, title: movie.title, year: movie.year }));
    console.log(`[Feed] Swipe LEFT (Skipped): ${movie.id} ${movie.title}`);
    markSkipped(movie.id);
  };

  const handleSwipeUp = (movie: MovieBase | Movie) => {
    // Up = Seen ✅ → Movies to Rank
    console.log('[Feed] handleSwipeUp → Seen/MoviesToRank for movie:', movie.id, movie.title);
    markSeen(movie.id);
    console.log('[Feed] seenIds now:', getSeenIds());
  };

  const handleSwipeDown = (movie: MovieBase | Movie) => {
    // Down = Details (don't advance card, just show modal)
    console.log('[Details] opening modal for movie:', movie.id, movie.title);
    setSelectedMovie(movie);
    setDetailsVisible(true);
  };

  const handleDetails = (movie: MovieBase | Movie) => {
    // Open details from other UI actions (e.g. button/tap)
    console.log('[Details] opening modal for movie:', movie.id, movie.title);
    setSelectedMovie(movie);
    setDetailsVisible(true);
  };

  // Filter movies based on streaming preferences
  // TODO: When TMDB provider data is available, ensure it maps to our service names
  const filteredMovies = useMemo(() => {
    const { streaming } = feedPreferences;

    // If filtering is disabled, show all movies
    if (!streaming.onlyShowMyServices) {
      return movies;
    }

    // Get selected services
    const selectedServices = Object.entries(streaming.services)
      .filter(([_, enabled]) => enabled)
      .map(([service]) => service);

    // If no services selected, show all movies (fallback)
    if (selectedServices.length === 0) {
      return movies;
    }

    // Filter movies that have at least one overlapping service
    return movies.filter((movie) => {
      if (!movie.streamingPlatforms || movie.streamingPlatforms.length === 0) {
        // If movie has no streaming data, include it (avoid hiding content)
        return true;
      }

      // Check if movie is available on any selected service
      return movie.streamingPlatforms.some((platform) =>
        selectedServices.includes(platform)
      );
    });
  }, [movies, feedPreferences]);

  const HEADER_HEIGHT = 56;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Custom Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>Feed</Text>
        <TouchableOpacity
          onPress={() => setSettingsVisible(true)}
          style={styles.settingsButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="options" size={24} color="#FFFEAD" />
        </TouchableOpacity>
      </View>

      <View style={[styles.deckContainer, {
        paddingTop: 8,
        paddingBottom: 0,
        height: SCREEN_HEIGHT - insets.top - HEADER_HEIGHT,
      }]}>
        <SwipeDeck
          movies={filteredMovies}
          onSwipeRight={handleSwipeRight}
          onSwipeLeft={handleSwipeLeft}
          onSwipeUp={handleSwipeUp}
          onSwipeDown={handleSwipeDown}
          onDetails={handleDetails}
          onProfileShake={triggerProfileShake}
          profileIconPosition={iconPositions.profile}
          maxTicketHeight={SCREEN_HEIGHT - insets.top - HEADER_HEIGHT - insets.bottom - 49 - 8 - 8}
        />
      </View>

      {selectedMovie && (
        <DetailsModal
          key={selectedMovie.id} // Force remount when movie changes
          visible={detailsVisible}
          movie={selectedMovie}
          onClose={() => {
            setDetailsVisible(false);
            setSelectedMovie(null);
          }}
        />
      )}

      <FeedSettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />
    </View>
  );
}

// Wrapper component with FeedPreferencesProvider
export default function FeedScreen() {
  return (
    <FeedPreferencesProvider>
      <FeedContent />
    </FeedPreferencesProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6B0000', // Deep red like movie theater carpet and seats
  },
  header: {
    backgroundColor: '#7E1616',
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#DC2026',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFEAD',
    letterSpacing: 0.5,
  },
  settingsButton: {
    padding: 8,
  },
  deckContainer: {
    flex: 1,
  },
});
