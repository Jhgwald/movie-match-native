# Environment Setup

## API Keys (Optional)

The app works without API keys using sample data. To enable real movie data from TMDb and OMDb:

1. Create a `.env` file in the project root (do NOT commit this file to git)

2. Add your API keys:

```env
EXPO_PUBLIC_TMDB_API_KEY=your_tmdb_api_key_here
EXPO_PUBLIC_OMDB_API_KEY=your_omdb_api_key_here
```

3. Get API keys:
   - **TMDb**: Sign up at https://www.themoviedb.org/settings/api
   - **OMDb**: Sign up at http://www.omdbapi.com/apikey.aspx

4. Restart Expo with cache clear:

```bash
npx expo start -c
```

## Running the App

```bash
npx expo start -c
```

The app will:
- Use TMDb data if `EXPO_PUBLIC_TMDB_API_KEY` is set
- Use OMDb ratings if `EXPO_PUBLIC_OMDB_API_KEY` is set
- Fall back to sample data if keys are missing

**Important**: Never commit the `.env` file to git. It's already in `.gitignore`.

