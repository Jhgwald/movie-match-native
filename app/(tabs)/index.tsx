import { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SwipeDeck from '../../src/components/SwipeDeck';
import DetailsModal from '../../src/components/DetailsModal';
import { movies as sampleMovies } from '../../src/data/sample/movies';
import { getTrendingMovies } from '../../src/services/tmdb';
import { HAS_TMDB } from '../../src/config/env';
import { markSeen, markPassed, markWatchlist } from '../../src/state/library';
import type { Movie, MovieBase } from '../../src/types/movie';
import { useProfileTabAnimation } from '../../src/context/ProfileTabAnimationContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const [movies, setMovies] = useState<readonly (MovieBase | Movie)[]>(sampleMovies);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<MovieBase | Movie | null>(null);
  const { triggerProfileShake, iconPositions } = useProfileTabAnimation();

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
    // Right = Like → Mark as SEEN → Add to Movies to Rank
    console.log('[Feed] handleSwipeRight RECEIVED movie:', movie.id, movie.title);
    console.log('[Feed] handleSwipeRight movie object:', JSON.stringify({ id: movie.id, title: movie.title, year: movie.year }));
    markSeen(movie.id);
  };

  const handleSwipeLeft = (movie: MovieBase | Movie) => {
    // Left = Skip → Do not add anywhere
    console.log('[Feed] handleSwipeLeft RECEIVED movie:', movie.id, movie.title);
    console.log('[Feed] handleSwipeLeft movie object:', JSON.stringify({ id: movie.id, title: movie.title, year: movie.year }));
    markPassed(movie.id);
  };

  const handleSwipeUp = (movie: MovieBase | Movie) => {
    // Up = Add to WATCHLIST (not Seen)
    console.log('[Feed] handleSwipeUp RECEIVED movie:', movie.id, movie.title);
    console.log('[Feed] handleSwipeUp movie object:', JSON.stringify({ id: movie.id, title: movie.title, year: movie.year }));
    markWatchlist(movie.id);
  };

  const handleSwipeDown = (movie: MovieBase | Movie) => {
    // Down = Mark as SEEN + Show Details
    console.log('[Feed] handleSwipeDown RECEIVED movie:', movie.id, movie.title);
    console.log('[Feed] handleSwipeDown movie object:', JSON.stringify({ id: movie.id, title: movie.title, year: movie.year }));
    markSeen(movie.id);
    console.log('[Feed] Calling setSelectedMovie with:', movie.id, movie.title);
    setSelectedMovie(movie);
    setDetailsVisible(true);
  };

  const handleDetails = (movie: MovieBase | Movie) => {
    console.log('[Feed] handleDetails RECEIVED movie:', movie.id, movie.title);
    console.log('[Feed] handleDetails movie object:', JSON.stringify({ id: movie.id, title: movie.title, year: movie.year }));
    console.log('[Feed] Calling setSelectedMovie with:', movie.id, movie.title);
    setSelectedMovie(movie);
    setDetailsVisible(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={[styles.deckContainer, { 
        paddingTop: insets.top + 8, 
        paddingBottom: 0,
        height: SCREEN_HEIGHT - insets.top,
      }]}>
        <SwipeDeck
          movies={movies}
          onSwipeRight={handleSwipeRight}
          onSwipeLeft={handleSwipeLeft}
          onSwipeUp={handleSwipeUp}
          onSwipeDown={handleSwipeDown}
          onDetails={handleDetails}
          onProfileShake={triggerProfileShake}
          profileIconPosition={iconPositions.profile}
          maxTicketHeight={SCREEN_HEIGHT - insets.top - insets.bottom - 49 - 8 - 8}
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
    </View>
  );
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
