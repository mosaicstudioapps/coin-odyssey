import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Pressable,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

import { palette, fontFamily, radius } from '../../theme';
import { Card, Eyebrow, Field, Button, Icon } from '../design';
import { MintMarkPicker } from './MintMarkPicker';

export interface CoinFormValues {
  name: string;
  year: string;
  denomination: string;
  country: string;
  mintMark: string;
  grade: string;
  series: string;
  designer: string;
  faceValue: string;
  purchasePrice: string;
  purchaseDate: string;
  notes: string;
  obverseUri: string | null;
  reverseUri: string | null;
}

export const emptyCoinForm: CoinFormValues = {
  name: '',
  year: '',
  denomination: '',
  country: '',
  mintMark: '',
  grade: '',
  series: '',
  designer: '',
  faceValue: '',
  purchasePrice: '',
  purchaseDate: '',
  notes: '',
  obverseUri: null,
  reverseUri: null,
};

interface Props {
  eyebrow: string;
  title: string;
  initial?: Partial<CoinFormValues>;
  saveLabel: string;
  savingLabel?: string;
  onSave: (values: CoinFormValues) => Promise<void>;
  onCancel: () => void;
}

interface FieldErrors {
  name?: string;
  year?: string;
  denomination?: string;
  mintMark?: string;
}

