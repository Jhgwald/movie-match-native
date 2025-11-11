# Movie Match

A native mobile app for discovering and matching movies with friends, built with Expo and React Native.

## Features

- **Feed**: Browse through a curated list of movies
- **Search**: Find movies by title, genre, or rating (coming soon)
- **Friends**: Connect with friends to share recommendations (coming soon)
- **Party**: Create movie-watching parties and swipe together (coming soon)
- **Profile**: Manage your profile and view stats (coming soon)

## Tech Stack

- **Expo SDK 52**: Latest Expo framework
- **React Native 0.76**: Latest React Native version
- **Expo Router 4**: File-based routing system
- **TypeScript**: Type-safe development
- **Expo Go**: Run on iOS/Android without building

## How to Run

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Expo Go app installed on your iPhone or Android device
  - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
  - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd movie-match-native
```

2. Install dependencies:
```bash
npm install
```

### Running the App

#### Start Development Server (Recommended)
```bash
npm start
```
This will open the Expo Dev Tools in your terminal. Scan the QR code with:
- **iOS**: Open Camera app and scan the QR code
- **Android**: Open Expo Go app and scan the QR code

#### Run with Tunnel (if on different network)
```bash
npx expo start --tunnel
```
Use this if your phone and computer are on different networks.

#### Platform-Specific Commands
```bash
npm run ios       # Open in iOS Simulator (Mac only)
npm run android   # Open in Android Emulator
npm run web       # Open in web browser
```

### Project Structure

```
movie-match-native/
├── app/                      # Expo Router pages
│   ├── _layout.tsx          # Root layout
│   └── (tabs)/              # Tab navigation
│       ├── _layout.tsx      # Tabs layout
│       ├── feed.tsx         # Feed screen
│       ├── search.tsx       # Search screen
│       ├── friends.tsx      # Friends screen
│       ├── party.tsx        # Party screen
│       └── profile.tsx      # Profile screen
├── src/
│   ├── components/          # Reusable components
│   │   └── MovieCard.tsx    # Movie card component
│   ├── data/
│   │   └── sample/
│   │       └── movies.ts    # Sample movie data
│   └── types/
│       └── movie.ts         # TypeScript types
├── app.json                 # Expo configuration
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
└── babel.config.js          # Babel config
```

## Development

The app uses:
- **Expo Router** for file-based navigation
- **TypeScript** for type safety
- **Ionicons** for icons
- **React Native** core components

## Troubleshooting

### App won't load in Expo Go
1. Make sure your phone and computer are on the same network
2. Try using tunnel mode: `npx expo start --tunnel`
3. Clear Expo cache: `npx expo start -c`

### Dependencies won't install
1. Delete `node_modules` and `package-lock.json`
2. Run `npm install` again

### TypeScript errors
1. Make sure you have the latest TypeScript version
2. Run `npx tsc --noEmit` to check for errors

## Next Steps

- Implement movie search functionality
- Add user authentication
- Integrate with movie database API (TMDB)
- Build swipe functionality for movie matching
- Add real-time party sessions
- Implement friend system

## License

MIT
