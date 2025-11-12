// Environment configuration for API keys
// Set these in a .env file (do not commit .env to git)
// 
// Example .env:
// EXPO_PUBLIC_TMDB_API_KEY=your_tmdb_key_here
// EXPO_PUBLIC_OMDB_API_KEY=your_omdb_key_here

export const TMDB_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY || '';
export const OMDB_KEY = process.env.EXPO_PUBLIC_OMDB_API_KEY || '';

export const HAS_TMDB = Boolean(TMDB_KEY);
export const HAS_OMDB = Boolean(OMDB_KEY);

// Note: To use environment variables in Expo, you may need to update app.json:
// {
//   "expo": {
//     "extra": {
//       "eas": { "projectId": "local-dev" }
//     }
//   }
// }
// Then create a .env file in the project root with your keys.

