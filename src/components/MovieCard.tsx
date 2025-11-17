import { View, Text, StyleSheet, Image, Dimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Movie, MovieBase } from '../types/movie';
import { useFeedPreferences } from '../context/FeedPreferencesContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TICKET_MAX_WIDTH = Math.min(SCREEN_WIDTH - 32, 400);
const NOTCH_RADIUS = 20; // 20px radius as per clip-path specification

interface MovieCardProps {
  movie: MovieBase | Movie;
  onPass?: () => void;
  onDetails?: () => void;
  onWatchlist?: () => void;
  onSeen?: () => void;
  borderColor?: string;
  maxHeight?: number;
}

export default function MovieCard({
  movie,
  onPass,
  onDetails,
  onWatchlist,
  onSeen,
  borderColor = '#A0452E', // Dark brown/red border
  maxHeight,
}: MovieCardProps) {
  const { feedPreferences } = useFeedPreferences();
  const { ticketLayout } = feedPreferences;

  const hasRatings = 'ratings' in movie && !!movie.ratings;
  const imdbRating = hasRatings ? movie.ratings?.imdb : undefined;
  const rtRating = hasRatings ? movie.ratings?.rtCritics : undefined;

  // Calculate Friend Score (average of IMDb and RT, or use tmdbRating as fallback)
  const friendScore = imdbRating && rtRating
    ? Math.round((imdbRating * 10 + rtRating) / 2)
    : Math.round(movie.tmdbRating * 10);

  // Generate serial number (format: No. 000071)
  const numericFragment = movie.id.replace(/\D/g, '');
  const fallbackSerialSeed = `${movie.year}${Math.round(movie.tmdbRating * 10)}`;
  const serialNumber = (numericFragment || fallbackSerialSeed).padStart(6, '0').slice(-6);

  return (
    <View style={styles.card}>
      <View style={[styles.ticketContainer, { borderColor }, maxHeight ? { maxHeight, height: maxHeight } : {}]}>
        {/* Left Semicircle Notch - 20px radius, centered vertically at 50% */}
        <View style={styles.notchLeft} pointerEvents="none" />
        
        {/* Right Semicircle Notch - 20px radius, centered vertically at 50% */}
        <View style={styles.notchRight} pointerEvents="none" />
        
        {/* Main Ticket Body */}
        <View style={styles.ticketBody}>
          <ScrollView 
              style={styles.scrollContent}
              contentContainerStyle={styles.scrollContentContainer}
              showsVerticalScrollIndicator={false}
              bounces={false}
              overScrollMode="never"
              scrollEventThrottle={16}
            >
              {/* Feature Presentation Header */}
              <Text style={styles.featureLabel}>FEATURE PRESENTATION</Text>

              {/* Poster and Ratings Row */}
              <View style={styles.posterRatingsRow}>
                {/* Poster - Left side */}
                <View style={[styles.posterContainer, !ticketLayout.showScores && styles.posterFullWidth]}>
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

                {/* Ratings - Vertical stack to the right (4 ratings only) */}
                {ticketLayout.showScores && (
                  <View style={styles.ratingsColumn}>
                    {/* IMDb - Yellow background, black text */}
                    {imdbRating !== undefined && typeof imdbRating === 'number' ? (
                      <View style={[styles.ratingBubble, styles.imdbBubble]}>
                        <Text style={[styles.ratingBubbleLabel, styles.darkText]}>IMDb</Text>
                        <Text style={[styles.ratingBubbleValue, styles.darkText]}>{Math.round(imdbRating * 10)}%</Text>
                      </View>
                    ) : null}

                    {/* Rotten Tomatoes - Red background, white text */}
                    {rtRating !== undefined && typeof rtRating === 'number' ? (
                      <View style={[styles.ratingBubble, styles.rtBubble]}>
                        <Text style={[styles.ratingBubbleLabel, styles.lightText]}>Rotten Tomatoes</Text>
                        <Text style={[styles.ratingBubbleValue, styles.lightText]}>{Math.round(rtRating)}%</Text>
                      </View>
                    ) : null}

                    {/* Friend Score - Blue background, white text */}
                    <View style={[styles.ratingBubble, styles.friendBubble]}>
                      <Text style={[styles.ratingBubbleLabel, styles.lightText]}>Friend Score</Text>
                      <Text style={[styles.ratingBubbleValue, styles.lightText]}>{friendScore}%</Text>
                    </View>

                    {/* Butter Score - Light yellow background, black text */}
                    {movie.butterScore !== undefined && (
                      <View style={[styles.ratingBubble, styles.butterBubble]}>
                        <Text style={[styles.ratingBubbleLabel, styles.darkText]}>Butter Score</Text>
                        <Text style={[styles.ratingBubbleValue, styles.darkText]}>{movie.butterScore}%</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Movie Title */}
              <Text style={styles.movieTitle}>{movie.title}</Text>

              {/* Year and Genres */}
              {(ticketLayout.showYear || ticketLayout.showGenre) && (
                <Text style={styles.yearGenresText}>
                  {ticketLayout.showYear && `(${movie.year})`}
                  {ticketLayout.showYear && ticketLayout.showGenre && ' • '}
                  {ticketLayout.showGenre && movie.genres.slice(0, 3).join(' • ')}
                </Text>
              )}

              {/* TODO: Director - Add director field to movie data */}
              {ticketLayout.showDirector && (
                <Text style={styles.directorText}>
                  {/* Placeholder - Director data not yet available in movie type */}
                  Director: TBD (data not available)
                </Text>
              )}

              {/* TODO: Cast - Add cast field to movie data */}
              {ticketLayout.showCast && (
                <Text style={styles.castText}>
                  {/* Placeholder - Cast data not yet available in movie type */}
                  Cast: TBD (data not available)
                </Text>
              )}

              {/* Perforation Line - above description (only show if plot is visible) */}
              {ticketLayout.showPlot && (
                <View style={styles.perforationRow} pointerEvents="none">
                  {Array.from({ length: 40 }, (_, i) => (
                    <View key={i} style={styles.perforationDot} />
                  ))}
                </View>
              )}

              {/* Description Section */}
              {ticketLayout.showPlot && (
                <View style={styles.descriptionSection}>
                  <Text style={styles.descriptionLabel}>DESCRIPTION</Text>
                  <Text style={styles.descriptionText}>
                    {movie.description}
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Bottom Section: ADMIT ONE badge and Serial Number */}
            <View style={styles.bottomSection}>
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
  );
}

const styles = StyleSheet.create({
  card: {
    width: TICKET_MAX_WIDTH,
    alignSelf: 'center',
  },
  ticketContainer: {
    backgroundColor: '#FDF4E0', // Light parchment/beige
    borderRadius: 0, // Flat edges as per clip-path (no rounded corners)
    borderWidth: 1.5,
    borderColor: '#A0452E', // Dark brown/red border
    overflow: 'visible', // Visible for notches to show red background
    width: '100%',
    position: 'relative',
    // Subtle drop shadow for layered effect
    shadowColor: '#3a2b1a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  notchLeft: {
    position: 'absolute',
    left: -NOTCH_RADIUS, // Half outside to create semicircle cut-out
    top: '50%',
    width: NOTCH_RADIUS * 2,
    height: NOTCH_RADIUS * 2,
    borderRadius: NOTCH_RADIUS,
    backgroundColor: '#6B0000', // Red background showing through
    marginTop: -NOTCH_RADIUS, // Center vertically
    zIndex: 1,
  },
  notchRight: {
    position: 'absolute',
    right: -NOTCH_RADIUS, // Half outside to create semicircle cut-out
    top: '50%',
    width: NOTCH_RADIUS * 2,
    height: NOTCH_RADIUS * 2,
    borderRadius: NOTCH_RADIUS,
    backgroundColor: '#6B0000', // Red background showing through
    marginTop: -NOTCH_RADIUS, // Center vertically
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
  posterRatingsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  posterContainer: {
    flex: 1,
    aspectRatio: 2 / 3,
    maxHeight: 320,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0C296',
    overflow: 'hidden',
    backgroundColor: '#E8D5C4',
  },
  posterFullWidth: {
    flex: 0,
    width: '100%',
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
  ratingsColumn: {
    width: 90,
    gap: 8,
    justifyContent: 'flex-start',
  },
  ratingBubble: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20, // Oval/pill shape
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 55,
    width: '100%',
  },
  ratingBubbleLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    textAlign: 'center',
  },
  ratingBubbleValue: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  darkText: {
    color: '#2C150A', // Black text
  },
  lightText: {
    color: '#FFFFFF', // White text
  },
  imdbBubble: {
    backgroundColor: '#FCC252', // Yellow
  },
  rtBubble: {
    backgroundColor: '#DC2026', // Red
  },
  friendBubble: {
    backgroundColor: '#113CCF', // Blue
  },
  butterBubble: {
    backgroundColor: '#FFF0B3', // Light yellow/butter
  },
  movieTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3a2b1a', // Dark brown
    marginBottom: 6,
    // Serif font for title (will use system serif)
  },
  yearGenresText: {
    fontSize: 14,
    color: '#6B4330',
    marginBottom: 20,
    lineHeight: 20,
  },
  directorText: {
    fontSize: 13,
    color: '#7E1616',
    marginBottom: 8,
    fontWeight: '600',
  },
  castText: {
    fontSize: 13,
    color: '#6B4330',
    marginBottom: 16,
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
    backgroundColor: 'rgba(160, 69, 46, 0.7)', // Dark brown/red
  },
  descriptionSection: {
    gap: 8,
    marginBottom: 20,
  },
  descriptionLabel: {
    fontSize: 12,
    letterSpacing: 2,
    color: '#7E1616',
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: 14,
    color: '#3a2b1a',
    lineHeight: 20,
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(160, 69, 46, 0.2)',
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
  serialNumber: {
    // Serial number on the right
  },
  serialText: {
    fontSize: 10,
    letterSpacing: 1,
    color: '#8D6A3A',
    fontWeight: '500',
    fontFamily: 'monospace',
  },
});
