import { useState, useRef, useEffect } from 'react';
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
  const activeThumbRef = useRef<'min' | 'max' | null>(null);
  const rangeRef = useRef({ min: valueMin ?? minYear, max: valueMax ?? maxYear });
  const trackWidthRef = useRef(trackWidth);
  const minYearRef = useRef(minYear);
  const maxYearRef = useRef(maxYear);
  const onValueChangeRef = useRef(onValueChange);

  // Keep refs synced with latest props/state so the pan responder can read them
  useEffect(() => {
    trackWidthRef.current = trackWidth;
  }, [trackWidth]);

  useEffect(() => {
    minYearRef.current = minYear;
  }, [minYear]);

  useEffect(() => {
    maxYearRef.current = maxYear;
  }, [maxYear]);

  useEffect(() => {
    onValueChangeRef.current = onValueChange;
  }, [onValueChange]);

  // Default to full range if not set
  const currentMin = valueMin ?? minYear;
  const currentMax = valueMax ?? maxYear;

  useEffect(() => {
    rangeRef.current = { min: currentMin, max: currentMax };
  }, [currentMin, currentMax]);

  const updateActiveThumb = (thumb: 'min' | 'max' | null) => {
    activeThumbRef.current = thumb;
    setActiveThumb(thumb);
  };

  const clampPosition = (position: number) => {
    const width = trackWidthRef.current;
    if (width <= 0) return 0;
    return Math.max(0, Math.min(width, position));
  };

  const getPositionFromValue = (value: number) => {
    const minValue = minYearRef.current;
    const maxValue = maxYearRef.current;
    const width = trackWidthRef.current;
    const range = maxValue - minValue;
    if (range <= 0) return 0;
    const percentage = (value - minValue) / range;
    return Math.max(0, Math.min(width, percentage * width));
  };

  const getValueFromPosition = (position: number) => {
    const minValue = minYearRef.current;
    const maxValue = maxYearRef.current;
    const width = trackWidthRef.current;
    if (width <= 0) {
      return minValue;
    }
    const percentage = Math.max(0, Math.min(1, position / width));
    return Math.max(minValue, Math.min(maxValue, Math.round(minValue + percentage * (maxValue - minValue))));
  };

  const updateRange = (thumb: 'min' | 'max', newValue: number) => {
    const { min, max } = rangeRef.current;
    let nextMin = min;
    let nextMax = max;

    if (thumb === 'min') {
      nextMin = Math.min(newValue, nextMax);
    } else {
      nextMax = Math.max(newValue, nextMin);
    }

    rangeRef.current = { min: nextMin, max: nextMax };
    onValueChangeRef.current(nextMin, nextMax);
  };

  const handleTrackLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0) {
      setTrackWidth(width);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const relativeX = clampPosition(evt.nativeEvent.locationX);
        const { min, max } = rangeRef.current;

        const minPos = getPositionFromValue(min);
        const maxPos = getPositionFromValue(max);

        const distToMin = Math.abs(relativeX - minPos);
        const distToMax = Math.abs(relativeX - maxPos);

        if (distToMin < distToMax && distToMin < THUMB_HIT_AREA) {
          updateActiveThumb('min');
        } else if (distToMax < THUMB_HIT_AREA) {
          updateActiveThumb('max');
        } else if (relativeX < minPos) {
          updateActiveThumb('min');
          const newValue = getValueFromPosition(relativeX);
          updateRange('min', newValue);
        } else if (relativeX > maxPos) {
          updateActiveThumb('max');
          const newValue = getValueFromPosition(relativeX);
          updateRange('max', newValue);
        } else {
          if (distToMin <= distToMax) {
            updateActiveThumb('min');
          } else {
            updateActiveThumb('max');
          }
        }
      },
      onPanResponderMove: (evt) => {
        const thumb = activeThumbRef.current;
        if (!thumb) return;

        const relativeX = clampPosition(evt.nativeEvent.locationX);
        const newValue = getValueFromPosition(relativeX);
        updateRange(thumb, newValue);
      },
      onPanResponderRelease: () => {
        updateActiveThumb(null);
      },
      onPanResponderTerminate: () => {
        updateActiveThumb(null);
      },
    })
  ).current;

  const minPosition = getPositionFromValue(currentMin);
  const maxPosition = getPositionFromValue(currentMax);
  const isFullRange = currentMin === minYear && currentMax === maxYear;
  const rangeLabel = isFullRange
    ? `${minYear} – Present`
    : `${currentMin} – ${currentMax}`;

  return (
    <View style={styles.container}>
      {/* Year range display */}
      <Text style={styles.rangeText}>{rangeLabel}</Text>

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
              width: Math.max(0, maxPosition - minPosition),
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
