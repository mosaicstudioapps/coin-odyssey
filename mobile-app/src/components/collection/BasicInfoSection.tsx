// src/components/collection/BasicInfoSection.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors, Typography, Spacing, GlassmorphismStyles } from '../../styles';
import { Input, CoinNameSuggestions } from '../common';

interface BasicInfoSectionProps {
  formData: {
    name: string;
    title: string;
    year: string;
    denomination: string;
    country: string;
    mintMark: string;
  };
  onFieldChange: (field: string, value: string) => void;
  showCoinSuggestions: boolean;
  onCoinSuggestionSelect: (suggestion: any) => void;
}

export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  formData,
  onFieldChange,
  showCoinSuggestions,
  onCoinSuggestionSelect,
}) => {
  return (
    <BlurView intensity={60} style={styles.formSection}>
      <Text style={styles.sectionTitle}>📋 Basic Information</Text>

      <View style={styles.helpCard}>
        <Text style={styles.helpText}>
          💡 Tip: Specific coin names make series and album matching more accurate
        </Text>
        <Text style={styles.helpSubtext}>
          Examples: "Morgan Dollar", "Peace Dollar", "American Women Quarter", "Walking Liberty Half"
          {'\n'}Avoid generic terms like "Commemorative" - be specific about the design or series
        </Text>
      </View>

      <View style={styles.inputWithSuggestions}>
        <Input
          label="Coin Name *"
          placeholder="e.g. American Women Quarter, Morgan Dollar, Walking Liberty Half"
          value={formData.name}
          onChangeText={(value) => onFieldChange('name', value)}
          style={styles.input}
          accessibilityLabel="Coin name input"
          accessibilityHint="Enter the specific name of the coin"
        />
        <CoinNameSuggestions
          query={formData.name}
          onSuggestionSelect={onCoinSuggestionSelect}
          visible={showCoinSuggestions}
        />
      </View>

      <Input
        label="Title/Description"
        placeholder="e.g. Sally Ride, Peace Design, 1916-D Key Date"
        value={formData.title}
        onChangeText={(value) => onFieldChange('title', value)}
        style={styles.input}
        accessibilityLabel="Coin title or description"
      />

      <View style={styles.gridRow}>
        <View style={styles.gridInput}>
          <Input
            label="Year *"
            placeholder="e.g. 2022 (just the year)"
            value={formData.year}
            onChangeText={(value) => onFieldChange('year', value)}
            keyboardType="numeric"
            accessibilityLabel="Year coin was minted"
          />
        </View>

        <View style={styles.gridInput}>
          <Input
            label="Denomination *"
            placeholder="e.g. Quarter, Dollar, Cent"
            value={formData.denomination}
            onChangeText={(value) => onFieldChange('denomination', value)}
            accessibilityLabel="Coin denomination"
          />
        </View>
      </View>

      <View style={styles.gridRow}>
        <View style={styles.gridInput}>
          <Input
            label="Country"
            placeholder="United States"
            value={formData.country}
            onChangeText={(value) => onFieldChange('country', value)}
            accessibilityLabel="Country of origin"
          />
        </View>

        <View style={styles.gridInput}>
          <Input
            label="Mint Mark"
            placeholder="S, D, O, etc."
            value={formData.mintMark}
            onChangeText={(value) => onFieldChange('mintMark', value)}
            accessibilityLabel="Mint mark"
          />
        </View>
      </View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  formSection: {
    ...GlassmorphismStyles.card,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  helpCard: {
    ...GlassmorphismStyles.card,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.text.secondary,
    borderStyle: 'dashed',
  },
  helpText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    fontWeight: Typography.fontWeight.medium,
  },
  helpSubtext: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  inputWithSuggestions: {
    position: 'relative',
    zIndex: 200,
    marginBottom: Spacing.md,
  },
  input: {
    marginBottom: Spacing.md,
  },
  gridRow: {
    flexDirection: 'row',
    width: '100%',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  gridInput: {
    flex: 1,
  },
});
