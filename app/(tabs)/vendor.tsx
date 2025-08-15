
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, DocumentData, getDoc, onSnapshot, query, QueryDocumentSnapshot, QuerySnapshot, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../constants/firebase';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

type Vendor = {
  id: string;
  name: string;
  contactNumbers: string[];
  balance: string;
};

export default function VendorScreen() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [currentUser, setCurrentUser] = useState<{ uid: string; email?: string } | null>(null);
  const [name, setName] = useState('');
  const [contactNumbers, setContactNumbers] = useState<string[]>(['']);
  const [balance, setBalance] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; contactNumbers?: string; balance?: string }>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Subscribe to auth state
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (u) setCurrentUser({ uid: u.uid, email: u.email ?? undefined });
      else setCurrentUser(null);
    });
    return () => unsubAuth();
  }, []);

  // Fetch vendors for the signed-in user
  useEffect(() => {
    if (!currentUser) {
      setVendors([]);
      setInitialLoading(false);
      return;
    }

    const q = query(collection(db, 'vendors'), where('ownerId', '==', currentUser.uid));
    const unsub = onSnapshot(q as any, (snapshot: QuerySnapshot<DocumentData>) => {
      const fetched: Vendor[] = snapshot.docs.map((docSnap: QueryDocumentSnapshot<DocumentData>) => ({
        id: docSnap.id,
        ...(docSnap.data() as any),
      })) as Vendor[];
      setVendors(fetched);
      setInitialLoading(false);
    });
    return () => unsub();
  }, [currentUser]);

  const renderVendors: React.ReactNode[] = vendors.filter(vendor => vendor.name.toLowerCase().includes(search.trim().toLowerCase())).map((v) => {
    const vendor = v as Vendor;
    return (
      <View key={vendor.id} style={styles.vendorCard}>
        <View style={styles.vendorHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{vendor.name ? vendor.name.charAt(0).toUpperCase() : '?'}</Text>
          </View>
          <View style={styles.vendorInfo}>
            <ThemedText style={styles.vendorName}>{vendor.name}</ThemedText>
            <Text style={styles.vendorContact}>
              <MaterialIcons name="phone" size={14} color="#64748b" />{' '}{vendor.contactNumbers && vendor.contactNumbers.length > 0 ? vendor.contactNumbers.join(', ') : 'No contact'}
            </Text>
            <View style={styles.balanceContainer}>
              <MaterialIcons name="account-balance-wallet" size={14} color="#64748b" />
              <Text style={[
                styles.balanceText,
                Number(vendor.balance) < 0 ? styles.negativeBalance : styles.positiveBalance,
              ]}>{' '}Balance: Rs {Number(vendor.balance).toLocaleString()}</Text>
            </View>
          </View>
          <View style={styles.vendorActions}>
            <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(vendor)}>
              <MaterialIcons name="edit" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(vendor.id)}>
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
    if (!trimmedName) newErrors.name = 'Vendor name is required.';
    // Check for duplicate name (case-insensitive, ignore self when editing)
    const duplicate = vendors.some(vendor =>
      vendor.name.trim().toLowerCase() === trimmedName.toLowerCase() && vendor.id !== editingId
    );
    if (duplicate) newErrors.name = 'Vendor name already exists.';
    // Validate contact numbers (at least one, all must be non-empty)
    if (!contactNumbers.length || contactNumbers.some(num => !num.trim())) {
      newErrors.contactNumbers = 'At least one valid contact number is required.';
    }
    // Validate balance
    if (!balance.trim()) newErrors.balance = 'Balance is required.';
    else if (isNaN(Number(balance))) newErrors.balance = 'Enter a valid number.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setName('');
    setContactNumbers(['']);
    setBalance('');
    setEditingId(null);
    setErrors({});
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (vendor: Vendor) => {
    setName(vendor.name);
    setContactNumbers(vendor.contactNumbers.length ? vendor.contactNumbers : ['']);
    setBalance(vendor.balance);
    setEditingId(vendor.id);
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
    if (!currentUser) {
      Alert.alert('Sign in required', 'Please sign in to manage vendors.');
      setLoading(false);
      return;
    }

    if (editingId) {
      try {
        // Verify owner before updating
        const vendorRef = doc(db, 'vendors', editingId);
        const snap = await getDoc(vendorRef);
        const data = snap.exists() ? (snap.data() as any) : null;
        if (!data || data.ownerId !== currentUser.uid) {
          Alert.alert('Permission denied', 'You can only edit vendors you created.');
          setLoading(false);
          return;
        }

        await updateDoc(vendorRef, { name, contactNumbers, balance });
      } catch (error) {
        Alert.alert('Error', 'Failed to update vendor.');
        setLoading(false);
        return;
      }
    } else {
      try {
        await addDoc(collection(db, 'vendors'), {
          name,
          contactNumbers,
          balance,
          createdAt: new Date().toISOString(),
          ownerId: currentUser.uid,
          ownerEmail: currentUser.email || null,
        });
      } catch (error) {
        Alert.alert('Error', 'Failed to add vendor to Firestore.');
        setLoading(false);
        return;
      }
    }
    setLoading(false);
    setModalVisible(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Vendor', 'Are you sure you want to delete this vendor?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
            onPress: async () => {
          setLoading(true);
          try {
            if (!currentUser) {
              Alert.alert('Sign in required', 'Please sign in to delete vendors.');
              setLoading(false);
              return;
            }

            // Verify ownership
            const vendorRef = doc(db, 'vendors', id);
            const snap = await getDoc(vendorRef);
            const data = snap.exists() ? (snap.data() as any) : null;
            if (!data || data.ownerId !== currentUser.uid) {
              Alert.alert('Permission denied', 'You can only delete vendors you created.');
              setLoading(false);
              return;
            }

            await deleteDoc(doc(db, 'vendors', id));
          } catch (error) {
            Alert.alert('Error', 'Failed to delete vendor.');
          }
          setLoading(false);
        },
      },
    ]);
  };

  // Contact number field handlers
  const handleContactChange = (value: string, idx: number) => {
    const updated = [...contactNumbers];
    updated[idx] = value;
    setContactNumbers(updated);
  };
  const addContactField = () => setContactNumbers([...contactNumbers, '']);
  const removeContactField = (idx: number) => {
    if (contactNumbers.length === 1) return;
    setContactNumbers(contactNumbers.filter((_, i) => i !== idx));
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
            <MaterialIcons name="business" size={28} color="#fff" />
          </View>
          
          <View style={styles.headerTitles}>
            <ThemedText type="title" style={styles.title}>Vendor Management</ThemedText>
            <ThemedText type="subtitle" style={styles.subtitle}>Manage your business vendors and suppliers</ThemedText>
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
                  placeholder="Search vendors by name..."
                  value={search}
                  onChangeText={setSearch}
                  placeholderTextColor="#94a3b8"
                  autoCorrect={false}
                  autoCapitalize="none"
                  clearButtonMode="while-editing"
                />
              </View>
            </LinearGradient>

            {/* Vendors List Section */}
            <LinearGradient 
              colors={["#ffffff", "#f8fafc"]} 
              style={styles.vendorsCard}
            >
              <View style={styles.vendorsHeader}>
                <View style={styles.vendorsIconContainer}>
                  <MaterialIcons name="people" size={24} color="#667eea" />
                </View>
                <View style={styles.vendorsHeaderText}>
                  <ThemedText type="title" style={styles.vendorsTitle}>All Vendors</ThemedText>
                  <ThemedText style={styles.vendorsSubtitle}>
                    {vendors.filter(vendor => vendor.name.toLowerCase().includes(search.trim().toLowerCase())).length} vendors found
                  </ThemedText>
                </View>
                <Pressable style={styles.addBtn} onPress={openAddModal}>
                  <MaterialIcons name="add" size={20} color="#fff" />
                  <ThemedText style={styles.addBtnText}>Add Vendor</ThemedText>
                </Pressable>
              </View>

              {initialLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#667eea" />
                  <ThemedText style={styles.loadingText}>Loading vendors...</ThemedText>
                </View>
              ) : (
                <View style={styles.vendorsList}>
                  {vendors.filter(vendor => vendor.name.toLowerCase().includes(search.trim().toLowerCase())).length === 0 ? (
                    <View style={styles.emptyState}>
                      <MaterialIcons name="business" size={48} color="#94a3b8" />
                      <ThemedText style={styles.emptyText}>No vendors found</ThemedText>
                      <ThemedText style={styles.emptySubtext}>
                        {search ? 'Try adjusting your search' : 'Add your first vendor to get started'}
                      </ThemedText>
                    </View>
                  ) : (
                    renderVendors
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
      {/* Add/Edit Vendor Modal */}
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
                  <MaterialIcons name={editingId ? "edit" : "business"} size={24} color="#fff" />
                </View>
                <View>
                  <ThemedText type="title" style={styles.modalTitle}>
                    {editingId ? 'Edit Vendor' : 'Add New Vendor'}
                  </ThemedText>
                  <ThemedText style={styles.modalSubtitle}>
                    {editingId ? 'Update vendor information' : 'Create a new vendor profile'}
                  </ThemedText>
                </View>
              </View>
              <Pressable style={styles.closeBtn} onPress={closeModal}>
                <MaterialIcons name="close" size={24} color="#fff" />
              </Pressable>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.formCard}>
                <View style={styles.formSection}>
                  <ThemedText style={styles.fieldLabel}>
                    <MaterialIcons name="person" size={16} color="#667eea" /> Vendor Name *
                  </ThemedText>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter vendor name"
                    value={name}
                    onChangeText={setName}
                    placeholderTextColor="#94a3b8"
                    autoCorrect={false}
                    autoCapitalize="words"
                  />
                  {errors.name && <ThemedText style={styles.errorText}>{errors.name}</ThemedText>}
                </View>

                <View style={styles.formSection}>
                  <ThemedText style={styles.fieldLabel}>
                    <MaterialIcons name="phone" size={16} color="#667eea" /> Contact Numbers
                  </ThemedText>
                  {contactNumbers.map((num, idx) => (
                    <View key={idx} style={styles.contactRow}>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder={`Contact Number ${idx + 1}`}
                        value={num}
                        onChangeText={val => handleContactChange(val, idx)}
                        keyboardType="phone-pad"
                        placeholderTextColor="#94a3b8"
                      />
                      {contactNumbers.length > 1 && (
                        <Pressable onPress={() => removeContactField(idx)} style={styles.contactAction}>
                          <MaterialIcons name="remove-circle" size={22} color="#ef4444" />
                        </Pressable>
                      )}
                      {idx === contactNumbers.length - 1 && (
                        <Pressable onPress={addContactField} style={styles.contactAction}>
                          <MaterialIcons name="add-circle" size={22} color="#667eea" />
                        </Pressable>
                      )}
                    </View>
                  ))}
                  {errors.contactNumbers && <ThemedText style={styles.errorText}>{errors.contactNumbers}</ThemedText>}
                </View>

                <View style={styles.formSection}>
                  <ThemedText style={styles.fieldLabel}>
                    <MaterialIcons name="account-balance-wallet" size={16} color="#667eea" /> 
                    {editingId ? ' Balance' : ' Opening Balance'}
                  </ThemedText>
                  <TextInput
                    style={styles.input}
                    value={balance ? Number(balance.replace(/,/g, '')).toLocaleString() : ''}
                    onChangeText={val => {
                      const raw = val.replace(/,/g, '');
                      setBalance(raw);
                    }}
                    placeholder="Enter balance"
                    keyboardType="decimal-pad"
                    placeholderTextColor="#94a3b8"
                  />
                  {errors.balance && <ThemedText style={styles.errorText}>{errors.balance}</ThemedText>}
                </View>

                <View style={styles.modalActions}>
                  <Pressable style={styles.cancelBtn} onPress={closeModal}>
                    <MaterialIcons name="cancel" size={20} color="#64748b" />
                    <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
                  </Pressable>
                  <Pressable
                    style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                    onPress={handleAddOrUpdate}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <MaterialIcons name={editingId ? "save" : "add"} size={20} color="#fff" />
                        <ThemedText style={styles.submitBtnText}>
                          {editingId ? 'Update' : 'Add'} Vendor
                        </ThemedText>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            </ScrollView>
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
  vendorsCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    flex: 1,
  },
  vendorsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  vendorsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  vendorsHeaderText: {
    flex: 1,
  },
  vendorsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  vendorsSubtitle: {
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
  vendorsList: {
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
  vendorCard: {
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
  vendorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  vendorContact: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceText: {
    fontSize: 13,
    fontWeight: '600',
  },
  positiveBalance: {
    color: '#059669',
  },
  negativeBalance: {
    color: '#dc2626',
  },
  vendorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  formSection: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#f9fafb',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelBtnText: {
    color: '#64748b',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 16,
  },
  submitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitBtnDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  contactAction: {
    padding: 4,
  },
});
