import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { 
  counts, 
  getRankedMovies, 
  getUnrankedSeenIds,
  getMoviesToBeRankedIds,
  getWatchlistIds,
  getSkippedIds,
  getMasterRankingsIds,
  getCustomLists,
  createCustomList,
  getActivityItems,
  getSeenIds,
} from '../../src/state/library';
import { getMoviesByIds } from '../../src/lib/movieHelpers';
import { useProfile } from '../../src/context/ProfileContext';
import HeaderBar from '../../src/components/HeaderBar';
import CreateNewListModal from '../../src/components/CreateNewListModal';
import type { Movie, MovieBase } from '../../src/types/movie';
import type { RankedMovie } from '../../src/state/library';

type TabType = 'about' | 'activity' | 'rankings' | 'lists';

// Profile Header Component (simplified, no card background)
function ProfileHeader({
  profile,
  seenCount,
}: {
  profile: { name: string; username: string; profilePictureUri: string | null };
  seenCount: number;
}) {
  return (
    <View style={styles.profileHeader}>
      {/* Avatar - centered */}
      <View style={styles.avatarWrapper}>
        {profile.profilePictureUri ? (
          <Image
            source={{ uri: profile.profilePictureUri }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={45} color="#FFFEAD" />
          </View>
        )}
      </View>

      {/* Name */}
      <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
        {profile.name}
      </Text>

      {/* Username */}
      <Text style={styles.username} numberOfLines={1} ellipsizeMode="tail">
        @{profile.username}
      </Text>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{seenCount}</Text>
          <Text style={styles.statLabel}>Movies</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>128</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>104</Text>
          <Text style={styles.statLabel}>Following</Text>
        </View>
      </View>
    </View>
  );
}

// Tab Bar Component
function ProfileTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}) {
  const tabs: { id: TabType; label: string }[] = [
    { id: 'about', label: 'About' },
    { id: 'activity', label: 'Activity' },
    { id: 'rankings', label: 'Rankings' },
    { id: 'lists', label: 'Lists' },
  ];

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onTabChange(tab.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.tabText, isActive && styles.tabTextActive]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
            {isActive && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// About Tab Component
function AboutTab({
  profile,
  favoriteMovie,
  onFavoriteMoviePress,
  totalSeen,
  masterRankingsCount,
  topLists,
  onListPress,
}: {
  profile: { bio: string };
  favoriteMovie: Movie | MovieBase | null;
  onFavoriteMoviePress: () => void;
  totalSeen: number;
  masterRankingsCount: number;
  topLists: Array<{ id: string; name: string; count: number; isMasterRankings?: boolean }>;
  onListPress: (listId: string, isMasterRankings?: boolean) => void;
}) {
  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Summary Stats Section */}
      <View style={styles.aboutCard}>
        <Text style={styles.aboutCardTitle}>Summary</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Movies seen:</Text>
            <Text style={styles.statValue}>{totalSeen}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>In Master Rankings:</Text>
            <Text style={styles.statValue}>{masterRankingsCount}</Text>
          </View>
        </View>
      </View>

      {/* Top Lists Section */}
      {topLists.length > 0 && (
        <View style={styles.aboutCard}>
          <Text style={styles.aboutCardTitle}>Your top lists</Text>
          {topLists.map((list) => (
            <TouchableOpacity
              key={list.id}
              style={styles.listShortcut}
              onPress={() => onListPress(list.id, list.isMasterRankings)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={list.isMasterRankings ? 'trophy-outline' : 'list-outline'}
                size={20}
                color="#FFFEAD"
                style={styles.listShortcutIcon}
              />
              <View style={styles.listShortcutContent}>
                <Text style={styles.listShortcutName}>{list.name}</Text>
                <Text style={styles.listShortcutCount}>
                  {list.count} {list.count === 1 ? 'movie' : 'movies'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#C0C1C1" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Bio Section */}
      <View style={styles.aboutCard}>
        <Text style={styles.aboutCardTitle}>Bio</Text>
        {profile.bio && profile.bio.trim() ? (
          <Text style={styles.bioText}>{profile.bio}</Text>
        ) : (
          <Text style={styles.bioPlaceholder}>Write a short bio…</Text>
        )}
      </View>

      {/* Favorite Movie Section */}
      <View style={styles.aboutCard}>
        <Text style={styles.aboutCardTitle}>Favorite Movie</Text>
        <TouchableOpacity
          style={styles.favoriteMovieCard}
          onPress={onFavoriteMoviePress}
          activeOpacity={0.7}
        >
          {favoriteMovie ? (
            <View style={styles.favoriteMovieContent}>
              {favoriteMovie.poster && (
                <Image
                  source={{ uri: favoriteMovie.poster }}
                  style={styles.favoriteMoviePoster}
                />
              )}
              <Text style={styles.favoriteMovieTitle} numberOfLines={2}>
                {favoriteMovie.title}
              </Text>
            </View>
          ) : (
            <Text style={styles.favoriteMoviePlaceholder}>
              Choose your favorite movie
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Activity Tab Component
function ActivityTab() {
  const [activities, setActivities] = useState(getActivityItems());

  // Refresh activities when tab comes into focus
  useFocusEffect(
    useCallback(() => {
      setActivities(getActivityItems());
    }, [])
  );

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'watched_now':
      case 'logged_watched':
        return 'checkmark-circle';
      case 'ranked':
      case 'ranked_in_list':
        return 'trophy';
      case 'watchlist':
        return 'bookmark';
      case 'added_to_list':
        return 'list';
      case 'skipped':
        return 'close-circle';
      default:
        return 'film';
    }
  };

  const getActivityText = (activity: any) => {
    const movie = getMoviesByIds([activity.movieId])[0];
    const movieTitle = movie?.title || 'Unknown Movie';
    
    switch (activity.action) {
      case 'watched_now':
        return `You watched ${movieTitle}`;
      case 'logged_watched':
        return `Logged ${movieTitle}`;
      case 'ranked':
        return `You ranked ${movieTitle}`;
      case 'ranked_in_list':
        return `Ranked ${movieTitle} in ${activity.listName || 'list'}`;
      case 'watchlist':
        return `You added ${movieTitle} to your watchlist`;
      case 'added_to_list':
        return `Added ${movieTitle} to ${activity.listName || 'list'}`;
      case 'skipped':
        return `You skipped ${movieTitle}`;
      default:
        return `Activity: ${movieTitle}`;
    }
  };

  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {activities.length > 0 ? (
        activities.map((activity) => (
          <View key={activity.id} style={styles.activityItem}>
            <Ionicons
              name={getActivityIcon(activity.action) as any}
              size={24}
              color="#FFFEAD"
              style={styles.activityIcon}
            />
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>
                {getActivityText(activity)}
              </Text>
              <Text style={styles.activityTime}>{formatTimeAgo(activity.timestamp)}</Text>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No activity yet</Text>
        </View>
      )}
    </ScrollView>
  );
}

// Rankings Tab Component
function RankingsTab({ rankedMovies }: { rankedMovies: RankedMovie[] }) {
  // Get movie data for ranked movies
  const rankedMovieData = getMoviesByIds(rankedMovies.map((rm) => rm.movieId));

  // Sort by score (descending) and assign global positions
  const sortedRanked = rankedMovies
    .map((rm, index) => {
      const movieData = rankedMovieData.find((m) => m.id === rm.movieId);
      return {
        ...rm,
        movie: movieData,
        globalPosition: index + 1,
      };
    })
    .sort((a, b) => b.score - a.score);

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {sortedRanked.length > 0 ? (
        sortedRanked.map((item) => (
          <View key={item.movieId} style={styles.rankingItem}>
            {item.movie?.poster && (
              <Image
                source={{ uri: item.movie.poster }}
                style={styles.rankingPoster}
              />
            )}
            <View style={styles.rankingContent}>
              <Text style={styles.rankingTitle} numberOfLines={1}>
                {item.movie?.title || 'Unknown Movie'}
              </Text>
              {item.movie?.year && (
                <Text style={styles.rankingYear}>{item.movie.year}</Text>
              )}
            </View>
            <View style={styles.rankingStats}>
              <Text style={styles.rankingPosition}>#{item.globalPosition}</Text>
              <Text style={styles.rankingScore}>{item.score.toFixed(0)}%</Text>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No ranked movies yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Start ranking movies to see them here
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// Lists Tab Component
function ListsTab({
  moviesToRankCount,
  watchlistCount,
  skippedCount,
  sceneCount,
  onNavigate,
}: {
  moviesToRankCount: number;
  watchlistCount: number;
  skippedCount: number;
  onNavigate: (route: string) => void;
}) {
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [customLists, setCustomLists] = useState(getCustomLists());

  // Refresh custom lists when tab comes into focus
  useFocusEffect(
    useCallback(() => {
      setCustomLists(getCustomLists());
    }, [])
  );

  // System lists (fixed order)
  const masterRankingsCount = getMasterRankingsIds().length;
  const systemLists = [
    {
      id: 'master-rankings',
      title: 'Master Rankings',
      subtitle: "Your master ranking list",
      count: masterRankingsCount,
      route: '/profile/master-rankings',
      icon: 'trophy-outline' as const,
    },
    {
      id: 'movies-to-be-ranked',
      title: 'Movies to be Logged',
      subtitle: "Movies you've seen but haven't organized yet",
      count: moviesToRankCount,
      route: '/profile/movies-to-rank',
      icon: 'film-outline' as const,
    },
    {
      id: 'watchlist',
      title: 'Watchlist',
      subtitle: "Movies you want to watch",
      count: watchlistCount,
      route: '/profile/watchlist',
      icon: 'bookmark-outline' as const,
    },
    {
      id: 'skipped',
      title: 'Skipped Movies',
      subtitle: "Movies you're not interested in",
      count: skippedCount,
      route: '/profile/skipped',
      icon: 'close-circle-outline' as const,
    },
  ];

  const handleCreateList = (name: string) => {
    createCustomList(name);
    // Refresh custom lists
    setCustomLists(getCustomLists());
  };

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* System Lists */}
      {systemLists.map((list) => (
        <TouchableOpacity
          key={list.id}
          style={styles.listItem}
          onPress={() => onNavigate(list.route)}
          activeOpacity={0.7}
        >
          <Ionicons name={list.icon} size={24} color="#FFFEAD" style={styles.listIcon} />
          <View style={styles.listContent}>
            <Text style={styles.listTitle}>{list.title}</Text>
            <Text style={styles.listSubtitle}>{list.subtitle}</Text>
          </View>
          <Text style={styles.listCount}>{list.count}</Text>
          <Ionicons name="chevron-forward" size={20} color="#C0C1C1" />
        </TouchableOpacity>
      ))}

      {/* Custom Lists Section */}
      <View style={styles.customListsSection}>
        <Text style={styles.sectionHeader}>Your lists</Text>
        
        {customLists.length > 0 ? (
          customLists.map((list) => (
            <TouchableOpacity
              key={list.id}
              style={styles.listItem}
              onPress={() => onNavigate(`/profile/custom-list/${list.id}`)}
              activeOpacity={0.7}
            >
              <Ionicons name="list-outline" size={24} color="#FFFEAD" style={styles.listIcon} />
              <View style={styles.listContent}>
                <Text style={styles.listTitle}>{list.name}</Text>
                <Text style={styles.listSubtitle}>
                  {list.movieIds.length} {list.movieIds.length === 1 ? 'movie' : 'movies'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#C0C1C1" />
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyListsText}>You don't have any lists yet.</Text>
        )}

        {/* New List Button */}
        <TouchableOpacity
          style={[styles.listItem, styles.newListButton]}
          onPress={() => setCreateModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={24} color="#FFFEAD" style={styles.listIcon} />
          <View style={styles.listContent}>
            <Text style={styles.newListText}>+ New list</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Create New List Modal */}
      <CreateNewListModal
        visible={createModalVisible}
        onCreate={handleCreateList}
        onClose={() => setCreateModalVisible(false)}
      />
    </ScrollView>
  );
}

// Main Profile Screen Component
export default function ProfileScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const [activeTab, setActiveTab] = useState<TabType>('about');
  const [seenCount, setSeenCount] = useState(0);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [moviesToRankCount, setMoviesToRankCount] = useState(0);
  const [rankedCount, setRankedCount] = useState(0);
  const [favoriteMovie, setFavoriteMovie] = useState<Movie | MovieBase | null>(null);
  const [rankedMovies, setRankedMovies] = useState<RankedMovie[]>([]);
  const [totalSeen, setTotalSeen] = useState(0);
  const [masterRankingsCount, setMasterRankingsCount] = useState(0);
  const [topLists, setTopLists] = useState<Array<{ id: string; name: string; count: number; isMasterRankings?: boolean }>>([]);
  const [fadeAnim] = useState(new Animated.Value(1));

  // Reload counts every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const libraryCounts = counts();
      setSeenCount(libraryCounts.seen);
      setWatchlistCount(libraryCounts.watchlist);
      setSkippedCount(libraryCounts.skipped);

      // Movies to be Ranked count = movies in the inbox bucket
      const moviesToBeRankedIds = getMoviesToBeRankedIds();
      setMoviesToRankCount(moviesToBeRankedIds.length);

      // Ranked movies count
      const rankedMoviesData = getRankedMovies();
      setRankedCount(rankedMoviesData.length);
      setRankedMovies(rankedMoviesData);

      // Total movies seen
      const seenIdsArray = getSeenIds();
      setTotalSeen(seenIdsArray.length);

      // Master Rankings count
      const masterRankingsIdsArray = getMasterRankingsIds();
      setMasterRankingsCount(masterRankingsIdsArray.length);

      // Top lists (Master Rankings + top 2 custom lists by size)
      const customListsData = getCustomLists();
      const listsWithCounts = [
        {
          id: 'master-rankings',
          name: 'Master Rankings',
          count: masterRankingsIdsArray.length,
          isMasterRankings: true,
        },
        ...customListsData
          .map(list => ({
            id: list.id,
            name: list.name,
            count: list.movieIds.length,
            isMasterRankings: false,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 2),
      ].filter(list => list.count > 0);
      setTopLists(listsWithCounts);

      // Favorite movie = top-ranked movie (highest score, position 1)
      if (rankedMoviesData.length > 0) {
        // Sort by score descending to get top movie
        const sorted = [...rankedMoviesData].sort((a, b) => b.score - a.score);
        const topRankedMovie = sorted[0];
        const topMovieData = getMoviesByIds([topRankedMovie.movieId]);
        if (topMovieData.length > 0) {
          setFavoriteMovie(topMovieData[0]);
        } else {
          setFavoriteMovie(null);
        }
      } else {
        setFavoriteMovie(null);
      }
    }, [])
  );

  // Animate tab content transition
  const handleTabChange = (tab: TabType) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    setActiveTab(tab);
  };

  const handleFavoriteMoviePress = () => {
    // TODO: Open movie picker or navigate to favorite movie selection
    console.log('Favorite movie pressed - placeholder');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'about':
        return (
          <AboutTab
            profile={profile}
            favoriteMovie={favoriteMovie}
            onFavoriteMoviePress={handleFavoriteMoviePress}
            totalSeen={totalSeen}
            masterRankingsCount={masterRankingsCount}
            topLists={topLists}
            onListPress={(listId, isMasterRankings) => {
              if (isMasterRankings) {
                router.push('/profile/master-rankings');
              } else {
                router.push(`/profile/custom-list/${listId}` as any);
              }
            }}
          />
        );
      case 'activity':
        return <ActivityTab />;
      case 'rankings':
        return <RankingsTab rankedMovies={rankedMovies} />;
      case 'lists':
        return (
          <ListsTab
            moviesToRankCount={moviesToRankCount}
            watchlistCount={watchlistCount}
            skippedCount={skippedCount}
            onNavigate={(route) => router.push(route as any)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <HeaderBar
        title="Profile"
        rightIconName="settings-outline"
        onRightIconPress={() => router.push('/profile/settings')}
      />

      {/* Fixed Header Section */}
      <View style={styles.headerSection}>
        {/* Profile Header (simplified, no card) */}
        <ProfileHeader profile={profile} seenCount={seenCount} />

        {/* Tab Bar */}
        <ProfileTabs activeTab={activeTab} onTabChange={handleTabChange} />
      </View>

      {/* Tab Content Area (Scrollable) */}
      <Animated.View style={[styles.tabContentContainer, { opacity: fadeAnim }]}>
        {renderTabContent()}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7E1616',
  },
  // Header Section
  headerSection: {
    paddingBottom: 4,
  },
  // Profile Header (simplified, no card)
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  avatarWrapper: {
    marginBottom: 6,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#FFFEAD',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DC2026',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFEAD',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFEAD',
    marginBottom: 2,
    textAlign: 'center',
  },
  username: {
    fontSize: 14,
    color: '#C0C1C1',
    fontWeight: '400',
    marginBottom: 8,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: 2,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFEAD',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#C0C1C1',
    fontWeight: '500',
  },
  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 254, 173, 0.05)',
    marginHorizontal: 20,
    marginTop: 2,
    marginBottom: 0,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 254, 173, 0.1)',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabActive: {
    // Active styling handled by indicator
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#C0C1C1',
  },
  tabTextActive: {
    color: '#FFFEAD',
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 4,
    left: '10%',
    right: '10%',
    height: 2,
    backgroundColor: '#FFFEAD',
    borderRadius: 1,
  },
  // Tab Content Container
  tabContentContainer: {
    flex: 1,
    paddingBottom: 20,
  },
  tabContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  // About Tab Styles
  aboutCard: {
    backgroundColor: 'rgba(255, 254, 173, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 254, 173, 0.2)',
  },
  aboutCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFEAD',
    marginBottom: 12,
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
  favoriteMovieCard: {
    marginTop: 8,
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
  statsContainer: {
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#C0C1C1',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    color: '#FFFEAD',
    fontWeight: '600',
  },
  listShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 254, 173, 0.05)',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 254, 173, 0.1)',
  },
  listShortcutIcon: {
    marginRight: 12,
  },
  listShortcutContent: {
    flex: 1,
  },
  listShortcutName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFEAD',
    marginBottom: 2,
  },
  listShortcutCount: {
    fontSize: 12,
    color: '#C0C1C1',
  },
  // Activity Tab Styles
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 254, 173, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 254, 173, 0.2)',
  },
  activityIcon: {
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFEAD',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#C0C1C1',
  },
  // Rankings Tab Styles
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 254, 173, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 254, 173, 0.2)',
  },
  rankingPoster: {
    width: 50,
    height: 75,
    borderRadius: 6,
    backgroundColor: '#DC2026',
    marginRight: 12,
  },
  rankingContent: {
    flex: 1,
  },
  rankingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFEAD',
    marginBottom: 4,
  },
  rankingYear: {
    fontSize: 12,
    color: '#C0C1C1',
  },
  rankingStats: {
    alignItems: 'flex-end',
  },
  rankingPosition: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFEAD',
    marginBottom: 2,
  },
  rankingScore: {
    fontSize: 12,
    color: '#C0C1C1',
  },
  // Lists Tab Styles
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 254, 173, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 254, 173, 0.2)',
  },
  listIcon: {
    marginRight: 12,
  },
  listContent: {
    flex: 1,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFEAD',
    marginBottom: 4,
  },
  listSubtitle: {
    fontSize: 12,
    color: '#C0C1C1',
  },
  listCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFEAD',
    marginRight: 8,
  },
  customListsSection: {
    marginTop: 24,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFEAD',
    marginBottom: 16,
  },
  emptyListsText: {
    fontSize: 14,
    color: '#C0C1C1',
    fontStyle: 'italic',
    marginBottom: 12,
    paddingLeft: 36, // Align with list items
  },
  newListButton: {
    borderWidth: 1,
    borderColor: 'rgba(255, 254, 173, 0.3)',
    borderStyle: 'dashed',
  },
  newListText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFEAD',
  },
  // Empty State
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFEAD',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#C0C1C1',
    textAlign: 'center',
  },
});
