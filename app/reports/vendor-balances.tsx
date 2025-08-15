import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, DocumentData, onSnapshot, query, QueryDocumentSnapshot, QuerySnapshot, where } from 'firebase/firestore';
import { auth, db } from '../../constants/firebase';

type Vendor = {
  id: string;
  name?: string;
  contactNumbers?: string[];
  balance?: string | number;
  createdAt?: string | number;
};

export default function VendorBalancesReport() {
  const router = useRouter();
  const title = 'Vendor Balances';

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ uid: string; email?: string } | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (u) setCurrentUser({ uid: u.uid, email: u.email ?? undefined });
      else setCurrentUser(null);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    setLoading(true);
    if (!currentUser) {
      setVendors([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'vendors'), where('ownerId', '==', currentUser.uid));
    const unsub = onSnapshot(q as any, (snapshot: QuerySnapshot<DocumentData>) => {
      const fetched: Vendor[] = snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...(d.data() as any) }));
      setVendors(fetched);
      setLoading(false);
    }, (err) => {
      console.warn('vendors onSnapshot error', err);
      setLoading(false);
    });
    return () => unsub();
  }, [currentUser]);

  // Safe parse and computed summary
  const summary = useMemo(() => {
    const parsed = vendors.map(v => {
      const raw = (v.balance ?? '').toString().replace(/,/g, '').trim();
      const n = Number(raw);
      const balance = Number.isFinite(n) ? n : 0;
      const createdAt = v.createdAt ? new Date(String(v.createdAt)) : new Date(0);
      return { ...v, balance, createdAt } as Vendor & { balance: number; createdAt: Date };
    });

    const totalVendors = parsed.length;
    const totalBalance = parsed.reduce((s, p) => s + (p.balance as number), 0);
    const avgBalance = totalVendors ? totalBalance / totalVendors : 0;
    const positiveCount = parsed.filter(p => (p.balance as number) >= 0).length;
    const negativeCount = totalVendors - positiveCount;
    const topCreditors = parsed
      .filter(p => (p.balance as number) > 0)
      .sort((a, b) => (b.balance as number) - (a.balance as number))
      .slice(0, 5);
    const recentVendors = parsed
      .slice()
      .sort((a, b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime())
      .slice(0, 5);

    return { totalVendors, totalBalance, avgBalance, positiveCount, negativeCount, topCreditors, recentVendors };
  }, [vendors]);

  const format = (n: number) => `Rs ${Math.abs(n).toLocaleString('en-IN')}${n > 0 ? ' (credit)' : n < 0 ? ' (owed to vendor)' : ''}`;

  return (
    <ThemedView style={styles.container}>
      <LinearGradient 
        colors={["#f59e0b", "#d97706"]} 
        start={[0,0]} 
        end={[1,1]} 
        style={styles.headerWrap}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <IconSymbol name="chevron.left" size={20} color="#fff" />
          </Pressable>
          <View style={styles.headerTitles}>
            <ThemedText type="title" style={styles.title}>{title}</ThemedText>
            <ThemedText type="subtitle" style={styles.subtitle}>Quick snapshot of vendor balances</ThemedText>
          </View>
          <View style={styles.headerIcon}>
            <MaterialIcons name="store" size={28} color="#fff" />
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#f59e0b" />
            <ThemedText style={styles.loadingText}>Loading vendors...</ThemedText>
          </View>
        ) : (
          <View style={styles.contentContainer}>
            {/* Main Summary Card */}
            <LinearGradient 
              colors={["#ffffff", "#f8fafc"]} 
              style={styles.summaryCard}
            >
              <View style={styles.summaryHeader}>
                <View style={styles.summaryIconContainer}>
                  <MaterialIcons name="dashboard" size={24} color="#f59e0b" />
                </View>
                <View style={styles.summaryHeaderText}>
                  <ThemedText type="title" style={styles.summaryTitle}>Vendor Overview</ThemedText>
                  <ThemedText style={styles.summarySubtitle}>{summary.totalVendors} total vendors</ThemedText>
                </View>
              </View>

              <View style={styles.balanceHighlight}>
                <ThemedText style={styles.balanceLabel}>Net Balance</ThemedText>
                <ThemedText style={[styles.balanceAmount, summary.totalBalance >= 0 ? styles.positiveAmount : styles.negativeAmount]}>
                  {format(summary.totalBalance)}
                </ThemedText>
              </View>

              <View style={styles.statsRow}>
                <View style={[styles.statCard, styles.positiveCard]}>
                  <MaterialIcons name="trending-up" size={20} color="#10b981" />
                  <ThemedText style={styles.statNumber}>{summary.positiveCount}</ThemedText>
                  <ThemedText style={styles.statLabel}>Credit</ThemedText>
                </View>
                
                <View style={[styles.statCard, styles.negativeCard]}>
                  <MaterialIcons name="trending-down" size={20} color="#ef4444" />
                  <ThemedText style={styles.statNumber}>{summary.negativeCount}</ThemedText>
                  <ThemedText style={styles.statLabel}>Owed</ThemedText>
                </View>
                
                <View style={[styles.statCard, styles.avgCard]}>
                  <MaterialIcons name="analytics" size={20} color="#8b5cf6" />
                  <ThemedText style={styles.statNumber}>Rs {Math.abs(Math.round(summary.avgBalance)).toLocaleString()}</ThemedText>
                  <ThemedText style={styles.statLabel}>Average</ThemedText>
                </View>
              </View>
            </LinearGradient>

            {/* Top Creditors Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <MaterialIcons name="star" size={20} color="#10b981" />
                  <ThemedText type="title" style={styles.sectionTitle}>Top Credits</ThemedText>
                </View>
                <View style={styles.badge}>
                  <ThemedText style={styles.badgeText}>{summary.topCreditors.length}</ThemedText>
                </View>
              </View>

              {summary.topCreditors.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="balance" size={48} color="#6b7280" />
                  <ThemedText style={styles.emptyText}>No credit balances</ThemedText>
                  <ThemedText style={styles.emptySubtext}>All vendor accounts are settled</ThemedText>
                </View>
              ) : (
                <View style={styles.listContainer}>
                  {summary.topCreditors.map((item, index) => (
                    <View key={item.id} style={styles.creditorRow}>
                      <View style={styles.rankBadge}>
                        <ThemedText style={styles.rankText}>{index + 1}</ThemedText>
                      </View>
                      <View style={styles.vendorInfo}>
                        <ThemedText style={styles.vendorName}>{item.name ?? '—'}</ThemedText>
                        <ThemedText style={styles.vendorContact}>
                          {(item.contactNumbers && item.contactNumbers.length) ? 
                            `📞 ${item.contactNumbers[0]}` : 'No contact'}
                        </ThemedText>
                      </View>
                      <View style={styles.amountContainer}>
                        <ThemedText style={styles.creditAmount}>{format(item.balance as number)}</ThemedText>
                        <MaterialIcons name="phone" size={16} color="#f59e0b" />
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Recent Vendors Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <MaterialIcons name="schedule" size={20} color="#f59e0b" />
                  <ThemedText type="title" style={styles.sectionTitle}>Recent Vendors</ThemedText>
                </View>
                <TouchableOpacity style={styles.viewAllBtn}>
                  <ThemedText style={styles.viewAllText}>View All</ThemedText>
                  <MaterialIcons name="arrow-forward" size={16} color="#f59e0b" />
                </TouchableOpacity>
              </View>

              {summary.recentVendors.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="store-mall-directory" size={48} color="#6b7280" />
                  <ThemedText style={styles.emptyText}>No recent vendors</ThemedText>
                </View>
              ) : (
                <View style={styles.listContainer}>
                  {summary.recentVendors.map((item) => (
                    <View key={item.id} style={styles.recentRow}>
                      <View style={styles.avatarContainer}>
                        <ThemedText style={styles.avatarText}>
                          {item.name ? item.name.charAt(0).toUpperCase() : '?'}
                        </ThemedText>
                      </View>
                      <View style={styles.vendorInfo}>
                        <ThemedText style={styles.vendorName}>{item.name ?? '—'}</ThemedText>
                        <ThemedText style={styles.dateText}>
                          {new Date((item.createdAt as any)).toLocaleDateString('en-IN')}
                        </ThemedText>
                      </View>
                      <ThemedText style={[styles.balanceText, (item.balance as number) >= 0 ? styles.positiveBalance : styles.negativeBalance]}>
                        {format(item.balance as number)}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  headerWrap: { 
    paddingVertical: 20, 
    paddingHorizontal: 16, 
    paddingTop: 45,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  headerTop: { 
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { 
    width: 44, 
    height: 44, 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderRadius: 12, 
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  headerTitles: { 
    flex: 1, 
    marginLeft: 16,
  },
  headerIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  title: { 
    fontSize: 24, 
    color: '#fff',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  subtitle: { 
    fontSize: 14, 
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#6b7280',
    fontSize: 16,
  },
  summaryCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#f59e0b',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.1)',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  summaryHeaderText: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  summarySubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  balanceHighlight: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 8,
  },
  positiveAmount: {
    color: '#059669',
  },
  negativeAmount: {
    color: '#dc2626',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  positiveCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  negativeCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  avgCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  sectionContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginLeft: 8,
  },
  badge: {
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#475569',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: '#f59e0b',
    fontWeight: '600',
    marginRight: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
  listContainer: {
    gap: 12,
  },
  creditorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  vendorContact: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  amountContainer: {
    alignItems: 'flex-end',
    flexDirection: 'row',
  },
  creditAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
    marginRight: 8,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  dateText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  balanceText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  positiveBalance: {
    color: '#059669',
  },
  negativeBalance: {
    color: '#dc2626',
  },
});
