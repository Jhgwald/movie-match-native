import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CreateNewListModal from './CreateNewListModal';
import { createCustomList, getCustomLists } from '../state/library';
import type { MovieBase, Movie } from '../types/movie';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;

interface LogMovieSheetProps {
  visible: boolean;
  movie: MovieBase | Movie | null;
  onDone: (selectedLists: string[]) => void;
  onClose: () => void;
}

export default function LogMovieSheet({
  visible,
  movie,
  onDone,
  onClose,
}: LogMovieSheetProps) {
  const [masterRankingsSelected, setMasterRankingsSelected] = useState(true);
  const [selectedCustomListIds, setSelectedCustomListIds] = useState<Set<string>>(new Set());
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [customLists, setCustomLists] = useState(getCustomLists());
  const slideAnim = React.useRef(new Animated.Value(SHEET_HEIGHT)).current;

  React.useEffect(() => {
    console.log('[LogMovieSheet] visible changed to:', visible, 'movie:', movie?.title);
    if (visible) {
      // Reset selection when opening
      setMasterRankingsSelected(true);
      setSelectedCustomListIds(new Set());
      // Refresh custom lists
      setCustomLists(getCustomLists());
      // Animate sheet up
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      // Animate sheet down when closing
      Animated.timing(slideAnim, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, movie]);

  const handleCreateList = (name: string) => {
    const newList = createCustomList(name);
    // Refresh custom lists
    setCustomLists(getCustomLists());
    // Auto-select the newly created list
    setSelectedCustomListIds(prev => new Set([...prev, newList.id]));
    setCreateModalVisible(false);
  };

  const toggleCustomList = (listId: string) => {
    setSelectedCustomListIds(prev => {
      const next = new Set(prev);
      if (next.has(listId)) {
        next.delete(listId);
      } else {
        next.add(listId);
      }
      return next;
    });
  };

  console.log('[LogMovieSheet] rendered with movie:', movie?.title, 'visible:', visible);

  const handleDone = () => {
    if (!movie) return;
    const selectedLists: string[] = [];
    if (masterRankingsSelected) {
      selectedLists.push('master-rankings');
    }
    // Add selected custom list IDs
    selectedLists.push(...Array.from(selectedCustomListIds));
    onDone(selectedLists);
  };

  // Always render Modal when visible is true, even if movie is null (it will be set)
  if (!visible) {
    console.log('[LogMovieSheet] Not visible, returning null');
    return null;
  }

  console.log('[LogMovieSheet] Rendering Modal, visible:', visible, 'movie:', movie?.title);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent={true}
      presentationStyle="overFullScreen"
    >
      <View style={styles.backdropContainer}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={(e) => e.stopPropagation()}
          style={styles.sheetContainer}
        >
          <Animated.View
            style={[
              styles.sheet,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Drag Handle */}
            <View style={styles.dragHandle} />

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Log movie</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Movie Info */}
              {movie ? (
                <View style={styles.movieInfo}>
                  {movie.poster ? (
                    <Image
                      source={{ uri: movie.poster }}
                      style={styles.poster}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.poster, styles.posterPlaceholder]}>
                      <Ionicons name="film" size={48} color="#8e8e93" />
                    </View>
                  )}
                  <Text style={styles.movieTitle}>{movie.title}</Text>
                  {movie.year && (
                    <Text style={styles.movieYear}>({movie.year})</Text>
                  )}
                </View>
              ) : (
                <View style={styles.movieInfo}>
                  <Text style={styles.movieTitle}>Loading...</Text>
                </View>
              )}

              {/* Lists Section */}
              <View style={styles.listsSection}>
                <Text style={styles.sectionTitle}>Add this to your lists</Text>

                {/* Master Rankings */}
                <TouchableOpacity
                  style={styles.listItem}
                  onPress={() => setMasterRankingsSelected(!masterRankingsSelected)}
                  activeOpacity={0.7}
                >
                  <View style={styles.listItemContent}>
                    <Ionicons
                      name={masterRankingsSelected ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={masterRankingsSelected ? '#4caf50' : '#8e8e93'}
                    />
                    <Text style={styles.listItemText}>Master Rankings</Text>
                  </View>
                </TouchableOpacity>

                {/* Custom Lists */}
                {customLists.map((list) => {
                  const isSelected = selectedCustomListIds.has(list.id);
                  return (
                    <TouchableOpacity
                      key={list.id}
                      style={styles.listItem}
                      onPress={() => toggleCustomList(list.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.listItemContent}>
                        <Ionicons
                          name={isSelected ? 'checkbox' : 'square-outline'}
                          size={24}
                          color={isSelected ? '#4caf50' : '#8e8e93'}
                        />
                        <Text style={styles.listItemText}>{list.name}</Text>
                      </View>
                      <Text style={styles.listItemCount}>
                        {list.movieIds.length}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {/* Create New List */}
                <TouchableOpacity
                  style={[styles.listItem, styles.createListItem]}
                  onPress={() => {
                    setCreateModalVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.listItemContent}>
                    <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
                    <Text style={[styles.listItemText, styles.createListText]}>
                      + Create new list
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Done Button */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.doneButton}
                onPress={handleDone}
                activeOpacity={0.8}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Create New List Modal */}
      <CreateNewListModal
        visible={createModalVisible}
        onCreate={handleCreateList}
        onClose={() => setCreateModalVisible(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
  },
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: '#0f0f0f',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#8e8e93',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  movieInfo: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  poster: {
    width: 120,
    height: 180,
    borderRadius: 12,
    marginBottom: 16,
  },
  posterPlaceholder: {
    backgroundColor: '#2c2c2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  movieTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  movieYear: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
  },
  listsSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  listItem: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  createListItem: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listItemText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  listItemCount: {
    fontSize: 14,
    color: '#8e8e93',
    marginRight: 8,
  },
  createListText: {
    color: '#007AFF',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#2c2c2e',
    backgroundColor: '#0f0f0f',
  },
  doneButton: {
    backgroundColor: '#4caf50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

