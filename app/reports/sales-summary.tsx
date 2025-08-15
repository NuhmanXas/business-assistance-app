import { auth, db } from '@/constants/firebase';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, DocumentData, getDoc, getDocs, orderBy, query, QueryDocumentSnapshot, QuerySnapshot, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';

export default function SalesSummaryReport() {
  const router = useRouter();
  const id = 'sales-summary';
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<{ uid: string; email?: string } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [startDate, setStartDate] = useState(''); // YYYY-MM-DD
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [paymentType, setPaymentType] = useState<'all' | 'cash' | 'account'>('all');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setCurrentUser({ uid: u.uid, email: u.email ?? undefined });
      else setCurrentUser(null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (!currentUser) {
          setRows([]);
          setLoading(false);
          return;
        }

        const q = query(collection(db, 'sales'), where('ownerId', '==', currentUser.uid), orderBy('date', 'desc'));
        const snap: QuerySnapshot<DocumentData> = await getDocs(q as any);

        const promises = snap.docs.map(async (d: QueryDocumentSnapshot<DocumentData>) => {
          const v: any = d.data();

          // normalize date (Firestore Timestamp or ISO/string)
          const date = v.date?.toDate ? v.date.toDate() : (v.date ? new Date(v.date) : null);

          // resolve item names robustly. items may be:
          // - array of strings
          // - array of objects with { name, quantity }
          // - array of DocumentReference
          const rawItems = Array.isArray(v.items) ? v.items : [];
          const itemsResolved = await Promise.all(rawItems.map(async (it: any) => {
            try {
              if (!it) return '';
              if (typeof it === 'string') return it;
              if (typeof it === 'object' && ('name' in it || 'title' in it)) {
                const name = it.name ?? it.title ?? '';
                const qty = it.quantity ?? it.qty ?? it.qtyOrdered ?? null;
                return qty ? `${name} (x${qty})` : name;
              }
              // Detect DocumentReference-like object by presence of 'id' and 'path'
              if (typeof it === 'object' && 'id' in it && 'path' in it) {
                const doc = await getDoc(it as any);
                const docData: any = doc.exists() ? doc.data() : null;
                const name = docData?.name ?? docData?.title ?? it.id;
                const qty = docData?.quantity ?? it.quantity ?? null;
                return qty ? `${name} (x${qty})` : name;
              }
              // fallback to JSON string
              return JSON.stringify(it);
            } catch (e) {
              console.warn('Failed to resolve item', e);
              return '';
            }
          }));

          return {
            id: d.id,
            date,
            customerName: v.customerName ?? v.customer ?? v.client ?? '',
            items: itemsResolved.filter(Boolean),
            totalAmount: v.totalAmount ?? 0,
            cashReceived: v.cashReceived ?? 0,
            onAccount: v.onAccount ?? 0,
          };
        });

    const data = await Promise.all(promises);
    setRows(data);
      } catch (err) {
        console.error(err);
        Alert.alert('Error', 'Failed to load report data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser]);

  const parseItemDate = (itemDate: any) => {
    try {
      if (!itemDate) return null;
      if (itemDate.toDate) return itemDate.toDate();
      return new Date(itemDate);
    } catch {
      return new Date(itemDate);
    }
  };

  const applyFilters = (items: any[]) => {
    return items.filter((it) => {
      // customer filter (exact/partial match)
      if (customerFilter.trim()) {
        const cn = (it.customerName || '').toString().toLowerCase();
        if (!cn.includes(customerFilter.toLowerCase())) return false;
      }

      // search by customer or items
      const customer = (it.customerName || '').toString().toLowerCase();
      const itemsText = Array.isArray(it.items) ? it.items.join(' ').toLowerCase() : '';
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!customer.includes(q) && !itemsText.includes(q)) return false;
      }

      // date range
      const d = parseItemDate(it.date);
      if (startDate) {
        const sd = new Date(startDate + 'T00:00:00');
        if (!d || d < sd) return false;
      }
      if (endDate) {
        const ed = new Date(endDate + 'T23:59:59');
        if (!d || d > ed) return false;
      }

      // amount
      const total = Number(it.totalAmount ?? 0);
      if (minAmount) {
        const mn = Number(minAmount);
        if (isFinite(mn) && total < mn) return false;
      }
      if (maxAmount) {
        const mx = Number(maxAmount);
        if (isFinite(mx) && total > mx) return false;
      }

      // payment type
      if (paymentType === 'cash') {
        if (!it.cashReceived || Number(it.cashReceived) <= 0) return false;
      }
      if (paymentType === 'account') {
        if (!it.onAccount || Number(it.onAccount) <= 0) return false;
      }

      return true;
    });
  };

  const resetFilters = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
    setPaymentType('all');
    setCustomerFilter('');
  };

  const filtered = applyFilters(rows);

  // compute summary from filtered results
  const summary = filtered.reduce((acc, r) => {
    acc.totalSales += Number(r.totalAmount ?? 0);
    acc.cashReceived += Number(r.cashReceived ?? 0);
    acc.onAccount += Number(r.onAccount ?? 0);
    acc.transactions += 1;
    return acc;
  }, { totalSales: 0, cashReceived: 0, onAccount: 0, transactions: 0 });

  const generateCSV = (headers: string[], dataRows: any[]) => {
    const out: string[] = [];
    out.push(headers.map(h => `"${h.replace(/\"/g, '\"\"')}"`).join(','));
    for (const r of dataRows) {
      out.push(headers.map(h => `"${String(r[h] ?? '') .replace(/\"/g, '\"\"')}"`).join(','));
    }
    return out.join('\n');
  };

  const handleDownload = async () => {
    if (!filtered || filtered.length === 0) return Alert.alert('No data', 'There is no data to export');
    try {
      const headers = ['id','date','customerName','items','totalAmount','cashReceived','onAccount'];
      const dataRows = filtered.map(r => ({ id: r.id, date: r.date ? r.date.toISOString() : '', customerName: r.customerName, items: Array.isArray(r.items) ? r.items.join(' | ') : '', totalAmount: r.totalAmount, cashReceived: r.cashReceived, onAccount: r.onAccount }));

      const csv = generateCSV(headers, dataRows);
      const filename = `${id}-${Date.now()}.csv`;
      const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
      const path = dir + filename;
      await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
      Alert.alert('Saved', `CSV saved to ${path}`);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to export CSV');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <LinearGradient
        colors={["#667eea", "#764ba2"]}
        start={[0, 0]}
        end={[1, 1]}
        style={styles.headerWrap}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <IconSymbol name="chevron.left" size={20} color="#fff" />
          </Pressable>

          <View style={styles.headerTitles}>
            <ThemedText type="title" style={styles.title}>Sales Summary</ThemedText>
            <ThemedText type="subtitle" style={styles.subtitle}>Comprehensive sales analytics and insights</ThemedText>
          </View>
          
          <View style={styles.headerIcon}>
            <MaterialIcons name="trending-up" size={28} color="#fff" />
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#667eea" />
            <ThemedText style={styles.loadingText}>Loading sales data...</ThemedText>
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
                  <MaterialIcons name="analytics" size={24} color="#667eea" />
                </View>
                <View style={styles.summaryHeaderText}>
                  <ThemedText type="title" style={styles.summaryTitle}>Sales Overview</ThemedText>
                  <ThemedText style={styles.summarySubtitle}>{filtered.length} total transactions</ThemedText>
                </View>
                <Pressable onPress={handleDownload} style={styles.downloadBtn}>
                  <MaterialIcons name="download" size={20} color="#fff" />
                  <ThemedText style={styles.downloadText}>Export</ThemedText>
                </Pressable>
              </View>

              <View style={styles.statsRow}>
                <View style={[styles.statCard, styles.totalSalesCard]}>
                  <MaterialIcons name="monetization-on" size={20} color="#059669" />
                  <ThemedText style={styles.statNumber}>Rs {summary.totalSales.toLocaleString()}</ThemedText>
                  <ThemedText style={styles.statLabel}>Total Sales</ThemedText>
                </View>
                
                <View style={[styles.statCard, styles.cashCard]}>
                  <MaterialIcons name="account-balance-wallet" size={20} color="#0ea5e9" />
                  <ThemedText style={styles.statNumber}>Rs {summary.cashReceived.toLocaleString()}</ThemedText>
                  <ThemedText style={styles.statLabel}>Cash</ThemedText>
                </View>
                
                <View style={[styles.statCard, styles.accountCard]}>
                  <MaterialIcons name="credit-card" size={20} color="#8b5cf6" />
                  <ThemedText style={styles.statNumber}>Rs {summary.onAccount.toLocaleString()}</ThemedText>
                  <ThemedText style={styles.statLabel}>On Account</ThemedText>
                </View>
              </View>

              <View style={styles.transactionHighlight}>
                <View style={styles.transactionIconContainer}>
                  <MaterialIcons name="receipt" size={20} color="#667eea" />
                </View>
                <View>
                  <ThemedText style={styles.transactionLabel}>Total Transactions</ThemedText>
                  <ThemedText style={styles.transactionCount}>{summary.transactions}</ThemedText>
                </View>
              </View>
            </LinearGradient>

            {/* Filters Section */}
            <View style={styles.filtersSection}>
              <View style={styles.filtersHeader}>
                <TouchableOpacity 
                  onPress={() => setShowFilters(v => !v)} 
                  style={styles.filtersToggle}
                >
                  <MaterialIcons 
                    name={showFilters ? "filter-list-off" : "filter-list"} 
                    size={20} 
                    color="#667eea" 
                  />
                  <Text style={styles.filtersToggleText}>
                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                  </Text>
                </TouchableOpacity>
                <View style={styles.recordsBadge}>
                  <Text style={styles.recordsText}>{filtered.length} records</Text>
                </View>
              </View>

              {showFilters && (
                <View style={styles.filtersContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScrollContent}>
                    <TextInput 
                      placeholder="Filter by customer" 
                      value={customerFilter} 
                      onChangeText={setCustomerFilter} 
                      style={styles.filterInput} 
                    />
                    <TextInput 
                      placeholder="Search customer or item" 
                      value={searchQuery} 
                      onChangeText={setSearchQuery} 
                      style={styles.filterInput} 
                    />
                    <TextInput 
                      placeholder="Start date (YYYY-MM-DD)" 
                      value={startDate} 
                      onChangeText={setStartDate} 
                      style={styles.filterInput} 
                      keyboardType="numbers-and-punctuation" 
                      maxLength={10} 
                    />
                    <TextInput 
                      placeholder="End date (YYYY-MM-DD)" 
                      value={endDate} 
                      onChangeText={setEndDate} 
                      style={styles.filterInput} 
                      keyboardType="numbers-and-punctuation" 
                      maxLength={10} 
                    />
                    <TextInput 
                      placeholder="Min amount" 
                      value={minAmount} 
                      onChangeText={setMinAmount} 
                      keyboardType="numeric" 
                      style={[styles.filterInput, styles.amountInput]} 
                    />
                    <TextInput 
                      placeholder="Max amount" 
                      value={maxAmount} 
                      onChangeText={setMaxAmount} 
                      keyboardType="numeric" 
                      style={[styles.filterInput, styles.amountInput]} 
                    />
                    
                    <View style={styles.paymentFilters}>
                      <TouchableOpacity 
                        onPress={() => setPaymentType('all')} 
                        style={[styles.paymentFilter, paymentType === 'all' && styles.activePaymentFilter]}
                      >
                        <Text style={[styles.paymentFilterText, paymentType === 'all' && styles.activePaymentFilterText]}>All</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => setPaymentType('cash')} 
                        style={[styles.paymentFilter, paymentType === 'cash' && styles.activePaymentFilter]}
                      >
                        <Text style={[styles.paymentFilterText, paymentType === 'cash' && styles.activePaymentFilterText]}>Cash</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => setPaymentType('account')} 
                        style={[styles.paymentFilter, paymentType === 'account' && styles.activePaymentFilter]}
                      >
                        <Text style={[styles.paymentFilterText, paymentType === 'account' && styles.activePaymentFilterText]}>On Account</Text>
                      </TouchableOpacity>
                    </View>
                    
                    <TouchableOpacity onPress={resetFilters} style={styles.resetButton}>
                      <MaterialIcons name="refresh" size={16} color="#64748b" />
                      <Text style={styles.resetButtonText}>Reset</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Sales List */}
            <View style={styles.salesListSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <MaterialIcons name="list" size={20} color="#667eea" />
                  <ThemedText type="title" style={styles.sectionTitle}>Recent Sales</ThemedText>
                </View>
              </View>

              {filtered.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="receipt-long" size={48} color="#94a3b8" />
                  <ThemedText style={styles.emptyText}>No sales records found</ThemedText>
                  <ThemedText style={styles.emptySubtext}>Try adjusting your filters</ThemedText>
                </View>
              ) : (
                <FlatList 
                  data={filtered} 
                  keyExtractor={i => i.id} 
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.listContent}
                  renderItem={({ item }) => (
                    <View style={styles.itemCard}>
                      <View style={styles.itemHeader}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>
                            {((item.customerName || '').split(' ').map((s: any) => s?.[0] || '').join('').slice(0,2)).toUpperCase() || '?'}
                          </Text>
                        </View>
                        <View style={styles.itemInfo}>
                          <ThemedText style={styles.customerName}>{item.customerName || '—'}</ThemedText>
                          <Text style={styles.itemDate}>
                            <MaterialIcons name="schedule" size={14} color="#64748b" />
                            {' '}{item.date ? item.date.toLocaleDateString() : '-'}
                          </Text>
                          <Text style={styles.itemsText} numberOfLines={2}>
                            <MaterialIcons name="shopping-cart" size={14} color="#64748b" />
                            {' '}{Array.isArray(item.items) ? item.items.join(', ') : 'No items'}
                          </Text>
                        </View>
                        <View style={styles.amountSection}>
                          <Text style={styles.totalAmount}>Rs {Number(item.totalAmount ?? 0).toLocaleString()}</Text>
                          <View style={styles.paymentBreakdown}>
                            <View style={styles.paymentRow}>
                              <MaterialIcons name="money" size={12} color="#059669" />
                              <Text style={styles.cashAmount}>Rs {Number(item.cashReceived ?? 0).toLocaleString()}</Text>
                            </View>
                            <View style={styles.paymentRow}>
                              <MaterialIcons name="credit-card" size={12} color="#8b5cf6" />
                              <Text style={styles.accountAmount}>Rs {Number(item.onAccount ?? 0).toLocaleString()}</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                  )} 
                />
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
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#667eea',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  downloadText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  totalSalesCard: {
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
  },
  cashCard: {
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
  },
  accountCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 8,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  transactionHighlight: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  transactionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  transactionCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 2,
  },
  filtersSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  filtersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filtersToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  filtersToggleText: {
    color: '#667eea',
    fontWeight: '600',
    marginLeft: 8,
  },
  recordsBadge: {
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  recordsText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#475569',
  },
  filtersContainer: {
    marginTop: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
  },
  filtersScrollContent: {
    alignItems: 'center',
    gap: 12,
  },
  filterInput: {
    minWidth: 160,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 14,
  },
  amountInput: {
    minWidth: 120,
  },
  paymentFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentFilter: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  activePaymentFilter: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  paymentFilterText: {
    color: '#667eea',
    fontWeight: '600',
    fontSize: 14,
  },
  activePaymentFilterText: {
    color: '#fff',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  resetButtonText: {
    color: '#64748b',
    fontWeight: '600',
    marginLeft: 6,
  },
  salesListSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
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
  emptyState: {
    alignItems: 'center',
    padding: 40,
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
  listContent: {
    gap: 12,
  },
  itemCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: '#667eea', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 16,
  },
  avatarText: { 
    color: '#fff', 
    fontWeight: 'bold',
    fontSize: 16,
  },
  itemInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  itemDate: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemsText: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  amountSection: {
    alignItems: 'flex-end',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  paymentBreakdown: {
    gap: 4,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cashAmount: {
    fontSize: 12,
    color: '#059669',
    marginLeft: 4,
    fontWeight: '600',
  },
  accountAmount: {
    fontSize: 12,
    color: '#8b5cf6',
    marginLeft: 4,
    fontWeight: '600',
  },
});
