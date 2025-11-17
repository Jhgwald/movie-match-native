import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import type { Movie, MovieBase, MovieRatings } from '../types/movie';
import { getDetailsWithCredits, toMovie } from '../services/tmdb';
import { getOmdbRatingsByImdbId } from '../services/omdb';
import { HAS_TMDB, HAS_OMDB } from '../config/env';

interface DetailsModalProps {
  visible: boolean;
  movie: MovieBase | Movie;
  onClose: () => void;
}

export default function DetailsModal({ visible, movie, onClose }: DetailsModalProps) {
  // Only store enriched data (director, cast, ratings) in state
  // Always use the movie prop directly for basic fields (title, year, poster, description, etc.)
  const [loading, setLoading] = useState(false);
  const [director, setDirector] = useState<string | null>(null);
  const [cast, setCast] = useState<string[]>([]);
  const [ratings, setRatings] = useState<MovieRatings>({});

  // Reset enriched data whenever movie.id changes
  useEffect(() => {
    if (!movie) return;
    
    console.log('[DetailsModal] movie prop changed to:', movie.id, movie.title);
    
    // Reset all enriched data immediately when movie changes
    setRatings('ratings' in movie ? movie.ratings || {} : {});
    setDirector(null);
    setCast([]);
    setLoading(false);
  }, [movie.id]); // Reset whenever the movie ID changes
  
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
      const canOpen = await Linking.canOpenURL(movie.trailer);
      if (canOpen) {
        await Linking.openURL(movie.trailer);
      }
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
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
            <Text style={styles.title}>
              {movie.title} ({movie.year})
            </Text>
            
            <View style={styles.genreContainer}>
              {movie.genres.map((genre, index) => (
                <View key={index} style={styles.genreTag}>
                  <Text style={styles.genreText}>{genre}</Text>
                </View>
              ))}
            </View>
            
            {(director || cast.length > 0) && (
              <View style={styles.section}>
                {director && (
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Director:</Text>
                    <Text style={styles.value}>{director}</Text>
                  </View>
                )}
                {cast.length > 0 && (
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Cast:</Text>
                    <Text style={styles.value}>{cast.join(', ')}</Text>
                  </View>
                )}
              </View>
            )}
            
            <View style={styles.ratingsSection}>
              <Text style={styles.sectionTitle}>Ratings</Text>
              <View style={styles.ratingsRow}>
                {ratings.imdb !== undefined && (
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingLabel}>IMDb</Text>
                    <Text style={styles.ratingValue}>{ratings.imdb.toFixed(1)}</Text>
                  </View>
                )}
                {ratings.rtCritics !== undefined && (
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingLabel}>RT Critics</Text>
                    <Text style={styles.ratingValue}>{Math.round(ratings.rtCritics)}%</Text>
                  </View>
                )}
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingLabel}>TMDb</Text>
                  <Text style={styles.ratingValue}>{movie.tmdbRating.toFixed(1)}</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{movie.description}</Text>
            </View>
            
            {movie.trailer && (
              <TouchableOpacity style={styles.trailerButton} onPress={handleTrailer}>
                <Ionicons name="play-circle" size={24} color="#fff" />
                <Text style={styles.trailerButtonText}>Watch Trailer</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    paddingTop: 50,
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
});

