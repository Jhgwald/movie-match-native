import type { MovieBase } from '../types/movie';
import { TMDB_KEY, HAS_TMDB } from '../config/env';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export function imageUrl(path: string, size: 'w342' | 'w500' | 'original' = 'w500'): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

interface TMDbMovie {
  id: number;
  title: string;
  release_date: string;
  genre_ids: number[];
  vote_average: number;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
}

interface TMDbGenre {
  id: number;
  name: string;
}

interface TMDbGenresResponse {
  genres: TMDbGenre[];
}

let genreMap: Map<number, string> = new Map();

async function loadGenres(): Promise<void> {
  if (!HAS_TMDB || genreMap.size > 0) return;
  
  try {
    const response = await fetch(`${TMDB_BASE_URL}/genre/movie/list?api_key=${TMDB_KEY}`);
    const data: TMDbGenresResponse = await response.json();
    genreMap = new Map(data.genres.map(g => [g.id, g.name]));
  } catch (error) {
    console.warn('Failed to load genres:', error);
  }
}

function getGenres(genreIds: number[]): string[] {
  if (genreMap.size === 0) {
    // Fallback genre names if genres not loaded
    const fallback: Record<number, string> = {
      28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
      80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
      14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
      9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
      53: 'Thriller', 10752: 'War', 37: 'Western'
    };
    return genreIds.map(id => fallback[id] || 'Unknown').filter(Boolean);
  }
  return genreIds.map(id => genreMap.get(id) || 'Unknown').filter(Boolean);
}

export async function getTrendingMovies(page = 1): Promise<MovieBase[]> {
  if (!HAS_TMDB) {
    return [];
  }

  try {
    await loadGenres();
    
    const response = await fetch(
      `${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_KEY}&page=${page}`
    );
    const data = await response.json();
    
    const movies: TMDbMovie[] = data.results || [];
    
    return movies.map((movie): MovieBase => {
      const year = movie.release_date ? parseInt(movie.release_date.split('-')[0]) : new Date().getFullYear();
      
      return {
        id: String(movie.id),
        title: movie.title,
        year,
        genres: getGenres(movie.genre_ids),
        tmdbRating: movie.vote_average,
        description: movie.overview || 'No description available.',
        poster: imageUrl(movie.poster_path || ''),
        trailer: '', // Will be filled by getDetailsWithCredits
        imdbId: undefined, // Will be filled by getDetailsWithCredits
      };
    });
  } catch (error) {
    console.error('Failed to fetch trending movies:', error);
    return [];
  }
}

interface TMDbCredits {
  cast: Array<{ name: string }>;
  crew: Array<{ job: string; name: string }>;
}

interface TMDbVideo {
  key: string;
  site: string;
  type: string;
}

interface TMDbVideosResponse {
  results: TMDbVideo[];
}

interface TMDbExternalIds {
  imdb_id: string | null;
}

interface TMDbDetailsResponse {
  external_ids: TMDbExternalIds;
  credits: TMDbCredits;
  videos: TMDbVideosResponse;
}

export interface MovieDetails {
  imdbId: string | null;
  directorName: string | null;
  castTop5: string[];
  trailerUrl: string | null;
}

export async function getDetailsWithCredits(tmdbId: number): Promise<MovieDetails> {
  if (!HAS_TMDB) {
    return { imdbId: null, directorName: null, castTop5: [], trailerUrl: null };
  }

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_KEY}&append_to_response=credits,videos,external_ids`
    );
    const data: TMDbDetailsResponse = await response.json();
    
    const director = data.credits?.crew?.find(person => person.job === 'Director');
    const castTop5 = data.credits?.cast?.slice(0, 5).map(actor => actor.name) || [];
    
    const trailer = data.videos?.results?.find(
      video => video.site === 'YouTube' && video.type === 'Trailer'
    );
    
    return {
      imdbId: data.external_ids?.imdb_id || null,
      directorName: director?.name || null,
      castTop5,
      trailerUrl: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
    };
  } catch (error) {
    console.error('Failed to fetch movie details:', error);
    return { imdbId: null, directorName: null, castTop5: [], trailerUrl: null };
  }
}

export function toMovie(base: MovieBase, details: MovieDetails): MovieBase {
  return {
    ...base,
    trailer: details.trailerUrl || base.trailer,
    imdbId: details.imdbId || base.imdbId,
  };
}

