import type { MovieBase } from '../types/movie';

export type SearchFilters = {
  query?: string;
  genres?: string[];
  minYear?: number;
  maxYear?: number;
  streamingServices?: string[];
};

/**
 * Searches and filters movies based on the provided filters.
 * 
 * This is a pure in-memory implementation that can later be swapped
 * for an API-backed search without changing the UI.
 * 
 * @param allMovies - Array of all movies to search through
 * @param filters - Search filters to apply
 * @returns Filtered array of movies matching the criteria
 */
export function searchMovies(
  allMovies: readonly MovieBase[],
  filters: SearchFilters
): MovieBase[] {
  let results = [...allMovies];

  // Filter by query (case-insensitive title match)
  if (filters.query && filters.query.trim().length > 0) {
    const queryLower = filters.query.trim().toLowerCase();
    results = results.filter((movie) =>
      movie.title.toLowerCase().includes(queryLower)
    );
  }

  // Filter by genres (movie must match at least one selected genre)
  if (filters.genres && filters.genres.length > 0) {
    results = results.filter((movie) => {
      if (!movie.genres || movie.genres.length === 0) {
        return false;
      }
      return filters.genres!.some((selectedGenre) =>
        movie.genres.includes(selectedGenre)
      );
    });
  }

  // Filter by year range
  if (filters.minYear !== undefined && filters.minYear !== null) {
    results = results.filter((movie) => movie.year >= filters.minYear!);
  }

  if (filters.maxYear !== undefined && filters.maxYear !== null) {
    results = results.filter((movie) => movie.year <= filters.maxYear!);
  }

  // Filter by streaming services (movie must have at least one selected service)
  if (filters.streamingServices && filters.streamingServices.length > 0) {
    results = results.filter((movie) => {
      if (!movie.streamingPlatforms || movie.streamingPlatforms.length === 0) {
        return false;
      }
      return filters.streamingServices!.some((selectedService) =>
        movie.streamingPlatforms!.includes(selectedService)
      );
    });
  }

  return results;
}

