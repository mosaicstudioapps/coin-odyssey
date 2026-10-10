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

import { fontFamily, makeStyles, useTheme } from '../../theme';
import { Button, Card, Field, Eyebrow, Icon } from '../../components/design';
import { AuthService } from '../../services/auth';
import { AuthStackScreenProps } from '../../types/navigation';
import { Logger } from '../../services/logger';

type Props = AuthStackScreenProps<'ForgotPassword'>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const styles = useStyles();
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!EMAIL_RE.test(email.trim())) {
      setEmailError('Enter a valid email');
      return;
    }
    setEmailError(undefined);
    setLoading(true);
    try {
      const { error } = await AuthService.resetPassword(email.trim());
      if (error) {
        Alert.alert('Reset failed', error.message);
      } else {
        setSent(true);
      }
    } catch (err) {
      Logger.error('Password reset error', err);
      Alert.alert('Reset failed', 'Please try again.');
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
          <Text style={styles.title}>{sent ? 'Check your inbox.' : 'Reset your password.'}</Text>
          <Text style={styles.subtitle}>
            {sent
              ? `We sent reset instructions to ${email.trim()}.`
              : 'Enter your email and we\'ll send a reset link.'}
          </Text>
        </View>

        {sent ? (
          <Card style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <Icon name="check" size={22} color={palette.goldFg} stroke={2.6} />
            </View>
            <Text style={styles.successTitle}>Email sent</Text>
            <Text style={styles.successBody}>
              The link will expire in about an hour. Didn’t see it? Check your spam folder.
            </Text>
            <Button
              label="Send again"
              variant="ghost"
              onPress={() => {
                setSent(false);
                handleReset();
              }}
            />
          </Card>
        ) : (
          <Card style={styles.card}>
            <Field
              label="EMAIL"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (emailError) setEmailError(undefined);
              }}
              invalid={!!emailError}
              helper={emailError}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              placeholder="you@example.com"
            />
            <Button
              label={loading ? 'Sending…' : 'Send reset link'}
              variant="gold"
              onPress={handleReset}
              disabled={loading}
            />
          </Card>
        )}

        <View style={styles.footer}>
          <Pressable onPress={() => navigation.navigate('SignIn')} hitSlop={6}>
            <Text style={styles.footerLink}>← Back to sign in</Text>
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

  successCard: { padding: 22, alignItems: 'center', gap: 12 },
  successIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontFamily: fontFamily.display,
    fontSize: 20,
    color: palette.fg,
    letterSpacing: -0.4,
  },
  successBody: {
    fontFamily: fontFamily.ui,
    fontSize: 13,
    color: palette.fg3,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 8,
  },

  footer: { alignItems: 'center', marginTop: 8 },
  footerLink: { fontFamily: fontFamily.uiMedium, fontSize: 13, color: palette.goldText },
}));
