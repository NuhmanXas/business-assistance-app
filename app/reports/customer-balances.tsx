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

type Customer = {
  id: string;
  name?: string;
  contactNumbers?: string[];
  balance?: string | number;
  createdAt?: string | number;
};

export default function CustomerBalancesReport() {
  const router = useRouter();
  const title = 'Customer Balances';

  const [customers, setCustomers] = useState<Customer[]>([]);
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
      setCustomers([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'customers'), where('ownerId', '==', currentUser.uid));
    const unsub = onSnapshot(q as any, (snapshot: QuerySnapshot<DocumentData>) => {
      const fetched: Customer[] = snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...(d.data() as any) }));
      setCustomers(fetched);
      setLoading(false);
    }, (err) => {
      console.warn('customers onSnapshot error', err);
      setLoading(false);
    });
    return () => unsub();
  }, [currentUser]);

  // Safe parse and computed summary
  const summary = useMemo(() => {
    const parsed = customers.map(c => {
      const raw = (c.balance ?? '').toString().replace(/,/g, '').trim();
      const n = Number(raw);
      const balance = Number.isFinite(n) ? n : 0;
      const createdAt = c.createdAt ? new Date(String(c.createdAt)) : new Date(0);
      return { ...c, balance, createdAt } as Customer & { balance: number; createdAt: Date };
    });

    const totalCustomers = parsed.length;
    const totalBalance = parsed.reduce((s, p) => s + (p.balance as number), 0);
    const avgBalance = totalCustomers ? totalBalance / totalCustomers : 0;
    const positiveCount = parsed.filter(p => (p.balance as number) >= 0).length;
    const negativeCount = totalCustomers - positiveCount;
    const topDebtors = parsed
      .filter(p => (p.balance as number) < 0)
      .sort((a, b) => (a.balance as number) - (b.balance as number))
      .slice(0, 5);
    const recentCustomers = parsed
      .slice()
      .sort((a, b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime())
      .slice(0, 5);

    return { totalCustomers, totalBalance, avgBalance, positiveCount, negativeCount, topDebtors, recentCustomers };
  }, [customers]);

  const format = (n: number) => `Rs ${Math.abs(n).toLocaleString('en-IN')}${n < 0 ? ' (owed)' : ''}`;

  return (
    <ThemedView style={styles.container}>
      <LinearGradient 
        colors={["#667eea", "#764ba2"]} 
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
            <ThemedText type="subtitle" style={styles.subtitle}>Quick snapshot of customer balances</ThemedText>
          </View>
          <View style={styles.headerIcon}>
            <MaterialIcons name="account-balance-wallet" size={28} color="#fff" />
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#667eea" />
            <ThemedText style={styles.loadingText}>Loading customers...</ThemedText>
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
                  <MaterialIcons name="dashboard" size={24} color="#667eea" />
                </View>
                <View style={styles.summaryHeaderText}>
                  <ThemedText type="title" style={styles.summaryTitle}>Customer Overview</ThemedText>
                  <ThemedText style={styles.summarySubtitle}>{summary.totalCustomers} total customers</ThemedText>
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
                  <ThemedText style={styles.statLabel}>Owing</ThemedText>
                </View>
                
                <View style={[styles.statCard, styles.avgCard]}>
                  <MaterialIcons name="analytics" size={20} color="#8b5cf6" />
                  <ThemedText style={styles.statNumber}>Rs {Math.abs(Math.round(summary.avgBalance)).toLocaleString()}</ThemedText>
                  <ThemedText style={styles.statLabel}>Average</ThemedText>
                </View>
              </View>
            </LinearGradient>

            {/* Top Debtors Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <MaterialIcons name="warning" size={20} color="#ef4444" />
                  <ThemedText type="title" style={styles.sectionTitle}>Top Debtors</ThemedText>
                </View>
                <View style={styles.badge}>
                  <ThemedText style={styles.badgeText}>{summary.topDebtors.length}</ThemedText>
                </View>
              </View>

              {summary.topDebtors.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="check-circle" size={48} color="#10b981" />
                  <ThemedText style={styles.emptyText}>No outstanding debts!</ThemedText>
                  <ThemedText style={styles.emptySubtext}>All customers have positive balances</ThemedText>
                </View>
              ) : (
                <View style={styles.listContainer}>
                  {summary.topDebtors.map((item, index) => (
                    <View key={item.id} style={styles.debtorRow}>
                      <View style={styles.rankBadge}>
                        <ThemedText style={styles.rankText}>{index + 1}</ThemedText>
                      </View>
                      <View style={styles.customerInfo}>
                        <ThemedText style={styles.customerName}>{item.name ?? '—'}</ThemedText>
                        <ThemedText style={styles.customerContact}>
                          {(item.contactNumbers && item.contactNumbers.length) ? 
                            `📞 ${item.contactNumbers[0]}` : 'No contact'}
                        </ThemedText>
                      </View>
                      <View style={styles.amountContainer}>
                        <ThemedText style={styles.debtAmount}>{format(item.balance as number)}</ThemedText>
                        <MaterialIcons name="phone" size={16} color="#667eea" />
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Recent Customers Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <MaterialIcons name="schedule" size={20} color="#667eea" />
                  <ThemedText type="title" style={styles.sectionTitle}>Recent Customers</ThemedText>
                </View>
                <TouchableOpacity style={styles.viewAllBtn}>
                  <ThemedText style={styles.viewAllText}>View All</ThemedText>
                  <MaterialIcons name="arrow-forward" size={16} color="#667eea" />
                </TouchableOpacity>
              </View>

              {summary.recentCustomers.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="person-add" size={48} color="#6b7280" />
                  <ThemedText style={styles.emptyText}>No recent customers</ThemedText>
                </View>
              ) : (
                <View style={styles.listContainer}>
                  {summary.recentCustomers.map((item) => (
                    <View key={item.id} style={styles.recentRow}>
                      <View style={styles.avatarContainer}>
                        <ThemedText style={styles.avatarText}>
                          {item.name ? item.name.charAt(0).toUpperCase() : '?'}
                        </ThemedText>
                      </View>
                      <View style={styles.customerInfo}>
                        <ThemedText style={styles.customerName}>{item.name ?? '—'}</ThemedText>
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
    shadowColor: '#667eea',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.1)',
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
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
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
    color: '#667eea',
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
  debtorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  customerContact: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  amountContainer: {
    alignItems: 'flex-end',
    flexDirection: 'row',
  },
  debtAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc2626',
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
    backgroundColor: '#667eea',
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
