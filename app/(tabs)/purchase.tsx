
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection, doc, DocumentData, onSnapshot, query, QueryDocumentSnapshot, QuerySnapshot, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../constants/firebase';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
type PurchaseItem = {
  id: string;
  name: string;
  quantity: string;
  price: string;
};

type ItemSuggestion = {
  id: string;
  name: string;
  purchasingPrice: string;
};

type VendorSuggestion = {
  id: string;
  name: string;
  contactNumbers: string[];
  balance?: number | string;
  ownerId?: string;
};

type Vendor = {
  name: string;
  phone: string;
};

export default function PurchaseScreen() {
  const router = useRouter();
  const [items, setItems] = useState<PurchaseItem[]>([]);
  // Suggestions
  const [itemSuggestions, setItemSuggestions] = useState<ItemSuggestion[]>([]);
  const [vendorSuggestions, setVendorSuggestions] = useState<VendorSuggestion[]>([]);
  // Filtered suggestions
  const [filteredItemSuggestions, setFilteredItemSuggestions] = useState<ItemSuggestion[]>([]);
  const [filteredVendorSuggestions, setFilteredVendorSuggestions] = useState<VendorSuggestion[]>([]);
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);
  const [showVendorSuggestions, setShowVendorSuggestions] = useState(false);
  const vendorInputRef = useRef<TextInput>(null);
  const [currentUser, setCurrentUser] = useState<{ uid: string; email?: string } | null>(null);
  // Fetch items and vendors for autocomplete
  useEffect(() => {
    // subscribe to auth
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (u) setCurrentUser({ uid: u.uid, email: u.email ?? undefined });
      else setCurrentUser(null);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    // If not signed in, clear suggestions
    if (!currentUser) {
      setItemSuggestions([]);
      setVendorSuggestions([]);
      return;
    }

    const itemsRef = query(collection(db, 'inventoryItems'), where('ownerId', '==', currentUser.uid));
    const vendorsRef = query(collection(db, 'vendors'), where('ownerId', '==', currentUser.uid));

    const unsubItems = onSnapshot(itemsRef as any, (snapshot: QuerySnapshot<DocumentData>) => {
      const fetched: ItemSuggestion[] = snapshot.docs.map((docSnap: QueryDocumentSnapshot<DocumentData>) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name,
          purchasingPrice: data.purchasingPrice || '',
        };
      });
      setItemSuggestions(fetched);
    });

    const unsubVendors = onSnapshot(vendorsRef as any, (snapshot: QuerySnapshot<DocumentData>) => {
      const fetched: VendorSuggestion[] = snapshot.docs.map((docSnap: QueryDocumentSnapshot<DocumentData>) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name,
          contactNumbers: data.contactNumbers || [],
          balance: data.balance ?? 0,
          ownerId: data.ownerId,
        };
      });
      setVendorSuggestions(fetched);
    });

    return () => {
      unsubItems();
      unsubVendors();
    };
  }, [currentUser]);

  const [modalVisible, setModalVisible] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemQuantity, setItemQuantity] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [vendor, setVendor] = useState<Vendor>({ name: '', phone: '' });
  const [vendorPrevBalance, setVendorPrevBalance] = useState<number>(0);
  const [cashPaid, setCashPaid] = useState('');
  const [onAccount, setOnAccount] = useState('');
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);

  // Add or update item in purchase list
  const handleAddOrUpdateItem = () => {
    const newErrors: any = {};
    if (!itemName.trim()) newErrors.itemName = 'Item name required';
    if (!itemQuantity.trim() || isNaN(Number(itemQuantity)) || Number(itemQuantity) <= 0) newErrors.itemQuantity = 'Valid quantity required';
    if (!itemPrice.trim() || isNaN(Number(itemPrice)) || Number(itemPrice) <= 0) newErrors.itemPrice = 'Valid price required';
    // Prevent duplicate item names (case-insensitive, ignore self when editing)
    const duplicate = items.some(it => it.name.trim().toLowerCase() === itemName.trim().toLowerCase() && it.id !== editingId);
    if (duplicate) newErrors.itemName = 'This item is already added.';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    if (editingId) {
      setItems(items.map(it => it.id === editingId ? { id: editingId, name: itemName, quantity: itemQuantity, price: itemPrice } : it));
    } else {
      setItems([...items, { id: Date.now().toString(), name: itemName, quantity: itemQuantity, price: itemPrice }]);
    }
    setItemName('');
    setItemQuantity('');
    setItemPrice('');
    setEditingId(null);
    setModalVisible(false);
    setShowItemSuggestions(false);
    setErrors({});
  };

  const handleEditItem = (item: PurchaseItem) => {
    setItemName(item.name);
    setItemQuantity(item.quantity);
    setItemPrice(item.price);
    setEditingId(item.id);
    setModalVisible(true);
  };

  const handleDeleteItem = (id: string) => {
    Alert.alert('Delete Item', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setItems(items.filter(it => it.id !== id)) },
    ]);
  };

  // Calculate totals
  const totalAmount = items.reduce((sum, it) => sum + Number(it.price) * Number(it.quantity), 0);
  const cash = Number(cashPaid) || 0;
  const account = Number(onAccount) || 0;

  // Vendor validation
  const handleVendorChange = (field: keyof Vendor, value: string) => {
    setVendor({ ...vendor, [field]: value });
    if (field === 'name') {
      if (value.trim().length > 0) {
        setFilteredVendorSuggestions(
          vendorSuggestions.filter(v => v.name.toLowerCase().includes(value.trim().toLowerCase()))
        );
        setShowVendorSuggestions(true);
      } else {
        setShowVendorSuggestions(false);
      }
    }
  };

  const handleVendorSuggestionSelect = (suggestion: VendorSuggestion) => {
    setVendor({ name: suggestion.name, phone: suggestion.contactNumbers[0] || '' });
    // Try to get previous balance from suggestion (if available)
    // If not available, fetch from Firestore (optional, for now assume 0 if not present)
    if (typeof suggestion.balance === 'number') {
      setVendorPrevBalance(suggestion.balance);
    } else if (typeof suggestion.balance === 'string' && !isNaN(Number(suggestion.balance))) {
      setVendorPrevBalance(Number(suggestion.balance));
    } else {
      setVendorPrevBalance(0);
    }
    setShowVendorSuggestions(false);
    vendorInputRef.current?.blur();
  };
  // Item name autocomplete
  const handleItemNameChange = (value: string) => {
    setItemName(value);
    if (value.trim().length > 0) {
      setFilteredItemSuggestions(
        itemSuggestions.filter(i => i.name.toLowerCase().includes(value.trim().toLowerCase()))
      );
      setShowItemSuggestions(true);
    } else {
      setShowItemSuggestions(false);
    }
  };

  const handleItemSuggestionSelect = (suggestion: ItemSuggestion) => {
    setItemName(suggestion.name);
    setItemPrice(suggestion.purchasingPrice);
    setShowItemSuggestions(false);
  };

  // Save purchase to Firestore
  const handleSubmitPurchase = async () => {
    const newErrors: any = {};
    if (!vendor.name.trim()) newErrors.vendorName = 'Vendor name required';
    if (!items.length) newErrors.items = 'Add at least one item';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    if (!currentUser) {
      Alert.alert('Sign in required', 'Please sign in to save purchases.');
      return;
    }

    setLoading(true);
    try {
      // 1. Save purchase detail with owner info
      const purchaseRef = await addDoc(collection(db, 'purchases'), {
        ownerId: currentUser.uid,
        ownerEmail: currentUser.email ?? null,
        vendorName: vendor.name,
        vendorPhone: vendor.phone,
        items,
        totalAmount,
        cashPaid: cash,
        onAccount: vendorPrevBalance + totalAmount - cash,
        date: new Date().toISOString(),
      });

      // 2. Update vendor balance (credit) only if vendor belongs to current user
      const vendorDoc = vendorSuggestions.find(v => v.name === vendor.name && v.ownerId === currentUser.uid);
      if (vendorDoc) {
        const vendorDocRef = doc(db, 'vendors', vendorDoc.id);
        await updateDoc(vendorDocRef, {
          balance: (vendorPrevBalance + totalAmount - cash),
        });
      }

      Alert.alert('Purchase Saved', 'Your purchase has been recorded successfully.');
      setItems([]);
      setVendor({ name: '', phone: '' });
      setCashPaid('');
      setOnAccount('');
      setVendorPrevBalance(0);
      setErrors({});
    } catch (error) {
      Alert.alert('Error', 'Failed to save purchase. Please try again.');
    } finally {
      setLoading(false);
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
          <View style={styles.headerIcon}>
            <MaterialIcons name="shopping-basket" size={28} color="#fff" />
          </View>
          
          <View style={styles.headerTitles}>
            <ThemedText type="title" style={styles.title}>New Purchase</ThemedText>
            <ThemedText type="subtitle" style={styles.subtitle}>Record vendor purchases and payments</ThemedText>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.contentContainer}>
            
            {/* Vendor Section */}
            <LinearGradient 
              colors={["#ffffff", "#f8fafc"]} 
              style={styles.sectionCard}
            >
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <MaterialIcons name="business" size={24} color="#667eea" />
                </View>
                <View style={styles.sectionHeaderText}>
                  <ThemedText type="title" style={styles.sectionTitle}>Vendor Details</ThemedText>
                  <ThemedText style={styles.sectionSubtitle}>Enter vendor information</ThemedText>
                </View>
              </View>

              <View style={{ position: 'relative' }}>
                <TextInput
                  ref={vendorInputRef}
                  style={styles.input}
                  placeholder="Vendor Name"
                  value={vendor.name}
                  onChangeText={v => handleVendorChange('name', v)}
                  placeholderTextColor="#94a3b8"
                  onFocus={() => vendor.name && setShowVendorSuggestions(true)}
                  autoCorrect={false}
                  autoCapitalize="words"
                />
                {showVendorSuggestions && filteredVendorSuggestions.length > 0 && (
                  <View style={styles.suggestionBox}>
                    {filteredVendorSuggestions.map(suggestion => (
                      <TouchableOpacity key={suggestion.id} style={styles.suggestionItem} onPress={() => handleVendorSuggestionSelect(suggestion)}>
                        <View style={styles.suggestionContent}>
                          <MaterialIcons name="business" size={20} color="#667eea" />
                          <View style={styles.suggestionText}>
                            <Text style={styles.suggestionName}>{suggestion.name}</Text>
                            <Text style={styles.suggestionBalance}>Balance: Rs {Number(suggestion.balance || 0).toLocaleString()}</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              {errors.vendorName && <Text style={styles.errorText}>{errors.vendorName}</Text>}
              
              <TextInput
                style={styles.input}
                placeholder="Phone Number (optional)"
                value={vendor.phone}
                onChangeText={v => handleVendorChange('phone', v)}
                keyboardType="phone-pad"
                placeholderTextColor="#94a3b8"
              />
            </LinearGradient>

            {/* Items Section */}
            <LinearGradient 
              colors={["#ffffff", "#f8fafc"]} 
              style={styles.sectionCard}
            >
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <MaterialIcons name="inventory" size={24} color="#667eea" />
                </View>
                <View style={styles.sectionHeaderText}>
                  <ThemedText type="title" style={styles.sectionTitle}>Purchase Items</ThemedText>
                  <ThemedText style={styles.sectionSubtitle}>{items.length} items added</ThemedText>
                </View>
                <Pressable 
                  style={styles.addBtn} 
                  onPress={() => { 
                    setModalVisible(true); 
                    setEditingId(null); 
                    setItemName(''); 
                    setItemQuantity(''); 
                    setItemPrice(''); 
                    setErrors({});
                  }}
                >
                  <MaterialIcons name="add" size={20} color="#fff" />
                  <ThemedText style={styles.addBtnText}>Add Item</ThemedText>
                </Pressable>
              </View>

              {errors.items && <Text style={styles.errorText}>{errors.items}</Text>}
              
              {items.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="inventory" size={48} color="#94a3b8" />
                  <ThemedText style={styles.emptyText}>No items added yet</ThemedText>
                  <ThemedText style={styles.emptySubtext}>Tap "Add Item" to get started</ThemedText>
                </View>
              ) : (
                <View style={styles.itemsList}>
                  {items.map(item => (
                    <View key={item.id} style={styles.itemCard}>
                      <View style={styles.itemHeader}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>
                            {item.name ? item.name.charAt(0).toUpperCase() : '?'}
                          </Text>
                        </View>
                        <View style={styles.itemInfo}>
                          <ThemedText style={styles.itemName}>{item.name}</ThemedText>
                          <Text style={styles.itemDetail}>
                            <MaterialIcons name="inventory-2" size={14} color="#64748b" />
                            {' '}Qty: {Number(item.quantity).toLocaleString()} • Rs {Number(item.price).toLocaleString()}
                          </Text>
                          <Text style={styles.itemTotal}>
                            Total: Rs {(Number(item.quantity) * Number(item.price)).toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.itemActions}>
                          <TouchableOpacity style={styles.editBtn} onPress={() => handleEditItem(item)}>
                            <MaterialIcons name="edit" size={18} color="#fff" />
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteItem(item.id)}>
                            <MaterialIcons name="delete" size={18} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </LinearGradient>

            {/* Payment Section */}
            <LinearGradient 
              colors={["#ffffff", "#f8fafc"]} 
              style={styles.sectionCard}
            >
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <MaterialIcons name="payment" size={24} color="#667eea" />
                </View>
                <View style={styles.sectionHeaderText}>
                  <ThemedText type="title" style={styles.sectionTitle}>Payment Details</ThemedText>
                  <ThemedText style={styles.sectionSubtitle}>Cash and account payment</ThemedText>
                </View>
              </View>

              <View style={styles.paymentInputs}>
                <View style={styles.paymentInputContainer}>
                  <Text style={styles.inputLabel}>
                    <MaterialIcons name="money" size={16} color="#059669" />
                    {' '}Cash Paid
                  </Text>
                  <TextInput
                    style={[styles.input, styles.paymentInput]}
                    placeholder="0"
                    value={cashPaid ? Number(cashPaid.replace(/,/g, '')).toLocaleString() : ''}
                    onChangeText={val => {
                      const raw = val.replace(/,/g, '');
                      const cashValue = Number(raw) || 0;
                      const maxCash = vendorPrevBalance + totalAmount;
                      if (cashValue > maxCash) {
                        setErrors((prev: any) => ({ ...prev, cashPaid: `Cash cannot exceed Rs ${maxCash.toLocaleString()}` }));
                        return;
                      } else {
                        setErrors((prev: any) => ({ ...prev, cashPaid: undefined }));
                        setCashPaid(raw);
                      }
                    }}
                    keyboardType="numeric"
                    placeholderTextColor="#94a3b8"
                  />
                  {errors.cashPaid && <Text style={styles.errorText}>{errors.cashPaid}</Text>}
                </View>

                <View style={styles.paymentInputContainer}>
                  <Text style={styles.inputLabel}>
                    <MaterialIcons name="credit-card" size={16} color="#8b5cf6" />
                    {' '}On Account
                  </Text>
                  <TextInput
                    style={[styles.input, styles.paymentInput, styles.readOnlyInput]}
                    placeholder="0"
                    value={(vendorPrevBalance + totalAmount - cash).toLocaleString()}
                    editable={false}
                    keyboardType="numeric"
                    placeholderTextColor="#94a3b8"
                  />
                  {(vendorPrevBalance !== 0 || totalAmount !== 0 || cash !== 0) && (
                    <Text style={styles.calculationText}>
                      Previous: Rs {vendorPrevBalance.toLocaleString()} + Purchase: Rs {totalAmount.toLocaleString()} - Cash: Rs {cash.toLocaleString()}
                    </Text>
                  )}
                </View>
              </View>
            </LinearGradient>

            {/* Summary Section */}
            <LinearGradient 
              colors={["#ffffff", "#f8fafc"]} 
              style={styles.summaryCard}
            >
              <View style={styles.summaryHeader}>
                <View style={styles.summaryIconContainer}>
                  <MaterialIcons name="analytics" size={24} color="#667eea" />
                </View>
                <View style={styles.summaryHeaderText}>
                  <ThemedText type="title" style={styles.summaryTitle}>Purchase Summary</ThemedText>
                  <ThemedText style={styles.summarySubtitle}>Transaction overview</ThemedText>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={[styles.statCard, styles.totalPurchaseCard]}>
                  <MaterialIcons name="monetization-on" size={20} color="#059669" />
                  <ThemedText style={styles.statNumber}>Rs {totalAmount.toLocaleString()}</ThemedText>
                  <ThemedText style={styles.statLabel}>Total Amount</ThemedText>
                </View>
                
                <View style={[styles.statCard, styles.cashCard]}>
                  <MaterialIcons name="account-balance-wallet" size={20} color="#0ea5e9" />
                  <ThemedText style={styles.statNumber}>Rs {cash.toLocaleString()}</ThemedText>
                  <ThemedText style={styles.statLabel}>Cash Paid</ThemedText>
                </View>
                
                <View style={[styles.statCard, styles.accountCard]}>
                  <MaterialIcons name="credit-card" size={20} color="#8b5cf6" />
                  <ThemedText style={styles.statNumber}>Rs {(vendorPrevBalance + totalAmount - cash).toLocaleString()}</ThemedText>
                  <ThemedText style={styles.statLabel}>On Account</ThemedText>
                </View>
              </View>
            </LinearGradient>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <Pressable 
                style={[styles.saveBtn, loading && styles.disabledBtn]} 
                onPress={handleSubmitPurchase}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialIcons name="save" size={24} color="#fff" />
                )}
                <ThemedText style={styles.saveBtnText}>
                  {loading ? 'Saving...' : 'Save Purchase'}
                </ThemedText>
              </Pressable>

              <Pressable
                style={styles.historyBtn}
                onPress={() => router.push('/purchase-history')}
              >
                <MaterialIcons name="history" size={20} color="#667eea" />
                <ThemedText style={styles.historyBtnText}>View Purchase History</ThemedText>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
        {/* Modal for Add/Edit Item */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => { setModalVisible(false); setEditingId(null); setErrors({}); }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText type="title" style={styles.modalTitle}>{editingId ? 'Edit Item' : 'Add Item'}</ThemedText>
              <Pressable onPress={() => { setModalVisible(false); setEditingId(null); setErrors({}); }}>
                <MaterialIcons name="close" size={24} color="#64748b" />
              </Pressable>
            </View>
            
            <View style={{ position: 'relative' }}>
              <TextInput
                style={styles.modalInput}
                  placeholder="Item Name"
                  value={itemName}
                  onChangeText={handleItemNameChange}
                  placeholderTextColor="#aaa"
                  autoCorrect={false}
                  autoCapitalize="none"
                  onFocus={() => itemName && setShowItemSuggestions(true)}
                />
                {showItemSuggestions && filteredItemSuggestions.length > 0 && (
                  <View style={styles.suggestionBox}>
                    {filteredItemSuggestions.map(suggestion => (
                      <TouchableOpacity key={suggestion.id} style={styles.suggestionItem} onPress={() => handleItemSuggestionSelect(suggestion)}>
                        <Text>{suggestion.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
  
              {errors.itemName && <Text style={styles.errorText}>{errors.itemName}</Text>}
              <TextInput
                style={styles.input}
                placeholder="Quantity"
                value={itemQuantity}
                onChangeText={setItemQuantity}
                keyboardType="numeric"
                placeholderTextColor="#aaa"
              />
              {errors.itemQuantity && <Text style={styles.errorText}>{errors.itemQuantity}</Text>}
              <TextInput
                style={styles.input}
                placeholder="Purchasing Price"
                value={itemPrice ? Number(itemPrice.replace(/,/g, '')).toLocaleString() : ''}
                onChangeText={val => {
                  const raw = val.replace(/,/g, '');
                  setItemPrice(raw);
                }}
                keyboardType="numeric"
                placeholderTextColor="#aaa"
              />
              {errors.itemPrice && <Text style={styles.errorText}>{errors.itemPrice}</Text>}
              {/* Show total for this item */}
              {itemQuantity && itemPrice && !isNaN(Number(itemQuantity)) && !isNaN(Number(itemPrice)) && Number(itemQuantity) > 0 && Number(itemPrice) > 0 && (
                <Text style={{ fontWeight: 'bold', color: '#3949ab', marginBottom: 8 }}>
                  Total: Rs {(Number(itemQuantity) * Number(itemPrice)).toLocaleString()}
                </Text>
              )}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 18 }}>
                <Pressable style={styles.cancelBtn} onPress={() => { setModalVisible(false); setEditingId(null); setErrors({}); }}>
                  <MaterialIcons name="close" size={20} color="#fff" />
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.confirmBtn} onPress={handleAddOrUpdateItem}>
                  <MaterialIcons name={editingId ? "edit" : "add"} size={20} color="#fff" />
                  <Text style={styles.confirmBtnText}>{editingId ? 'Update' : 'Add'}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
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
  headerIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerTitles: { 
    flex: 1, 
    marginLeft: 16,
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
  sectionCard: {
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
    color: '#1e293b',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#667eea',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
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
  itemsList: {
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
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  itemDetail: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editBtn: {
    backgroundColor: '#0ea5e9',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    backgroundColor: '#ef4444',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentInputs: {
    gap: 16,
  },
  paymentInputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentInput: {
    marginBottom: 8,
  },
  readOnlyInput: {
    backgroundColor: '#f1f5f9',
    color: '#64748b',
  },
  calculationText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
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
  totalPurchaseCard: {
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
  actionButtons: {
    gap: 12,
    alignItems: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    shadowColor: '#667eea',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    minWidth: 200,
  },
  disabledBtn: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0.1,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    marginLeft: 8,
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#667eea',
  },
  historyBtnText: {
    color: '#667eea',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginBottom: 8,
    marginTop: -8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
    color: '#1e293b',
  },
  itemTotalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  itemTotalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
    marginLeft: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 12,
  },
  cancelBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    paddingVertical: 12,
    borderRadius: 12,
  },
  confirmBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  suggestionBox: {
    position: 'absolute',
    top: 72,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    zIndex: 100,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  suggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionText: {
    marginLeft: 12,
    flex: 1,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  suggestionBalance: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
});
