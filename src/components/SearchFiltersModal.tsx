import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import YearRangeSlider from './YearRangeSlider';
import type { SearchFilters } from '../lib/searchMovies';
import type { StreamingService } from '../types/feedPreferences';

interface SearchFiltersModalProps {
  visible: boolean;
  filters: SearchFilters;
  onApply: (filters: SearchFilters) => void;
  onClose: () => void;
}

// Common genres from the sample movies
const AVAILABLE_GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Sci-Fi',
  'Thriller',
  'Biography',
  'History',
  'Crime',
  'Fantasy',
] as const;

const STREAMING_SERVICES: StreamingService[] = [
  'Netflix',
  'Prime Video',
  'Disney+',
  'Max',
  'Hulu',
  'Apple TV+',
  'Peacock',
  'Paramount+',
];

export default function SearchFiltersModal({
  visible,
  filters,
  onApply,
  onClose,
}: SearchFiltersModalProps) {
  // Local state for editing (only save on Apply)
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);

  // Update local state when filters change or modal opens
  useEffect(() => {
    if (visible) {
      setLocalFilters(filters);
    }
  }, [visible, filters]);

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleCancel = () => {
    // Reset to saved filters
    setLocalFilters(filters);
    onClose();
  };

  const toggleGenre = (genre: string) => {
    const currentGenres = localFilters.genres || [];
    const newGenres = currentGenres.includes(genre)
      ? currentGenres.filter((g) => g !== genre)
      : [...currentGenres, genre];
    setLocalFilters({ ...localFilters, genres: newGenres });
  };

  const toggleStreamingService = (service: StreamingService) => {
    const currentServices = localFilters.streamingServices || [];
    const newServices = currentServices.includes(service)
      ? currentServices.filter((s) => s !== service)
      : [...currentServices, service];
    setLocalFilters({ ...localFilters, streamingServices: newServices });
  };

  const clearFilters = () => {
    setLocalFilters({
      // Don't touch query - it's managed separately in Search screen
      genres: undefined,
      minYear: undefined,
      maxYear: undefined,
      streamingServices: undefined,
    });
  };

  const hasActiveFilters =
    (localFilters.genres && localFilters.genres.length > 0) ||
    localFilters.minYear !== undefined ||
    localFilters.maxYear !== undefined ||
    (localFilters.streamingServices && localFilters.streamingServices.length > 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
              <Text style={styles.headerButtonText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Filters</Text>
            <TouchableOpacity onPress={handleApply} style={styles.headerButton}>
              <Text style={[styles.headerButtonText, styles.applyButton]}>Apply</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <TouchableOpacity onPress={clearFilters} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#DC2026" />
                <Text style={styles.clearButtonText}>Clear All Filters</Text>
              </TouchableOpacity>
            )}

            {/* Genres Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Genres</Text>
              <Text style={styles.sectionDescription}>
                Select one or more genres to filter by
              </Text>
              <View style={styles.chipContainer}>
                {AVAILABLE_GENRES.map((genre) => {
                  const isSelected = localFilters.genres?.includes(genre) || false;
                  return (
                    <TouchableOpacity
                      key={genre}
                      onPress={() => toggleGenre(genre)}
                      style={[
                        styles.chip,
                        isSelected && styles.chipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.chipTextSelected,
                        ]}
                      >
                        {genre}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Year Range Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Year Range</Text>
              <Text style={styles.sectionDescription}>
                Filter movies by release year
              </Text>
              <YearRangeSlider
                minYear={1900}
                maxYear={new Date().getFullYear()}
                valueMin={localFilters.minYear}
                valueMax={localFilters.maxYear}
                onValueChange={(min, max) => {
                  const currentYear = new Date().getFullYear();
                  // If range is full (1900 to current year), clear the filter
                  if (min === 1900 && max === currentYear) {
                    setLocalFilters({
                      ...localFilters,
                      minYear: undefined,
                      maxYear: undefined,
                    });
                  } else {
                    setLocalFilters({
                      ...localFilters,
                      minYear: min,
                      maxYear: max,
                    });
                  }
                }}
              />
            </View>

            {/* Streaming Services Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Streaming Services</Text>
              <Text style={styles.sectionDescription}>
                Show only movies available on selected services
              </Text>
              <View style={styles.servicesContainer}>
                {STREAMING_SERVICES.map((service) => {
                  const isSelected =
                    localFilters.streamingServices?.includes(service) || false;
                  return (
                    <TouchableOpacity
                      key={service}
                      onPress={() => toggleStreamingService(service)}
                      style={[
                        styles.serviceChip,
                        isSelected && styles.serviceChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.serviceChipText,
                          isSelected && styles.serviceChipTextSelected,
                        ]}
                      >
                        {service}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color="#FFFEAD" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#7E1616',
  },
  container: {
    flex: 1,
    backgroundColor: '#FDF4E0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#7E1616',
    borderBottomWidth: 1,
    borderBottomColor: '#DC2026',
  },
  headerButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 60,
  },
  headerButtonText: {
    fontSize: 16,
    color: '#FFFEAD',
    fontWeight: '500',
  },
  applyButton: {
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFEAD',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#DC2026',
    gap: 8,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2026',
  },
  section: {
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#3a2b1a',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B4330',
    marginBottom: 16,
    lineHeight: 20,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0C296',
  },
  chipSelected: {
    backgroundColor: '#7E1616',
    borderColor: '#7E1616',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3a2b1a',
  },
  chipTextSelected: {
    color: '#FFFEAD',
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0C296',
    gap: 8,
  },
  serviceChipSelected: {
    backgroundColor: '#7E1616',
    borderColor: '#7E1616',
  },
  serviceChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3a2b1a',
  },
  serviceChipTextSelected: {
    color: '#FFFEAD',
  },
});

