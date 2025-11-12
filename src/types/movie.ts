export interface MovieBase {
  id: string;
  title: string;
  year: number;
  genres: string[];
  tmdbRating: number;
  description: string;
  poster: string;
  trailer: string;
  imdbId?: string;
  streamingPlatforms?: string[]; // e.g., ['Netflix', 'Disney+', 'HBO Max']
  butterScore?: number; // 0-100, algorithm's prediction of how much user will like it
}

export interface MovieRatings {
  imdb?: number;
  rtCritics?: number;
  rtAudience?: number;
}

export type Movie = MovieBase & {
  ratings?: MovieRatings;
};
