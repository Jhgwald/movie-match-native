import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, PanResponder, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_WIDTH - 64; // Account for padding
const THUMB_SIZE = 24;
const TRACK_HEIGHT = 4;
const THUMB_HIT_AREA = 44; // Larger hit area for easier dragging

interface YearRangeSliderProps {
  minYear: number;
  maxYear: number;
  valueMin: number | undefined;
  valueMax: number | undefined;
  onValueChange: (min: number | undefined, max: number | undefined) => void;
}

export default function YearRangeSlider({
  minYear,
  maxYear,
  valueMin,
  valueMax,
  onValueChange,
}: YearRangeSliderProps) {
  const [trackWidth, setTrackWidth] = useState(SLIDER_WIDTH);
  const [activeThumb, setActiveThumb] = useState<'min' | 'max' | null>(null);
  const trackRef = useRef<View>(null);
  const trackX = useRef(0);

  // Default to full range if not set
  const currentMin = valueMin ?? minYear;
  const currentMax = valueMax ?? maxYear;

  const getPositionFromValue = useCallback(
    (value: number) => {
      const range = maxYear - minYear;
      if (range === 0) return 0;
      const percentage = (value - minYear) / range;
      return percentage * trackWidth;
    },
    [minYear, maxYear, trackWidth]
  );

  const getValueFromPosition = useCallback(
    (position: number) => {
      const percentage = Math.max(0, Math.min(1, position / trackWidth));
      const value = Math.round(minYear + percentage * (maxYear - minYear));
      return Math.max(minYear, Math.min(maxYear, value));
    },
    [minYear, maxYear, trackWidth]
  );

  const handleTrackLayout = (event: any) => {
    const { width, x } = event.nativeEvent.layout;
    setTrackWidth(width);
    trackRef.current?.measureInWindow((winX, winY) => {
      trackX.current = winX;
    });
  };

  const updateTrackPosition = useCallback(() => {
    if (trackRef.current) {
      trackRef.current.measureInWindow((x, y) => {
        trackX.current = x;
      });
    }
  }, []);

  useEffect(() => {
    updateTrackPosition();
  }, [updateTrackPosition]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2;
      },
      onPanResponderGrant: (evt) => {
        updateTrackPosition();
        const touchX = evt.nativeEvent.pageX;
        const relativeX = touchX - trackX.current;

        const minPos = getPositionFromValue(currentMin);
        const maxPos = getPositionFromValue(currentMax);

        // Determine which thumb is closer
        const distToMin = Math.abs(relativeX - minPos);
        const distToMax = Math.abs(relativeX - maxPos);

        if (distToMin < distToMax && distToMin < THUMB_HIT_AREA) {
          setActiveThumb('min');
        } else if (distToMax < THUMB_HIT_AREA) {
          setActiveThumb('max');
        } else if (relativeX < minPos) {
          // Clicked before min thumb, move min
          setActiveThumb('min');
          const newValue = getValueFromPosition(relativeX);
          onValueChange(newValue, currentMax);
        } else if (relativeX > maxPos) {
          // Clicked after max thumb, move max
          setActiveThumb('max');
          const newValue = getValueFromPosition(relativeX);
          onValueChange(currentMin, newValue);
        } else {
          // Clicked between thumbs, move the closer one
          if (distToMin < distToMax) {
            setActiveThumb('min');
          } else {
            setActiveThumb('max');
          }
        }
      },
      onPanResponderMove: (evt) => {
        if (!activeThumb) return;

        const touchX = evt.nativeEvent.pageX;
        const relativeX = Math.max(0, Math.min(trackWidth, touchX - trackX.current));
        const newValue = getValueFromPosition(relativeX);

        if (activeThumb === 'min') {
          // Ensure min doesn't exceed max
          const newMin = Math.min(newValue, currentMax);
          onValueChange(newMin, currentMax);
        } else {
          // Ensure max doesn't go below min
          const newMax = Math.max(newValue, currentMin);
          onValueChange(currentMin, newMax);
        }
      },
      onPanResponderRelease: () => {
        setActiveThumb(null);
      },
      onPanResponderTerminate: () => {
        setActiveThumb(null);
      },
    })
  ).current;

  const minPosition = getPositionFromValue(currentMin);
  const maxPosition = getPositionFromValue(currentMax);

  return (
    <View style={styles.container}>
      {/* Year range display */}
      <Text style={styles.rangeText}>
        Year range: {currentMin} – {currentMax}
      </Text>

      {/* Slider track */}
      <View
        ref={trackRef}
        style={styles.trackContainer}
        onLayout={handleTrackLayout}
        {...panResponder.panHandlers}
      >
        {/* Background track */}
        <View style={styles.track} />

        {/* Active range (between thumbs) */}
        <View
          style={[
            styles.activeTrack,
            {
              left: minPosition,
              width: maxPosition - minPosition,
            },
          ]}
        />

        {/* Min thumb */}
        <View
          style={[
            styles.thumb,
            {
              left: minPosition - THUMB_SIZE / 2,
            },
            activeThumb === 'min' && styles.thumbActive,
          ]}
          pointerEvents="none"
        />

        {/* Max thumb */}
        <View
          style={[
            styles.thumb,
            {
              left: maxPosition - THUMB_SIZE / 2,
            },
            activeThumb === 'max' && styles.thumbActive,
          ]}
          pointerEvents="none"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  rangeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3a2b1a',
    marginBottom: 16,
    textAlign: 'center',
  },
  trackContainer: {
    height: THUMB_SIZE,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: TRACK_HEIGHT,
    backgroundColor: '#E0C296',
    borderRadius: TRACK_HEIGHT / 2,
    width: '100%',
  },
  activeTrack: {
    position: 'absolute',
    height: TRACK_HEIGHT,
    backgroundColor: '#7E1616',
    borderRadius: TRACK_HEIGHT / 2,
    top: (THUMB_SIZE - TRACK_HEIGHT) / 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#7E1616',
    borderWidth: 3,
    borderColor: '#FFFEAD',
    top: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  thumbActive: {
    transform: [{ scale: 1.2 }],
    borderColor: '#DC2026',
  },
});

