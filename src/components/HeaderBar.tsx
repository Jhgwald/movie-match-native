import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface HeaderBarProps {
  title: string;
  rightIconName?: string;
  onRightIconPress?: () => void;
}

export default function HeaderBar({
  title,
  rightIconName,
  onRightIconPress,
}: HeaderBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <Text style={styles.headerTitle}>{title}</Text>
      {rightIconName && onRightIconPress && (
        <TouchableOpacity
          onPress={onRightIconPress}
          style={styles.settingsButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name={rightIconName as any} size={24} color="#FFFEAD" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#7E1616',
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFEAD',
    letterSpacing: 0.5,
  },
  settingsButton: {
    padding: 8,
  },
});

