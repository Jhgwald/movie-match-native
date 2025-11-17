import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import type { Movie, MovieBase } from '../types/movie';

interface SearchResultRowProps {
  movie: MovieBase | Movie;
  onPress: () => void;
}

export default function SearchResultRow({ movie, onPress }: SearchResultRowProps) {
  const hasRatings = 'ratings' in movie && !!movie.ratings;
  const imdbRating = hasRatings ? movie.ratings?.imdb : undefined;
  const rtRating = hasRatings ? movie.ratings?.rtCritics : undefined;

  // Calculate Friend Score (average of IMDb and RT, or use tmdbRating as fallback)
  const friendScore = imdbRating && rtRating
    ? Math.round((imdbRating * 10 + rtRating) / 2)
    : Math.round(movie.tmdbRating * 10);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Poster thumbnail */}
      <View style={styles.posterContainer}>
        {movie.poster ? (
          <Image
            source={{ uri: movie.poster }}
            style={styles.poster}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.posterPlaceholder}>
            <Text style={styles.posterPlaceholderText}>🎬</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {movie.title}
        </Text>
        <Text style={styles.year}>({movie.year})</Text>
        
        {movie.genres && movie.genres.length > 0 && (
          <Text style={styles.genres} numberOfLines={1}>
            {movie.genres.slice(0, 3).join(', ')}
          </Text>
        )}

        <View style={styles.ratingsRow}>
          {imdbRating !== undefined && (
            <Text style={styles.ratingText}>IMDb: {Math.round(imdbRating * 10)}%</Text>
          )}
          {rtRating !== undefined && (
            <Text style={styles.ratingText}>RT: {Math.round(rtRating)}%</Text>
          )}
          <Text style={styles.ratingText}>Friend: {friendScore}%</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FDF4E0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0C296',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  posterContainer: {
    width: 60,
    height: 90,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E8D5C4',
    marginRight: 12,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  posterPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8D5C4',
  },
  posterPlaceholderText: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3a2b1a',
    marginBottom: 4,
  },
  year: {
    fontSize: 14,
    color: '#6B4330',
    marginBottom: 6,
  },
  genres: {
    fontSize: 13,
    color: '#8D6A3A',
    marginBottom: 8,
  },
  ratingsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ratingText: {
    fontSize: 12,
    color: '#7E1616',
    fontWeight: '500',
  },
});

