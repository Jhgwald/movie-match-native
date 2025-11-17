import React, { useState, useRef, useCallback } from 'react';
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

interface ThrowConfig {
  arcPeakX?: number;
  arcPeakY?: number;
  liftDuration?: number;
  diveDuration?: number;
  peakScale?: number;
  finalScale?: number;
  liftOpacity?: number;
  finalOpacity?: number;
  impactOffsetX?: number;
  impactOffsetY?: number;
  easingUp?: (value: number) => number;
  easingDown?: (value: number) => number;
}

interface SwipeDeckProps {
  movies: readonly (MovieBase | Movie)[];
  onSwipeRight?: (movie: MovieBase | Movie) => void;
  onSwipeLeft?: (movie: MovieBase | Movie) => void;
  onSwipeUp?: (movie: MovieBase | Movie) => void;
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
  onSwipeUp,
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
  const labelDirection = useRef<'right' | 'left' | 'up' | 'down' | null>(null);
  const isAnimating = useRef(false);
  const cardRef = useRef<View | null>(null);
  const cardCenter = useRef<{ x: number; y: number }>({
    x: SCREEN_WIDTH / 2,
    y: SCREEN_HEIGHT / 2,
  });

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

  const computeTargetOffset = useCallback(
    (
      iconPosition: ProfileIconPosition | null | undefined,
      fallback: { x: number; y: number }
    ) => {
      if (!iconPosition) {
        return fallback;
      }

      return {
        x: iconPosition.x - cardCenter.current.x,
        y: iconPosition.y - cardCenter.current.y,
      };
    },
    []
  );

  const getProfileTargetOffset = useCallback(() => {
    return computeTargetOffset(profileIconPosition, {
      x: SCREEN_WIDTH * 0.9 - SCREEN_WIDTH / 2,
      y: SCREEN_HEIGHT * 0.85 - SCREEN_HEIGHT / 2,
    });
  }, [computeTargetOffset, profileIconPosition]);

  const throwCardIntoTarget = useCallback(
    (targetX: number, targetY: number, config: ThrowConfig = {}) => {
      const {
        arcPeakX = targetX * 0.35,
        arcPeakY = Math.min(-SCREEN_HEIGHT * 0.35, targetY - 120),
        liftDuration = 320,
        diveDuration = 420,
        peakScale = 0.78,
        finalScale = 0.02,
        liftOpacity = 0.9,
        finalOpacity = 0,
        impactOffsetX = targetX >= 0 ? 8 : -8,
        impactOffsetY = 16,
        easingUp = Easing.out(Easing.quad),
        easingDown = Easing.in(Easing.cubic),
      } = config;

      const impactX = targetX + impactOffsetX;
      const impactY = targetY + impactOffsetY;

      // Get current overlay opacity to maintain it during animation
      const currentOverlayOpacity = (overlayOpacity as any)._value || 0.2;

      return new Promise<void>((resolve) => {
        Animated.sequence([
          Animated.parallel([
            Animated.timing(position, {
              toValue: { x: arcPeakX, y: arcPeakY },
              duration: liftDuration,
              easing: easingUp,
              useNativeDriver: false,
            }),
            Animated.timing(scale, {
              toValue: peakScale,
              duration: liftDuration,
              easing: easingUp,
              useNativeDriver: false,
            }),
            Animated.timing(cardOpacity, {
              toValue: liftOpacity,
              duration: liftDuration,
              easing: easingUp,
              useNativeDriver: false,
            }),
            // Keep overlay visible during lift, fade with card
            Animated.timing(overlayOpacity, {
              toValue: currentOverlayOpacity * liftOpacity,
              duration: liftDuration,
              easing: easingUp,
              useNativeDriver: false,
            }),
          ]),
          Animated.parallel([
            Animated.timing(position, {
              toValue: { x: impactX, y: impactY },
              duration: diveDuration,
              easing: easingDown,
              useNativeDriver: false,
            }),
            Animated.timing(scale, {
              toValue: finalScale,
              duration: diveDuration,
              easing: easingDown,
              useNativeDriver: false,
            }),
            Animated.timing(cardOpacity, {
              toValue: finalOpacity,
              duration: diveDuration,
              easing: easingDown,
              useNativeDriver: false,
            }),
            // Fade overlay out with card
            Animated.timing(overlayOpacity, {
              toValue: 0,
              duration: diveDuration,
              easing: easingDown,
              useNativeDriver: false,
            }),
          ]),
        ]).start(() => {
          // Reset overlay after animation
          overlayOpacity.setValue(0);
          setOverlayColorState('transparent');
          resolve();
        });
      });
    },
    [cardOpacity, position, scale, overlayOpacity]
  );

