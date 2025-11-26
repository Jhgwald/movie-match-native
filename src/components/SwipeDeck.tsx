import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  Easing,
  LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MovieCard from './MovieCard';
import type { Movie, MovieBase } from '../types/movie';
import type { ProfileIconPosition } from '../context/ProfileTabAnimationContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 100;
const VELOCITY_THRESHOLD = 0.5;
const INDICATOR_THRESHOLD = 30;
const DETAILS_OPEN_THRESHOLD = SCREEN_HEIGHT * 0.3; // Open when swiped 30% of screen height

interface SwipeDeckProps {
  movies: readonly (MovieBase | Movie)[];
  onSwipeRight?: (movie: MovieBase | Movie) => void;
  onSwipeLeft?: (movie: MovieBase | Movie) => void;
  onSwipeDown?: (movie: MovieBase | Movie) => void;
  onDetails?: (movie: MovieBase | Movie) => void;
  onProfileShake?: () => void;
  profileIconPosition?: ProfileIconPosition | null;
  maxTicketHeight?: number;
}

// Helper component for centered floating label
function FloatingLabel({ 
  label, 
  emoji, 
  opacity, 
  color 
}: { 
  label: string; 
  emoji: string; 
  opacity: Animated.AnimatedInterpolation<number>; 
  color: string;
}) {
  return (
    <Animated.View
      style={[
        styles.floatingLabel,
        {
          opacity,
          backgroundColor: `${color}30`,
          borderColor: color,
        },
      ]}
      pointerEvents="none"
    >
      <Text style={[styles.floatingLabelText, { color }]}>
        {label} {emoji}
      </Text>
    </Animated.View>
  );
}

