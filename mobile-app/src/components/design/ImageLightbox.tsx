import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Image,
  Pressable,
  Text,
  Dimensions,
  StatusBar as RNStatusBar,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

// Photos are viewed on black in both themes, like the system Photos app.
import { darkPalette as palette, fontFamily } from '../../theme';
import { Icon } from './Icon';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const MIN_SCALE = 1;
const MAX_SCALE = 5;

interface Props {
  visible: boolean;
  uri: string | null;
  label?: string;
  onClose: () => void;
}

export const ImageLightbox: React.FC<Props> = ({ visible, uri, label, onClose }) => {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const reset = () => {
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const close = () => {
    reset();
    onClose();
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      const next = savedScale.value * e.scale;
      scale.value = Math.min(Math.max(next, MIN_SCALE * 0.9), MAX_SCALE);
    })
    .onEnd(() => {
      if (scale.value < MIN_SCALE) {
        scale.value = withTiming(1);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        savedScale.value = 1;
      } else {
        savedScale.value = scale.value;
      }
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value <= 1.02) {
        // when not zoomed, allow swipe-down-to-close drift
        translateY.value = e.translationY;
        return;
      }
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd((e) => {
      if (scale.value <= 1.02) {
        if (Math.abs(e.translationY) > 120) {
          runOnJS(close)();
        } else {
          translateY.value = withTiming(0);
        }
      } else {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1.05) {
        scale.value = withTiming(1);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withTiming(2.5);
        savedScale.value = 2.5;
      }
    });

  const composed = Gesture.Simultaneous(pinch, pan, doubleTap);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (!uri) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={close}
    >
      <RNStatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.95)" />
      <View style={styles.backdrop}>
        <Pressable style={styles.closeBtn} onPress={close} hitSlop={12}>
          <Icon name="x" size={20} color={palette.fg} stroke={2.4} />
        </Pressable>
        {label ? (
          <View style={styles.labelChip}>
            <Text style={styles.labelText}>{label}</Text>
          </View>
        ) : null}
        <GestureDetector gesture={composed}>
          <Animated.View style={[styles.imageWrap, imageStyle]}>
            <Image
              source={{ uri }}
              style={styles.image}
              resizeMode="contain"
            />
          </Animated.View>
        </GestureDetector>
        <Text style={styles.hint}>Pinch to zoom · double-tap to fit · swipe down to close</Text>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  labelChip: {
    position: 'absolute',
    top: 72,
    left: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.gold,
    zIndex: 10,
  },
  labelText: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    color: palette.gold,
  },
  imageWrap: {
    width: SCREEN_W,
    height: SCREEN_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: SCREEN_W,
    height: SCREEN_W,
  },
  hint: {
    position: 'absolute',
    bottom: 40,
    fontFamily: fontFamily.mono,
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