  const finishProfileCatch = () => {
    onProfileShake?.();
    setTimeout(() => {
      // Reset values before calling nextCard
      position.setValue({ x: 0, y: 0 });
      scale.setValue(1);
      cardOpacity.setValue(1);
      // Ensure animation flag is reset before nextCard sets it
      isAnimating.current = false;
      nextCard();
    }, 280);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isAnimating.current,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        position.setOffset({
          x: (position.x as any)._value,
          y: (position.y as any)._value,
        });
        position.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gesture) => {
        if (isAnimating.current) return;
        
        const { dx, dy } = gesture;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        
        // Allow normal movement for all directions including down
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
          if (dy < 0) {
            labelDirection.current = 'up';
            setOverlayColorState('#FFD700'); // Yellow for Seen
            setCardBorderColor('#FFD700'); // Yellow border for Seen
            overlayOpacity.setValue(Math.min(absDy / 150, 0.2));
            labelOpacity.setValue(Math.min(absDy / 80, 1));
          } else {
            labelDirection.current = 'down';
            setOverlayColorState('#FFD700'); // Yellow for Details
            setCardBorderColor('#DC2026'); // Keep red for Details (no action)
            overlayOpacity.setValue(Math.min(absDy / 150, 0.2));
            labelOpacity.setValue(Math.min(absDy / 80, 1));
          }
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (isAnimating.current) return;
        
        position.flattenOffset();
        
        const { dx, dy, vx, vy } = gesture;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        const absVx = Math.abs(vx);
        const absVy = Math.abs(vy);

        // Use velocity to help determine direction if distance is borderline
        const isHorizontal = absDx > absDy || (absDx === absDy && absVx > absVy);
        
        // Determine swipe direction before resetting overlay
        let swipeDirection: 'left' | 'right' | 'up' | 'down' | null = null;
        
        if (isHorizontal) {
          // Horizontal swipe
          if (dx > SWIPE_THRESHOLD || (dx > 50 && vx > VELOCITY_THRESHOLD)) {
            swipeDirection = 'right';
          } else if (dx < -SWIPE_THRESHOLD || (dx < -50 && vx < -VELOCITY_THRESHOLD)) {
            swipeDirection = 'left';
          }
        } else {
          // Vertical swipe
          if (dy < -SWIPE_THRESHOLD || (dy < -50 && vy < -VELOCITY_THRESHOLD)) {
            swipeDirection = 'up';
          } else if (dy > SWIPE_THRESHOLD || (dy > 50 && vy > VELOCITY_THRESHOLD)) {
            swipeDirection = 'down';
          }
        }
        
        // For right/up swipes, keep overlay visible during animation
        // For left/down or no swipe, reset overlay
        if (swipeDirection === 'right' || swipeDirection === 'up') {
          // Keep overlay visible - it will fade with the card
          labelOpacity.setValue(0); // Hide label but keep overlay
        } else {
          // Reset overlay for left/down/no swipe
          overlayOpacity.setValue(0);
          setOverlayColorState('transparent');
          labelOpacity.setValue(0);
          labelDirection.current = null;
        }
        
        if (swipeDirection) {
          handleSwipe(swipeDirection);
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  const handleSwipe = (direction: 'left' | 'right' | 'up' | 'down') => {
    if (isAnimating.current || currentIndex >= movies.length) return;
    
    isAnimating.current = true;
    const movie = movies[currentIndex];
    let x = 0;
    let y = 0;
    let shouldAdvance = true;

    switch (direction) {
      case 'right':
        // Change border to green for "Watchlist"
        setCardBorderColor('#4caf50'); // Green
        onSwipeRight?.(movie);
        // Card arcs up then to Profile tab, shrinking INTO the icon
        // Keep the green border color during animation
        const { x: profileTargetX, y: profileTargetY } = getProfileTargetOffset();
        throwCardIntoTarget(profileTargetX, profileTargetY).then(finishProfileCatch);
        return;
      case 'left':
        x = -SCREEN_WIDTH * 1.5;
        onSwipeLeft?.(movie);
        break;
      case 'up':
        // Change border to yellow for "Seen"
        setCardBorderColor('#FFD700'); // Yellow
        onSwipeUp?.(movie);
        // Keep the yellow border color during animation
        const { x: seenTargetX, y: seenTargetY } = getProfileTargetOffset();
        throwCardIntoTarget(seenTargetX, seenTargetY, {
          arcPeakX: seenTargetX * 0.2,
          arcPeakY: Math.min(-SCREEN_HEIGHT * 0.25, seenTargetY - 90),
          liftDuration: 260,
          diveDuration: 360,
          peakScale: 0.88,
          liftOpacity: 0.95,
        }).then(finishProfileCatch);
        return;
      case 'down':
        // Swipe down to show details - card moves down and then resets
        y = SCREEN_HEIGHT * 0.3; // Move down a bit to show action
        console.log('[SwipeDeck] swipe down on movie:', movie.id, movie.title, 'from index:', currentIndex);
        onSwipeDown?.(movie);
        shouldAdvance = false;
        // Animate down then reset
        Animated.sequence([
          Animated.timing(position, {
            toValue: { x: 0, y },
            duration: 200,
            useNativeDriver: false,
          }),
          Animated.timing(position, {
            toValue: { x: 0, y: 0 },
            duration: 200,
            useNativeDriver: false,
          }),
        ]).start(() => {
          isAnimating.current = false;
          resetPosition();
        });
        return;
    }

    if (shouldAdvance) {
      isAnimating.current = true;
      Animated.parallel([
        Animated.timing(position, {
          toValue: { x, y },
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.timing(rotate, {
          toValue: direction === 'left' ? -30 : 0,
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }),
      ]).start(() => {
        nextCard();
      });
    }
  };

  const resetPosition = () => {
    // Reset all values immediately
    position.setValue({ x: 0, y: 0 });
    rotate.setValue(0);
    scale.setValue(1);
    cardOpacity.setValue(1);
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
    setCurrentIndex((prev) => {
      const next = prev + 1;
      if (next < movies.length) {
        // Keep animation flag true during slide-up
        isAnimating.current = true;
        
        // Flatten any existing offset from previous gesture
        position.flattenOffset();
        
        // Start new ticket completely offscreen below (immediate fast slide-up)
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
        
        // Immediate fast slide-up animation with bounce
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
      } else {
        // No more cards, reset animation flag
        isAnimating.current = false;
      }
      return next;
    });
  };

  const getCardStyle = (index: number) => {
    const isTopCard = index === currentIndex;
    const isNextCard = index === currentIndex + 1;

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

  const getOverlayColor = () => {
    if (!labelDirection.current) return 'transparent';
    
    switch (labelDirection.current) {
      case 'right':
        return '#4caf50'; // Green for Watchlist
      case 'left':
        return '#DC2026'; // Red for Not Interested
      case 'up':
        return '#FFD700'; // Yellow for Seen
      case 'down':
        return '#FFD700'; // Yellow for Details
      default:
        return 'transparent';
    }
  };

  const getLabelConfig = () => {
    if (!labelDirection.current) return null;
    
    switch (labelDirection.current) {
      case 'right':
        return { label: 'Watchlist', emoji: '🔖', color: '#4caf50' }; // Green
      case 'left':
        return { label: 'Pass', emoji: '🚫', color: '#DC2026' }; // Red
      case 'up':
        return { label: 'Seen', emoji: '✅', color: '#FFD700' }; // Yellow
      case 'down':
        return { label: 'Details', emoji: 'ℹ️', color: '#FFD700' }; // Yellow
      default:
        return null;
    }
  };

  const renderCard = (movie: MovieBase | Movie, index: number) => {
    if (index < currentIndex) return null;
    if (index > currentIndex + 2) return null;

    const cardStyle = getCardStyle(index);
    const zIndex = movies.length - index;
    const isTopCard = index === currentIndex;
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
