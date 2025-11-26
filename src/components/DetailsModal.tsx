import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Linking,
  Animated,
  PanResponder,
} from 'react-native';
// import { WebView } from 'react-native-webview'; // TODO: Re-enable when implementing in-app video playback
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
import type { Movie, MovieBase, MovieRatings } from '../types/movie';
import { getDetailsWithCredits, toMovie } from '../services/tmdb';
import { getOmdbRatingsByImdbId } from '../services/omdb';
import { HAS_TMDB, HAS_OMDB } from '../config/env';
import { useBlindMode } from '../context/BlindModeContext';

interface DetailsModalProps {
  visible: boolean;
  movie: MovieBase | Movie;
  onClose: () => void;
  // For tethered animation from card swipe
  externalTranslateY?: Animated.Value;
  isTethered?: boolean; // When true, position is controlled externally
}

const DETAILS_SHEET_HEIGHT = SCREEN_HEIGHT * 0.9; // 90% of screen height
const DETAILS_OPEN_THRESHOLD = SCREEN_HEIGHT * 0.3; // Open when sheet is 30% up

export default function DetailsModal({ 
  visible, 
  movie, 
  onClose,
  externalTranslateY,
  isTethered = false,
}: DetailsModalProps) {
  const { blindModeSettings } = useBlindMode();
  // Only store enriched data (director, cast, ratings) in state
  // Always use the movie prop directly for basic fields (title, year, poster, description, etc.)
  const [loading, setLoading] = useState(false);
  const [director, setDirector] = useState<string | null>(null);
  const [cast, setCast] = useState<string[]>([]);
  const [ratings, setRatings] = useState<MovieRatings>({});
  // const [showTrailer, setShowTrailer] = useState(false); // TODO: Re-enable when implementing in-app video playback

  // Internal position for independent dragging when not tethered
  const internalTranslateY = useRef(new Animated.Value(0)).current;
  const isDragging = useRef(false);
  const openingAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);

  // Use external position when tethered, internal when not
  // This creates a direct connection - no intermediate calculations, no delay
  const translateY = isTethered && externalTranslateY 
    ? (externalTranslateY as Animated.Value)
    : internalTranslateY;

  // Reset enriched data whenever movie.id changes
  useEffect(() => {
    if (!movie) return;
    
    console.log('[DetailsModal] movie prop changed to:', movie.id, movie.title);
    
    // Reset all enriched data immediately when movie changes
    setRatings('ratings' in movie ? movie.ratings || {} : {});
    setDirector(null);
    setCast([]);
    // setShowTrailer(false); // TODO: Re-enable when implementing in-app video playback
    setLoading(false);
  }, [movie.id]); // Reset whenever the movie ID changes

  // Reset position when modal opens/closes
  useEffect(() => {
    if (visible) {
      // When opening via tap (not tethered), start from bottom and animate
      if (!isTethered) {
        // Stop any existing animation first
        if (openingAnimationRef.current) {
          openingAnimationRef.current.stop();
          openingAnimationRef.current = null;
        }
        
        // Set initial position immediately
        internalTranslateY.setValue(DETAILS_SHEET_HEIGHT);
        isDragging.current = false; // Reset drag state
        
        // Animate to open position - store ref so we can cancel it if user drags
        const animation = Animated.spring(internalTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        });
        
        openingAnimationRef.current = animation;
        animation.start((finished) => {
          if (finished) {
            openingAnimationRef.current = null;
          }
        });
      }
      // When tethered, position is controlled externally - don't animate
    } else {
      // Reset when closing
      if (!isTethered) {
        // Stop any running animation
        if (openingAnimationRef.current) {
          openingAnimationRef.current.stop();
          openingAnimationRef.current = null;
        }
        internalTranslateY.setValue(0);
        isDragging.current = false;
      }
    }
  }, [visible, isTethered]);
  
  // Fetch additional details when modal becomes visible or movie changes
  useEffect(() => {
    if (!visible || !movie || !HAS_TMDB) return;

    const tmdbId = typeof movie.id === 'string' ? parseInt(movie.id) : movie.id;
    if (isNaN(tmdbId) || tmdbId <= 0) {
      // If we can't fetch from TMDb, just use the movie data we have
      setLoading(false);
      return;
    }

    setLoading(true);
    const fetchId = movie.id; // Capture current movie ID for race condition checks
    console.log('[DetailsModal] Fetching TMDB details for:', tmdbId, movie.title);

    getDetailsWithCredits(tmdbId)
      .then((details) => {
        // Verify this is still the current movie (prevent race conditions)
        if (fetchId === movie.id) {
          setDirector(details.directorName);
          setCast(details.castTop5);
          
          // Fetch OMDb ratings if we have IMDb ID
          if (HAS_OMDB && details.imdbId) {
            getOmdbRatingsByImdbId(details.imdbId).then((omdbRatings) => {
              // Double-check movie hasn't changed during async call
              if (fetchId === movie.id) {
                setRatings(omdbRatings);
              }
            });
          }
        }
      })
      .catch((error) => {
        console.error('Error fetching details:', error);
      })
      .finally(() => {
        // Only stop loading if this is still the current movie
        if (fetchId === movie.id) {
          setLoading(false);
        }
      });
  }, [visible, movie.id]); // Fetch when modal opens or movie ID changes

  const handleTrailer = async () => {
    if (movie.trailer) {
      // Open trailer in external app (YouTube app) or browser
      // TODO: Later, implement true in-app video playback using expo-av or react-native-video
      // For now, opening externally avoids YouTube Error 153 (embed configuration issues)
      const canOpen = await Linking.canOpenURL(movie.trailer);
      if (canOpen) {
        await Linking.openURL(movie.trailer);
      } else {
        console.warn('[DetailsModal] Cannot open trailer URL:', movie.trailer);
      }
    }
  };

  // Pan responder for independent dragging (only when not tethered)
  // IMPORTANT: Only attached to drag handle/header area, not the entire sheet
  // This allows the ScrollView inside to handle its own gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => {
        // Never respond when tethered - let card gesture handle everything
        if (isTethered) return false;
        // Only respond if ScrollView is at the top (scroll position 0)
        // This allows scrolling when content is scrolled down
        return scrollOffsetRef.current <= 0;
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Never respond when tethered
        if (isTethered) return false;
        // Only respond to downward movement (closing gesture)
        // And only if ScrollView is at the top
        return scrollOffsetRef.current <= 0 && gestureState.dy > 5;
      },
      onPanResponderGrant: () => {
        if (isTethered) return;
        
        // Stop any opening animation immediately when user starts dragging
        if (openingAnimationRef.current) {
          openingAnimationRef.current.stop();
          openingAnimationRef.current = null;
        }
        
        isDragging.current = true;
        // Stop any running animations on the value and capture current position
        internalTranslateY.stopAnimation((value) => {
          // Use the current animated value as the offset (wherever animation stopped)
          internalTranslateY.setOffset(value);
          internalTranslateY.setValue(0);
        });
      },
      onPanResponderMove: (_, gesture) => {
        if (isTethered) return;
        const { dy } = gesture;
        // Only allow downward dragging
        if (dy > 0) {
          // Set value directly - offset is already set in grant
          internalTranslateY.setValue(dy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (isTethered) return;
        isDragging.current = false;
        internalTranslateY.flattenOffset();
        
        const { dy, vy } = gesture;
        const currentY = (internalTranslateY as any)._value;
        
        // If dragged down significantly or with velocity, close
        if (currentY > DETAILS_OPEN_THRESHOLD || (dy > 100 && vy > 0.5)) {
          Animated.timing(internalTranslateY, {
            toValue: DETAILS_SHEET_HEIGHT,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            onClose();
          });
        } else {
          // Spring back to open position
          Animated.spring(internalTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Backdrop */}
        <TouchableOpacity 
          style={styles.backdrop}
          activeOpacity={1}
          onPress={isTethered ? undefined : onClose}
          pointerEvents={isTethered ? 'none' : 'auto'}
        />
        
        {/* Bottom Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY }],
            },
          ]}
          pointerEvents={isTethered ? 'none' : 'auto'}
        >
          {/* Drag Handle and Header - Only this area responds to drag gestures */}
          <View 
            style={styles.dragArea}
            {...(isTethered ? {} : panResponder.panHandlers)}
          >
            <View style={styles.dragHandle} />
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          
          <ScrollView 
            ref={scrollViewRef}
            style={styles.scrollView} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            onScroll={(event) => {
              scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
          >
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#DC2026" />
              </View>
            )}
            
            {/* Always use movie prop directly for basic fields */}
            {movie.poster && (
              <Image
                source={{ uri: movie.poster }}
                style={styles.poster}
                resizeMode="cover"
              />
            )}
            
            <View style={styles.content}>
              {/* Core Movie Info */}
              <Text style={styles.title}>
                {movie.title} ({movie.year})
              </Text>
              
              <View style={styles.genreContainer}>
                {movie.genres && movie.genres.length > 0 ? (
                  movie.genres.map((genre, index) => (
                    <View key={index} style={styles.genreTag}>
                      <Text style={styles.genreText}>{genre}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.placeholderText}>—</Text>
                )}
              </View>
              
              {/* Details Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Details</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Runtime:</Text>
                  <Text style={styles.value}>
                    {movie.runtimeMinutes ? `${movie.runtimeMinutes} min` : '—'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>MPAA Rating:</Text>
                  <Text style={styles.value}>
                    {movie.mpaaRating || '—'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Language:</Text>
                  <Text style={styles.value}>
                    {movie.language || '—'}
                  </Text>
                </View>
              </View>
              
              {/* Creators Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Creators</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Director:</Text>
                  <Text style={styles.value}>
                    {director || movie.director || '(Coming soon)'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Cast:</Text>
                  <Text style={styles.value}>
                    {cast.length > 0 
                      ? cast.join(', ') 
                      : (movie.cast && movie.cast.length > 0 
                          ? movie.cast.slice(0, 5).join(', ') 
                          : '(Coming soon)')}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Writers:</Text>
                  <Text style={styles.value}>(Coming soon)</Text>
                </View>
              </View>
              
              {/* Ratings Section */}
              <View style={styles.ratingsSection}>
                <Text style={styles.sectionTitle}>Ratings</Text>
                <View style={styles.ratingsRow}>
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingLabel}>IMDb</Text>
                    <Text style={styles.ratingValue}>
                      {blindModeSettings.hideImdb
                        ? '🍿'
                        : ratings.imdb !== undefined
                        ? ratings.imdb.toFixed(1)
                        : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingLabel}>RT Critics</Text>
                    <Text style={styles.ratingValue}>
                      {blindModeSettings.hideRtCritics
                        ? '🍿'
                        : ratings.rtCritics !== undefined
                        ? `${Math.round(ratings.rtCritics)}%`
                        : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingLabel}>RT Audience</Text>
                    <Text style={styles.ratingValue}>
                      {blindModeSettings.hideRtAudience
                        ? '🍿'
                        : ratings.rtAudience !== undefined
                        ? `${Math.round(ratings.rtAudience)}%`
                        : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingLabel}>TMDb</Text>
                    <Text style={styles.ratingValue}>
                      {blindModeSettings.hideTmdb
                        ? '🍿'
                        : movie.tmdbRating
                        ? movie.tmdbRating.toFixed(1)
                        : 'N/A'}
                    </Text>
                  </View>
                </View>
              </View>
              
              {/* Overview Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Overview</Text>
                <Text style={styles.description}>
                  {movie.description || 'No description available.'}
                </Text>
              </View>
              
              {/* Where to Watch Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Where to Watch</Text>
                {movie.streamingPlatforms && movie.streamingPlatforms.length > 0 ? (
                  <View style={styles.streamingContainer}>
                    {movie.streamingPlatforms.map((platform, index) => (
                      <View key={index} style={styles.streamingChip}>
                        <Text style={styles.streamingChipText}>{platform}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.placeholderText}>Streaming availability coming soon</Text>
                )}
              </View>
              
              {/* Trailer Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Trailer</Text>
                {movie.trailer ? (
                  <TouchableOpacity style={styles.trailerButton} onPress={handleTrailer}>
                    <Ionicons name="play-circle" size={24} color="#fff" />
                    <Text style={styles.trailerButtonText}>Watch Trailer</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.trailerPlaceholder}>
                    <Text style={styles.placeholderText}>Trailer not available</Text>
                  </View>
                )}
              </View>
              
              {/* Friends Section (Placeholder) - Hidden if friends rating is hidden */}
              {!blindModeSettings.hideFriendsRating && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Friends</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Friends who've seen this:</Text>
                    <Text style={styles.value}>(Friends data coming soon)</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Average friend rating:</Text>
                    <Text style={styles.value}>🍿</Text>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    height: DETAILS_SHEET_HEIGHT,
    backgroundColor: '#0f0f0f',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  dragArea: {
    // This area handles drag gestures for closing the sheet
    // The ScrollView below handles its own scrolling gestures
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#8e8e93',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    paddingTop: 8,
  },
  closeButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  poster: {
    width: '100%',
    height: 300,
    backgroundColor: '#2c2c2e',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  genreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  genreTag: {
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  genreText: {
    fontSize: 12,
    color: '#8e8e93',
    fontWeight: '500',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#8e8e93',
    marginRight: 8,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#fff',
    flex: 1,
  },
  ratingsSection: {
    marginBottom: 20,
  },
  ratingsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  ratingBadge: {
    backgroundColor: '#1c1c1e',
    padding: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 12,
    color: '#8e8e93',
    marginBottom: 4,
  },
  ratingValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#DC2026', // Movie theater red
  },
  blindModeBadge: {
    // Popcorn overlay style - keeps badge visible but hides score value
  },
  description: {
    fontSize: 16,
    color: '#d1d1d6',
    lineHeight: 24,
  },
  trailerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2026', // Movie theater red
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    gap: 8,
  },
  trailerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  trailerPlaceholder: {
    padding: 16,
    backgroundColor: '#1c1c1e',
    borderRadius: 8,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: '#8e8e93',
    fontStyle: 'italic',
  },
  streamingContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  streamingChip: {
    backgroundColor: '#1c1c1e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  streamingChipText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
});
