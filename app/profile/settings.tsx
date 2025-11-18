import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Image,
  Alert,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useBlindMode } from '../../src/context/BlindModeContext';
import { useProfile } from '../../src/context/ProfileContext';
import { useAppSettings, type StreamingService } from '../../src/context/SettingsContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { blindModeSettings, updateBlindModeSetting } = useBlindMode();
  const { profile, updateProfile } = useProfile();
  const { settings, updateStreamingService, updateNotification, updatePrivacy, updateContentPreference } = useAppSettings();
  const [localProfile, setLocalProfile] = useState(profile);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    profile: true, // Profile section expanded by default
    streaming: false,
    notifications: false,
    privacy: false,
    content: false,
    unbiased: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Update local state when profile changes
  useEffect(() => {
    setLocalProfile(profile);
  }, [profile]);

  const requestImagePickerPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need access to your photo library to set a profile picture.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const handlePickImage = async () => {
    const hasPermission = await requestImagePickerPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        updateProfile({ profilePictureUri: result.assets[0].uri });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerStyle: { backgroundColor: '#7E1616' },
          headerTintColor: '#FFFEAD',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFEAD" />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Profile Picture Section */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('profile')}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>Profile</Text>
              <Ionicons
                name={expandedSections.profile ? 'chevron-down' : 'chevron-forward'}
                size={20}
                color="#FFFEAD"
              />
            </TouchableOpacity>
            {expandedSections.profile && (
              <>
            <TouchableOpacity
              style={styles.profilePictureRow}
              onPress={handlePickImage}
              activeOpacity={0.7}
            >
              <View style={styles.profilePictureContainer}>
                {localProfile.profilePictureUri ? (
                  <Image
                    source={{ uri: localProfile.profilePictureUri }}
                    style={styles.profilePicture}
                  />
                ) : (
                  <View style={styles.profilePicturePlaceholder}>
                    <Ionicons name="person" size={40} color="#FFFEAD" />
                  </View>
                )}
              </View>
              <View style={styles.profilePictureTextContainer}>
                <Text style={styles.profilePictureLabel}>Profile Picture</Text>
                <Text style={styles.profilePictureDescription}>
                  Tap to choose from your photos
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#C0C1C1" />
            </TouchableOpacity>

            {/* Display Name Input */}
            <View style={styles.inputRow}>
              <View style={styles.inputLabelContainer}>
                <Ionicons name="person-outline" size={20} color="#FFFEAD" style={styles.inputIcon} />
                <Text style={styles.inputLabel}>Display Name</Text>
              </View>
              <TextInput
                style={styles.textInput}
                value={localProfile.name}
                onChangeText={(text) => setLocalProfile({ ...localProfile, name: text })}
                onBlur={() => updateProfile({ name: localProfile.name })}
                placeholder="Enter your display name"
                placeholderTextColor="#8e8e93"
                autoCapitalize="words"
              />
            </View>

            {/* Username Input */}
            <View style={styles.inputRow}>
              <View style={styles.inputLabelContainer}>
                <Ionicons name="at-outline" size={20} color="#FFFEAD" style={styles.inputIcon} />
                <Text style={styles.inputLabel}>Username</Text>
              </View>
              <View style={styles.usernameInputContainer}>
                <Text style={styles.usernamePrefix}>@</Text>
                <TextInput
                  style={styles.usernameTextInput}
                  value={localProfile.username.startsWith('@') ? localProfile.username.substring(1) : localProfile.username}
                  onChangeText={(text) => {
                    // Strip any @ symbols the user might type
                    const cleanText = text.replace(/@/g, '');
                    setLocalProfile({ ...localProfile, username: cleanText });
                  }}
                  onBlur={() => {
                    // Ensure no @ in stored value
                    const cleanUsername = localProfile.username.replace(/@/g, '');
                    updateProfile({ username: cleanUsername });
                    setLocalProfile({ ...localProfile, username: cleanUsername });
                  }}
                  placeholder="username"
                  placeholderTextColor="#8e8e93"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Bio Input */}
            <View style={styles.inputRow}>
              <View style={styles.inputLabelContainer}>
                <Ionicons name="document-text-outline" size={20} color="#FFFEAD" style={styles.inputIcon} />
                <Text style={styles.inputLabel}>Bio</Text>
              </View>
              <TextInput
                style={[styles.textInput, styles.bioInput]}
                value={localProfile.bio || ''}
                onChangeText={(text) => {
                  // Limit to 120 characters
                  const limitedText = text.length > 120 ? text.substring(0, 120) : text;
                  setLocalProfile({ ...localProfile, bio: limitedText });
                }}
                onBlur={() => updateProfile({ bio: localProfile.bio || '' })}
                placeholder="Write something about yourself…"
                placeholderTextColor="#8e8e93"
                multiline
                numberOfLines={3}
                maxLength={120}
              />
              <Text style={styles.charCount}>
                {(localProfile.bio || '').length}/120
              </Text>
            </View>
              </>
            )}
          </View>

          {/* Streaming Services Section */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('streaming')}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>Streaming Services</Text>
              <Ionicons
                name={expandedSections.streaming ? 'chevron-down' : 'chevron-forward'}
                size={20}
                color="#FFFEAD"
              />
            </TouchableOpacity>
            {expandedSections.streaming && (
              <>
                <Text style={styles.sectionDescription}>
                  Select which streaming services you have access to
                </Text>
                <View style={styles.settingsGroup}>
                  {(['Netflix', 'Hulu', 'Prime Video', 'Max', 'Disney+', 'Apple TV+', 'Peacock', 'Paramount+'] as StreamingService[]).map((service) => (
                    <SettingRow
                      key={service}
                      icon="tv-outline"
                      label={service}
                      value={settings.streamingServices[service]}
                      onValueChange={(value) => updateStreamingService(service, value)}
                    />
                  ))}
                </View>
              </>
            )}
          </View>

          {/* Notifications Section */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('notifications')}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>Notifications</Text>
              <Ionicons
                name={expandedSections.notifications ? 'chevron-down' : 'chevron-forward'}
                size={20}
                color="#FFFEAD"
              />
            </TouchableOpacity>
            {expandedSections.notifications && (
              <View style={styles.settingsGroup}>
              <SettingRow
                icon="notifications-outline"
                label="Allow Notifications"
                description="Enable push notifications for the app"
                value={settings.notifications.allowNotifications}
                onValueChange={(value) => updateNotification('allowNotifications', value)}
              />
              <SettingRow
                icon="film-outline"
                label="New Movies to Rank"
                description="Get notified when new movies are added to your ranking list"
                value={settings.notifications.newMoviesToRank}
                onValueChange={(value) => updateNotification('newMoviesToRank', value)}
              />
              <SettingRow
                icon="people-outline"
                label="Friend Activity"
                description="Get notified about your friends' movie activity"
                value={settings.notifications.friendActivity}
                onValueChange={(value) => updateNotification('friendActivity', value)}
              />
              <SettingRow
                icon="calendar-outline"
                label="Watch Party Invites"
                description="Get notified when friends invite you to watch parties"
                value={settings.notifications.watchPartyInvites}
                onValueChange={(value) => updateNotification('watchPartyInvites', value)}
              />
              </View>
            )}
          </View>

          {/* Data & Privacy Section */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('privacy')}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>Data & Privacy</Text>
              <Ionicons
                name={expandedSections.privacy ? 'chevron-down' : 'chevron-forward'}
                size={20}
                color="#FFFEAD"
              />
            </TouchableOpacity>
            {expandedSections.privacy && (
              <View style={styles.settingsGroup}>
              <SettingRow
                icon="lock-closed-outline"
                label="Make Profile Private"
                description="Only approved followers can see your profile"
                value={settings.privacy.makeProfilePrivate}
                onValueChange={(value) => updatePrivacy('makeProfilePrivate', value)}
              />
              <SettingRow
                icon="eye-off-outline"
                label="Hide My Activity From Friends"
                description="Your movie activity will not be visible to friends"
                value={settings.privacy.hideActivityFromFriends}
                onValueChange={(value) => updatePrivacy('hideActivityFromFriends', value)}
              />
              <TouchableOpacity style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Ionicons name="ban-outline" size={20} color="#FFFEAD" style={styles.settingIcon} />
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingLabel}>Manage Blocked Users</Text>
                    <Text style={styles.settingDescription}>View and manage users you've blocked</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#C0C1C1" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.settingRow, styles.dangerRow]}
                onPress={() => {
                  Alert.alert(
                    'Delete Account',
                    'This action cannot be undone. Are you sure you want to delete your account?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => {
                        // TODO: Implement account deletion logic
                        Alert.alert('Coming Soon', 'Account deletion will be available in a future update.');
                      }},
                    ]
                  );
                }}
              >
                <View style={styles.settingLeft}>
                  <Ionicons name="trash-outline" size={20} color="#DC2026" style={styles.settingIcon} />
                  <View style={styles.settingTextContainer}>
                    <Text style={[styles.settingLabel, styles.dangerText]}>Delete My Account</Text>
                    <Text style={styles.settingDescription}>Permanently delete your account and all data</Text>
                  </View>
                </View>
              </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Content Preferences Section */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('content')}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>Content Preferences</Text>
              <Ionicons
                name={expandedSections.content ? 'chevron-down' : 'chevron-forward'}
                size={20}
                color="#FFFEAD"
              />
            </TouchableOpacity>
            {expandedSections.content && (
              <View style={styles.settingsGroup}>
              <SettingRow
                icon="warning-outline"
                label="Hide Adult Content"
                description="Exclude R-rated and mature content from recommendations"
                value={settings.contentPreferences.hideAdultContent}
                onValueChange={(value) => updateContentPreference('hideAdultContent', value)}
              />
              <TouchableOpacity style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Ionicons name="language-outline" size={20} color="#FFFEAD" style={styles.settingIcon} />
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingLabel}>Preferred Languages</Text>
                    <Text style={styles.settingDescription}>
                      {settings.contentPreferences.preferredLanguages.length > 0
                        ? settings.contentPreferences.preferredLanguages.join(', ')
                        : 'Select preferred languages (Coming soon)'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#C0C1C1" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Ionicons name="globe-outline" size={20} color="#FFFEAD" style={styles.settingIcon} />
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingLabel}>Preferred Regions</Text>
                    <Text style={styles.settingDescription}>
                      {settings.contentPreferences.preferredRegions.length > 0
                        ? settings.contentPreferences.preferredRegions.join(', ')
                        : 'Select preferred regions (Coming soon)'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#C0C1C1" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Ionicons name="heart-outline" size={20} color="#FFFEAD" style={styles.settingIcon} />
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingLabel}>Favorite Genres</Text>
                    <Text style={styles.settingDescription}>
                      {settings.contentPreferences.favoriteGenres.length > 0
                        ? settings.contentPreferences.favoriteGenres.join(', ')
                        : 'Select your favorite genres (Coming soon)'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#C0C1C1" />
              </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Unbiased Mode Section */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('unbiased')}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>Unbiased Mode</Text>
              <Ionicons
                name={expandedSections.unbiased ? 'chevron-down' : 'chevron-forward'}
                size={20}
                color="#FFFEAD"
              />
            </TouchableOpacity>
            {expandedSections.unbiased && (
              <>
                <Text style={styles.sectionDescription}>
                  Hide specific score types to avoid external influence while keeping your own rankings visible
                </Text>

                <View style={styles.settingsGroup}>
              <SettingRow
                icon="star-outline"
                label="Hide IMDb rating"
                description="Hide IMDb scores on movie cards and details"
                value={blindModeSettings.hideImdb}
                onValueChange={(value) => updateBlindModeSetting('hideImdb', value)}
              />
              <SettingRow
                icon="film-outline"
                label="Hide Rotten Tomatoes critic score"
                description="Hide RT Critics scores on movie cards and details"
                value={blindModeSettings.hideRtCritics}
                onValueChange={(value) => updateBlindModeSetting('hideRtCritics', value)}
              />
              <SettingRow
                icon="people-outline"
                label="Hide Rotten Tomatoes audience score"
                description="Hide RT Audience scores on movie cards and details"
                value={blindModeSettings.hideRtAudience}
                onValueChange={(value) => updateBlindModeSetting('hideRtAudience', value)}
              />
              <SettingRow
                icon="tv-outline"
                label="Hide TMDB score"
                description="Hide TMDB ratings on movie cards and details"
                value={blindModeSettings.hideTmdb}
                onValueChange={(value) => updateBlindModeSetting('hideTmdb', value)}
              />
              <SettingRow
                icon="heart-outline"
                label="Hide friends' average rating"
                description="Hide friends' ratings in details and social sections"
                value={blindModeSettings.hideFriendsRating}
                onValueChange={(value) => updateBlindModeSetting('hideFriendsRating', value)}
              />
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function SettingRow({
  icon,
  label,
  description,
  value,
  onValueChange,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        {icon && (
          <Ionicons name={icon} size={20} color="#FFFEAD" style={styles.settingIcon} />
        )}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7E1616',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFEAD',
    letterSpacing: 0.5,
  },
  profilePictureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 254, 173, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 254, 173, 0.2)',
  },
  profilePictureContainer: {
    marginRight: 16,
  },
  profilePicture: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#FFFEAD',
  },
  profilePicturePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#DC2026',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFEAD',
  },
  profilePictureTextContainer: {
    flex: 1,
  },
  profilePictureLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFEAD',
    marginBottom: 4,
  },
  profilePictureDescription: {
    fontSize: 13,
    color: '#C0C1C1',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 254, 173, 0.1)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
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
    color: '#FFFEAD',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#C0C1C1',
    lineHeight: 18,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#C0C1C1',
    marginBottom: 16,
    lineHeight: 20,
  },
  settingsGroup: {
    backgroundColor: 'rgba(255, 254, 173, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 254, 173, 0.2)',
    overflow: 'hidden',
  },
  backButton: {
    marginLeft: 16,
    padding: 4,
  },
  inputRow: {
    backgroundColor: 'rgba(255, 254, 173, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 254, 173, 0.2)',
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputIcon: {
    marginRight: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFEAD',
  },
  textInput: {
    fontSize: 16,
    color: '#FFFEAD',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 254, 173, 0.3)',
  },
  usernameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 254, 173, 0.3)',
    paddingLeft: 12,
  },
  usernamePrefix: {
    fontSize: 16,
    color: '#FFFEAD',
    fontWeight: '500',
  },
  usernameTextInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFEAD',
    padding: 12,
    paddingLeft: 4,
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    marginTop: 8,
  },
  charCount: {
    fontSize: 12,
    color: '#8e8e93',
    textAlign: 'right',
    marginTop: 4,
  },
  dangerRow: {
    borderTopWidth: 2,
    borderTopColor: 'rgba(220, 32, 38, 0.3)',
    marginTop: 8,
    paddingTop: 16,
  },
  dangerText: {
    color: '#DC2026',
  },
});

