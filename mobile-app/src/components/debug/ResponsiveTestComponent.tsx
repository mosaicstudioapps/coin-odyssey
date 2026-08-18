// src/components/debug/ResponsiveTestComponent.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, GlassmorphismStyles } from '../../styles';
import { CardBlur } from '../common/OptimizedBlurView';
import { useDeviceInfo, DeviceUtils } from '../../utils/deviceUtils';
import { EnhancedCoinCard } from '../collection/EnhancedCoinCard';
import { Coin } from '../../types/coin';

// Mock coin data for testing
const mockCoin: Coin = {
  id: 'test-coin-1',
  name: 'American Women Quarter',
  title: 'Sally Ride',
  year: 2022,
  denomination: 'Quarter',
  category: 'commemorative',
  country: 'United States',
  mintMark: 'P',
  grade: 'MS-67',
  faceValue: 0.25,
  purchasePrice: 15.00,
  purchaseDate: '2023-01-15',
  obverseImage: '',
  reverseImage: '',
  certificationNumber: '12345678',
  gradingService: 'PCGS',
  notes: 'Beautiful example of the Sally Ride quarter',
  userId: 'test-user',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  collectionId: '',
  currentMarketValue: null,
  lastValueUpdate: null,
  pcgsId: null,
  personalValue: null,
  lastAppraisalValue: null,
  lastAppraisalDate: null,
  mintage: null,
  rarityScale: null,
  historicalNotes: null,
  varietyNotes: null,
  images: null,
  series: null,
  seriesId: null,
  specificCoinId: null,
  specificCoinName: null,
  designer: null,
  theme: null,
  honoree: null,
  releaseDate: null,
};

