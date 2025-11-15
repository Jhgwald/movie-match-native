import type { Movie, MovieBase } from '../types/movie';
import { movies as sampleMovies } from '../data/sample/movies';

/**
 * Converts an array of movie IDs into full movie objects.
 *
 * This function looks up each ID in the available movie data sources:
 * 1. Sample movies (always available)
 * 2. (Future: TMDB-fetched movies from global cache)
 *
 * @param ids - Array of movie IDs to look up
 * @returns Array of movie objects that match the given IDs
 */
export function getMoviesByIds(ids: string[]): (Movie | MovieBase)[] {
  const movies: (Movie | MovieBase)[] = [];

  // For each ID, try to find the matching movie
  for (const id of ids) {
    const movie = sampleMovies.find(m => m.id === id);
    if (movie) {
      movies.push(movie);
    }
  }

  return movies;
}

/**
 * Gets a single movie by ID.
 *
 * @param id - Movie ID to look up
 * @returns Movie object if found, undefined otherwise
 */
export function getMovieById(id: string): Movie | MovieBase | undefined {
  return sampleMovies.find(m => m.id === id);
}
