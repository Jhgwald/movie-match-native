import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { movies as sampleMovies } from '../../src/data/sample/movies';
import SearchResultRow from '../../src/components/SearchResultRow';
import DetailsModal from '../../src/components/DetailsModal';
import SearchFiltersModal from '../../src/components/SearchFiltersModal';
import { searchMovies, type SearchFilters } from '../../src/lib/searchMovies';
import type { Movie, MovieBase } from '../../src/types/movie';

export type SortOption =
  | 'relevance'
  | 'title-az'
  | 'year-newest'
  | 'imdb-highest'
  | 'rt-highest'
  | 'friend-highest';

function SearchContent() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<MovieBase | Movie | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('relevance');
  const [sortModalVisible, setSortModalVisible] = useState(false);

  const { minYearAvailable, maxYearAvailable } = useMemo(() => {
    if (sampleMovies.length === 0) {
      const currentYear = new Date().getFullYear();
      return { minYearAvailable: 1900, maxYearAvailable: currentYear };
    }

    const years = sampleMovies.map((movie) => movie.year);
    return {
      minYearAvailable: Math.min(...years),
      maxYearAvailable: Math.max(...years),
    };
  }, []);

  // Combine query with filters for search
  const searchFilters: SearchFilters = useMemo(
    () => ({
      ...filters,
      query: query.trim() || undefined,
    }),
    [query, filters]
  );

  // Perform search and sorting
  const filteredMovies = useMemo(() => {
    let results = searchMovies(sampleMovies, searchFilters);

    // Apply sorting
    if (sortOption === 'relevance') {
      // Keep original order (already filtered)
      return results;
    } else if (sortOption === 'title-az') {
      return [...results].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortOption === 'year-newest') {
      return [...results].sort((a, b) => b.year - a.year);
    } else if (sortOption === 'imdb-highest') {
      return [...results].sort((a, b) => {
        const aRating = 'ratings' in a && a.ratings?.imdb ? a.ratings.imdb * 10 : -1;
        const bRating = 'ratings' in b && b.ratings?.imdb ? b.ratings.imdb * 10 : -1;
        return bRating - aRating; // Higher first
      });
    } else if (sortOption === 'rt-highest') {
      return [...results].sort((a, b) => {
        const aRating = 'ratings' in a && a.ratings?.rtCritics ? a.ratings.rtCritics : -1;
        const bRating = 'ratings' in b && b.ratings?.rtCritics ? b.ratings.rtCritics : -1;
        return bRating - aRating; // Higher first
      });
    } else if (sortOption === 'friend-highest') {
      return [...results].sort((a, b) => {
        const aHasRatings = 'ratings' in a && a.ratings;
        const bHasRatings = 'ratings' in b && b.ratings;
        const aImdb = aHasRatings && a.ratings?.imdb ? a.ratings.imdb * 10 : null;
        const bImdb = bHasRatings && b.ratings?.imdb ? b.ratings.imdb * 10 : null;
        const aRt = aHasRatings && a.ratings?.rtCritics ? a.ratings.rtCritics : null;
        const bRt = bHasRatings && b.ratings?.rtCritics ? b.ratings.rtCritics : null;
        
        const aFriend = aImdb && aRt ? Math.round((aImdb + aRt) / 2) : Math.round(a.tmdbRating * 10);
        const bFriend = bImdb && bRt ? Math.round((bImdb + bRt) / 2) : Math.round(b.tmdbRating * 10);
        
        return bFriend - aFriend; // Higher first
      });
    }

    return results;
  }, [searchFilters, sortOption]);

  useEffect(() => {
    console.log(`[Search] ${filteredMovies.length} movies match current filters`);
  }, [filteredMovies.length]);

  const handleMoviePress = (movie: MovieBase | Movie) => {
    setSelectedMovie(movie);
    setDetailsVisible(true);
  };

  const handleApplyFilters = (newFilters: SearchFilters) => {
    setFilters(newFilters);
  };

  const hasActiveFilters =
    (filters.genres && filters.genres.length > 0) ||
    (filters.minYear !== undefined && filters.minYear > minYearAvailable) ||
    (filters.maxYear !== undefined && filters.maxYear < maxYearAvailable) ||
    filters.minLength !== undefined ||
    filters.maxLength !== undefined ||
    (filters.streamingServices && filters.streamingServices.length > 0) ||
    (filters.cast && filters.cast.length > 0);

  const removeGenreFilter = (genre: string) => {
    if (!filters.genres) return;
    const updatedGenres = filters.genres.filter((g) => g !== genre);
    setFilters((prev) => ({
      ...prev,
      genres: updatedGenres.length > 0 ? updatedGenres : undefined,
    }));
  };

  const removeServiceFilter = (service: string) => {
    if (!filters.streamingServices) return;
    const updatedServices = filters.streamingServices.filter((s) => s !== service);
    setFilters((prev) => ({
      ...prev,
      streamingServices: updatedServices.length > 0 ? updatedServices : undefined,
    }));
  };

  const removeYearFilter = () => {
    setFilters((prev) => ({
      ...prev,
      minYear: undefined,
      maxYear: undefined,
    }));
  };

  const removeLengthFilter = () => {
    setFilters((prev) => ({
      ...prev,
      minLength: undefined,
      maxLength: undefined,
    }));
  };

  const removeCastFilter = (actorId: number) => {
    if (!filters.cast) return;
    const matchMode = filters.castMatchMode || 'OR';
    
    if (matchMode === 'AND') {
      // In AND mode, removing one chip clears all cast filters
      setFilters((prev) => ({
        ...prev,
        cast: undefined,
        castMatchMode: undefined,
      }));
    } else {
      // In OR mode, remove just that one actor
      const updatedCast = filters.cast.filter((actor) => actor.id !== actorId);
      setFilters((prev) => ({
        ...prev,
        cast: updatedCast.length > 0 ? updatedCast : undefined,
      }));
    }
  };

  const clearAllFilters = () => {
    setFilters({});
  };

  const renderActiveFilterChips = () => {
    if (!hasActiveFilters) return null;

    const chips: { label: string; onRemove: () => void }[] = [];

    filters.genres?.forEach((genre) => {
      chips.push({ label: genre, onRemove: () => removeGenreFilter(genre) });
    });

    if (filters.minYear !== undefined || filters.maxYear !== undefined) {
      let label: string | null = null;
      if (filters.minYear !== undefined && filters.maxYear !== undefined) {
        label = `Year: ${filters.minYear}–${filters.maxYear}`;
      } else if (filters.minYear !== undefined) {
        label = `after ${filters.minYear}`;
      } else if (filters.maxYear !== undefined) {
        label = `before ${filters.maxYear}`;
      }
      if (label) {
        chips.push({ label, onRemove: removeYearFilter });
      }
    }

    if (filters.minLength !== undefined || filters.maxLength !== undefined) {
      let label: string | null = null;
      if (filters.minLength !== undefined && filters.maxLength !== undefined) {
        label = `Length: ${filters.minLength}–${filters.maxLength} min`;
      } else if (filters.minLength !== undefined) {
        label = `Length: after ${filters.minLength} min`;
      } else if (filters.maxLength !== undefined) {
        label = `Length: before ${filters.maxLength} min`;
      }
      if (label) {
        chips.push({ label, onRemove: removeLengthFilter });
      }
    }

    filters.streamingServices?.forEach((service) => {
      chips.push({ label: service, onRemove: () => removeServiceFilter(service) });
    });

    // Cast chips - different rendering based on match mode
    if (filters.cast && filters.cast.length > 0) {
      const matchMode = filters.castMatchMode || 'OR';
      
      if (matchMode === 'AND') {
        // AND mode: Show all actors in one combined chip
        const castNames = filters.cast.map((actor) => actor.name).join(', ');
        chips.push({
          label: `Cast: ${castNames}`,
          onRemove: () => {
            setFilters((prev) => ({
              ...prev,
              cast: undefined,
              castMatchMode: undefined,
            }));
          },
        });
      } else {
        // OR mode: Show each actor as a separate chip
        filters.cast.forEach((actor) => {
          chips.push({
            label: actor.name,
            onRemove: () => removeCastFilter(actor.id),
          });
        });
      }
    }

    return (
      <View style={styles.activeFiltersContainer}>
        <View style={styles.activeFiltersChips}>
          {chips.map((chip, index) => (
            <TouchableOpacity
              key={`${chip.label}-${index}`}
              style={styles.filterChip}
              onPress={chip.onRemove}
            >
              <Text style={styles.filterChipText}>{chip.label}</Text>
              <Ionicons name="close" size={14} color="#3a2b1a" />
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={clearAllFilters} style={styles.clearAllChipsButton}>
          <Text style={styles.clearAllChipsText}>Clear all</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const listContentStyle = useMemo(
    () => [styles.listContent, { paddingBottom: 16 + insets.bottom }],
    [insets.bottom]
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header + Search Bar */}
      <View style={[styles.headerSection, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Search</Text>
          <TouchableOpacity
            onPress={() => setFiltersVisible(true)}
            style={styles.filtersButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="options"
              size={24}
              color={hasActiveFilters ? '#DC2026' : '#FFFEAD'}
            />
            {hasActiveFilters && <View style={styles.filterBadge} />}
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#8e8e93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a movie…"
            placeholderTextColor="#8e8e93"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery('')}
              style={styles.clearButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={20} color="#8e8e93" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Active Filters Chips */}
      {renderActiveFilterChips()}

      {/* Results */}
      {filteredMovies.length > 0 ? (
        <FlatList
          style={styles.resultsList}
          data={filteredMovies}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SearchResultRow
              movie={item}
              onPress={() => handleMoviePress(item)}
            />
          )}
          contentContainerStyle={listContentStyle}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsCount}>
                {filteredMovies.length} {filteredMovies.length === 1 ? 'movie' : 'movies'} found
              </Text>
              <TouchableOpacity
                onPress={() => setSortModalVisible(true)}
                style={styles.sortButton}
              >
                <Ionicons name="swap-vertical" size={16} color="#FFFEAD" />
                <Text style={styles.sortButtonText}>Sort by</Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color="#8e8e93" />
          <Text style={styles.emptyText}>No movies found</Text>
          <Text style={styles.emptySubtext}>
            Try adjusting your search or filters
          </Text>
        </View>
      )}

      {/* Sort Modal */}
      <Modal
        visible={sortModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSortModalVisible(false)}
        >
          <View style={styles.sortModalContent} pointerEvents="box-none">
            <View pointerEvents="auto">
            <Text style={styles.sortModalTitle}>Sort by</Text>
            {[
              { value: 'relevance', label: 'Relevance' },
              { value: 'title-az', label: 'Title A–Z' },
              { value: 'year-newest', label: 'Newest year first' },
              { value: 'imdb-highest', label: 'Highest IMDb score first' },
              { value: 'rt-highest', label: 'Highest Rotten Tomatoes score first' },
              { value: 'friend-highest', label: 'Highest Friend score first' },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.sortOption}
                onPress={() => {
                  setSortOption(option.value as SortOption);
                  setSortModalVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sortOption === option.value && styles.sortOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
                {sortOption === option.value && (
                  <Ionicons name="checkmark" size={20} color="#DC2026" />
                )}
              </TouchableOpacity>
            ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Details Modal */}
      {selectedMovie && (
        <DetailsModal
          key={selectedMovie.id}
          visible={detailsVisible}
          movie={selectedMovie}
          onClose={() => {
            setDetailsVisible(false);
            setSelectedMovie(null);
          }}
        />
      )}

      {/* Filters Modal */}
      <SearchFiltersModal
        visible={filtersVisible}
        filters={filters}
        onApply={handleApplyFilters}
        onClose={() => setFiltersVisible(false)}
        minAvailableYear={minYearAvailable}
        maxAvailableYear={maxYearAvailable}
      />
    </View>
  );
}

export default function SearchScreen() {
  return <SearchContent />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6B0000',
  },
  headerSection: {
    backgroundColor: '#7E1616',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#DC2026',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFEAD',
    letterSpacing: 0.5,
  },
  filtersButton: {
    padding: 8,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2026',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 0,
    width: '100%',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  resultsList: {
    flex: 1,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 0,
  },
  resultsCount: {
    fontSize: 14,
    color: '#FFFEAD',
    fontWeight: '500',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sortButtonText: {
    fontSize: 14,
    color: '#FFFEAD',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortModalContent: {
    backgroundColor: '#FDF4E0',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: '#E0C296',
  },
  sortModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3a2b1a',
    marginBottom: 16,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0C296',
  },
  sortOptionText: {
    fontSize: 16,
    color: '#3a2b1a',
    fontWeight: '500',
  },
  sortOptionTextSelected: {
    color: '#7E1616',
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFEAD',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8e8e93',
    textAlign: 'center',
  },
  activeFiltersContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: '#6B0000',
  },
  activeFiltersChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFEAD',
    gap: 6,
  },
  filterChipText: {
    color: '#3a2b1a',
    fontSize: 14,
    fontWeight: '600',
  },
  clearAllChipsButton: {
    marginTop: 4,
    alignSelf: 'flex-end',
    padding: 4,
  },
  clearAllChipsText: {
    color: '#FFFEAD',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
