import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Svg, { Rect, Mask, Circle, Defs, G } from 'react-native-svg';

type Props = {
  width: number;
  height?: number;
  radius?: number;
  notchRadius?: number;
  notchTop?: boolean;
  notchBottom?: boolean;
  children?: React.ReactNode;
  backgroundColor?: string;
  contentStyle?: StyleProp<ViewStyle>;
};

export default function TicketShape({
  width,
  height = 640,
  radius = 24,
  notchRadius = 36,
  notchTop = true,
  notchBottom = true,
  children,
  backgroundColor = '#F7E8C8',
  contentStyle,
}: Props) {
  const w = width;
  const h = height;
  const cx = w / 2;

  return (
    <View style={{ width: w, height: h }}>
      <Svg width={w} height={h}>
        <Defs>
          <Mask id="ticketMask">
            <Rect x={0} y={0} width={w} height={h} rx={radius} ry={radius} fill="#fff" />
            {notchTop && <Circle cx={cx} cy={0} r={notchRadius} fill="#000" />}
            {notchBottom && <Circle cx={cx} cy={h} r={notchRadius} fill="#000" />}
          </Mask>
        </Defs>

        <G mask="url(#ticketMask)">
          <Rect x={0} y={0} width={w} height={h} rx={radius} ry={radius} fill={backgroundColor} />
          <Rect
            x={0.5}
            y={0.5}
            width={w - 1}
            height={h - 1}
            rx={radius - 0.5}
            ry={radius - 0.5}
            stroke="#D8C8A4"
            strokeOpacity={0.4}
          />
        </G>
      </Svg>

      <View pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
        <View
          style={[
            styles.content,
            {
              paddingTop: notchTop ? 32 : 20,
              paddingBottom: notchBottom ? 32 : 20,
            },
            contentStyle,
          ]}
        >
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
});