export function CoinForm({
  eyebrow,
  title,
  initial,
  saveLabel,
  savingLabel,
  onSave,
  onCancel,
}: Props) {
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState<CoinFormValues>({ ...emptyCoinForm, ...initial });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof CoinFormValues>(key: K, val: CoinFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: val }));
    if (key in errors) {
      setErrors((e) => ({ ...e, [key]: undefined }));
    }
  };

  const pickImage = async (
    side: 'obverseUri' | 'reverseUri',
    source: 'camera' | 'library'
  ) => {
    const status =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status.status !== 'granted') {
      Alert.alert(
        source === 'camera' ? 'Camera permission needed' : 'Photos permission needed',
        'Enable access in Settings to add images.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings().catch(() => {}) },
        ]
      );
      return;
    }

    const fn =
      source === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await fn({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (!result.canceled && result.assets[0]) {
      update(side, result.assets[0].uri);
    }
  };

  const promptImage = (side: 'obverseUri' | 'reverseUri') => {
    Alert.alert(
      side === 'obverseUri' ? 'Add obverse photo' : 'Add reverse photo',
      undefined,
      [
        { text: 'Take photo', onPress: () => pickImage(side, 'camera') },
        { text: 'Choose from library', onPress: () => pickImage(side, 'library') },
        ...(values[side] ? [{ text: 'Remove', style: 'destructive' as const, onPress: () => update(side, null) }] : []),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  };

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!values.name.trim()) next.name = 'Required';
    if (!values.year.trim() || Number.isNaN(Number(values.year))) next.year = 'Enter a year';
    if (!values.denomination.trim()) next.denomination = 'Required';
    // Blank can't be allowed through: it would mean both "no mint mark" and
    // "didn't check", and nothing downstream could tell them apart. "Not sure"
    // is the honest answer when the coin is worn or the collector is unsure.
    if (!values.mintMark.trim()) next.mintMark = 'Pick one — "Not sure" is fine';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    setSaving(true);
    try {
      await onSave(values);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const subtitleLine = useMemo(() => {
    const parts = [values.year, values.country, values.denomination].filter((s) => s.trim());
    return parts.length ? parts.join(' · ').toUpperCase() : null;
  }, [values.year, values.country, values.denomination]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <Text style={styles.title}>{title}</Text>
          {subtitleLine ? <Text style={styles.subtitle}>{subtitleLine}</Text> : null}
        </View>

        {/* Image pair */}
        <View style={styles.imagePair}>
          {(['obverseUri', 'reverseUri'] as const).map((side) => (
            <Pressable
              key={side}
              onPress={() => promptImage(side)}
              style={[
                styles.imageSlot,
                values[side]
                  ? { borderStyle: 'solid', backgroundColor: palette.bg2 }
                  : { borderStyle: 'dashed' },
              ]}
            >
              {values[side] ? (
                <>
                  <Image source={{ uri: values[side] as string }} style={styles.imageFill} />
                  <View style={styles.imageBadge}>
                    <Text style={styles.imageBadgeText}>
                      {side === 'obverseUri' ? 'OBV' : 'REV'}
                    </Text>
                  </View>
                </>
              ) : (
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <Icon name="plus" size={18} color={palette.fg4} />
                  <Text style={styles.imagePlaceholder}>
                    {side === 'obverseUri' ? 'OBVERSE' : 'REVERSE'}
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {/* Basics */}
        <Section title="BASICS">
          <Field
            label="NAME"
            value={values.name}
            onChangeText={(t) => update('name', t)}
            invalid={!!errors.name}
            helper={errors.name}
            placeholder="e.g. 1965 Washington Quarter"
            autoCapitalize="words"
          />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field
                label="YEAR"
                value={values.year}
                onChangeText={(t) => update('year', t.replace(/[^0-9]/g, '').slice(0, 4))}
                invalid={!!errors.year}
                helper={errors.year}
                keyboardType="number-pad"
                placeholder="1965"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="DENOMINATION"
                value={values.denomination}
                onChangeText={(t) => update('denomination', t)}
                invalid={!!errors.denomination}
                helper={errors.denomination}
                placeholder="Quarter"
                autoCapitalize="words"
              />
            </View>
          </View>
          <Field
            label="COUNTRY"
            value={values.country}
            onChangeText={(t) => update('country', t)}
            placeholder="United States"
            autoCapitalize="words"
          />
        </Section>

        {/* Details */}
        <Section title="DETAILS">
          <MintMarkPicker
            value={values.mintMark}
            onChange={(t) => update('mintMark', t)}
            invalid={!!errors.mintMark}
            helper={errors.mintMark}
          />
          <Field
            label="GRADE"
            value={values.grade}
            onChangeText={(t) => update('grade', t)}
            placeholder="MS-65"
            autoCapitalize="characters"
          />
          <Field
            label="SERIES"
            value={values.series}
            onChangeText={(t) => update('series', t)}
            placeholder="Morgan Dollar, Walking Liberty, …"
          />
          <Field
            label="DESIGNER"
            value={values.designer}
            onChangeText={(t) => update('designer', t)}
            placeholder="George T. Morgan"
          />
        </Section>

        {/* Acquisition */}
        <Section title="ACQUISITION">
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field
                label="FACE VALUE"
                value={values.faceValue}
                onChangeText={(t) => update('faceValue', t.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                placeholder="0.25"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="PURCHASE PRICE"
                value={values.purchasePrice}
                onChangeText={(t) => update('purchasePrice', t.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                placeholder="45.00"
              />
            </View>
          </View>
          <Field
            label="PURCHASE DATE"
            value={values.purchaseDate}
            onChangeText={(t) => update('purchaseDate', t)}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
          />
        </Section>

        {/* Notes */}
        <Section title="NOTES">
          <Field
            label="OBSERVATIONS"
            value={values.notes}
            onChangeText={(t) => update('notes', t)}
            placeholder="Anything noteworthy about this coin…"
            multiline
          />
        </Section>

        {/* Actions */}
        <View style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
          <Button label="Cancel" variant="ghost" onPress={onCancel} flex={1} />
          <Button
            label={saving ? savingLabel ?? 'Saving…' : saveLabel}
            variant="gold"
            onPress={handleSave}
            disabled={saving}
            flex={1.4}
            leading={
              !saving ? (
                <Icon name="check" size={15} color={palette.goldFg} stroke={2.4} />
              ) : null
            }
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Eyebrow style={styles.sectionTitle}>{title}</Eyebrow>
      <Card style={styles.sectionCard}>{children as any}</Card>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 18 },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 26,
    color: palette.fg,
    letterSpacing: -0.5,
    marginTop: 6,
  },
  subtitle: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    color: palette.fg3,
    marginTop: 8,
    letterSpacing: 0.5,
  },

  imagePair: { paddingHorizontal: 20, paddingBottom: 18, flexDirection: 'row', gap: 10 },
  imageSlot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.base,
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imageFill: { width: '100%', height: '100%' },
  imageBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  imageBadgeText: {
    fontFamily: fontFamily.mono,
    fontSize: 9,
    color: palette.gold,
    letterSpacing: 1.4,
  },
  imagePlaceholder: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    color: palette.fg4,
    letterSpacing: 1.4,
  },

  section: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 10,
  },
  sectionTitle: { marginLeft: 4 },
  sectionCard: {
    padding: 14,
    gap: 14,
  },

  row: { flexDirection: 'row', gap: 12 },

  actions: {
    paddingHorizontal: 20,
    paddingTop: 8,
    flexDirection: 'row',
    gap: 10,
  },
});
