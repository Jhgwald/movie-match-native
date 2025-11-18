import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { counts, getRankedMovies } from '../../src/state/library';
import { getMoviesByIds } from '../../src/lib/movieHelpers';
import type { Movie, MovieBase } from '../../src/types/movie';

export default function ProfileScreen() {
  const [seenCount, setSeenCount] = useState(0);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [favoriteMovie, setFavoriteMovie] = useState<Movie | MovieBase | null>(null);

  // Reload counts every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const libraryCounts = counts();
      setSeenCount(libraryCounts.seen);
      setWatchlistCount(libraryCounts.watchlist);
      setSkippedCount(libraryCounts.skipped);
      
      // Favorite movie = top-ranked movie (highest score, position 1)
      const rankedMovies = getRankedMovies();
      if (rankedMovies.length > 0) {
        // getRankedMovies() returns movies sorted by score (descending), so first is top
        const topRankedMovie = rankedMovies[0];
        const topMovieData = getMoviesByIds([topRankedMovie.movieId]);
        if (topMovieData.length > 0) {
          setFavoriteMovie(topMovieData[0]);
        } else {
          setFavoriteMovie(null);
        }
      } else {
        // No ranked movies yet
        setFavoriteMovie(null);
      }
    }, [])
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <StatusBar style="light" />
      
      {/* 1. Top Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={40} color="#FFFEAD" />
          </View>
        </View>
        <View style={styles.nameContainer}>
          <Text style={styles.userName}>Josh Greenwald</Text>
          <Text style={styles.userHandle}>@jhg</Text>
        </View>
      </View>

      {/* 2. Favorite Movie Row */}
      <TouchableOpacity style={styles.favoriteMovieRow} activeOpacity={0.7}>
        <Text style={styles.favoriteMovieLabel}>Favorite Movie</Text>
        {favoriteMovie ? (
          <Text style={styles.favoriteMovieTitle}>{favoriteMovie.title}</Text>
        ) : (
          <Text style={styles.favoriteMoviePlaceholder}>Choose your favorite movie</Text>
        )}
      </TouchableOpacity>

      {/* 3. Stats Row */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>128</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>104</Text>
          <Text style={styles.statLabel}>Following</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{seenCount}</Text>
          <Text style={styles.statLabel}>Movies Watched</Text>
        </View>
      </View>

      {/* 4. Navigation List */}
      <View style={styles.navigationSection}>
        <Link href="/profile/movies-to-rank" asChild>
          <TouchableOpacity style={styles.navItem} activeOpacity={0.7}>
            <Ionicons name="film-outline" size={24} color="#FFFEAD" />
            <Text style={styles.navItemText}>Movies to Rank</Text>
            <Ionicons name="chevron-forward" size={20} color="#C0C1C1" />
          </TouchableOpacity>
        </Link>

        <Link href="/profile/watchlist" asChild>
          <TouchableOpacity style={styles.navItem} activeOpacity={0.7}>
            <Ionicons name="bookmark-outline" size={24} color="#FFFEAD" />
            <Text style={styles.navItemText}>Watchlist</Text>
            {watchlistCount > 0 && (
              <Text style={styles.navItemCount}>{watchlistCount}</Text>
            )}
            <Ionicons name="chevron-forward" size={20} color="#C0C1C1" />
          </TouchableOpacity>
        </Link>

        <Link href="/profile/skipped" asChild>
          <TouchableOpacity style={styles.navItem} activeOpacity={0.7}>
            <Ionicons name="close-circle-outline" size={24} color="#FFFEAD" />
            <Text style={styles.navItemText}>Skipped Movies</Text>
            {skippedCount > 0 && (
              <Text style={styles.navItemCount}>{skippedCount}</Text>
            )}
            <Ionicons name="chevron-forward" size={20} color="#C0C1C1" />
          </TouchableOpacity>
        </Link>

        <Link href="/profile/ranking" asChild>
          <TouchableOpacity style={styles.navItem} activeOpacity={0.7}>
            <Ionicons name="trophy-outline" size={24} color="#FFFEAD" />
            <Text style={styles.navItemText}>Ranking</Text>
            <Ionicons name="chevron-forward" size={20} color="#C0C1C1" />
          </TouchableOpacity>
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7E1616',
  },
  contentContainer: {
    padding: 20,
    paddingTop: 16,
  },
  // 1. Profile Header
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#DC2026',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFEAD',
  },
  nameContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFEAD',
    marginBottom: 4,
  },
  userHandle: {
    fontSize: 16,
    color: '#C0C1C1',
    fontWeight: '400',
  },
  // 2. Favorite Movie Row
  favoriteMovieRow: {
    backgroundColor: 'rgba(255, 254, 173, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 254, 173, 0.2)',
  },
  favoriteMovieLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C0C1C1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  favoriteMovieContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  favoriteMoviePoster: {
    width: 50,
    height: 75,
    borderRadius: 6,
    backgroundColor: '#DC2026',
  },
  favoriteMoviePosterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(192, 193, 193, 0.2)',
  },
  favoriteMovieTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFEAD',
    flex: 1,
  },
  favoriteMoviePlaceholder: {
    fontSize: 14,
    color: '#C0C1C1',
    fontStyle: 'italic',
  },
  // 3. Stats Row
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 254, 173, 0.1)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 254, 173, 0.2)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFEAD',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#C0C1C1',
    fontWeight: '500',
    textAlign: 'center',
  },
  // 4. Navigation List
  navigationSection: {
    gap: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 254, 173, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 254, 173, 0.2)',
    gap: 12,
  },
  navItemText: {
    flex: 1,
    fontSize: 16,
    color: '#FFFEAD',
    fontWeight: '500',
  },
  navItemCount: {
    fontSize: 14,
    color: '#C0C1C1',
    fontWeight: '600',
    marginRight: 4,
  },
});
