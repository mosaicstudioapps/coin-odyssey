import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';

import { palette, fontFamily, radius } from '../../theme';
import { Card, Icon, Eyebrow, Button } from '../../components/design';
import { compressForUpload } from '../../services/imageCapture';
import { Logger } from '../../services/logger';

type Side = 'OBV' | 'REV';

export default function ScanCaptureScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  // Off by default: the torch sits beside the lens, so on a shiny strike it
  // throws a specular hotspot and flattens the relief the model reads. It earns
  // its place in genuinely dim light, or to fill the shadow the phone casts.
  const [torchOn, setTorchOn] = useState(false);

  const [obverseUri, setObverseUri] = useState<string | null>(null);
  const [reverseUri, setReverseUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentSide: Side = obverseUri === null ? 'OBV' : 'REV';
  const stepText = currentSide === 'OBV' ? 'STEP 1 OF 2 · OBVERSE' : 'STEP 2 OF 2 · REVERSE';
  const titleText = currentSide === 'OBV' ? 'Capture the front' : 'Capture the back';

  const capture = async () => {
    if (busy || !cameraRef.current || !cameraReady) return;
    setError(null);
    setBusy(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        skipProcessing: false,
        exif: false,
      });
      if (!photo?.uri) throw new Error('Capture failed — no image returned.');

      const compressed = await compressForUpload(photo.uri);

      if (currentSide === 'OBV') {
        setObverseUri(compressed.uri);
      } else {
        setReverseUri(compressed.uri);
        navigation.navigate('ScanPipeline', {
          obverseUri: obverseUri!,
          reverseUri: compressed.uri,
        });
      }
    } catch (err) {
      Logger.error('Scan capture failed', err);
      setError(err instanceof Error ? err.message : 'Capture failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const retake = (side: Side) => {
    if (busy) return;
    if (side === 'OBV') setObverseUri(null);
    else setReverseUri(null);
  };

  if (!permission) {
    return <View style={[styles.root, { paddingTop: insets.top }]} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 24, paddingHorizontal: 20 }]}>
        <Eyebrow>CAMERA ACCESS</Eyebrow>
        <Text style={styles.title}>Camera permission needed</Text>
        <Text style={styles.permissionBody}>
          Coin Odyssey uses your camera to photograph coins for identification, grading, and pricing.
          We never upload or store images without your action.
        </Text>
        <View style={{ height: 18 }} />
        {permission.canAskAgain ? (
          <Button label="Enable camera" onPress={requestPermission} />
        ) : (
          <Button
            label="Open Settings"
            onPress={() => Linking.openSettings().catch(() => {})}
          />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        <View style={styles.header}>
          <Eyebrow>{stepText}</Eyebrow>
          <Text style={styles.title}>{titleText}</Text>
        </View>

        {/* Live viewfinder */}
        <View style={styles.viewfinderWrap}>
          <View style={styles.viewfinder}>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing="back"
              // Counterintuitive, do not "fix" this to "on": expo-camera's
              // FocusMode is 'on' = focus once then LOCK, 'off' = refocus
              // continuously as needed. "on" locked focus on whatever was in
              // frame at warm-up, so moving in on a coin left it soft.
              autofocus="off"
              enableTorch={torchOn}
              onCameraReady={() => setCameraReady(true)}
            />
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <View style={styles.alignRingOuter}>
                <View style={styles.alignRingInner} />
                <Text style={styles.alignLabel}>ALIGN {currentSide}ERSE</Text>
              </View>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              <View style={styles.viewfinderFooter}>
                <Text style={styles.viewfinderFooterText}>
                  {cameraReady ? '● READY' : '● WARMING UP'}
                </Text>
                <Text style={styles.viewfinderFooterText}>1:1 · JPEG</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Lighting control */}
        <View style={styles.tipWrap}>
          <Pressable
            onPress={() => setTorchOn(v => !v)}
            style={[styles.torchBtn, torchOn && styles.torchBtnOn]}
            accessibilityRole="switch"
            accessibilityState={{ checked: torchOn }}
            accessibilityLabel="Camera light"
          >
            <Text style={[styles.torchText, torchOn && styles.torchTextOn]}>
              LIGHT · {torchOn ? 'ON' : 'OFF'}
            </Text>
          </Pressable>
        </View>

        {/* Tip */}
        <View style={styles.tipWrap}>
          <Card quiet style={styles.tipCard}>
            <Icon name="info" size={14} color={palette.gold} />
            <Text style={styles.tipText}>
              {torchOn
                ? 'Light on — good in dim rooms, but it can blow out shiny coins. Tilt the coin slightly if you see a bright hotspot.'
                : 'Fill the ring with the coin from about 15 cm, hold steady a moment for focus, and keep the phone from shadowing it.'}
            </Text>
          </Card>
        </View>

        {error && (
          <View style={styles.tipWrap}>
            <Card style={styles.errorCard}>
              <Icon name="warning" size={14} color={palette.cLow} />
              <Text style={styles.errorText}>{error}</Text>
            </Card>
          </View>
        )}

        {/* Capture controls */}
        <View style={styles.controls}>
          <View style={styles.sideSpacer} />
          <Pressable
            onPress={capture}
            disabled={busy || !cameraReady}
            style={[styles.shutter, (busy || !cameraReady) && { opacity: 0.5 }]}
          >
            {busy ? (
              <ActivityIndicator color={palette.goldFg} size="small" />
            ) : (
              <View style={styles.shutterInner} />
            )}
          </Pressable>
          <View style={styles.sideSpacer} />
        </View>

        {/* Captured strip */}
        <View style={styles.capturedSection}>
          <Eyebrow style={{ marginBottom: 10 }}>CAPTURED</Eyebrow>
          <View style={styles.capturedRow}>
            <CapturedSlot label="OBV" uri={obverseUri} onPress={() => retake('OBV')} />
            <CapturedSlot label="REV" uri={reverseUri} onPress={() => retake('REV')} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function CapturedSlot({
  label,
  uri,
  onPress,
}: {
  label: string;
  uri: string | null;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!uri}
      style={[
        styles.capturedSlot,
        uri
          ? { borderStyle: 'solid', backgroundColor: palette.bg2 }
          : { borderStyle: 'dashed' },
      ]}
    >
      {uri ? (
        <>
          <Image source={{ uri }} style={styles.capturedImage} />
          <View style={styles.capturedBadge}>
            <Text style={styles.capturedBadgeText}>{label}</Text>
          </View>
        </>
      ) : (
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Icon name="plus" size={16} color={palette.fg4} />
          <Text style={styles.capturedPlaceholder}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 26,
    color: palette.fg,
    letterSpacing: -0.5,
    marginTop: 6,
  },
  permissionBody: {
    fontFamily: fontFamily.ui,
    fontSize: 14,
    color: palette.fg3,
    lineHeight: 20,
    marginTop: 12,
  },

  viewfinderWrap: { paddingHorizontal: 20, paddingBottom: 16 },
  viewfinder: {
    aspectRatio: 1,
    borderRadius: radius.lg,
    backgroundColor: palette.bg2,
    borderWidth: 1,
    borderColor: palette.line,
    overflow: 'hidden',
    position: 'relative',
  },
  alignRingOuter: {
    position: 'absolute',
    top: '10%', left: '10%', right: '10%', bottom: '10%',
    borderRadius: 999,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  alignRingInner: {
    position: 'absolute',
    top: '8%', left: '8%', right: '8%', bottom: '8%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  alignLabel: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.6)',
  },
  corner: {
    position: 'absolute',
    width: 24, height: 24,
    borderColor: palette.gold,
  },
  cornerTL: { top: 14, left: 14, borderTopWidth: 2, borderLeftWidth: 2 },
  cornerTR: { top: 14, right: 14, borderTopWidth: 2, borderRightWidth: 2 },
  cornerBL: { bottom: 14, left: 14, borderBottomWidth: 2, borderLeftWidth: 2 },
  cornerBR: { bottom: 14, right: 14, borderBottomWidth: 2, borderRightWidth: 2 },
  viewfinderFooter: {
    position: 'absolute', bottom: 14, left: 14, right: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  viewfinderFooterText: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
  },

  tipWrap: { paddingHorizontal: 20, paddingBottom: 14 },
  torchBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.line,
  },
  torchBtnOn: { borderColor: palette.goldDim, backgroundColor: palette.chipActiveBg },
  torchText: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    letterSpacing: 1.1,
    color: palette.fg3,
  },
  torchTextOn: { color: palette.gold },
  tipCard: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 12 },
  tipText: {
    flex: 1,
    fontFamily: fontFamily.ui,
    fontSize: 11.5,
    color: palette.fg2,
    lineHeight: 16,
  },
  errorCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    padding: 12,
    borderColor: palette.cLow,
  },
  errorText: {
    flex: 1,
    fontFamily: fontFamily.ui,
    fontSize: 12,
    color: palette.fg,
    lineHeight: 16,
  },

  controls: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  sideSpacer: { width: 48, height: 48 },
  shutter: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: palette.gold,
    borderWidth: 4,
    borderColor: palette.goldRing,
    alignItems: 'center', justifyContent: 'center',
  },
  shutterInner: { width: 0, height: 0 },

  capturedSection: { paddingHorizontal: 20, paddingBottom: 24 },
  capturedRow: { flexDirection: 'row', gap: 10 },
  capturedSlot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.base,
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  capturedImage: { width: '100%', height: '100%' },
  capturedBadge: {
    position: 'absolute',
    top: 6, left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  capturedBadgeText: {
    fontFamily: fontFamily.mono,
    fontSize: 9,
    color: palette.gold,
    letterSpacing: 1,
  },
  capturedPlaceholder: {
    fontFamily: fontFamily.mono,
    fontSize: 9.5,
    color: palette.fg4,
    letterSpacing: 1.33,
  },
});
