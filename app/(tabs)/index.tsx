import { useState, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SwipeDeck from '../../src/components/SwipeDeck';
import DetailsModal from '../../src/components/DetailsModal';
import FeedSettingsModal from '../../src/components/FeedSettingsModal';
import HeaderBar from '../../src/components/HeaderBar';
import LogNowLogLaterModal from '../../src/components/LogNowLogLaterModal';
import LogMovieSheet from '../../src/components/LogMovieSheet';
import { movies as sampleMovies } from '../../src/data/sample/movies';
import { getTrendingMovies } from '../../src/services/tmdb';
import { HAS_TMDB } from '../../src/config/env';
import {
  markSeen,
  markSeenForLaterRanking,
  markSeenAndAddToMasterRankings,
  markSeenAndAddToLists,
  markSkipped,
  markWatchlist,
  markScene,
  getSeenIds,
  getWatchlistIds,
  getSceneIds,
} from '../../src/state/library';
import type { Movie, MovieBase } from '../../src/types/movie';
import { useProfileTabAnimation } from '../../src/context/ProfileTabAnimationContext';
import { useFeedPreferences } from '../../src/context/FeedPreferencesContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const DETAILS_SHEET_HEIGHT = Dimensions.get('window').height * 0.9;
function FeedContent() {
  const insets = useSafeAreaInsets();
  const [movies, setMovies] = useState<readonly (MovieBase | Movie)[]>(sampleMovies);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<MovieBase | Movie | null>(null);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [logMovieSheetVisible, setLogMovieSheetVisible] = useState(false);
  const [movieToLog, setMovieToLog] = useState<MovieBase | Movie | null>(null);

  // Debug: Log state changes
  useEffect(() => {
    console.log('[Feed] logMovieSheetVisible changed to:', logMovieSheetVisible);
    console.log('[Feed] movieToLog:', movieToLog?.title);
  }, [logMovieSheetVisible, movieToLog]);
  const { triggerProfileShake, iconPositions } = useProfileTabAnimation();
  const { feedPreferences } = useFeedPreferences();
  
  // Animated value for detail sheet position (for tethered animation)
  const detailsSheetY = useRef(new Animated.Value(DETAILS_SHEET_HEIGHT)).current;

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
    // Up = Seen ✅ → Show Log now / Log later modal
    console.log('[Feed] handleSwipeUp → Show log modal for movie:', movie.id, movie.title);
    setMovieToLog(movie);
    setLogModalVisible(true);
  };

  const handleLogNow = () => {
    if (!movieToLog) {
      console.log('[Feed] handleLogNow called but movieToLog is null');
      return;
    }
    // Log now - open Log Movie sheet instead of directly marking
    console.log('[LogMovie] Opening sheet for movie:', movieToLog.title);
    console.log('[LogMovie] Movie ID:', movieToLog.id);
    // Close the popup first
    setLogModalVisible(false);
    // Wait longer to ensure the modal fully closes before opening the sheet
    // React Native Modals need time to unmount
    setTimeout(() => {
      console.log('[LogMovie] About to open LogMovieSheet, movieToLog:', movieToLog?.title);
      setLogMovieSheetVisible(true);
      console.log('[LogMovie] setLogMovieSheetVisible(true) called');
    }, 300);
  };

  const handleLogMovieDone = (selectedLists: string[]) => {
    if (!movieToLog) {
      console.log('[Feed] handleLogMovieDone called but movieToLog is null');
      return;
    }
    
    console.log('[Feed] Log movie done for:', movieToLog.id, movieToLog.title, 'selectedLists:', selectedLists);
    
    // Separate Master Rankings from custom lists
    const addToMasterRankings = selectedLists.includes('master-rankings');
    const customListIds = selectedLists.filter(id => id !== 'master-rankings');
    
    // Use the comprehensive function that handles all requirements:
    // 1. Mark as seen
    // 2. Add to Master Rankings if selected
    // 3. Add to selected custom lists
    // 4. Remove from Movies to be Ranked
    markSeenAndAddToLists(movieToLog.id, addToMasterRankings, customListIds);
    
    console.log('[Feed] Movie logged - Master Rankings:', addToMasterRankings, 'Custom lists:', customListIds.length);
    
    // Close the sheet and reset
    setLogMovieSheetVisible(false);
    setMovieToLog(null);
  };

  const handleLogLater = () => {
    if (!movieToLog) return;
    // Log later - mark as seen + add to Movies to be Ranked
    console.log('[Feed] Log later for movie:', movieToLog.id, movieToLog.title);
    markSeenForLaterRanking(movieToLog.id);
    console.log('[Feed] seenIds now:', getSeenIds());
    setLogModalVisible(false);
    setMovieToLog(null);
  };

  const handleSwipeDown = (movie: MovieBase | Movie) => {
    // Down = Seen ✅ → Show Log now / Log later modal
    console.log('[Feed] handleSwipeDown → Show log modal for movie:', movie.id, movie.title);
    setMovieToLog(movie);
    setLogModalVisible(true);
  };

  const handleDetails = (movie: MovieBase | Movie) => {
    // Open details from other UI actions (e.g. button/tap)
    console.log('[Details] opening modal for movie:', movie.id, movie.title);
    setSelectedMovie(movie);
    setDetailsVisible(true);
    // Animate sheet up from bottom
    detailsSheetY.setValue(DETAILS_SHEET_HEIGHT);
    Animated.spring(detailsSheetY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
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

      {/* Header */}
      <HeaderBar
        title="Feed"
        rightIconName="options"
        onRightIconPress={() => setSettingsVisible(true)}
      />

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
            detailsSheetY.setValue(DETAILS_SHEET_HEIGHT);
          }}
          externalTranslateY={undefined}
          isTethered={false}
        />
      )}

      <FeedSettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />

      {/* Only render LogNowLogLaterModal when it should be visible and LogMovieSheet is not visible */}
      {!logMovieSheetVisible && (
        <LogNowLogLaterModal
          visible={logModalVisible}
          movie={movieToLog}
          onLogNow={handleLogNow}
          onLogLater={handleLogLater}
          onClose={() => {
            setLogModalVisible(false);
            // Don't clear movieToLog here - it might be needed for LogMovieSheet
            // Only clear it when both modals are closed
          }}
        />
      )}

      {/* Only render LogMovieSheet when it should be visible */}
      {logMovieSheetVisible && (
        <LogMovieSheet
          visible={logMovieSheetVisible}
          movie={movieToLog}
          onDone={handleLogMovieDone}
          onClose={() => {
            setLogMovieSheetVisible(false);
            setMovieToLog(null);
          }}
        />
      )}
    </View>
  );
}

export default function FeedScreen() {
  return <FeedContent />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6B0000', // Deep red like movie theater carpet and seats
  },
  deckContainer: {
    flex: 1,
  },
});
