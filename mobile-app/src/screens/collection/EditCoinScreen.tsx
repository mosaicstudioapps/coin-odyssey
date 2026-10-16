import React, { useEffect, useState } from 'react';
import { Alert, View, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { coinToFormValues, formValuesToFields } from '@coin-collecting/shared';

import { useTheme } from '../../theme';
import { CoinForm, CoinFormValues, emptyCoinForm } from '../../components/forms/CoinForm';
import { CoinService } from '../../services/coinService';
import { supabase } from '../../services/supabase';
import { Logger } from '../../services/logger';
import { CollectionStackParamList } from '../../types/navigation';

type EditCoinRouteProp = RouteProp<CollectionStackParamList, 'EditCoin'>;

export default function EditCoinScreen() {
  const { palette } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<EditCoinRouteProp>();
  const { coinId } = route.params;

  const [loading, setLoading] = useState(true);
  const [initial, setInitial] = useState<CoinFormValues>(emptyCoinForm);
  const [coinName, setCoinName] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('coins')
          .select('*')
          .eq('id', coinId)
          .single();
        if (error) throw error;
        const [coin] = await CoinService.resolveImageUrls([
          CoinService.mapSupabaseToCoin(data),
        ]);
        if (cancelled) return;
        setCoinName(coin.name ?? '');
        setInitial(coinToFormValues(coin));
      } catch (err) {
        Logger.error('Failed to load coin for edit', err);
        Alert.alert('Could not load coin', 'Please try again.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [coinId, navigation]);

  const onSave = async (values: CoinFormValues) => {
    try {
      await CoinService.updateCoin(coinId, {
        // Cleared fields are sent as null, so clearing one actually clears it.
        ...formValuesToFields(values, 'update'),
        obverseImage: values.obverseUri && values.obverseUri !== initial.obverseUri
          ? values.obverseUri
          : undefined,
        reverseImage: values.reverseUri && values.reverseUri !== initial.reverseUri
          ? values.reverseUri
          : undefined,
      });
      Logger.info('Coin updated', { coinId });
      Alert.alert('Saved', 'Your changes are in your collection.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Logger.error('Failed to update coin', err);
      Alert.alert(
        'Could not save',
        err instanceof Error ? err.message : 'Please try again.'
      );
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={palette.goldText} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <CoinForm
        eyebrow="EDIT COIN"
        title={coinName || 'Edit entry'}
        initial={initial}
        saveLabel="Save changes"
        savingLabel="Saving…"
        onSave={onSave}
        onCancel={() => navigation.goBack()}
      />
    </View>
  );
}
