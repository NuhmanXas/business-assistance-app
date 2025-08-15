// lazy require CameraRoll so app doesn't crash when native module not linked
let CameraRoll: any = null;
try {
 // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
 const mod = require('@react-native-camera-roll/camera-roll');
 CameraRoll = mod && (mod.default || mod);
} catch (e) {
 CameraRoll = null;
 // native module not linked - handle at runtime with fallback
}

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, DocumentData, onSnapshot, orderBy, query, QueryDocumentSnapshot, QuerySnapshot, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Modal, PermissionsAndroid, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { auth, db } from '../constants/firebase';
// lazy require RNFS so app doesn't crash when native module not linked
let RNFS: any = null;
try {
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  const mod = require('react-native-fs');
  RNFS = mod && (mod.default || mod);
} catch (e) {
  RNFS = null;
}

// lazy require Expo FileSystem / MediaLibrary so we can save in Expo-managed apps
let ExpoFileSystem: any = null;
let ExpoMediaLibrary: any = null;
try {
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  const fmod = require('expo-file-system');
  ExpoFileSystem = fmod && (fmod.default || fmod);
} catch (e) {
  ExpoFileSystem = null;
}
try {
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  const mmod = require('expo-media-library');
  ExpoMediaLibrary = mmod && (mmod.default || mmod);
} catch (e) {
  ExpoMediaLibrary = null;
}

