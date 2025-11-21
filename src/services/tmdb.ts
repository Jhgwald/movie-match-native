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

export interface Person {
  id: number;
  name: string;
  knownFor?: string; // Known for department or popular work
}

interface TMDbPerson {
  id: number;
  name: string;
  known_for_department?: string;
  known_for?: Array<{ title?: string; name?: string }>;
}

interface TMDbPeopleSearchResponse {
  results: TMDbPerson[];
}

// Mock data for testing when TMDB is not configured
// Actors from the actual movies in the app
const MOCK_PEOPLE: Person[] = [
  // Oppenheimer
  { id: 1, name: 'Cillian Murphy', knownFor: 'Oppenheimer' },
  { id: 2, name: 'Emily Blunt', knownFor: 'Oppenheimer' },
  { id: 3, name: 'Matt Damon', knownFor: 'Oppenheimer' },
  { id: 4, name: 'Robert Downey Jr.', knownFor: 'Oppenheimer' },
  { id: 5, name: 'Florence Pugh', knownFor: 'Oppenheimer' },
  // Dune
  { id: 6, name: 'Timothée Chalamet', knownFor: 'Dune' },
  { id: 7, name: 'Rebecca Ferguson', knownFor: 'Dune' },
  { id: 8, name: 'Oscar Isaac', knownFor: 'Dune' },
  { id: 9, name: 'Zendaya', knownFor: 'Dune' },
  { id: 10, name: 'Jason Momoa', knownFor: 'Dune' },
  // Everything Everywhere All at Once
  { id: 11, name: 'Michelle Yeoh', knownFor: 'Everything Everywhere All at Once' },
  { id: 12, name: 'Stephanie Hsu', knownFor: 'Everything Everywhere All at Once' },
  { id: 13, name: 'Ke Huy Quan', knownFor: 'Everything Everywhere All at Once' },
  { id: 14, name: 'Jamie Lee Curtis', knownFor: 'Everything Everywhere All at Once' },
  // Inception
  { id: 15, name: 'Leonardo DiCaprio', knownFor: 'Inception' },
  { id: 16, name: 'Marion Cotillard', knownFor: 'Inception' },
  { id: 17, name: 'Tom Hardy', knownFor: 'Inception' },
  { id: 18, name: 'Ellen Page', knownFor: 'Inception' },
  { id: 19, name: 'Joseph Gordon-Levitt', knownFor: 'Inception' },
  // The Batman
  { id: 20, name: 'Robert Pattinson', knownFor: 'The Batman' },
  { id: 21, name: 'Zoë Kravitz', knownFor: 'The Batman' },
  { id: 22, name: 'Paul Dano', knownFor: 'The Batman' },
  { id: 23, name: 'Colin Farrell', knownFor: 'The Batman' },
  // Parasite
  { id: 24, name: 'Song Kang-ho', knownFor: 'Parasite' },
  { id: 25, name: 'Lee Sun-kyun', knownFor: 'Parasite' },
  { id: 26, name: 'Cho Yeo-jeong', knownFor: 'Parasite' },
  { id: 27, name: 'Choi Woo-shik', knownFor: 'Parasite' },
  // Interstellar
  { id: 28, name: 'Matthew McConaughey', knownFor: 'Interstellar' },
  { id: 29, name: 'Anne Hathaway', knownFor: 'Interstellar' },
  { id: 30, name: 'Jessica Chastain', knownFor: 'Interstellar' },
  { id: 31, name: 'Michael Caine', knownFor: 'Interstellar' },
  // Spider-Man: No Way Home
  { id: 32, name: 'Tom Holland', knownFor: 'Spider-Man: No Way Home' },
  { id: 33, name: 'Benedict Cumberbatch', knownFor: 'Spider-Man: No Way Home' },
  { id: 34, name: 'Willem Dafoe', knownFor: 'Spider-Man: No Way Home' },
  // Mad Max: Fury Road
  { id: 35, name: 'Charlize Theron', knownFor: 'Mad Max: Fury Road' },
  { id: 36, name: 'Nicholas Hoult', knownFor: 'Mad Max: Fury Road' },
  { id: 37, name: 'Hugh Keays-Byrne', knownFor: 'Mad Max: Fury Road' },
  // Barbie
  { id: 38, name: 'Margot Robbie', knownFor: 'Barbie' },
  { id: 39, name: 'Ryan Gosling', knownFor: 'Barbie' },
  { id: 40, name: 'America Ferrera', knownFor: 'Barbie' },
  { id: 41, name: 'Kate McKinnon', knownFor: 'Barbie' },
];

export async function searchPeople(query: string): Promise<Person[]> {
  if (!query.trim()) {
    console.log('[searchPeople] Empty query, returning empty array');
    return [];
  }

  // Fallback to mock data when TMDB is not configured
  if (!HAS_TMDB || !TMDB_KEY) {
    console.warn('[searchPeople] TMDB not configured, using mock data');
    const queryLower = query.trim().toLowerCase();
    const mockResults = MOCK_PEOPLE.filter((person) =>
      person.name.toLowerCase().includes(queryLower)
    ).slice(0, 10);
    console.log('[searchPeople] Mock results:', mockResults.length);
    return mockResults;
  }

  try {
    const url = `${TMDB_BASE_URL}/search/person?api_key=${TMDB_KEY}&query=${encodeURIComponent(query.trim())}`;
    console.log('[searchPeople] Fetching from:', url.replace(TMDB_KEY, '***'));
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('[searchPeople] Response not OK:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('[searchPeople] Error response:', errorText);
      return [];
    }
    
    const data: TMDbPeopleSearchResponse = await response.json();
    console.log('[searchPeople] Raw response:', JSON.stringify(data).substring(0, 200));
    
    if (!data.results) {
      console.warn('[searchPeople] No results array in response');
      return [];
    }
    
    const people = (data.results || []).slice(0, 10).map((person): Person => {
      // Get known_for title if available
      const knownFor = person.known_for?.[0]?.title || person.known_for?.[0]?.name || person.known_for_department || 'Actor';
      
      return {
        id: person.id,
        name: person.name,
        knownFor,
      };
    });
    
    console.log('[searchPeople] Returning', people.length, 'people');
    return people;
  } catch (error) {
    console.error('[searchPeople] Failed to search people:', error);
    if (error instanceof Error) {
      console.error('[searchPeople] Error message:', error.message);
      console.error('[searchPeople] Error stack:', error.stack);
    }
    return [];
  }
}

