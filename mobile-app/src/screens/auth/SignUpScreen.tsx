import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, fontFamily } from '../../theme';
import { Button, Card, Field, Eyebrow } from '../../components/design';
import { AuthService } from '../../services/auth';
import { AuthStackScreenProps } from '../../types/navigation';
import { Logger } from '../../services/logger';

type Props = AuthStackScreenProps<'SignUp'>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Errors {
  email?: string;
  password?: string;
  confirm?: string;
}

export default function SignUpScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const next: Errors = {};
    if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email';
    if (password.length < 6) next.password = 'At least 6 characters';
    if (password !== confirm) next.confirm = 'Doesn\'t match';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const { data, error } = await AuthService.signUp(email.trim(), password);
      if (error) {
        Alert.alert('Sign up failed', error.message);
      } else if (data.user) {
        Alert.alert(
          'Check your inbox',
          'We sent a verification email. Confirm your address to sign in.',
          [{ text: 'OK', onPress: () => navigation.navigate('SignIn') }]
        );
      }
    } catch (err) {
      Logger.error('Sign up error', err);
      Alert.alert('Sign up failed', 'Please try again.');
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
          <Eyebrow>NEW ACCOUNT</Eyebrow>
          <Text style={styles.title}>Start a collection.</Text>
          <Text style={styles.subtitle}>
            One account keeps your collection synced and backed up.
          </Text>
        </View>

        <Card style={styles.card}>
          <Field
            label="EMAIL"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
            }}
            invalid={!!errors.email}
            helper={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            placeholder="you@example.com"
          />
          <Field
            label="PASSWORD"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
            }}
            invalid={!!errors.password}
            helper={errors.password ?? 'At least 6 characters'}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password-new"
            textContentType="newPassword"
            placeholder="••••••••"
          />
          <Field
            label="CONFIRM PASSWORD"
            value={confirm}
            onChangeText={(t) => {
              setConfirm(t);
              if (errors.confirm) setErrors((e) => ({ ...e, confirm: undefined }));
            }}
            invalid={!!errors.confirm}
            helper={errors.confirm}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password-new"
            textContentType="newPassword"
            placeholder="••••••••"
          />
          <Button
            label={loading ? 'Creating account…' : 'Create account'}
            variant="gold"
            onPress={handleSignUp}
            disabled={loading}
          />
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Pressable onPress={() => navigation.navigate('SignIn')} hitSlop={6}>
            <Text style={styles.footerLink}>Sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  footerText: { fontFamily: fontFamily.ui, fontSize: 13, color: palette.fg3 },
  footerLink: { fontFamily: fontFamily.uiMedium, fontSize: 13, color: palette.gold },
});
