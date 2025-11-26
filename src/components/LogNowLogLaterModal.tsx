import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MovieBase, Movie } from '../types/movie';

interface LogNowLogLaterModalProps {
  visible: boolean;
  movie: MovieBase | Movie | null;
  onLogNow: () => void;
  onLogLater: () => void;
  onClose: () => void;
}

export default function LogNowLogLaterModal({
  visible,
  movie,
  onLogNow,
  onLogLater,
  onClose,
}: LogNowLogLaterModalProps) {
  if (!movie) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContainer}>
              <View style={styles.header}>
                <Text style={styles.title}>How do you want to log this?</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#8e8e93" />
                </TouchableOpacity>
              </View>

              <View style={styles.movieInfo}>
                <Text style={styles.movieTitle}>{movie.title}</Text>
                {movie.year && (
                  <Text style={styles.movieYear}>({movie.year})</Text>
                )}
              </View>

              <View style={styles.optionsContainer}>
                <TouchableOpacity
                  style={[styles.optionButton, styles.logNowButton]}
                  onPress={() => {
                    // Don't call onClose here - let handleLogNow handle closing the modal
                    // This ensures movieToLog is preserved for the LogMovieSheet
                    onLogNow();
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                  <Text style={styles.optionButtonText}>Log now</Text>
                  <Text style={styles.optionDescription}>
                    Process immediately
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.optionButton, styles.logLaterButton]}
                  onPress={() => {
                    onLogLater();
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="time-outline" size={24} color="#fff" />
                  <Text style={styles.optionButtonText}>Log later</Text>
                  <Text style={styles.optionDescription}>
                    Add to Movies to be Ranked
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#1c1c1e',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  closeButton: {
    padding: 4,
    marginLeft: 12,
  },
  movieInfo: {
    marginBottom: 24,
    alignItems: 'center',
  },
  movieTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  movieYear: {
    fontSize: 14,
    color: '#8e8e93',
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  logNowButton: {
    backgroundColor: '#4caf50',
  },
  logLaterButton: {
    backgroundColor: '#007AFF',
  },
  optionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  optionDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 'auto',
  },
});

