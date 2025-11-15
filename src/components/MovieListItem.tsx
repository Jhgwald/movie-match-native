import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Movie, MovieBase } from '../types/movie';

interface MovieListItemProps {
  movie: Movie | MovieBase;
  onPress: () => void;
  borderColor?: string;
}

/**
 * Simple row-based movie list item
 * Shows thumbnail, title, year, and genres in a compact layout
 */
export default function MovieListItem({ movie, onPress, borderColor = '#FFFEAD' }: MovieListItemProps) {
  return (
    <TouchableOpacity
      style={[styles.container, { borderLeftColor: borderColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Movie Poster Thumbnail */}
      <View style={styles.thumbnailContainer}>
        {movie.poster ? (
          <Image
            source={{ uri: movie.poster }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
            <Ionicons name="film-outline" size={24} color="#8e8e93" />
          </View>
        )}
      </View>

      {/* Movie Info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {movie.title}
        </Text>
        <Text style={styles.metadata}>
          {movie.year} • {movie.genres.slice(0, 2).join(', ')}
        </Text>
        {movie.tmdbRating && (
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.rating}>{movie.tmdbRating.toFixed(1)}</Text>
          </View>
        )}
      </View>

      {/* Chevron */}
      <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    gap: 12,
  },
  thumbnailContainer: {
    width: 60,
    height: 90,
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    backgroundColor: '#2c2c2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 20,
  },
  metadata: {
    fontSize: 13,
    color: '#8e8e93',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  rating: {
    fontSize: 13,
    color: '#FFD700',
    fontWeight: '500',
  },
});
