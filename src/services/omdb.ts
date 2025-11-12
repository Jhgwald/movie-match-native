import type { MovieRatings } from '../types/movie';
import { OMDB_KEY, HAS_OMDB } from '../config/env';

const OMDB_BASE_URL = 'https://www.omdbapi.com';

interface OMDbRating {
  Source: string;
  Value: string;
}

interface OMDbResponse {
  imdbRating?: string;
  Ratings?: OMDbRating[];
  Response: string;
  Error?: string;
}

function parseRating(value: string | undefined): number | undefined {
  if (!value) return undefined;
  // OMDb returns ratings like "8.3/10" or "85%"
  const match = value.match(/(\d+\.?\d*)/);
  if (match) {
    const num = parseFloat(match[1]);
    // If it's a percentage, convert to 0-10 scale
    if (value.includes('%')) {
      return num / 10;
    }
    // If it's already 0-10, return as is
    if (num <= 10) {
      return num;
    }
    // If it's 0-100, convert to 0-10
    if (num <= 100) {
      return num / 10;
    }
    return num;
  }
  return undefined;
}

export async function getOmdbRatingsByImdbId(imdbId: string): Promise<MovieRatings> {
  if (!HAS_OMDB || !imdbId) {
    return {};
  }

  try {
    const response = await fetch(
      `${OMDB_BASE_URL}/?i=${imdbId}&apikey=${OMDB_KEY}`
    );
    const data: OMDbResponse = await response.json();
    
    if (data.Response === 'False' || data.Error) {
      console.warn('OMDb error:', data.Error);
      return {};
    }
    
    const ratings: MovieRatings = {};
    
    // Parse IMDb rating
    if (data.imdbRating) {
      ratings.imdb = parseRating(data.imdbRating);
    }
    
    // Parse Rotten Tomatoes ratings
    if (data.Ratings) {
      for (const rating of data.Ratings) {
        if (rating.Source === 'Rotten Tomatoes') {
          // Rotten Tomatoes comes as percentage like "85%" or "85/100"
          const valueStr = rating.Value;
          if (valueStr) {
            // Extract percentage number
            const match = valueStr.match(/(\d+)/);
            if (match) {
              const percent = parseFloat(match[1]);
              // RT is stored as 0-100 percentage
              if (!ratings.rtCritics) {
                ratings.rtCritics = percent;
              } else if (!ratings.rtAudience) {
                ratings.rtAudience = percent;
              }
            }
          }
        }
      }
    }
    
    return ratings;
  } catch (error) {
    console.error('Failed to fetch OMDb ratings:', error);
    return {};
  }
}

