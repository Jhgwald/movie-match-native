import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MovieCard from './MovieCard';
import type { Movie } from '../types/movie';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 120;

interface SwipeDeckProps {
  movies: readonly Movie[];
  onSwipeRight?: (movie: Movie) => void;
  onSwipeLeft?: (movie: Movie) => void;
}

export default function SwipeDeck({ movies, onSwipeRight, onSwipeLeft }: SwipeDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [position] = useState(new Animated.ValueXY());

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      position.setValue({ x: gesture.dx, y: gesture.dy });
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > SWIPE_THRESHOLD) {
        // Swipe right - Like
        handleSwipe('right');
      } else if (gesture.dx < -SWIPE_THRESHOLD) {
        // Swipe left - Pass
        handleSwipe('left');
      } else {
        // Return to center
        resetPosition();
      }
    },
  });

  const handleSwipe = (direction: 'left' | 'right') => {
    const movie = movies[currentIndex];
    const x = direction === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH;

    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      if (direction === 'right' && onSwipeRight) {
        onSwipeRight(movie);
      } else if (direction === 'left' && onSwipeLeft) {
        onSwipeLeft(movie);
      }
      nextCard();
    });
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
    }).start();
  };

  const nextCard = () => {
    setCurrentIndex((prev) => prev + 1);
    position.setValue({ x: 0, y: 0 });
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
            rotate: position.x.interpolate({
              inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
              outputRange: ['-30deg', '0deg', '30deg'],
            }),
          },
        ],
        opacity: position.x.interpolate({
          inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
          outputRange: [0.5, 1, 0.5],
        }),
      };
    }

    if (isNextCard) {
      return {
        transform: [{ scale: 0.95 }],
        opacity: 0.8,
      };
    }

    return {
      transform: [{ scale: 0.9 }],
      opacity: 0.6,
    };
  };

  const renderCard = (movie: Movie, index: number) => {
    if (index < currentIndex) return null;
    if (index > currentIndex + 2) return null;

    const cardStyle = getCardStyle(index);
    const zIndex = movies.length - index;

    return (
      <Animated.View
        key={movie.id}
        style={[
          styles.cardContainer,
          cardStyle,
          { zIndex },
        ]}
        {...(index === currentIndex ? panResponder.panHandlers : {})}
      >
        <MovieCard movie={movie} />
        {index === currentIndex && (
          <View style={styles.swipeIndicators}>
            <Animated.View
              style={[
                styles.indicator,
                styles.likeIndicator,
                {
                  opacity: position.x.interpolate({
                    inputRange: [0, SWIPE_THRESHOLD],
                    outputRange: [0, 1],
                    extrapolate: 'clamp',
                  }),
                },
              ]}
            >
              <Ionicons name="heart" size={40} color="#fff" />
            </Animated.View>
            <Animated.View
              style={[
                styles.indicator,
                styles.passIndicator,
                {
                  opacity: position.x.interpolate({
                    inputRange: [-SWIPE_THRESHOLD, 0],
                    outputRange: [1, 0],
                    extrapolate: 'clamp',
                  }),
                },
              ]}
            >
              <Ionicons name="close" size={40} color="#fff" />
            </Animated.View>
          </View>
        )}
      </Animated.View>
    );
  };

  if (currentIndex >= movies.length) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="film-outline" size={64} color="#8e8e93" />
        <Text style={styles.emptyText}>
          No more movies to swipe!
        </Text>
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
  },
  cardContainer: {
    position: 'absolute',
    width: SCREEN_WIDTH - 32,
    maxWidth: 400,
  },
  swipeIndicators: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  indicator: {
    position: 'absolute',
    padding: 20,
    borderRadius: 50,
    borderWidth: 4,
  },
  likeIndicator: {
    right: 20,
    borderColor: '#4caf50',
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
  },
  passIndicator: {
    left: 20,
    borderColor: '#f44336',
    backgroundColor: 'rgba(244, 67, 54, 0.3)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    color: '#8e8e93',
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
});

