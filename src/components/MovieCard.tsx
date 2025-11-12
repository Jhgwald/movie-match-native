import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Movie, MovieBase } from '../types/movie';

// Streaming platform brand colors
const PLATFORM_COLORS: Record<string, { bg: string; text: string }> = {
  'Netflix': { bg: '#E50914', text: '#fff' },
  'HBO Max': { bg: '#5A2C8A', text: '#fff' },
  'Max': { bg: '#041E42', text: '#fff' },
  'Disney+': { bg: '#113CCF', text: '#fff' },
  'Hulu': { bg: '#1CE783', text: '#000' },
  'Prime Video': { bg: '#00A8E1', text: '#fff' },
  'Paramount+': { bg: '#0072FF', text: '#fff' },
  'Peacock': { bg: '#000000', text: '#fff' },
  'Showtime': { bg: '#B20000', text: '#fff' },
  'Starz': { bg: '#000000', text: '#fff' },
  'Apple TV+': { bg: '#000000', text: '#fff' },
  'Crunchyroll': { bg: '#F47521', text: '#fff' },
};

function getPlatformStyle(platform: string) {
  const colors = PLATFORM_COLORS[platform] || { bg: '#2c2c2e', text: '#fff' };
  return {
    backgroundColor: colors.bg,
    borderColor: colors.bg,
  };
}

function getPlatformTextColor(platform: string) {
  const colors = PLATFORM_COLORS[platform] || { text: '#fff' };
  return colors.text;
}

interface MovieCardProps {
  movie: MovieBase | Movie;
  onPass?: () => void;
  onDetails?: () => void;
  onWatchlist?: () => void;
  onSeen?: () => void;
  borderColor?: string; // Dynamic border color for swipe actions
}

export default function MovieCard({ 
  movie, 
  onPass, 
  onDetails, 
  onWatchlist, 
  onSeen,
  borderColor = '#DC2026' // Default to cinema red
}: MovieCardProps) {
  const hasRatings = 'ratings' in movie && movie.ratings;
  const imdbRating = hasRatings && movie.ratings?.imdb;
  const rtRating = hasRatings && movie.ratings?.rtCritics;

  return (
    <View style={styles.card}>
      {/* Border frame */}
      <View style={[styles.borderFrame, { borderColor }]}>
        {/* Poster with padding inside border */}
        <View style={styles.posterContainer}>
          {movie.poster ? (
            <Image 
              source={{ uri: movie.poster }} 
              style={styles.poster}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.posterPlaceholder}>
              <Ionicons name="film" size={48} color="#8e8e93" />
            </View>
          )}
        </View>
        
        <View style={styles.content}>
          {/* Ratings Row - Simplified badges, centered */}
          <View style={styles.ratingsRow}>
            {imdbRating !== undefined ? (
              <View style={[styles.ratingBadge, styles.imdbBadge]}>
                <Ionicons name="star" size={18} color="#FFD700" />
                <Text style={styles.ratingValue}>{imdbRating.toFixed(1)}</Text>
              </View>
            ) : null}
            {rtRating !== undefined ? (
              <View style={[styles.ratingBadge, styles.rtBadge]}>
                <Text style={styles.rtIcon}>🍅</Text>
                <Text style={styles.ratingValue}>{Math.round(rtRating)}%</Text>
              </View>
            ) : null}
            <View style={[styles.ratingBadge, styles.tmdbBadge]}>
              <Ionicons name="ticket" size={18} color="#9c27b0" />
              <Text style={styles.ratingValue}>{movie.tmdbRating.toFixed(1)}</Text>
            </View>
            {movie.butterScore !== undefined && (
              <View style={[styles.ratingBadge, styles.butterBadge]}>
                <Text style={styles.butterIcon}>🧈</Text>
                <Text style={styles.butterValue}>{movie.butterScore}%</Text>
              </View>
            )}
          </View>
          
          {/* Streaming Platforms */}
          {movie.streamingPlatforms && movie.streamingPlatforms.length > 0 && (
            <View style={styles.streamingContainer}>
              <Text style={styles.streamingLabel}>Available on:</Text>
              <View style={styles.streamingPlatforms}>
                {movie.streamingPlatforms.map((platform, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.platformBadge,
                      getPlatformStyle(platform)
                    ]}
                  >
                    <Text style={[styles.platformText, { color: getPlatformTextColor(platform) }]}>
                      {platform}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          
          {/* Genre Chips - With dots between */}
          <View style={styles.genreContainer}>
            {movie.genres.slice(0, 3).map((genre, index) => (
              <View key={index} style={styles.genreRow}>
                <Text style={styles.genreText}>{genre}</Text>
                {index < Math.min(movie.genres.length, 3) - 1 && (
                  <Text style={styles.genreDot}> • </Text>
                )}
              </View>
            ))}
          </View>
          
          {/* Description - Fully visible */}
          <Text style={styles.description}>
            {movie.description}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  borderFrame: {
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#DC2026', // Cinema TV Red
    overflow: 'hidden',
    width: '100%',
  },
  posterContainer: {
    alignSelf: 'center',
    flex: 0,
    aspectRatio: 2 / 3,
    maxHeight: 380, // Reduced to ensure card fits on smaller screens
    width: '100%',
    backgroundColor: '#2c2c2e',
    overflow: 'hidden',
    marginHorizontal: 8,
    marginTop: 8,
    marginBottom: 0,
    borderRadius: 12,
  },
  poster: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2c2c2e',
  },
  posterPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2c2c2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 20,
    alignItems: 'center',
  },
  ratingsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  imdbBadge: {
    backgroundColor: '#2c2c2e',
  },
  rtBadge: {
    backgroundColor: '#DC2026', // Movie theater red
  },
  tmdbBadge: {
    backgroundColor: '#2c2c2e',
  },
  butterBadge: {
    backgroundColor: '#FFFEAD', // Butter yellow background
  },
  ratingValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
  rtIcon: {
    fontSize: 16,
  },
  butterIcon: {
    fontSize: 16,
  },
  butterValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000', // Black text for butter badge (yellow background)
  },
  streamingContainer: {
    width: '100%',
    marginBottom: 12,
    alignItems: 'center',
  },
  streamingLabel: {
    fontSize: 12,
    color: '#8e8e93',
    marginBottom: 6,
    fontWeight: '500',
  },
  streamingPlatforms: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  platformBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  platformText: {
    fontSize: 11,
    fontWeight: '600',
  },
  genreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 12,
    justifyContent: 'center',
  },
  genreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  genreText: {
    fontSize: 13,
    color: '#8e8e93',
    fontWeight: '500',
  },
  genreDot: {
    fontSize: 13,
    color: '#8e8e93',
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    color: '#d1d1d6',
    lineHeight: 20,
  },
});
