import { View, Text, StyleSheet, Image, Dimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Movie, MovieBase } from '../types/movie';
import { useFeedPreferences } from '../context/FeedPreferencesContext';
import type { CardLayoutPreset } from '../types/feedPreferences';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TICKET_MAX_WIDTH = Math.min(SCREEN_WIDTH - 32, 400);
const NOTCH_RADIUS = 20;

interface MovieCardProps {
  movie: MovieBase | Movie;
  onPass?: () => void;
  onDetails?: () => void;
  onWatchlist?: () => void;
  onSeen?: () => void;
  borderColor?: string;
  maxHeight?: number;
}

// Helper to truncate description to 1-2 lines
function truncateDescription(text: string, maxLength: number = 120): string {
  if (text.length <= maxLength) return text;
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
}

export default function MovieCard({
  movie,
  onPass,
  onDetails,
  onWatchlist,
  onSeen,
  borderColor = '#A0452E',
  maxHeight,
}: MovieCardProps) {
  const { feedPreferences } = useFeedPreferences();
  const preset: CardLayoutPreset = feedPreferences.cardLayoutPreset || 'standard';

  const hasRatings = 'ratings' in movie && !!movie.ratings;
  const imdbRating = hasRatings ? movie.ratings?.imdb : undefined;
  const rtRating = hasRatings ? movie.ratings?.rtCritics : undefined;

  // Calculate Friend Score
  const friendScore = imdbRating && rtRating
    ? Math.round((imdbRating * 10 + rtRating) / 2)
    : Math.round(movie.tmdbRating * 10);

  // Generate serial number
  const numericFragment = movie.id.replace(/\D/g, '');
  const fallbackSerialSeed = `${movie.year}${Math.round(movie.tmdbRating * 10)}`;
  const serialNumber = (numericFragment || fallbackSerialSeed).padStart(6, '0').slice(-6);

  // Truncate description
  const shortDescription = truncateDescription(movie.description);

  // Determine poster size based on preset
  const posterSize = preset === 'minimal' ? 'large' : preset === 'standard' ? 'medium' : 'small';

  // Determine which detail rows to show based on preset
  const showRuntime = preset === 'standard' || preset === 'detailed';
  const showDirector = (preset === 'standard' || preset === 'detailed') && movie.director !== undefined;
  const showCast = preset === 'detailed' && movie.cast !== undefined && movie.cast.length > 0;
  const showLanguage = preset === 'detailed' && movie.language !== undefined;

  // Format cast list (first 2-3 names with ellipsis if more)
  const formatCast = (cast: string[]): string => {
    if (cast.length <= 3) {
      return cast.join(', ');
    }
    return cast.slice(0, 3).join(', ') + '…';
  };

  return (
    <View style={styles.card}>
      <View style={[styles.ticketContainer, { borderColor }, maxHeight ? { maxHeight, height: maxHeight } : {}]}>
        <View style={styles.notchLeft} pointerEvents="none" />
        <View style={styles.notchRight} pointerEvents="none" />
        
        <View style={styles.ticketBody}>
          <ScrollView 
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
            scrollEventThrottle={16}
          >
            <Text style={styles.featureLabel}>FEATURE PRESENTATION</Text>

            {/* Poster - size varies by preset */}
            <View style={[
              styles.posterContainer,
              preset === 'minimal' && styles.posterLarge,
              preset === 'standard' && styles.posterMedium,
              preset === 'detailed' && styles.posterSmall,
            ]}>
              {movie.poster ? (
                <Image
                  source={{ uri: movie.poster }}
                  style={styles.poster}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.posterPlaceholder}>
                  <Ionicons name="film" size={48} color="#7A4C2D" />
                </View>
              )}
            </View>

            {/* Title */}
            <Text style={styles.movieTitle}>{movie.title}</Text>

            {/* Year */}
            <Text style={styles.yearText}>({movie.year})</Text>

            {/* Genres - shown in all presets */}
            {movie.genres && movie.genres.length > 0 && (
              <View style={styles.genresContainer}>
                {movie.genres.slice(0, preset === 'detailed' ? 4 : 3).map((genre, index) => (
                  <View key={index} style={styles.genreChip}>
                    <Text style={styles.genreChipText}>{genre}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Details Block - rows appear based on preset */}
            <View style={styles.detailsBlock}>
              {/* Runtime row - Standard and Detailed only */}
              {showRuntime && (
                <Text style={styles.detailRow}>
                  Runtime: {movie.runtimeMinutes !== undefined ? `${movie.runtimeMinutes} min` : 'TBD'}
                </Text>
              )}

              {/* Director row - Standard and Detailed only */}
              {showDirector && (
                <Text style={styles.detailRow}>
                  Director: {movie.director}
                </Text>
              )}

              {/* Cast row - Detailed only */}
              {showCast && (
                <Text style={styles.detailRow}>
                  Cast: {formatCast(movie.cast!)}
                </Text>
              )}

              {/* Language row - Detailed only */}
              {showLanguage && (
                <Text style={styles.detailRow}>
                  Language: {movie.language}
                </Text>
              )}
            </View>

            {/* Description - Standard and Detailed only (Minimal hides it) */}
            {(preset === 'standard' || preset === 'detailed') && (
              <Text style={styles.descriptionTextOnly} numberOfLines={2}>
                {shortDescription}
              </Text>
            )}
          </ScrollView>

          {/* Bottom Section: Scores Row (always visible) + ADMIT ONE badge and Serial Number */}
          <View style={styles.bottomSection}>
            {/* Scores Row - always at bottom */}
            <View style={styles.scoresRow}>
              {imdbRating !== undefined && (
                <View style={[styles.scoreBadge, styles.imdbBadge]}>
                  <Text style={[styles.scoreLabel, styles.darkText]}>IMDb</Text>
                  <Text style={[styles.scoreValue, styles.darkText]}>{Math.round(imdbRating * 10)}%</Text>
                </View>
              )}
              {rtRating !== undefined && (
                <View style={[styles.scoreBadge, styles.rtBadge]}>
                  <Text style={[styles.scoreLabel, styles.lightText]}>RT</Text>
                  <Text style={[styles.scoreValue, styles.lightText]}>{Math.round(rtRating)}%</Text>
                </View>
              )}
              <View style={[styles.scoreBadge, styles.friendBadge]}>
                <Text style={[styles.scoreLabel, styles.lightText]}>Friend</Text>
                <Text style={[styles.scoreValue, styles.lightText]}>{friendScore}%</Text>
              </View>
              {movie.butterScore !== undefined && (
                <View style={[styles.scoreBadge, styles.butterBadge]}>
                  <Text style={[styles.scoreLabel, styles.darkText]}>Butter</Text>
                  <Text style={[styles.scoreValue, styles.darkText]}>{movie.butterScore}%</Text>
                </View>
              )}
            </View>

            {/* ADMIT ONE and Serial Number */}
            <View style={styles.bottomBadges}>
              <View style={styles.admitOneBadge}>
                <Text style={styles.admitOneText}>ADMIT ONE</Text>
              </View>
              <View style={styles.serialNumber}>
                <Text style={styles.serialText}>No. {serialNumber}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: TICKET_MAX_WIDTH,
    alignSelf: 'center',
  },
  ticketContainer: {
    backgroundColor: '#FDF4E0',
    borderRadius: 0,
    borderWidth: 1.5,
    borderColor: '#A0452E',
    overflow: 'visible',
    width: '100%',
    position: 'relative',
    shadowColor: '#3a2b1a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  notchLeft: {
    position: 'absolute',
    left: -NOTCH_RADIUS,
    top: '50%',
    width: NOTCH_RADIUS * 2,
    height: NOTCH_RADIUS * 2,
    borderRadius: NOTCH_RADIUS,
    backgroundColor: '#6B0000',
    marginTop: -NOTCH_RADIUS,
    zIndex: 1,
  },
  notchRight: {
    position: 'absolute',
    right: -NOTCH_RADIUS,
    top: '50%',
    width: NOTCH_RADIUS * 2,
    height: NOTCH_RADIUS * 2,
    borderRadius: NOTCH_RADIUS,
    backgroundColor: '#6B0000',
    marginTop: -NOTCH_RADIUS,
    zIndex: 1,
  },
  ticketBody: {
    flex: 1,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    position: 'relative',
  },
  scrollContent: {
    flex: 1,
    minHeight: 0,
  },
  scrollContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  featureLabel: {
    fontSize: 12,
    letterSpacing: 2,
    color: '#7A4C2D',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  posterContainer: {
    alignSelf: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0C296',
    overflow: 'hidden',
    backgroundColor: '#E8D5C4',
    marginBottom: 16,
  },
  posterLarge: {
    width: '70%',
    aspectRatio: 2 / 3,
    maxHeight: 280,
  },
  posterMedium: {
    width: '60%',
    aspectRatio: 2 / 3,
    maxHeight: 240,
  },
  posterSmall: {
    width: '50%',
    aspectRatio: 2 / 3,
    maxHeight: 200,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  posterPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E8D5C4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  movieTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3a2b1a',
    marginBottom: 4,
    textAlign: 'center',
  },
  yearText: {
    fontSize: 16,
    color: '#6B4330',
    marginBottom: 12,
    textAlign: 'center',
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  genreChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0C296',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  genreChipText: {
    fontSize: 11,
    color: '#6B4330',
    fontWeight: '500',
  },
  detailsBlock: {
    marginTop: 8,
    marginBottom: 8,
  },
  detailRow: {
    fontSize: 13,
    color: '#6B4330',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 18,
  },
  perforationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 0,
  },
  perforationDot: {
    width: 2.5,
    height: 2.5,
    borderRadius: 1.25,
    backgroundColor: 'rgba(160, 69, 46, 0.7)',
  },
  descriptionTextOnly: {
    fontSize: 14,
    color: '#3a2b1a',
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 16,
    textAlign: 'center',
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(160, 69, 46, 0.2)',
  },
  scoresRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  scoreBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  darkText: {
    color: '#2C150A',
  },
  lightText: {
    color: '#FFFFFF',
  },
  imdbBadge: {
    backgroundColor: '#FCC252',
  },
  rtBadge: {
    backgroundColor: '#DC2026',
  },
  friendBadge: {
    backgroundColor: '#113CCF',
  },
  butterBadge: {
    backgroundColor: '#FFF0B3',
  },
  bottomBadges: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  admitOneBadge: {
    borderWidth: 2,
    borderColor: '#7E1616',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FDF4E0',
  },
  admitOneText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3a2b1a',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  serialNumber: {},
  serialText: {
    fontSize: 10,
    letterSpacing: 1,
    color: '#8D6A3A',
    fontWeight: '500',
    fontFamily: 'monospace',
  },
});
