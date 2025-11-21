import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Button,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import type { SearchFilters, CastFilter, PeopleMatchMode } from '../lib/searchMovies';
import type { StreamingService } from '../types/feedPreferences';
import { searchPeople, type Person } from '../services/tmdb';

interface SearchFiltersModalProps {
  visible: boolean;
  filters: SearchFilters;
  onApply: (filters: SearchFilters) => void;
  onClose: () => void;
  minAvailableYear: number;
  maxAvailableYear: number;
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

// Movie length constants (in minutes)
const MIN_MOVIE_LENGTH = 60; // 1 hour
const MAX_MOVIE_LENGTH = 240; // 4 hours

// Year Picker Modal Component - Native Picker
interface YearPickerModalProps {
  visible: boolean;
  value: number;
  rangeMinYear: number;
  rangeMaxYear: number;
  minAllowedYear: number;
  maxAllowedYear: number;
  invalidFallbackYear: number;
  onConfirm: (year: number) => void;
  onCancel: () => void;
  title: string;
}

// Length Picker Modal Component - Native Picker
interface LengthPickerModalProps {
  visible: boolean;
  value: number;
  rangeMinLength: number;
  rangeMaxLength: number;
  minAllowedLength: number;
  maxAllowedLength: number;
  invalidFallbackLength: number;
  onConfirm: (length: number) => void;
  onCancel: () => void;
  title: string;
}

function YearPickerModal({
  visible,
  value,
  rangeMinYear,
  rangeMaxYear,
  minAllowedYear,
  maxAllowedYear,
  invalidFallbackYear,
  onConfirm,
  onCancel,
  title,
}: YearPickerModalProps) {
  const [tempValue, setTempValue] = useState<string>(value.toString());

  const years = Array.from({ length: rangeMaxYear - rangeMinYear + 1 }, (_, i) => rangeMaxYear - i);

  useEffect(() => {
    if (visible) {
      setTempValue(value.toString());
    }
  }, [visible, value, invalidFallbackYear]);

  const handleValueChange = (itemValue: string | number) => {
    const stringValue = String(itemValue);
    const numericValue = parseInt(stringValue, 10);

    if (Number.isNaN(numericValue)) {
      return;
    }

    if (numericValue < minAllowedYear || numericValue > maxAllowedYear) {
      setTempValue(invalidFallbackYear.toString());
      return;
    }

    setTempValue(stringValue);
  };

  const handleConfirm = () => {
    const year = parseInt(tempValue, 10);
    onConfirm(year);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <SafeAreaView style={styles.nativePickerModal}>
        <Text style={styles.nativePickerTitle}>{title}</Text>
        <Picker
          selectedValue={tempValue}
          style={styles.nativePicker}
          itemStyle={styles.nativePickerItem}
          onValueChange={handleValueChange}
        >
          {years.map((year) => (
            <Picker.Item key={year} label={year.toString()} value={year.toString()} />
          ))}
        </Picker>
        <View style={styles.nativePickerButtons}>
          <Button title="Cancel" onPress={onCancel} />
          <Button title="Done" onPress={handleConfirm} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function LengthPickerModal({
  visible,
  value,
  rangeMinLength,
  rangeMaxLength,
  minAllowedLength,
  maxAllowedLength,
  invalidFallbackLength,
  onConfirm,
  onCancel,
  title,
}: LengthPickerModalProps) {
  const [tempValue, setTempValue] = useState<string>(value.toString());

  // Generate length options in 5-minute increments
  const lengths = Array.from(
    { length: Math.floor((rangeMaxLength - rangeMinLength) / 5) + 1 },
    (_, i) => rangeMinLength + i * 5
  );

  useEffect(() => {
    if (visible) {
      setTempValue(value.toString());
    }
  }, [visible, value, invalidFallbackLength]);

  const handleValueChange = (itemValue: string | number) => {
    const stringValue = String(itemValue);
    const numericValue = parseInt(stringValue, 10);

    if (Number.isNaN(numericValue)) {
      return;
    }

    if (numericValue < minAllowedLength || numericValue > maxAllowedLength) {
      setTempValue(invalidFallbackLength.toString());
      return;
    }

    setTempValue(stringValue);
  };

  const handleConfirm = () => {
    const length = parseInt(tempValue, 10);
    onConfirm(length);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <SafeAreaView style={styles.nativePickerModal}>
        <Text style={styles.nativePickerTitle}>{title}</Text>
        <Picker
          selectedValue={tempValue}
          style={styles.nativePicker}
          itemStyle={styles.nativePickerItem}
          onValueChange={handleValueChange}
        >
          {lengths.map((length) => (
            <Picker.Item key={length} label={`${length} min`} value={length.toString()} />
          ))}
        </Picker>
        <View style={styles.nativePickerButtons}>
          <Button title="Cancel" onPress={onCancel} />
          <Button title="Done" onPress={handleConfirm} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export default function SearchFiltersModal({
  visible,
  filters,
  onApply,
  onClose,
  minAvailableYear,
  maxAvailableYear,
}: SearchFiltersModalProps) {
  const initialFilters: SearchFilters = {
    ...filters,
    minYear: filters.minYear ?? minAvailableYear,
    maxYear: filters.maxYear ?? maxAvailableYear,
    minLength: filters.minLength ?? MIN_MOVIE_LENGTH,
    maxLength: filters.maxLength ?? MAX_MOVIE_LENGTH,
    castMatchMode: filters.castMatchMode || 'OR', // Default to OR
  };

  // Local state for editing (only save on Apply)
  const [localFilters, setLocalFilters] = useState<SearchFilters>(initialFilters);
  const [yearError, setYearError] = useState<string | null>(null);
  const [lengthError, setLengthError] = useState<string | null>(null);
  const [yearPickerVisible, setYearPickerVisible] = useState(false);
  const [yearPickerType, setYearPickerType] = useState<'start' | 'end'>('start');
  const [yearPickerValue, setYearPickerValue] = useState<number>(minAvailableYear);
  const [yearPickerLimits, setYearPickerLimits] = useState({
    minAllowed: minAvailableYear,
    maxAllowed: maxAvailableYear,
    fallback: maxAvailableYear,
  });
  const [lengthPickerVisible, setLengthPickerVisible] = useState(false);
  const [lengthPickerType, setLengthPickerType] = useState<'start' | 'end'>('start');
  const [lengthPickerValue, setLengthPickerValue] = useState<number>(MIN_MOVIE_LENGTH);
  const [lengthPickerLimits, setLengthPickerLimits] = useState({
    minAllowed: MIN_MOVIE_LENGTH,
    maxAllowed: MAX_MOVIE_LENGTH,
    fallback: MAX_MOVIE_LENGTH,
  });
  const [castSearchQuery, setCastSearchQuery] = useState('');
  const [castSearchResults, setCastSearchResults] = useState<Person[]>([]);
  const [castSearchLoading, setCastSearchLoading] = useState(false);
  const [castDropdownVisible, setCastDropdownVisible] = useState(false);
  const castSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update local state when filters change or modal opens
  useEffect(() => {
    if (visible) {
      setLocalFilters({
        ...filters,
        minYear: filters.minYear ?? minAvailableYear,
        maxYear: filters.maxYear ?? maxAvailableYear,
        minLength: filters.minLength ?? MIN_MOVIE_LENGTH,
        maxLength: filters.maxLength ?? MAX_MOVIE_LENGTH,
        castMatchMode: filters.castMatchMode || 'OR',
      });
      setYearError(null);
      setLengthError(null);
    } else {
      // Clear cast search when modal closes
      setCastSearchQuery('');
      setCastDropdownVisible(false);
      setCastSearchResults([]);
    }
  }, [visible, filters, minAvailableYear, maxAvailableYear]);

  // Validate year range
  const validateYearRange = (start: number | undefined, end: number | undefined) => {
    if (start !== undefined && end !== undefined && start > end) {
      setYearError('Start year must be before or equal to end year');
      return false;
    }
    setYearError(null);
    return true;
  };

  // Validate length range
  const validateLengthRange = (start: number | undefined, end: number | undefined) => {
    if (start !== undefined && end !== undefined && start > end) {
      setLengthError('Start length must be less than or equal to end length');
      return false;
    }
    setLengthError(null);
    return true;
  };

  const openYearPicker = (type: 'start' | 'end') => {
    setYearPickerType(type);
    const fallback = type === 'start' ? minAvailableYear : maxAvailableYear;
    const currentValue = type === 'start' ? localFilters.minYear : localFilters.maxYear;
    const minAllowed =
      type === 'start' ? minAvailableYear : (localFilters.minYear ?? minAvailableYear);
    const maxAllowed =
      type === 'start' ? (localFilters.maxYear ?? maxAvailableYear) : maxAvailableYear;
    const fallbackBoundary =
      type === 'start'
        ? (localFilters.maxYear ?? maxAvailableYear)
        : (localFilters.minYear ?? minAvailableYear);

    setYearPickerValue(currentValue ?? fallback);
    setYearPickerLimits({ minAllowed, maxAllowed, fallback: fallbackBoundary });
    setYearPickerVisible(true);
  };

  const handleYearPickerConfirm = (year: number) => {
    if (yearPickerType === 'start') {
      const newFilters = { ...localFilters, minYear: year };
      setLocalFilters(newFilters);
      validateYearRange(year, localFilters.maxYear);
    } else {
      const newFilters = { ...localFilters, maxYear: year };
      setLocalFilters(newFilters);
      validateYearRange(localFilters.minYear, year);
    }

    setYearPickerVisible(false);
  };

  const handleYearPickerCancel = () => {
    setYearPickerVisible(false);
  };

  const openLengthPicker = (type: 'start' | 'end') => {
    setLengthPickerType(type);
    const fallback = type === 'start' ? MIN_MOVIE_LENGTH : MAX_MOVIE_LENGTH;
    const currentValue = type === 'start' ? localFilters.minLength : localFilters.maxLength;
    const minAllowed =
      type === 'start' ? MIN_MOVIE_LENGTH : (localFilters.minLength ?? MIN_MOVIE_LENGTH);
    const maxAllowed =
      type === 'start' ? (localFilters.maxLength ?? MAX_MOVIE_LENGTH) : MAX_MOVIE_LENGTH;
    const fallbackBoundary =
      type === 'start'
        ? (localFilters.maxLength ?? MAX_MOVIE_LENGTH)
        : (localFilters.minLength ?? MIN_MOVIE_LENGTH);

    setLengthPickerValue(currentValue ?? fallback);
    setLengthPickerLimits({ minAllowed, maxAllowed, fallback: fallbackBoundary });
    setLengthPickerVisible(true);
  };

  const handleLengthPickerConfirm = (length: number) => {
    if (lengthPickerType === 'start') {
      const newFilters = { ...localFilters, minLength: length };
      setLocalFilters(newFilters);
      validateLengthRange(length, localFilters.maxLength);
    } else {
      const newFilters = { ...localFilters, maxLength: length };
      setLocalFilters(newFilters);
      validateLengthRange(localFilters.minLength, length);
    }

    setLengthPickerVisible(false);
  };

  const handleLengthPickerCancel = () => {
    setLengthPickerVisible(false);
  };

  const handleApply = () => {
    // Validate before applying
    if (!validateYearRange(localFilters.minYear, localFilters.maxYear)) {
      return; // Don't apply if validation fails
    }
    if (!validateLengthRange(localFilters.minLength, localFilters.maxLength)) {
      return; // Don't apply if validation fails
    }
    const normalizedFilters: SearchFilters = {
      ...localFilters,
      minYear: localFilters.minYear === minAvailableYear ? undefined : localFilters.minYear,
      maxYear: localFilters.maxYear === maxAvailableYear ? undefined : localFilters.maxYear,
      minLength: localFilters.minLength === MIN_MOVIE_LENGTH ? undefined : localFilters.minLength,
      maxLength: localFilters.maxLength === MAX_MOVIE_LENGTH ? undefined : localFilters.maxLength,
    };

    onApply(normalizedFilters);
    onClose();
  };

  const handleCancel = () => {
    // Reset to saved filters
    setLocalFilters({
      ...filters,
      minYear: filters.minYear ?? minAvailableYear,
      maxYear: filters.maxYear ?? maxAvailableYear,
      minLength: filters.minLength ?? MIN_MOVIE_LENGTH,
      maxLength: filters.maxLength ?? MAX_MOVIE_LENGTH,
    });
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

  // Cast search handler with debounce
  useEffect(() => {
    if (castSearchTimeoutRef.current) {
      clearTimeout(castSearchTimeoutRef.current);
    }

    if (castSearchQuery.trim().length < 2) {
      setCastSearchResults([]);
      setCastDropdownVisible(false);
      setCastSearchLoading(false);
      return;
    }

    setCastSearchLoading(true);
    setCastDropdownVisible(false); // Hide while loading
    
    castSearchTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('[CastFilter] Searching for:', castSearchQuery);
        const results = await searchPeople(castSearchQuery);
        console.log('[CastFilter] Found', results.length, 'results:', results.map(r => r.name));
        
        // Always update results, even if empty
        setCastSearchResults(results);
        
        // Always show dropdown if we have results
        if (results.length > 0) {
          console.log('[CastFilter] Showing dropdown with', results.length, 'results');
          setCastDropdownVisible(true);
        } else {
          console.log('[CastFilter] No results, hiding dropdown');
          setCastDropdownVisible(false);
        }
      } catch (error) {
        console.error('[CastFilter] Failed to search cast:', error);
        setCastSearchResults([]);
        setCastDropdownVisible(false);
      } finally {
        setCastSearchLoading(false);
      }
    }, 300); // Reduced debounce to 300ms for faster response

    return () => {
      if (castSearchTimeoutRef.current) {
        clearTimeout(castSearchTimeoutRef.current);
      }
    };
  }, [castSearchQuery]);

  const handleSelectActor = (person: Person) => {
    const currentCast = localFilters.cast || [];
    // Check if actor is already selected
    if (currentCast.some((actor) => actor.id === person.id)) {
      return;
    }
    const newCast: CastFilter[] = [...currentCast, { id: person.id, name: person.name }];
    setLocalFilters({ ...localFilters, cast: newCast });
    setCastSearchQuery('');
    setCastDropdownVisible(false);
  };

  const handleRemoveActor = (actorId: number) => {
    const currentCast = localFilters.cast || [];
    const newCast = currentCast.filter((actor) => actor.id !== actorId);
    setLocalFilters({
      ...localFilters,
      cast: newCast.length > 0 ? newCast : undefined,
    });
  };

  const clearFilters = () => {
    setLocalFilters({
      // Don't touch query - it's managed separately in Search screen
      genres: undefined,
      minYear: minAvailableYear,
      maxYear: maxAvailableYear,
      minLength: MIN_MOVIE_LENGTH,
      maxLength: MAX_MOVIE_LENGTH,
      streamingServices: undefined,
      cast: undefined,
      castMatchMode: 'OR', // Reset to default
    });
    setCastSearchQuery('');
    setCastDropdownVisible(false);
  };

  const toggleCastMatchMode = () => {
    const newMode: PeopleMatchMode = localFilters.castMatchMode === 'AND' ? 'OR' : 'AND';
    setLocalFilters({ ...localFilters, castMatchMode: newMode });
  };

  const hasActiveFilters =
    (localFilters.genres && localFilters.genres.length > 0) ||
    localFilters.minYear !== minAvailableYear ||
    localFilters.maxYear !== maxAvailableYear ||
    localFilters.minLength !== MIN_MOVIE_LENGTH ||
    localFilters.maxLength !== MAX_MOVIE_LENGTH ||
    (localFilters.streamingServices && localFilters.streamingServices.length > 0) ||
    (localFilters.cast && localFilters.cast.length > 0);

  const scrollViewRef = useRef<ScrollView>(null);
  const castSectionRef = useRef<View>(null);
  const [castSectionY, setCastSectionY] = useState(0);

  const scrollToCastSection = () => {
    if (castSectionY > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: castSectionY - 100, animated: true });
      }, 300);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
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

            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
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
              <View style={styles.yearFieldsRow}>
                <TouchableOpacity
                  style={styles.yearField}
                  onPress={() => openYearPicker('start')}
                >
                  <View style={styles.yearFieldContent}>
                    <Text style={styles.yearFieldLabel}>Start Year</Text>
                    <Text style={styles.yearFieldValue}>
                      {localFilters.minYear !== undefined ? localFilters.minYear : 'Any'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={20} color="#6B4330" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.yearField}
                  onPress={() => openYearPicker('end')}
                >
                  <View style={styles.yearFieldContent}>
                    <Text style={styles.yearFieldLabel}>End Year</Text>
                    <Text style={styles.yearFieldValue}>
                      {localFilters.maxYear !== undefined ? localFilters.maxYear : 'Any'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={20} color="#6B4330" />
                </TouchableOpacity>
              </View>
              {yearError && (
                <Text style={styles.errorText}>{yearError}</Text>
              )}
            </View>

            {/* Movie Length Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Movie Length</Text>
              <Text style={styles.sectionDescription}>
                Filter movies by runtime (minutes)
              </Text>
              <View style={styles.yearFieldsRow}>
                <TouchableOpacity
                  style={styles.yearField}
                  onPress={() => openLengthPicker('start')}
                >
                  <View style={styles.yearFieldContent}>
                    <Text style={styles.yearFieldLabel}>Min Length</Text>
                    <Text style={styles.yearFieldValue}>
                      {localFilters.minLength !== MIN_MOVIE_LENGTH ? `${localFilters.minLength} min` : 'Any'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={20} color="#6B4330" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.yearField}
                  onPress={() => openLengthPicker('end')}
                >
                  <View style={styles.yearFieldContent}>
                    <Text style={styles.yearFieldLabel}>Max Length</Text>
                    <Text style={styles.yearFieldValue}>
                      {localFilters.maxLength !== MAX_MOVIE_LENGTH ? `${localFilters.maxLength} min` : 'Any'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={20} color="#6B4330" />
                </TouchableOpacity>
              </View>
              {lengthError && (
                <Text style={styles.errorText}>{lengthError}</Text>
              )}
            </View>

            {/* Cast Section */}
            <View
              ref={castSectionRef}
              style={styles.section}
              onLayout={(event) => {
                const { y } = event.nativeEvent.layout;
                setCastSectionY(y);
              }}
            >
              <View style={styles.castSectionHeader}>
                <View style={styles.castSectionTitleRow}>
                  <Text style={styles.sectionTitle}>Cast</Text>
                  {localFilters.cast && localFilters.cast.length > 1 && (
                    <View style={styles.castMatchModeToggle}>
                      <Text style={styles.castMatchModeLabel}>Match:</Text>
                      <TouchableOpacity
                        style={styles.castMatchModeButtons}
                        onPress={toggleCastMatchMode}
                      >
                        <View
                          style={[
                            styles.castMatchModeButton,
                            localFilters.castMatchMode === 'OR' && styles.castMatchModeButtonActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.castMatchModeButtonText,
                              localFilters.castMatchMode === 'OR' && styles.castMatchModeButtonTextActive,
                            ]}
                          >
                            ANY
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.castMatchModeButton,
                            localFilters.castMatchMode === 'AND' && styles.castMatchModeButtonActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.castMatchModeButtonText,
                              localFilters.castMatchMode === 'AND' && styles.castMatchModeButtonTextActive,
                            ]}
                          >
                            ALL
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
              <Text style={styles.sectionDescription}>
                Search and filter by actors
              </Text>
              
              {/* Cast Search Input */}
              <View style={styles.castSearchContainer}>
                <Ionicons name="search" size={20} color="#6B4330" style={styles.castSearchIcon} />
                <TextInput
                  style={styles.castSearchInput}
                  placeholder="Search for an actor..."
                  placeholderTextColor="#9CA3AF"
                  value={castSearchQuery}
                  onChangeText={setCastSearchQuery}
                  onFocus={() => {
                    scrollToCastSection();
                    // Show dropdown if we already have results
                    if (castSearchResults.length > 0) {
                      setCastDropdownVisible(true);
                    }
                  }}
                />
                {castSearchLoading && (
                  <Ionicons name="hourglass" size={20} color="#6B4330" style={styles.castSearchLoading} />
                )}
              </View>

              {/* Cast Autocomplete Dropdown */}
              {(castDropdownVisible || castSearchLoading) && (
                <View style={styles.castDropdown}>
                  {castSearchLoading ? (
                    <View style={styles.castDropdownLoading}>
                      <Text style={styles.castDropdownLoadingText}>Searching...</Text>
                    </View>
                  ) : castSearchResults.length > 0 ? (
                    <ScrollView 
                      style={styles.castDropdownScroll} 
                      nestedScrollEnabled
                      keyboardShouldPersistTaps="handled"
                    >
                      {castSearchResults.map((person) => {
                        const isSelected = localFilters.cast?.some((actor) => actor.id === person.id);
                        return (
                          <TouchableOpacity
                            key={person.id}
                            style={[
                              styles.castDropdownItem,
                              isSelected && styles.castDropdownItemSelected,
                            ]}
                            onPress={() => {
                              handleSelectActor(person);
                            }}
                            disabled={isSelected}
                          >
                          <View style={styles.castDropdownItemContent}>
                            <Text style={styles.castDropdownItemName}>{person.name}</Text>
                          </View>
                            {isSelected && (
                              <Ionicons name="checkmark-circle" size={20} color="#7E1616" />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  ) : castSearchQuery.trim().length >= 2 ? (
                    <View style={styles.castDropdownLoading}>
                      <Text style={styles.castDropdownLoadingText}>No results found</Text>
                    </View>
                  ) : null}
                </View>
              )}

              {/* Selected Cast Chips */}
              {localFilters.cast && localFilters.cast.length > 0 && (
                <View style={styles.castChipsContainer}>
                  {localFilters.cast.map((actor) => (
                    <TouchableOpacity
                      key={actor.id}
                      style={styles.castChip}
                      onPress={() => handleRemoveActor(actor.id)}
                    >
                      <Text style={styles.castChipText}>{actor.name}</Text>
                      <Ionicons name="close" size={16} color="#3a2b1a" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
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
      </KeyboardAvoidingView>

      {/* Year Picker Modal */}
      <YearPickerModal
        visible={yearPickerVisible}
        value={yearPickerValue}
        rangeMinYear={minAvailableYear}
        rangeMaxYear={maxAvailableYear}
        minAllowedYear={yearPickerLimits.minAllowed}
        maxAllowedYear={yearPickerLimits.maxAllowed}
        invalidFallbackYear={yearPickerLimits.fallback}
        onConfirm={handleYearPickerConfirm}
        onCancel={handleYearPickerCancel}
        title={yearPickerType === 'start' ? 'Start Year' : 'End Year'}
      />

      {/* Length Picker Modal */}
      <LengthPickerModal
        visible={lengthPickerVisible}
        value={lengthPickerValue}
        rangeMinLength={MIN_MOVIE_LENGTH}
        rangeMaxLength={MAX_MOVIE_LENGTH}
        minAllowedLength={lengthPickerLimits.minAllowed}
        maxAllowedLength={lengthPickerLimits.maxAllowed}
        invalidFallbackLength={lengthPickerLimits.fallback}
        onConfirm={handleLengthPickerConfirm}
        onCancel={handleLengthPickerCancel}
        title={lengthPickerType === 'start' ? 'Min Length' : 'Max Length'}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
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
  yearFieldsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  yearField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0C296',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  yearFieldContent: {
    flex: 1,
  },
  yearFieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B4330',
    marginBottom: 4,
  },
  yearFieldValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3a2b1a',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2026',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  nativePickerModal: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#FDF4E0',
    paddingHorizontal: 16,
  },
  nativePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#3a2b1a',
    marginBottom: 12,
  },
  nativePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginTop: 12,
  },
  nativePicker: {
    color: '#000',
  },
  nativePickerItem: {
    color: '#000',
  },
  // Cast Section Styles
  castSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0C296',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 8,
  },
  castSearchIcon: {
    marginRight: 8,
  },
  castSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#3a2b1a',
    padding: 0,
  },
  castSearchLoading: {
    marginLeft: 8,
  },
  castDropdown: {
    maxHeight: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0C296',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
    position: 'relative',
  },
  castDropdownScroll: {
    maxHeight: 200,
  },
  castDropdownLoading: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  castDropdownLoadingText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  castDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  castDropdownItemSelected: {
    backgroundColor: '#FEF3C7',
  },
  castDropdownItemContent: {
    flex: 1,
  },
  castDropdownItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3a2b1a',
    marginBottom: 2,
  },
  castDropdownItemSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  castChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  castChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0C296',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  castChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3a2b1a',
  },
  castSectionHeader: {
    marginBottom: 4,
  },
  castSectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  castMatchModeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  castMatchModeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B4330',
  },
  castMatchModeButtons: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0C296',
    overflow: 'hidden',
  },
  castMatchModeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'transparent',
  },
  castMatchModeButtonActive: {
    backgroundColor: '#7E1616',
  },
  castMatchModeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B4330',
  },
  castMatchModeButtonTextActive: {
    color: '#FFFEAD',
  },
});
