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

type Props = AuthStackScreenProps<'SignIn'>;

export default function SignInScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing details', 'Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await AuthService.signIn(email.trim(), password);
      if (error) {
        Alert.alert('Sign in failed', error.message);
      } else if (data.user) {
        Logger.info('Sign in successful');
      }
    } catch (err) {
      Logger.error('Sign in error', err);
      Alert.alert('Sign in failed', 'Please try again.');
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
          <Eyebrow>WELCOME BACK</Eyebrow>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>Pick up where you left off.</Text>
        </View>

        <Card style={styles.card}>
          <Field
            label="EMAIL"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            placeholder="you@example.com"
          />
          <Field
            label="PASSWORD"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
            placeholder="••••••••"
          />
          <Pressable
            onPress={() => navigation.navigate('ForgotPassword')}
            hitSlop={6}
            style={styles.forgotRow}
          >
            <Text style={styles.linkInline}>Forgot password?</Text>
          </Pressable>
          <Button
            label={loading ? 'Signing in…' : 'Sign in'}
            variant="gold"
            onPress={handleSignIn}
            disabled={loading}
          />
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerText}>New here?</Text>
          <Pressable onPress={() => navigation.navigate('SignUp')} hitSlop={6}>
            <Text style={styles.footerLink}>Create an account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  scroll: { paddingHorizontal: 24, gap: 24 },

  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.gold,
  },
  brandText: {
    fontFamily: fontFamily.mono,
    fontSize: 10.5,
    letterSpacing: 2,
    color: palette.fg2,
  },

  header: { gap: 6 },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 36,
    color: palette.fg,
    letterSpacing: -0.8,
    marginTop: 4,
  },
  subtitle: {
    fontFamily: fontFamily.ui,
    fontSize: 14,
    color: palette.fg3,
    marginTop: 4,
  },

  card: {
    padding: 18,
    gap: 14,
  },

  forgotRow: {
    alignSelf: 'flex-end',
    paddingVertical: 2,
  },
  linkInline: {
    fontFamily: fontFamily.ui,
    fontSize: 12.5,
    color: palette.gold,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  footerText: {
    fontFamily: fontFamily.ui,
    fontSize: 13,
    color: palette.fg3,
  },
  footerLink: {
    fontFamily: fontFamily.uiMedium,
    fontSize: 13,
    color: palette.gold,
  },
});
