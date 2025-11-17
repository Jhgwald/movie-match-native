import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Switch,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFeedPreferences } from '../context/FeedPreferencesContext';
import type { StreamingService } from '../types/feedPreferences';

interface FeedSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const STREAMING_SERVICES: StreamingService[] = [
  'Netflix',
  'Prime Video',
  'Disney+',
  'Max',
  'Hulu',
  'Apple TV+',
  'Peacock',
  'Paramount+',
];

export default function FeedSettingsModal({ visible, onClose }: FeedSettingsModalProps) {
  const { feedPreferences, setFeedPreferences } = useFeedPreferences();

  // Local state for editing (only save on Apply)
  const [ticketLayout, setTicketLayout] = useState(feedPreferences.ticketLayout);
  const [streaming, setStreaming] = useState(feedPreferences.streaming);

  // Update local state when preferences change or modal opens
  useEffect(() => {
    if (visible) {
      setTicketLayout(feedPreferences.ticketLayout);
      setStreaming(feedPreferences.streaming);
    }
  }, [visible, feedPreferences]);

  const handleApply = () => {
    setFeedPreferences({
      ticketLayout,
      streaming,
    });
    onClose();
  };

  const handleCancel = () => {
    // Reset to saved preferences
    setTicketLayout(feedPreferences.ticketLayout);
    setStreaming(feedPreferences.streaming);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
              <Text style={styles.headerButtonText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Feed Settings</Text>
            <TouchableOpacity onPress={handleApply} style={styles.headerButton}>
              <Text style={[styles.headerButtonText, styles.applyButton]}>Apply</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {/* Ticket Layout Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ticket Layout</Text>
              <Text style={styles.sectionDescription}>
                Choose what appears on your movie ticket.
              </Text>

              <View style={styles.settingsGroup}>
                <SettingRow
                  icon="trophy"
                  label="Scores"
                  description="Show IMDb, Rotten Tomatoes, and Friend Score"
                  value={ticketLayout.showScores}
                  onValueChange={(value) =>
                    setTicketLayout({ ...ticketLayout, showScores: value })
                  }
                />
                <SettingRow
                  icon="film"
                  label="Director"
                  description="Show the film director"
                  value={ticketLayout.showDirector}
                  onValueChange={(value) =>
                    setTicketLayout({ ...ticketLayout, showDirector: value })
                  }
                />
                <SettingRow
                  icon="people"
                  label="Cast"
                  description="Show lead actors"
                  value={ticketLayout.showCast}
                  onValueChange={(value) =>
                    setTicketLayout({ ...ticketLayout, showCast: value })
                  }
                />
                <SettingRow
                  icon="pricetags"
                  label="Genre"
                  description="Show movie genres"
                  value={ticketLayout.showGenre}
                  onValueChange={(value) =>
                    setTicketLayout({ ...ticketLayout, showGenre: value })
                  }
                />
                <SettingRow
                  icon="calendar"
                  label="Year"
                  description="Show release year"
                  value={ticketLayout.showYear}
                  onValueChange={(value) =>
                    setTicketLayout({ ...ticketLayout, showYear: value })
                  }
                />
                <SettingRow
                  icon="document-text"
                  label="Plot / Synopsis"
                  description="Show movie description"
                  value={ticketLayout.showPlot}
                  onValueChange={(value) =>
                    setTicketLayout({ ...ticketLayout, showPlot: value })
                  }
                />
              </View>
            </View>

            {/* Streaming Services Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Streaming Services</Text>
              <Text style={styles.sectionDescription}>
                Filter the feed to only show movies available on your services.
              </Text>

              <View style={styles.settingsGroup}>
                {/* Master Toggle */}
                <SettingRow
                  icon="filter"
                  label="Only show movies on my services"
                  description="Filter feed by selected streaming platforms"
                  value={streaming.onlyShowMyServices}
                  onValueChange={(value) =>
                    setStreaming({ ...streaming, onlyShowMyServices: value })
                  }
                  highlighted
                />

                {/* Individual Service Toggles */}
                <View style={styles.servicesContainer}>
                  <Text style={styles.servicesLabel}>My Services:</Text>
                  {STREAMING_SERVICES.map((service) => (
                    <ServiceRow
                      key={service}
                      service={service}
                      value={streaming.services[service]}
                      onValueChange={(value) =>
                        setStreaming({
                          ...streaming,
                          services: { ...streaming.services, [service]: value },
                        })
                      }
                      disabled={!streaming.onlyShowMyServices}
                    />
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function SettingRow({
  icon,
  label,
  description,
  value,
  onValueChange,
  highlighted = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  highlighted?: boolean;
}) {
  return (
    <View style={[styles.settingRow, highlighted && styles.highlightedRow]}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon} size={20} color="#7E1616" style={styles.settingIcon} />
        <View style={styles.settingTextContainer}>
          <Text style={styles.settingLabel}>{label}</Text>
          {description && <Text style={styles.settingDescription}>{description}</Text>}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#D1D5DB', true: '#DC2026' }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function ServiceRow({
  service,
  value,
  onValueChange,
  disabled,
}: {
  service: StreamingService;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled: boolean;
}) {
  return (
    <View style={[styles.serviceRow, disabled && styles.serviceRowDisabled]}>
      <Text style={[styles.serviceLabel, disabled && styles.serviceLabelDisabled]}>
        {service}
      </Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: '#D1D5DB', true: '#DC2026' }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#7E1616', // Dark red background
  },
  container: {
    flex: 1,
    backgroundColor: '#FDF4E0', // Light parchment
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#7E1616',
    borderBottomWidth: 1,
    borderBottomColor: '#DC2026',
  },
  headerButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 60,
  },
  headerButtonText: {
    fontSize: 16,
    color: '#FFFEAD',
    fontWeight: '500',
  },
  applyButton: {
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFEAD',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#3a2b1a',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B4330',
    marginBottom: 16,
    lineHeight: 20,
  },
  settingsGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0C296',
    overflow: 'hidden',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3E9DC',
  },
  highlightedRow: {
    backgroundColor: '#FFF9F0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3a2b1a',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#8D6A3A',
    lineHeight: 16,
  },
  servicesContainer: {
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#E0C296',
  },
  servicesLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7E1616',
    paddingHorizontal: 16,
    paddingVertical: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3E9DC',
  },
  serviceRowDisabled: {
    opacity: 0.4,
  },
  serviceLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#3a2b1a',
  },
  serviceLabelDisabled: {
    color: '#A0A0A0',
  },
});
