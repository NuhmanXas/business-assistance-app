import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Platform,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

const REPORTS = [
  { id: 'sales-summary', title: 'Sales Summary', icon: 'bar-chart' as keyof typeof MaterialIcons.glyphMap, color: '#5b8def' },
//   { id: 'inventory-levels', title: 'Inventory Levels', icon: 'inventory', color: '#2ec4b6' },
  { id: 'vendor-balances', title: 'Vendor Balances', icon: 'people' as keyof typeof MaterialIcons.glyphMap, color: '#f59e0b' },
  { id: 'customer-balances', title: 'Customer Balances', icon: 'person' as keyof typeof MaterialIcons.glyphMap, color: '#06b6d4' },
//   { id: 'profit-loss', title: 'Profit & Loss', icon: 'account-balance', color: '#f973b0' },
//   { id: 'cash-flow', title: 'Cash Flow', icon: 'trending-up', color: '#7c3aed' },
];

export default function ReportsScreen() {
  const router = useRouter();

  const handlePress = (report: { id: string; title: string }) => {
    router.push(`/reports/${report.id}` as unknown as never);
  };

  return (
    <ThemedView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={[0, 0]}
        end={[1, 0]}
        style={styles.headerWrap}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[
              styles.headerIcon,
              Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
            ]}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerTitles}>
            <ThemedText style={styles.title}>Reports</ThemedText>
            <ThemedText style={styles.subtitle}>
              Quick insights and summaries
            </ThemedText>
          </View>

          
        </View>
      </LinearGradient>

      <View style={styles.contentContainer}>
        <ThemedView style={styles.reportsCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <MaterialIcons name="assessment" size={24} color="#667eea" />
            </View>
            <ThemedText style={styles.cardTitle}>Available Reports</ThemedText>
          </View>

          <View style={styles.reportsList}>
            {REPORTS.map((item, index) => (
              <View key={item.id}>
                <TouchableOpacity
                  style={[
                    styles.reportItem,
                    Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
                  ]}
                  onPress={() => handlePress(item)}
                  activeOpacity={0.8}
                >
                  <View style={styles.reportItemLeft}>
                    <View style={[styles.reportIcon, { backgroundColor: `${item.color}15` }]}>
                      <MaterialIcons name={item.icon} size={24} color={item.color} />
                    </View>
                    <View style={styles.reportInfo}>
                      <ThemedText style={styles.reportTitle}>{item.title}</ThemedText>
                      <ThemedText style={styles.reportSubtitle}>
                        Tap to view details and download
                      </ThemedText>
                    </View>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color="#94a3b8" />
                </TouchableOpacity>
                {index < REPORTS.length - 1 && <View style={styles.reportDivider} />}
              </View>
            ))}
          </View>
        </ThemedView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerWrap: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerTitles: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 10,
  },
  reportsCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  reportsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  reportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  reportItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reportIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  reportSubtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  reportDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16,
  },
});