export default function PurchaseHistoryScreen() {
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<{ uid: string; email?: string } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [startDate, setStartDate] = useState(''); // expected YYYY-MM-DD
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [paymentType, setPaymentType] = useState<'all' | 'cash' | 'account'>('all');
  const [selectedPurchase, setSelectedPurchase] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (u) setCurrentUser({ uid: u.uid, email: u.email ?? undefined });
      else setCurrentUser(null);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setPurchaseHistory([]);
      return;
    }

    const q = query(collection(db, 'purchases'), where('ownerId', '==', currentUser.uid), orderBy('date', 'desc'));
    const unsub = onSnapshot(q as any, (snapshot: QuerySnapshot<DocumentData>) => {
      setPurchaseHistory(snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, [currentUser]);

  const parseItemDate = (itemDate: any) => {
    // Firestore Timestamp has toDate(), otherwise assume it's a ISO/number
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
      // vendor filter (exact/partial match)
      if (vendorFilter.trim()) {
        const vn = (it.vendorName || '').toString().toLowerCase();
        if (!vn.includes(vendorFilter.toLowerCase())) return false;
      }
      // search by vendor or items
      const vendor = (it.vendorName || '').toString().toLowerCase();
      const itemsText = Array.isArray(it.items) ? it.items.map((x: any) => (x.name || '')).join(' ').toLowerCase() : '';
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!vendor.includes(q) && !itemsText.includes(q)) return false;
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
        if (!it.cashPaid || Number(it.cashPaid) <= 0) return false;
      }
      if (paymentType === 'account') {
        if (!it.onAccount || Number(it.onAccount) <= 0) return false;
      }

      return true;
    });
  };

  const filtered = applyFilters(purchaseHistory);

  const resetFilters = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
    setPaymentType('all');
    setVendorFilter('');
  };

  const openPurchase = (p: any) => {
    setSelectedPurchase(p);
    setModalVisible(true);
  };
  const closeModal = () => {
    setModalVisible(false);
    setSelectedPurchase(null);
  };

  return (
    <ThemedView style={styles.container}>
      <PurchaseDetailModal purchase={selectedPurchase} visible={modalVisible} onClose={closeModal} />
      
      <LinearGradient
        colors={["#667eea", "#764ba2"]}
        start={[0, 0]}
        end={[1, 1]}
        style={styles.headerWrap}
      >
        <View style={styles.headerTop}>
          <Pressable
            onPress={() => {
              const nav: any = navigation;
              try {
                if (typeof nav.canGoBack === 'function' && nav.canGoBack()) {
                  nav.goBack();
                  return;
                }
                if (typeof nav.popToTop === 'function') {
                  nav.popToTop();
                  return;
                }
                if (typeof nav.goBack === 'function') {
                  nav.goBack();
                }
              } catch (err) {
              }
            }}
            style={styles.backBtn}
          >
            <IconSymbol name="chevron.left" size={20} color="#fff" />
          </Pressable>

          <View style={styles.headerTitles}>
            <ThemedText type="title" style={styles.title}>Purchase History</ThemedText>
            <ThemedText type="subtitle" style={styles.subtitle}>View and manage your purchase records</ThemedText>
          </View>
          
          <View style={styles.headerIcon}>
            <MaterialIcons name="shopping-cart" size={28} color="#fff" />
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          {/* Search Section */}
          <View style={styles.searchSection}>
            <View style={styles.searchInputContainer}>
              <MaterialIcons name="search" size={20} color="#64748b" style={styles.searchIcon} />
              <TextInput
                placeholder="Quick search vendor or item"
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.searchInput}
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

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
                  <View style={styles.filterInputGroup}>
                    <TextInput 
                      placeholder="Filter by vendor" 
                      value={vendorFilter} 
                      onChangeText={setVendorFilter} 
                      style={styles.filterInput} 
                    />
                    {vendorFilter.trim().length > 0 && (
                      <View style={styles.suggestionsBox}>
                        {Array.from(new Set(purchaseHistory.map(p => (p.vendorName || '').toString()))).filter(v => v && v.toLowerCase().includes(vendorFilter.toLowerCase())).slice(0, 6).map((v, idx) => (
                          <TouchableOpacity key={idx} onPress={() => setVendorFilter(v)} style={styles.suggestionItem}>
                            <Text>{v}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                  <TextInput 
                    placeholder="Search vendor or item" 
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

          {/* Purchase List */}
          <View style={styles.purchaseListSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <MaterialIcons name="shopping-bag" size={20} color="#667eea" />
                <ThemedText type="title" style={styles.sectionTitle}>Purchase Records</ThemedText>
              </View>
            </View>

            {filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="shopping-bag" size={48} color="#94a3b8" />
                {purchaseHistory.length === 0 ? (
                  <>
                    <ThemedText style={styles.emptyText}>No purchase records yet</ThemedText>
                    <ThemedText style={styles.emptySubtext}>Start making purchases to see your transaction history here</ThemedText>
                  </>
                ) : (
                  <>
                    <ThemedText style={styles.emptyText}>No purchases match your filters</ThemedText>
                    <ThemedText style={styles.emptySubtext}>Try adjusting your search criteria or reset filters</ThemedText>
                  </>
                )}
              </View>
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => {
                  const d = parseItemDate(item.date);
                  const initials = ((item.vendorName || '').split(' ').map((s: any) => s?.[0] || '').join('').slice(0, 2)).toUpperCase();
                  return (
                    <TouchableOpacity activeOpacity={0.85} onPress={() => openPurchase(item)}>
                      <View style={styles.itemCard}>
                        <View style={styles.itemHeader}>
                          <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{initials || '?'}</Text>
                          </View>
                          <View style={styles.itemInfo}>
                            <ThemedText style={styles.vendorName}>{item.vendorName || '—'}</ThemedText>
                            <Text style={styles.itemDate}>
                              <MaterialIcons name="schedule" size={14} color="#64748b" />
                              {' '}{d ? d.toLocaleString() : '—'}
                            </Text>
                            <Text style={styles.itemsText} numberOfLines={2}>
                              <MaterialIcons name="inventory" size={14} color="#64748b" />
                              {' '}{Array.isArray(item.items) ? item.items.map((it: any) => it.name).join(', ') : 'No items'}
                            </Text>
                          </View>
                          <View style={styles.amountSection}>
                            <Text style={styles.totalAmount}>Rs {item.totalAmount?.toLocaleString?.() ?? item.totalAmount}</Text>
                            <View style={styles.paymentBreakdown}>
                              <View style={styles.paymentRow}>
                                <MaterialIcons name="money" size={12} color="#059669" />
                                <Text style={styles.cashAmount}>Rs {item.cashPaid ?? 0}</Text>
                              </View>
                              <View style={styles.paymentRow}>
                                <MaterialIcons name="credit-card" size={12} color="#8b5cf6" />
                                <Text style={styles.accountAmount}>Rs {item.onAccount ?? 0}</Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

// Purchase detail modal (professional document style)
function PurchaseDetailModal({ purchase, visible, onClose }: { purchase: any, visible: boolean, onClose: () => void }) {
 if (!purchase) return <Modal visible={visible} transparent animationType="slide"><View style={{flex:1}}/></Modal>;
 const d = (purchase?.date && (purchase.date?.toDate ? purchase.date.toDate() : new Date(purchase.date))) || new Date();
 const items = Array.isArray(purchase.items) ? purchase.items : [];
 // helper to parse numbers - returns null for non-finite values, but preserves 0
 const toNum = (v: any): number | null => {
   const n = Number(v);
   return Number.isFinite(n) ? n : null;
 };
 const subtotal = items.reduce((s: number, it: any) => {
   const amt = toNum(it.amount ?? it.total ?? it.lineTotal);
   if (amt !== null) return s + amt;
   const qty = toNum(it.qty ?? it.quantity);
   const up = toNum(it.unitPrice ?? it.price ?? it.rate);
   if (qty !== null && up !== null) return s + qty * up;
   return s;
 }, 0);
 const total = Number(purchase.totalAmount ?? subtotal);

 const viewRef = useRef<any>(null);
 const [sharing, setSharing] = useState(false); // reused state for UI ("Downloading..." text)

// Expo fallback to save captured file when RNFS isn't available
const saveWithExpo = async (uri: string, filename: string, platform: 'ios' | 'android') => {
  try {
    if (!ExpoFileSystem || !ExpoMediaLibrary) {
      Alert.alert('Save failed', 'Required Expo modules not available.');
      return;
    }

    const fileUri = uri.startsWith('file://') ? uri : `file://${uri}`;
    const dest = `${ExpoFileSystem.cacheDirectory}${filename}`;

    // copy to cache
    await ExpoFileSystem.copyAsync({ from: fileUri, to: dest });

    // request media library permissions
    const perm = await ExpoMediaLibrary.requestPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permission denied', 'Cannot save without media library permission.');
      return;
    }

    const asset = await ExpoMediaLibrary.createAssetAsync(dest);
    // try create a Downloads album; ignore failure
    try {
      await ExpoMediaLibrary.createAlbumAsync('Downloads', asset, false);
    } catch (e) {
      // ignore
    }

    Alert.alert('Saved', 'Invoice saved to your Photos / Gallery.');
  } catch (err) {
    console.warn('Expo save failed', err);
    Alert.alert('Save failed', 'Unable to save image.');
  }
};

 const handleDownload = async () => {
   try {
     setSharing(true);
     if (!viewRef.current) {
       console.warn('Nothing to capture - viewRef is null');
       Alert.alert('Download failed', 'Nothing to capture.');
       return;
     }

     // capture view as temporary file (tmpfile returns a local file path)
     const uri = await captureRef(viewRef.current, { format: 'png', quality: 0.9, result: 'tmpfile' });
     if (!uri) throw new Error('captureRef did not return a file uri');

     // Normalize path (remove file:// for RNFS operations)
     const srcPath = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
     const filename = `purchase_${purchase.purchaseOrderNumber || purchase.id || Date.now()}.png`;

    if (Platform.OS === 'android') {
        if (!RNFS) {
          // try Expo fallback
          if (ExpoFileSystem && ExpoMediaLibrary) {
            await saveWithExpo(uri, filename, 'android');
            return;
          }
          Alert.alert('Save failed', 'react-native-fs native module is not available. Install and rebuild the app to enable saving on Android.');
          return;
        }
       // Request permission for older Android versions
       if (Platform.Version < 29) {
         const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE, {
           title: 'Storage permission required',
           message: 'App needs access to your storage to save the downloaded invoice',
           buttonPositive: 'OK',
         });
         if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
           Alert.alert('Permission denied', 'Cannot save file without storage permission.');
           return;
         }
       }

       // Destination in the public Downloads folder
       const destPath = `${RNFS.DownloadDirectoryPath}/${filename}`;
       try {
         // try copy (safer than move)
         await RNFS.copyFile(srcPath, destPath);
       } catch (err) {
         // fallback: try move
         try {
           await RNFS.moveFile(srcPath, destPath);
         } catch (err2) {
           throw err2;
         }
       }

       Alert.alert('Saved', `Invoice saved to Downloads as ${filename}`);
     } else {
       // iOS: prefer CameraRoll.save if native module exists; otherwise fallback to app documents
       const fileUri = uri.startsWith('file://') ? uri : `file://${srcPath}`;
       if (CameraRoll && typeof CameraRoll.save === 'function') {
         try {
           await CameraRoll.save(fileUri, { type: 'photo' });
           Alert.alert('Saved', 'Invoice saved to your Photos.');
         } catch (err) {
           console.warn('CameraRoll save failed', err);
           Alert.alert('Save failed', 'Unable to save image to Photos.');
         }
       } else {
         // fallback: copy into app Document directory and inform user
        if (!RNFS) {
            // Use Expo fallback when available
            if (ExpoFileSystem && ExpoMediaLibrary) {
              await saveWithExpo(uri, filename, 'ios');
              return;
            }
            Alert.alert('Save failed', 'File system module not available. Install react-native-fs and rebuild to enable saving.');
        } else {
          try {
            const destPath = `${RNFS.DocumentDirectoryPath}/${filename}`;
            // srcPath already normalized (no file://)
            await RNFS.copyFile(srcPath, destPath);
            Alert.alert('Saved', `Invoice saved to app documents: ${destPath}\nInstall and link @react-native-camera-roll/camera-roll and rebuild to save to Photos.`);
          } catch (err) {
            console.warn('Fallback save failed', err);
            Alert.alert('Save failed', 'Unable to save image. Please install and link @react-native-camera-roll/camera-roll and rebuild the app.');
          }
        }
       }
     }
   } catch (err) {
     console.warn('Download failed', err);
  Alert.alert('Download failed', String(err));
   } finally {
     setSharing(false);
   }
 };

 return (
   <Modal visible={visible} animationType="slide" transparent>
     <View style={styles.modalOverlay}>
       <View style={styles.modalContainer}>
        {/* wrap doc content in a ref so we can capture it */}
         <View ref={viewRef} collapsable={false} style={{ backgroundColor: '#fff' }}>
           <ScrollView contentContainerStyle={{ padding: 18, backgroundColor: '#fff' }}>
             <View style={styles.docHeader}>
               <Text style={styles.docTitle}>Purchase Document</Text>
               <Text style={styles.docSub}>Purchase Order / Invoice</Text>
             </View>

             <View style={styles.docMeta}>
               <View style={styles.metaColumn}>
                 <Text style={styles.metaLabel}>PO / Ref:</Text>
                 <Text style={styles.metaValue}>{purchase.purchaseOrderNumber || purchase.poNumber || purchase.id}</Text>
                 <Text style={styles.metaLabel}>Date:</Text>
                 <Text style={styles.metaValue}>{d.toLocaleString()}</Text>
               </View>
               <View style={styles.metaColumn}>
                 <Text style={styles.metaLabel}>Vendor:</Text>
                 <Text style={styles.metaValue}>{purchase.vendorName || '-'}</Text>
                 {purchase.vendorContact && <Text style={styles.metaValue}>{purchase.vendorContact}</Text>}
                 {purchase.vendorAddress && <Text style={styles.metaValue}>{purchase.vendorAddress}</Text>}
               </View>
             </View>

             <View style={styles.table}>
               <View style={[styles.tableRow, styles.tableHeaderRow]}>
                 <Text style={[styles.cell, styles.cellHeader, { flex: 4 }]}>Item</Text>
                 <Text style={[styles.cell, styles.cellHeader, { flex: 1, textAlign: 'center' }]}>Qty</Text>
                 <Text style={[styles.cell, styles.cellHeader, { flex: 2, textAlign: 'right' }]}>Unit Price</Text>
                 <Text style={[styles.cell, styles.cellHeader, { flex: 2, textAlign: 'right' }]}>Line Total</Text>
               </View>
               {items.map((it: any, idx: number) => {
                 const qty = toNum(it.qty ?? it.quantity);
                 const up = toNum(it.unitPrice ?? it.price ?? it.rate);
                 const amt = toNum(it.amount ?? it.total ?? it.lineTotal);
                 const lineTotal = amt !== null ? amt : (qty !== null && up !== null ? qty * up : null);
                 return (
                   <View key={idx} style={styles.tableRow}>
                     <Text style={[styles.cell, { flex: 4 }]}>{it.name || it.description || '-'}</Text>
                     <Text style={[styles.cell, { flex: 1, textAlign: 'center' }]}>{qty !== null ? qty : '-'}</Text>
                     <Text style={[styles.cell, { flex: 2, textAlign: 'right' }]}>{up !== null ? `Rs ${up.toLocaleString()}` : '-'}</Text>
                     <Text style={[styles.cell, { flex: 2, textAlign: 'right' }]}>{lineTotal !== null ? `Rs ${lineTotal.toLocaleString()}` : '-'}</Text>
                   </View>
                 );
               })}
             </View>

             <View style={styles.totals}>
               <View style={styles.totalsRow}>
                 <Text style={styles.totalsLabel}>Subtotal</Text>
                 <Text style={styles.totalsValue}>Rs {subtotal.toLocaleString()}</Text>
               </View>
               {purchase.taxAmount != null && (
                 <View style={styles.totalsRow}>
                   <Text style={styles.totalsLabel}>Tax</Text>
                   <Text style={styles.totalsValue}>Rs {Number(purchase.taxAmount).toLocaleString()}</Text>
                 </View>
               )}
               <View style={styles.totalsRow}>
                 <Text style={[styles.totalsLabel, { fontWeight: '800' }]}>Total</Text>
                 <Text style={[styles.totalsValue, { fontWeight: '800' }]}>Rs {total.toLocaleString()}</Text>
               </View>
               <View style={styles.totalsRow}>
                 <Text style={styles.totalsLabel}>Cash Paid</Text>
                 <Text style={styles.totalsValue}>Rs {Number(purchase.cashPaid ?? 0).toLocaleString()}</Text>
               </View>
               <View style={styles.totalsRow}>
                 <Text style={styles.totalsLabel}>On Account</Text>
                 <Text style={styles.totalsValue}>Rs {Number(purchase.onAccount ?? 0).toLocaleString()}</Text>
               </View>
             </View>

             {purchase.notes && (
               <View style={{ marginTop: 12 }}>
                 <Text style={styles.metaLabel}>Notes</Text>
                 <Text style={styles.metaValue}>{purchase.notes}</Text>
               </View>
             )}
           </ScrollView>
         </View>

         <View style={styles.modalActions}>
           <Pressable style={[styles.actionBtn, styles.shareBtn]} onPress={handleDownload} disabled={sharing}>
             <Text style={{ color: '#fff', fontWeight: '700' }}>{sharing ? 'Downloading...' : 'Download'}</Text>
           </Pressable>
           <Pressable style={styles.actionBtn} onPress={onClose}>
             <Text style={{ color: '#fff', fontWeight: '700' }}>Close</Text>
           </Pressable>
         </View>
       </View>
     </View>
   </Modal>
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
  searchSection: {
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
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
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
  filterInputGroup: {
    position: 'relative',
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
  purchaseListSection: {
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
  vendorName: {
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
  suggestionsBox: { 
    position: 'absolute', 
    top: 44, 
    left: 0, 
    backgroundColor: '#fff', 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#e6e9f2', 
    zIndex: 1000, 
    maxHeight: 200,
    minWidth: 160,
  },
  suggestionItem: { 
    paddingHorizontal: 10, 
    paddingVertical: 8, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f1f3f8' 
  },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 18 },
  modalContainer: { backgroundColor: '#fff', borderRadius: 12, maxHeight: '90%', overflow: 'hidden' },
  docHeader: { alignItems: 'center', marginBottom: 8 },
  docTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  docSub: { color: '#64748b', marginTop: 4 },
  docMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginBottom: 8 },
  metaColumn: { flex: 1, paddingRight: 8 },
  metaLabel: { color: '#64748b', fontSize: 12, marginTop: 6 },
  metaValue: { color: '#0f172a', fontSize: 14, fontWeight: '700' },
  table: { borderTopWidth: 1, borderTopColor: '#eef2ff', marginTop: 8 },
  tableRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f7ff', alignItems: 'center' },
  tableHeaderRow: { backgroundColor: '#f8fafc' },
  cell: { paddingHorizontal: 6, color: '#0f172a' },
  cellHeader: { color: '#374151', fontWeight: '700' },
  totals: { paddingVertical: 12, paddingHorizontal: 6 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  totalsLabel: { color: '#374151' },
  totalsValue: { color: '#0f172a' },
  modalActions: { padding: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'flex-end' },
  actionBtn: { backgroundColor: '#1e3a8a', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  shareBtn: { backgroundColor: '#10b981', marginRight: 8 },
});
