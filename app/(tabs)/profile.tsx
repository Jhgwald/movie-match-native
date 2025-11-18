import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { counts, getRankedMovies, getUnrankedSeenIds } from '../../src/state/library';
import { getMoviesByIds } from '../../src/lib/movieHelpers';
import { useProfile } from '../../src/context/ProfileContext';
import type { Movie, MovieBase } from '../../src/types/movie';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const [seenCount, setSeenCount] = useState(0);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [moviesToRankCount, setMoviesToRankCount] = useState(0);
  const [rankedCount, setRankedCount] = useState(0);
  const [favoriteMovie, setFavoriteMovie] = useState<Movie | MovieBase | null>(null);

  // Reload counts every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const libraryCounts = counts();
      setSeenCount(libraryCounts.seen);
      setWatchlistCount(libraryCounts.watchlist);
      setSkippedCount(libraryCounts.skipped);
      
      // Movies to Rank count = unranked, unskipped seen movies
      const unrankedSeenIds = getUnrankedSeenIds();
      setMoviesToRankCount(unrankedSeenIds.length);
      
      // Ranked movies count
      const rankedMovies = getRankedMovies();
      setRankedCount(rankedMovies.length);
      
      // Favorite movie = top-ranked movie (highest score, position 1)
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
      <View style={styles.profileHeaderContainer}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {profile.profilePictureUri ? (
              <Image
                source={{ uri: profile.profilePictureUri }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color="#FFFEAD" />
              </View>
            )}
          </View>
          <View style={styles.headerContent}>
            <View style={styles.nameRow}>
              <View style={styles.nameContainer}>
                <Text style={styles.userName}>{profile.name}</Text>
                <Text style={styles.userHandle}>@{profile.username}</Text>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statItemInline}>
                  <Text style={styles.statValueInline}>{seenCount}</Text>
                  <Text style={styles.statLabelInline}>Movies</Text>
                </View>
                <View style={styles.statItemInline}>
                  <Text style={styles.statValueInline}>128</Text>
                  <Text style={styles.statLabelInline}>Followers</Text>
                </View>
                <View style={styles.statItemInline}>
                  <Text style={styles.statValueInline}>104</Text>
                  <Text style={styles.statLabelInline}>Following</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/profile/settings')}
          style={styles.settingsButton}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={24} color="#FFFEAD" />
        </TouchableOpacity>
      </View>

      {/* Bio Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bio</Text>
        <View style={styles.bioContainer}>
          {profile.bio && profile.bio.trim() ? (
            <Text style={styles.bioText}>{profile.bio}</Text>
          ) : (
            <Text style={styles.bioPlaceholder}>No bio yet. Add one in Settings.</Text>
          )}
        </View>
      </View>

      {/* 2. Favorite Movie Row */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Favorite Movie</Text>
        <TouchableOpacity style={styles.favoriteMovieRow} activeOpacity={0.7}>
          <Text style={styles.favoriteMovieLabel}>Favorite Movie</Text>
          {favoriteMovie ? (
            <Text style={styles.favoriteMovieTitle}>{favoriteMovie.title}</Text>
          ) : (
            <Text style={styles.favoriteMoviePlaceholder}>Choose your favorite movie</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 4. Navigation List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Library</Text>
        <View style={styles.navigationSection}>
        <Link href="/profile/movies-to-rank" asChild>
          <TouchableOpacity style={styles.navItem} activeOpacity={0.7}>
            <Ionicons name="film-outline" size={24} color="#FFFEAD" />
            <Text style={styles.navItemText}>Movies to Rank</Text>
            <Text style={styles.navItemCount}>{moviesToRankCount}</Text>
            <Ionicons name="chevron-forward" size={20} color="#C0C1C1" />
          </TouchableOpacity>
        </Link>

        <Link href="/profile/watchlist" asChild>
          <TouchableOpacity style={styles.navItem} activeOpacity={0.7}>
            <Ionicons name="bookmark-outline" size={24} color="#FFFEAD" />
            <Text style={styles.navItemText}>Watchlist</Text>
            <Text style={styles.navItemCount}>{watchlistCount}</Text>
            <Ionicons name="chevron-forward" size={20} color="#C0C1C1" />
          </TouchableOpacity>
        </Link>

        <Link href="/profile/skipped" asChild>
          <TouchableOpacity style={styles.navItem} activeOpacity={0.7}>
            <Ionicons name="close-circle-outline" size={24} color="#FFFEAD" />
            <Text style={styles.navItemText}>Skipped Movies</Text>
            <Text style={styles.navItemCount}>{skippedCount}</Text>
            <Ionicons name="chevron-forward" size={20} color="#C0C1C1" />
          </TouchableOpacity>
        </Link>

        <Link href="/profile/ranking" asChild>
          <TouchableOpacity style={styles.navItem} activeOpacity={0.7}>
            <Ionicons name="trophy-outline" size={24} color="#FFFEAD" />
            <Text style={styles.navItemText}>Ranking</Text>
            <Text style={styles.navItemCount}>{rankedCount}</Text>
            <Ionicons name="chevron-forward" size={20} color="#C0C1C1" />
          </TouchableOpacity>
        </Link>
        </View>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFEAD',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  profileHeaderContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  bioContainer: {
    backgroundColor: 'rgba(255, 254, 173, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 254, 173, 0.2)',
  },
  bioText: {
    fontSize: 14,
    color: '#FFFEAD',
    lineHeight: 20,
  },
  bioPlaceholder: {
    fontSize: 14,
    color: '#C0C1C1',
    fontStyle: 'italic',
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
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#FFFEAD',
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
  headerContent: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  nameContainer: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginLeft: 16,
  },
  statItemInline: {
    alignItems: 'flex-start',
  },
  statValueInline: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFEAD',
    marginBottom: 2,
  },
  statLabelInline: {
    fontSize: 11,
    color: '#C0C1C1',
    fontWeight: '500',
  },
  settingsButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 8,
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