export default function SwipeDeck({
  movies,
  onSwipeRight,
  onSwipeLeft,
  onSwipeDown,
  onDetails,
  onProfileShake,
  profileIconPosition,
  maxTicketHeight,
}: SwipeDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [overlayColorState, setOverlayColorState] = useState<string>('transparent');
  const [cardBorderColor, setCardBorderColor] = useState<string>('#FFFEAD'); // Default butter yellow
  const position = useRef(new Animated.ValueXY()).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const flipY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const labelOpacity = useRef(new Animated.Value(0)).current;
  const labelDirection = useRef<'right' | 'left' | 'down' | null>(null);
  const isAnimating = useRef(false);
  const hasMoved = useRef(false); // Track if user has moved finger (to distinguish tap from swipe)
  const gestureMovieRef = useRef<MovieBase | Movie | null>(null); // Store movie captured at gesture start
  const gestureIndexRef = useRef<number | null>(null); // Store index captured at gesture start
  const cardRef = useRef<View | null>(null);
  const cardCenter = useRef<{ x: number; y: number }>({
    x: SCREEN_WIDTH / 2,
    y: SCREEN_HEIGHT / 2,
  });

  // Refs to always access the latest values (fixes stale closure issue)
  const currentIndexRef = useRef(currentIndex);
  const moviesRef = useRef(movies);

  // Keep refs in sync synchronously to avoid stale reads in gesture callbacks
  currentIndexRef.current = currentIndex;
  moviesRef.current = movies;

  // Debug logging for currentIndex changes
  useEffect(() => {
    console.log(`[SwipeDeck] currentIndex changed to: ${currentIndex}, movies.length: ${movies.length}`);
  }, [currentIndex, movies.length]);

  const updateCardCenter = useCallback(() => {
    if (!cardRef.current) return;
    cardRef.current.measureInWindow((x, y, width, height) => {
      cardCenter.current = {
        x: x + width / 2,
        y: y + height / 2,
      };
    });
  }, []);

  const handleCardLayout = useCallback(
    (_event: LayoutChangeEvent) => {
      updateCardCenter();
    },
    [updateCardCenter]
  );

  const handleCardRef = useCallback(
    (node: View | null) => {
      cardRef.current = node;
      if (node) {
        requestAnimationFrame(updateCardCenter);
      }
    },
    [updateCardCenter]
  );

  const clearGestureContext = useCallback(() => {
    gestureMovieRef.current = null;
    gestureIndexRef.current = null;
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isAnimating.current,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only start pan responder if movement is significant
        if (isAnimating.current) return false;
        const moved = Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
        if (moved) {
          hasMoved.current = true;
        }
        return moved;
      },
      onPanResponderGrant: () => {
        if (isAnimating.current) return;
        hasMoved.current = false; // Reset on grant
        gestureMovieRef.current = moviesRef.current[currentIndexRef.current] || null;
        gestureIndexRef.current = currentIndexRef.current;
        position.stopAnimation();
        position.setOffset({ x: 0, y: 0 });
        position.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gesture) => {
        if (isAnimating.current) return;

        const activeMovie = gestureMovieRef.current || moviesRef.current[currentIndexRef.current];
        if (!activeMovie) return;
        
        const { dx, dy, vy } = gesture;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        if (!hasMoved.current && (absDx > 2 || absDy > 2)) {
          hasMoved.current = true;
        }

        // Allow normal movement for all directions (up swipe no longer opens details)
        position.setValue({ x: dx, y: dy });
        rotate.setValue(dx / 12);
        flipY.setValue(0); // No flip animation
        
        if (absDx > absDy) {
          // Horizontal
          if (dx > 0) {
            labelDirection.current = 'right';
            setOverlayColorState('#4caf50'); // Green for Watchlist
            setCardBorderColor('#4caf50'); // Green border for Watchlist
            overlayOpacity.setValue(Math.min(absDx / 150, 0.2));
            labelOpacity.setValue(Math.min(absDx / 80, 1));
          } else {
            labelDirection.current = 'left';
            setOverlayColorState('#DC2026'); // Red for Not Interested
            setCardBorderColor('#DC2026'); // Red border for Pass
            overlayOpacity.setValue(Math.min(absDx / 150, 0.2));
            labelOpacity.setValue(Math.min(absDx / 80, 1));
          }
        } else {
          // Vertical
          if (dy > 0) {
            labelDirection.current = 'down';
            setOverlayColorState('#FFD700'); // Yellow for Seen
            setCardBorderColor('#FFD700'); // Yellow border for Seen
            overlayOpacity.setValue(Math.min(absDy / 150, 0.2));
            labelOpacity.setValue(Math.min(absDy / 80, 1));
          } else {
            // Upward swipe does nothing for details now; clear indicators
            labelDirection.current = null;
            overlayOpacity.setValue(0);
            labelOpacity.setValue(0);
          }
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (isAnimating.current) return;
        
        position.flattenOffset();
        
        const activeMovie = gestureMovieRef.current || moviesRef.current[currentIndexRef.current];
        const activeIndex = gestureIndexRef.current ?? currentIndexRef.current;
        const { dx, dy, vx, vy } = gesture;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        const absVx = Math.abs(vx);
        const absVy = Math.abs(vy);

        // Check if this was just a tap (no significant movement)
        const isTap = absDx < 10 && absDy < 10 && absVx < 0.3 && absVy < 0.3;
        
        if (isTap && !hasMoved.current && activeMovie) {
          console.log('[SwipeDeck] tap detected on movie:', activeMovie.id, activeMovie.title, 'at index:', activeIndex);
          onDetails?.(activeMovie);
          resetPosition();
          clearGestureContext();
          return;
        }

        // Use velocity to help determine direction if distance is borderline
        const isHorizontal = absDx > absDy || (absDx === absDy && absVx > absVy);
        
        // Determine swipe direction before resetting overlay
        let swipeDirection: 'left' | 'right' | 'down' | null = null;
        
        if (isHorizontal) {
          // Horizontal swipe
          if (dx > SWIPE_THRESHOLD || (dx > 50 && vx > VELOCITY_THRESHOLD)) {
            swipeDirection = 'right';
          } else if (dx < -SWIPE_THRESHOLD || (dx < -50 && vx < -VELOCITY_THRESHOLD)) {
            swipeDirection = 'left';
          }
        } else {
          // Vertical swipe
          if (dy > SWIPE_THRESHOLD || (dy > 50 && vy > VELOCITY_THRESHOLD)) {
            swipeDirection = 'down';
          }
        }
        
        // Reset overlay for all swipes
        overlayOpacity.setValue(0);
        setOverlayColorState('transparent');
        labelOpacity.setValue(0);
        labelDirection.current = null;

        if (swipeDirection && activeMovie) {
          handleSwipe(activeMovie, activeIndex, swipeDirection);
        } else {
          resetPosition();
        }
        clearGestureContext();
      },
    })
  ).current;

  const handleSwipe = (movie: MovieBase | Movie, index: number, direction: 'left' | 'right' | 'down') => {
    // Guard against double-firing while animating
    if (isAnimating.current || index >= moviesRef.current.length) return;

    isAnimating.current = true;
    console.log(`[SwipeDeck] Swipe ${direction} on movie: ${movie.id} ${movie.title} (index: ${index})`);

    let x = 0;
    let y = 0;

    switch (direction) {
      case 'right':
        // Throw right (Watchlist)
        x = SCREEN_WIDTH * 1.5;
        onSwipeRight?.(movie);
        break;
      case 'left':
        // Throw left (Skip)
        x = -SCREEN_WIDTH * 1.5;
        onSwipeLeft?.(movie);
        break;
      case 'down':
        // Throw down (Add to Seen bucket)
        y = SCREEN_HEIGHT * 1.5;
        onSwipeDown?.(movie); // Add to Seen bucket
        break;
    }

    overlayOpacity.setValue(0);
    labelOpacity.setValue(0);
    labelDirection.current = null;
    position.flattenOffset();

    // All swipes now advance to next card with simple throw animation
    Animated.parallel([
      Animated.timing(position, {
        toValue: { x, y },
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.timing(rotate, {
        toValue: direction === 'left' ? -30 : direction === 'right' ? 30 : 0,
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        nextCard();
      } else {
        isAnimating.current = false;
      }
    });
  };

  const resetPosition = () => {
    isAnimating.current = true;
    overlayOpacity.setValue(0);
    labelOpacity.setValue(0);
    setOverlayColorState('transparent');
    setCardBorderColor('#FFFEAD'); // Reset to default butter yellow
    labelDirection.current = null;
    
    // Smooth spring animation for any remaining movement
    Animated.parallel([
      Animated.spring(position, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
        tension: 50,
        friction: 8,
      }),
      Animated.spring(rotate, {
        toValue: 0,
        useNativeDriver: false,
        tension: 50,
        friction: 8,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: false,
        tension: 50,
        friction: 8,
      }),
      Animated.spring(flipY, {
        toValue: 0,
        useNativeDriver: false,
        tension: 50,
        friction: 8,
      }),
    ]).start(() => {
      isAnimating.current = false;
    });
  };

  const nextCard = () => {
    const next = currentIndexRef.current + 1;
    const totalMovies = moviesRef.current.length;
    console.log(`[SwipeDeck] nextCard called, currentIndex before: ${currentIndexRef.current}, next: ${next} (total: ${totalMovies})`);

    if (next >= totalMovies) {
      currentIndexRef.current = next;
      setCurrentIndex(next);
      isAnimating.current = false;
      return;
    }

    // New top card should be ready to interact immediately
    hasMoved.current = false;
    clearGestureContext();

    // Prepare next card offscreen and animate it up
    position.setValue({ x: 0, y: SCREEN_HEIGHT * 0.6 });
    rotate.setValue(0);
    flipY.setValue(0);
    scale.setValue(0.95);
    cardOpacity.setValue(0.8);
    overlayOpacity.setValue(0);
    labelOpacity.setValue(0);
    setOverlayColorState('transparent');
    setCardBorderColor('#FFFEAD'); // Reset to default butter yellow
    labelDirection.current = null;

    currentIndexRef.current = next;
    setCurrentIndex(next);
    // Allow gestures while the incoming card animates into place
    isAnimating.current = false;

    Animated.parallel([
      Animated.spring(position, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
        tension: 100, // Faster
        friction: 7,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: false,
        tension: 100, // Faster
        friction: 7,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 120, // Faster fade-in
        useNativeDriver: false,
      }),
    ]).start(() => {
      // Ensure position is at origin and ready for next gesture
      position.flattenOffset();
      position.setValue({ x: 0, y: 0 });
      // Reset animation flag so gestures work
      isAnimating.current = false;
    });
  };

  const getCardStyle = (index: number) => {
    const currentIdx = currentIndex;
    const isTopCard = index === currentIdx;
    const isNextCard = index === currentIdx + 1;

    if (isTopCard) {
      return {
        transform: [
          { translateX: position.x },
          { translateY: position.y },
          {
            rotate: rotate.interpolate({
              inputRange: [-100, 0, 100],
              outputRange: ['-25deg', '0deg', '25deg'],
            }),
          },
          {
            rotateY: flipY.interpolate({
              inputRange: [0, 180],
              outputRange: ['0deg', '180deg'],
            }),
          },
          { scale },
        ],
        opacity: cardOpacity,
      };
    }

    // Next ticket stays completely offscreen below until current is committed
    if (isNextCard) {
      return {
        transform: [
          { translateY: SCREEN_HEIGHT * 0.6 }, // Completely offscreen
          { scale: 0.95 },
        ],
        opacity: 0,
      };
    }

    // Cards further back stay hidden
    return {
      transform: [
        { translateY: SCREEN_HEIGHT * 0.6 },
        { scale: 0.9 },
      ],
      opacity: 0,
    };
  };

  const getFrontOpacity = () => {
    return flipY.interpolate({
      inputRange: [0, 90, 180],
      outputRange: [1, 0, 0],
      extrapolate: 'clamp',
    });
  };

  const getBackOpacity = () => {
    return flipY.interpolate({
      inputRange: [0, 90, 180],
      outputRange: [0, 0, 1],
      extrapolate: 'clamp',
    });
  };

  const getLabelConfig = () => {
    if (!labelDirection.current) return null;
    
    switch (labelDirection.current) {
      case 'right':
        return { label: 'Watchlist', emoji: '🔖', color: '#4caf50' }; // Green
      case 'left':
        return { label: 'Pass', emoji: '🚫', color: '#DC2026' }; // Red
      case 'down':
        return { label: 'Seen', emoji: '✅', color: '#FFD700' }; // Yellow for Seen
      default:
        return null;
    }
  };

  const renderCard = (movie: MovieBase | Movie, index: number) => {
    const currentIdx = currentIndex;
    if (index < currentIdx) return null;
    if (index > currentIdx + 2) return null;

    const cardStyle = getCardStyle(index);
    const zIndex = movies.length - index;
    const isTopCard = index === currentIdx;
    
    // Debug: Log which card is being rendered as top card
    if (isTopCard) {
      console.log(`[SwipeDeck] Rendering top card: ${movie.id} ${movie.title} at index ${index}, currentIndex: ${currentIdx}`);
    }
    const labelConfig = isTopCard ? getLabelConfig() : null;

    return (
      <Animated.View
        ref={isTopCard ? handleCardRef : undefined}
        onLayout={isTopCard ? handleCardLayout : undefined}
        key={`${movie.id}-${index}`}
        style={[
          styles.cardContainer,
          cardStyle,
          { zIndex },
        ]}
        {...(isTopCard ? panResponder.panHandlers : {})}
      >
        {isTopCard ? (
          <>
            <Animated.View
              style={[
                styles.cardFace,
                { opacity: getFrontOpacity() },
              ]}
            >
              <MovieCard 
                movie={movie}
                onDetails={() => {
                  console.log('[SwipeDeck] onDetails called for movie:', movie.id, movie.title, 'from index:', index);
                  onDetails?.(movie);
                }}
                borderColor={cardBorderColor}
                maxHeight={maxTicketHeight}
              />
            </Animated.View>
            <Animated.View
              style={[
                styles.cardFace,
                styles.cardBack,
                { opacity: getBackOpacity() },
              ]}
            >
              <View style={styles.backCard}>
                <Ionicons name="information-circle" size={80} color="#DC2026" />
                <Text style={styles.backCardText}>Details</Text>
              </View>
            </Animated.View>
            
            {/* Overlay tint */}
            <Animated.View
              style={[
                styles.overlay,
                {
                  opacity: overlayOpacity,
                  backgroundColor: overlayColorState,
                },
              ]}
              pointerEvents="none"
            />
            
            {/* Floating label */}
            {labelConfig && (
              <FloatingLabel
                label={labelConfig.label}
                emoji={labelConfig.emoji}
                opacity={labelOpacity}
                color={labelConfig.color}
              />
            )}
          </>
        ) : (
          <MovieCard 
            movie={movie}
            onDetails={() => onDetails?.(movie)}
            borderColor="#DC2026"
            maxHeight={maxTicketHeight}
          />
        )}
      </Animated.View>
    );
  };

  if (currentIndex >= movies.length) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="film-outline" size={64} color="#8e8e93" />
        <Text style={styles.emptyText}>No more movies to swipe!</Text>
        <Text style={styles.emptySubtext}>Check back later for new releases</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {movies.map((movie, index) => renderCard(movie, index))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    // Remove overflow: hidden to allow cards to animate off-screen
  },
  cardContainer: {
    position: 'absolute',
    width: SCREEN_WIDTH - 32,
    maxWidth: 400,
    // Ensure cards can move fully off-screen
  },
  cardFace: {
    backfaceVisibility: 'hidden',
  },
  cardBack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    transform: [{ rotateY: '180deg' }],
  },
  backCard: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#DC2026', // Movie theater red
  },
  backCardText: {
    color: '#DC2026', // Movie theater red
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    pointerEvents: 'none',
  },
  floatingLabel: {
    position: 'absolute',
    top: '30%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingLabelText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 22,
    color: '#fff',
    marginTop: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#8e8e93',
    marginTop: 8,
    textAlign: 'center',
  },
});
