import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontFamily, makeStyles } from '../../theme';
import { Button, Card, Field, Eyebrow } from '../../components/design';
import { AuthService } from '../../services/auth';
import { Logger } from '../../services/logger';

interface Props {
  /** Called when the user has set a new password or chosen to skip. */
  onDone: () => void;
}

const MIN_LENGTH = 8;

export default function ResetPasswordScreen({ onDone }: Props) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [confirmError, setConfirmError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    let valid = true;
    if (password.length < MIN_LENGTH) {
      setPasswordError(`Use at least ${MIN_LENGTH} characters`);
      valid = false;
    }
    if (confirm !== password) {
      setConfirmError('Passwords do not match');
      valid = false;
    }
    if (!valid) return;

    setLoading(true);
    try {
      const { error } = await AuthService.updatePassword(password);
      if (error) {
        Alert.alert('Could not update password', error.message);
      } else {
        Alert.alert('Password updated', 'You are signed in with your new password.');
        onDone();
      }
    } catch (err) {
      Logger.error('Password update error', err);
      Alert.alert('Could not update password', 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <View style={styles.brandDot} />
          <Text style={styles.brandText}>COIN ODYSSEY</Text>
        </View>

        <View style={styles.header}>
          <Eyebrow>PASSWORD HELP</Eyebrow>
          <Text style={styles.title}>Choose a new password.</Text>
          <Text style={styles.subtitle}>
            Your reset link was verified. Set a new password for your account.
          </Text>
        </View>

        <Card style={styles.card}>
          <Field
            label="NEW PASSWORD"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (passwordError) setPasswordError(undefined);
            }}
            invalid={!!passwordError}
            helper={passwordError}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            placeholder="At least 8 characters"
          />
          <Field
            label="CONFIRM PASSWORD"
            value={confirm}
            onChangeText={(t) => {
              setConfirm(t);
              if (confirmError) setConfirmError(undefined);
            }}
            invalid={!!confirmError}
            helper={confirmError}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            placeholder="Repeat new password"
          />
          <Button
            label={loading ? 'Saving…' : 'Save new password'}
            variant="gold"
            onPress={handleSave}
            disabled={loading}
          />
        </Card>

        <View style={styles.footer}>
          <Pressable onPress={onDone} hitSlop={6} disabled={loading}>
            <Text style={styles.footerLink}>Skip for now</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((palette) => ({
  root: { flex: 1, backgroundColor: palette.bg },
  scroll: { paddingHorizontal: 24, gap: 24 },

  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.gold },
  brandText: {
    fontFamily: fontFamily.mono,
    fontSize: 10.5,
    letterSpacing: 2,
    color: palette.fg2,
  },

  header: { gap: 6 },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 32,
    color: palette.fg,
    letterSpacing: -0.7,
    marginTop: 4,
  },
  subtitle: {
    fontFamily: fontFamily.ui,
    fontSize: 14,
    color: palette.fg3,
    marginTop: 4,
    lineHeight: 20,
  },

  card: { padding: 18, gap: 14 },

  footer: { alignItems: 'center', marginTop: 8 },
  footerLink: { fontFamily: fontFamily.uiMedium, fontSize: 13, color: palette.goldText },
}));