export const ResponsiveTestComponent = () => {
  const deviceInfo = useDeviceInfo();
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [showDeviceInfo, setShowDeviceInfo] = useState(true);
  
  const testDevices = DeviceUtils.getTestDevices();

  const simulateDevice = (deviceKey: string) => {
    const device = testDevices[deviceKey as keyof typeof testDevices];
    if (device) {
      // Note: This would require modifying Dimensions in a real test environment
      console.log(`Simulating ${device.name}: ${device.width}x${device.height}`);
      setSelectedDevice(deviceKey);
    }
  };

  const renderDeviceInfo = () => (
    <CardBlur style={styles.infoCard}>
      <Text style={styles.infoTitle}>📱 Current Device Info</Text>
      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Dimensions:</Text>
          <Text style={styles.infoValue}>
            {deviceInfo.width}×{deviceInfo.height}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Type:</Text>
          <Text style={styles.infoValue}>{deviceInfo.deviceType}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Orientation:</Text>
          <Text style={styles.infoValue}>{deviceInfo.orientation}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Scale:</Text>
          <Text style={styles.infoValue}>{deviceInfo.scale}x</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Font Scale:</Text>
          <Text style={styles.infoValue}>{deviceInfo.fontScale}x</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Grid Columns:</Text>
          <Text style={styles.infoValue}>{deviceInfo.responsive.gridColumns}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Container Padding:</Text>
          <Text style={styles.infoValue}>{deviceInfo.responsive.containerPadding}px</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Coin Image Size:</Text>
          <Text style={styles.infoValue}>{deviceInfo.responsive.coinImageSize}px</Text>
        </View>
      </View>
    </CardBlur>
  );

  const renderDeviceTests = () => (
    <CardBlur style={styles.testCard}>
      <Text style={styles.testTitle}>🧪 Device Size Tests</Text>
      <Text style={styles.testSubtitle}>
        Tap to see how components would appear on different devices
      </Text>
      
      <View style={styles.deviceGrid}>
        {Object.entries(testDevices).map(([key, device]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.deviceButton,
              selectedDevice === key && styles.deviceButtonActive
            ]}
            onPress={() => simulateDevice(key)}
          >
            <Text style={[
              styles.deviceButtonText,
              selectedDevice === key && styles.deviceButtonTextActive
            ]}>
              {device.name}
            </Text>
            <Text style={styles.deviceSize}>
              {device.width}×{device.height}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </CardBlur>
  );

  const renderAdaptiveStyles = () => (
    <CardBlur style={styles.stylesCard}>
      <Text style={styles.stylesTitle}>🎨 Adaptive Styles</Text>
      
      <View style={styles.styleDemo}>
        <Text style={styles.styleDemoTitle}>Font Sizes:</Text>
        <Text style={[styles.fontSample, { fontSize: deviceInfo.adaptiveStyles.text.fontSize.xs }]}>
          Extra Small ({deviceInfo.adaptiveStyles.text.fontSize.xs}px)
        </Text>
        <Text style={[styles.fontSample, { fontSize: deviceInfo.adaptiveStyles.text.fontSize.sm }]}>
          Small ({deviceInfo.adaptiveStyles.text.fontSize.sm}px)
        </Text>
        <Text style={[styles.fontSample, { fontSize: deviceInfo.adaptiveStyles.text.fontSize.md }]}>
          Medium ({deviceInfo.adaptiveStyles.text.fontSize.md}px)
        </Text>
        <Text style={[styles.fontSample, { fontSize: deviceInfo.adaptiveStyles.text.fontSize.lg }]}>
          Large ({deviceInfo.adaptiveStyles.text.fontSize.lg}px)
        </Text>
      </View>

      <View style={styles.styleDemo}>
        <Text style={styles.styleDemoTitle}>Spacing:</Text>
        {Object.entries(deviceInfo.adaptiveStyles.spacing).map(([size, value]) => (
          <View key={size} style={styles.spacingDemo}>
            <View 
              style={[
                styles.spacingBox, 
                { 
                  width: value, 
                  height: value,
                  backgroundColor: Colors.primary.gold
                }
              ]} 
            />
            <Text style={styles.spacingLabel}>
              {size}: {value}px
            </Text>
          </View>
        ))}
      </View>
    </CardBlur>
  );

  const renderCoinCardTest = () => (
    <CardBlur style={styles.coinTestCard}>
      <Text style={styles.coinTestTitle}>🪙 Responsive Coin Card</Text>
      <Text style={styles.coinTestSubtitle}>
        Shows how coin cards adapt to current device size
      </Text>
      
      <View style={[
        styles.coinCardContainer,
        { 
          paddingHorizontal: deviceInfo.responsive.containerPadding,
          flexDirection: deviceInfo.responsive.gridColumns > 2 ? 'row' : 'column',
          flexWrap: 'wrap',
          justifyContent: 'space-between'
        }
      ]}>
        <EnhancedCoinCard
          coin={mockCoin}
          onPress={() => console.log('Coin card pressed')}
        />
        {deviceInfo.responsive.gridColumns > 1 && (
          <EnhancedCoinCard
            coin={{
              ...mockCoin,
              id: 'test-coin-2',
              name: 'Morgan Dollar',
              title: '1921 Peace Design',
              year: 1921,
              denomination: 'Dollar',
              grade: 'AU-58',
            }}
            onPress={() => console.log('Coin card 2 pressed')}
          />
        )}
      </View>
      
      <Text style={styles.gridInfo}>
        Current grid: {deviceInfo.responsive.gridColumns} columns
      </Text>
    </CardBlur>
  );

  return (
    <LinearGradient colors={Colors.background.primary} style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: deviceInfo.responsive.containerPadding }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📏 Responsive Design Test</Text>
          <Text style={styles.headerSubtitle}>
            Testing component adaptation across device sizes
          </Text>
        </View>

        {showDeviceInfo && renderDeviceInfo()}
        
        {renderDeviceTests()}
        
        {renderAdaptiveStyles()}
        
        {renderCoinCardTest()}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  headerTitle: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary.gold,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.md,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  infoCard: {
    ...GlassmorphismStyles.card,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  infoTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoItem: {
    width: '48%',
    marginBottom: Spacing.sm,
  },
  infoLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  testCard: {
    ...GlassmorphismStyles.card,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  testTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  testSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
  },
  deviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  deviceButton: {
    ...GlassmorphismStyles.card,
    width: '48%',
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.background.cardBorder,
  },
  deviceButtonActive: {
    borderColor: Colors.primary.gold,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  deviceButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: 2,
    textAlign: 'center',
  },
  deviceButtonTextActive: {
    color: Colors.primary.gold,
  },
  deviceSize: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  stylesCard: {
    ...GlassmorphismStyles.card,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  stylesTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  styleDemo: {
    marginBottom: Spacing.lg,
  },
  styleDemoTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary.gold,
    marginBottom: Spacing.sm,
  },
  fontSample: {
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  spacingDemo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  spacingBox: {
    marginRight: Spacing.md,
    borderRadius: 2,
  },
  spacingLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  coinTestCard: {
    ...GlassmorphismStyles.card,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  coinTestTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  coinTestSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
  },
  coinCardContainer: {
    marginBottom: Spacing.md,
  },
  gridInfo: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.gold,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  bottomSpacing: {
    height: 40,
  },
});

export default ResponsiveTestComponent;