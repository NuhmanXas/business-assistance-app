

import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import InventoryItemForm from '../../components/InventoryItemForm';
import { auth, db } from '../../constants/firebase';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

type Item = {
  id: string;
  name: string;
  purchasingPrice: string;
  salesPrice: string;
  quantity: string;
};

export default function ItemsScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState('');
  const [purchasingPrice, setPurchasingPrice] = useState('');
  const [salesPrice, setSalesPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; purchasingPrice?: string; salesPrice?: string; quantity?: string }>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [search, setSearch] = useState('');
  // Fetch items from Firestore on mount and listen for changes
  useEffect(() => {
    // Subscribe to auth state and keep local user
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    return () => unsubAuth();
  }, []);

  useEffect(() => {
    // If no user signed in, clear the list and stop loading
    if (!user) {
      setItems([]);
      setInitialLoading(false);
      return;
    }

    // Query only items that belong to the signed-in user
    const q = query(collection(db, 'inventoryItems'), where('ownerId', '==', user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const fetched: Item[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data() as any;
        return {
          id: docSnap.id,
          name: data.name,
          purchasingPrice: data.purchasingPrice || '',
          salesPrice: data.salesPrice || '',
          quantity: data.quantity,
        };
      });
      setItems(fetched);
      setInitialLoading(false);
    });
    return () => unsub();
  }, [user]);

  const filteredItems = items.filter(item => item.name.toLowerCase().includes(search.trim().toLowerCase()));
  const renderItems: React.ReactNode[] = filteredItems.map((it) => {
    const item = it as Item;
    return (
      <View key={item.id} style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.name ? item.name.charAt(0).toUpperCase() : '?'}</Text>
          </View>
          <View style={styles.itemInfo}>
            <ThemedText style={styles.itemName}>{item.name}</ThemedText>
            <View style={styles.priceContainer}>
              <Text style={styles.priceDetail}>
                <MaterialIcons name="attach-money" size={14} color="#64748b" />{' '}Purchase: Rs {Number(item.purchasingPrice).toLocaleString()}
              </Text>
              <Text style={styles.priceDetail}>
                <MaterialIcons name="sell" size={14} color="#64748b" />{' '}Sale: Rs {Number(item.salesPrice).toLocaleString()}
              </Text>
            </View>
            <View style={styles.quantityContainer}>
              <MaterialIcons name="inventory-2" size={14} color="#64748b" />
              <Text style={styles.quantityText}>{' '}Stock: {Number(item.quantity).toLocaleString()} units</Text>
            </View>
            <View style={styles.valueTags}>
              <View style={styles.totalSalesTag}>
                <Text style={styles.tagText}>Total Sales: Rs {(Number(item.salesPrice) * Number(item.quantity)).toLocaleString()}</Text>
              </View>
              <View style={styles.totalPurchaseTag}>
                <Text style={styles.tagText}>Total Purchase: Rs {(Number(item.purchasingPrice) * Number(item.quantity)).toLocaleString()}</Text>
              </View>
            </View>
          </View>
          <View style={styles.itemActions}>
            <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
              <MaterialIcons name="edit" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
              <MaterialIcons name="delete" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  });

  const validate = () => {
    const newErrors: typeof errors = {};
    const trimmedName = name.trim();
    if (!trimmedName) newErrors.name = 'Item name is required.';
    // Check for duplicate name (case-insensitive, ignore self when editing)
    const duplicate = items.some(item =>
      item.name.trim().toLowerCase() === trimmedName.toLowerCase() && item.id !== editingId
    );
    if (duplicate) newErrors.name = 'Item name already exists.';
    if (!purchasingPrice.trim()) newErrors.purchasingPrice = 'Purchasing price is required.';
    else if (isNaN(Number(purchasingPrice)) || Number(purchasingPrice) <= 0) newErrors.purchasingPrice = 'Enter a valid purchasing price.';
    if (!salesPrice.trim()) newErrors.salesPrice = 'Sales price is required.';
    else if (isNaN(Number(salesPrice)) || Number(salesPrice) <= 0) newErrors.salesPrice = 'Enter a valid sales price.';
    if (!quantity.trim()) newErrors.quantity = 'Quantity is required.';
    else if (!Number.isInteger(Number(quantity)) || Number(quantity) < 0) newErrors.quantity = 'Enter a valid quantity.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setName('');
    setPurchasingPrice('');
    setSalesPrice('');
    setQuantity('');
    setEditingId(null);
    setErrors({});
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (item: Item) => {
    setName(item.name);
    setPurchasingPrice(item.purchasingPrice);
    setSalesPrice(item.salesPrice);
    setQuantity(item.quantity);
    setEditingId(item.id);
    setErrors({});
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    resetForm();
  };

  const handleAddOrUpdate = async () => {
    if (!validate()) return;
    setLoading(true);
    if (!user) {
      Alert.alert('Not signed in', 'You must be signed in to add or edit items.');
      setLoading(false);
      return;
    }

    if (editingId) {
      try {
        // Ensure the current user owns the item before updating
        const itemRef = doc(db, 'inventoryItems', editingId);
        const snap = await getDoc(itemRef);
        const data = snap.exists() ? (snap.data() as any) : null;
        if (!data || data.ownerId !== user.uid) {
          Alert.alert('Permission denied', 'You can only edit items you created.');
          setLoading(false);
          return;
        }

        await updateDoc(itemRef, { name, purchasingPrice, salesPrice, quantity });
        // No need to update local state, onSnapshot will update items
      } catch (error) {
        Alert.alert('Error', 'Failed to update item.');
        setLoading(false);
        return;
      }
    } else {
      try {
        const docRef = await addDoc(collection(db, 'inventoryItems'), {
          name,
          purchasingPrice,
          salesPrice,
          quantity,
          createdAt: new Date().toISOString(),
          ownerId: user.uid,
          ownerEmail: user.email || null,
        });
        // No need to update local state, onSnapshot will update items
      } catch (error) {
        Alert.alert('Error', 'Failed to add item to Firestore.');
        setLoading(false);
        return;
      }
    }
    setLoading(false);
    setModalVisible(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Item', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            if (!user) {
              Alert.alert('Not signed in', 'You must be signed in to delete items.');
              setLoading(false);
              return;
            }

            // Verify ownership before deleting
            const itemRef = doc(db, 'inventoryItems', id);
            const snap = await getDoc(itemRef);
            const data = snap.exists() ? (snap.data() as any) : null;
            if (!data || data.ownerId !== user.uid) {
              Alert.alert('Permission denied', 'You can only delete items you created.');
              setLoading(false);
              return;
            }

            await deleteDoc(itemRef);
            // No need to update local state, onSnapshot will update items
          } catch (error) {
            Alert.alert('Error', 'Failed to delete item.');
          }
          setLoading(false);
        },
      },
    ]);
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
            <MaterialIcons name="inventory" size={28} color="#fff" />
          </View>
          
          <View style={styles.headerTitles}>
            <ThemedText type="title" style={styles.title}>Inventory Management</ThemedText>
            <ThemedText type="subtitle" style={styles.subtitle}>Manage your product inventory and stock levels</ThemedText>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.contentContainer}>
            
            {/* Search Section */}
            <LinearGradient 
              colors={["#ffffff", "#f8fafc"]} 
              style={styles.searchCard}
            >
              <View style={styles.searchHeader}>
                <View style={styles.searchIconContainer}>
                  <MaterialIcons name="search" size={24} color="#667eea" />
                </View>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search items by name..."
                  value={search}
                  onChangeText={setSearch}
                  placeholderTextColor="#94a3b8"
                  autoCorrect={false}
                  autoCapitalize="none"
                  clearButtonMode="while-editing"
                />
              </View>
            </LinearGradient>

            {/* Items List Section */}
            <LinearGradient 
              colors={["#ffffff", "#f8fafc"]} 
              style={styles.itemsCard}
            >
              <View style={styles.itemsHeader}>
                <View style={styles.itemsIconContainer}>
                  <MaterialIcons name="inventory" size={24} color="#667eea" />
                </View>
                <View style={styles.itemsHeaderText}>
                  <ThemedText type="title" style={styles.itemsTitle}>Inventory Items</ThemedText>
                  <ThemedText style={styles.itemsSubtitle}>
                    {items.filter(item => item.name.toLowerCase().includes(search.trim().toLowerCase())).length} items found
                  </ThemedText>
                </View>
                <Pressable style={styles.addBtn} onPress={openAddModal}>
                  <MaterialIcons name="add" size={20} color="#fff" />
                  <ThemedText style={styles.addBtnText}>Add Item</ThemedText>
                </Pressable>
              </View>

              {initialLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#667eea" />
                  <ThemedText style={styles.loadingText}>Loading inventory...</ThemedText>
                </View>
              ) : (
                <View style={styles.itemsList}>
                  {items.filter(item => item.name.toLowerCase().includes(search.trim().toLowerCase())).length === 0 ? (
                    <View style={styles.emptyState}>
                      <MaterialIcons name="inventory" size={48} color="#94a3b8" />
                      <ThemedText style={styles.emptyText}>No items found</ThemedText>
                      <ThemedText style={styles.emptySubtext}>
                        {search ? 'Try adjusting your search' : 'Add your first inventory item to get started'}
                      </ThemedText>
                    </View>
                  ) : (
                    renderItems
                  )}
                </View>
              )}

              {loading && !initialLoading && (
                <View style={styles.overlayLoading}>
                  <ActivityIndicator size="large" color="#667eea" />
                </View>
              )}
            </LinearGradient>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {/* Inventory Item Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <LinearGradient
          colors={["#667eea", "#764ba2"]}
          style={styles.modalGradient}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIcon}>
                  <MaterialIcons name={editingId ? "edit" : "inventory"} size={24} color="#fff" />
                </View>
                <View>
                  <ThemedText type="title" style={styles.modalTitle}>
                    {editingId ? 'Edit Item' : 'Add New Item'}
                  </ThemedText>
                  <ThemedText style={styles.modalSubtitle}>
                    {editingId ? 'Update inventory item details' : 'Create a new inventory item'}
                  </ThemedText>
                </View>
              </View>
              <Pressable style={styles.closeBtn} onPress={closeModal}>
                <MaterialIcons name="close" size={24} color="#fff" />
              </Pressable>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.formCard}>
                <InventoryItemForm
                  name={name}
                  purchasingPrice={purchasingPrice}
                  salesPrice={salesPrice}
                  quantity={quantity}
                  errors={errors}
                  onNameChange={setName}
                  onPurchasingPriceChange={setPurchasingPrice}
                  onSalesPriceChange={setSalesPrice}
                  onQuantityChange={setQuantity}
                  onSubmit={handleAddOrUpdate}
                  onCancel={closeModal}
                  editing={!!editingId}
                />
                {loading && (
                  <View style={styles.overlayLoading}>
                    <ActivityIndicator size="large" color="#667eea" />
                  </View>
                )}
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </Modal>
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
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 10,
  },
  searchCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  itemsCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    flex: 1,
  },
  itemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  itemsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemsHeaderText: {
    flex: 1,
  },
  itemsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  itemsSubtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#667eea',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 14,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  itemsList: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
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
    paddingBottom: 20,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  priceContainer: {
    marginBottom: 6,
  },
  priceDetail: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  quantityText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  valueTags: {
    gap: 6,
  },
  totalSalesTag: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  totalPurchaseTag: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  itemActions: {
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  editBtn: {
    backgroundColor: '#667eea',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayLoading: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  modalGradient: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 60,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
  },
  formCard: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
});
