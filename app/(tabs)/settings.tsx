import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { auth, signOutUser } from '../../constants/firebase';
import { useThemeColor } from '../../hooks/useThemeColor';

export default function SettingsScreen() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const router = useRouter();
  const tint = useThemeColor({}, 'tint');
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthInitialized(true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Only redirect to login after auth initialization completes.
    if (authInitialized && user === null) {
      router.replace('/');
    }
  }, [user, router, authInitialized]);

  const handleLogout = async () => {
    try {
      await signOutUser();
      Alert.alert('Signed out', 'You have been signed out.');
    } catch (error) {
      console.error('Sign out error', error);
      Alert.alert('Error', 'Could not sign out. Please try again.');
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
            <MaterialIcons name="settings" size={28} color="#fff" />
          </View>
          
          <View style={styles.headerTitles}>
            <ThemedText type="title" style={styles.title}>Settings</ThemedText>
            <ThemedText type="subtitle" style={styles.subtitle}>Manage your account and app preferences</ThemedText>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          {user ? (
            <>
              {/* User Profile Section */}
              <LinearGradient 
                colors={["#ffffff", "#f8fafc"]} 
                style={styles.profileCard}
              >
                <View style={styles.profileHeader}>
                  <View style={styles.profileIconContainer}>
                    <MaterialIcons name="person" size={24} color="#667eea" />
                  </View>
                  <ThemedText type="title" style={styles.profileTitle}>Profile Information</ThemedText>
                </View>

                <View style={styles.userInfoContainer}>
                  <View style={styles.avatarSection}>
                    {user.email ? (
                      <View style={styles.avatarLetter}>
                        <Text style={styles.avatarLetterText}>
                          {user.email.trim().charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    ) : (
                      <Image
                        source={require('../../assets/images/icon.png')}
                        style={styles.avatar}
                      />
                    )}
                  </View>

                  <View style={styles.userDetails}>
                    <View style={styles.userField}>
                      <MaterialIcons name="email" size={16} color="#64748b" />
                      <View style={styles.fieldInfo}>
                        <ThemedText style={styles.fieldLabel}>Email Address</ThemedText>
                        <ThemedText style={styles.fieldValue}>{user.email ?? 'No email'}</ThemedText>
                      </View>
                    </View>

                    <View style={styles.userField}>
                      <MaterialIcons name="fingerprint" size={16} color="#64748b" />
                      <View style={styles.fieldInfo}>
                        <ThemedText style={styles.fieldLabel}>User ID</ThemedText>
                        <ThemedText style={styles.fieldValue} numberOfLines={1}>{user.uid}</ThemedText>
                      </View>
                    </View>
                  </View>
                </View>
              </LinearGradient>

              {/* Navigation Section */}
              <LinearGradient 
                colors={["#ffffff", "#f8fafc"]} 
                style={styles.navigationCard}
              >
                <View style={styles.navigationHeader}>
                  <View style={styles.navigationIconContainer}>
                    <MaterialIcons name="menu" size={24} color="#667eea" />
                  </View>
                  <ThemedText type="title" style={styles.navigationTitle}>Quick Actions</ThemedText>
                </View>

                <View style={styles.menuItems}>
                  <Pressable style={styles.menuItem} onPress={() => router.push('/reports' as unknown as never)}>
                    <View style={styles.menuItemLeft}>
                      <View style={styles.menuIconContainer}>
                        <MaterialIcons name="assessment" size={20} color="#667eea" />
                      </View>
                      <View style={styles.menuItemText}>
                        <ThemedText style={styles.menuItemTitle}>Reports</ThemedText>
                        <ThemedText style={styles.menuItemSubtitle}>View business reports and insights</ThemedText>
                      </View>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
                  </Pressable>

                  <View style={styles.menuItemDivider} />

                  {/* <Pressable style={styles.menuItem} onPress={() => router.push('/analysis' as unknown as never)}>
                    <View style={styles.menuItemLeft}>
                      <View style={styles.menuIconContainer}>
                        <MaterialIcons name="analytics" size={20} color="#667eea" />
                      </View>
                      <View style={styles.menuItemText}>
                        <ThemedText style={styles.menuItemTitle}>Analysis</ThemedText>
                        <ThemedText style={styles.menuItemSubtitle}>Analyze your business performance</ThemedText>
                      </View>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
                  </Pressable> */}
                </View>
              </LinearGradient>

              {/* Logout Section */}
              <LinearGradient 
                colors={["#ffffff", "#f8fafc"]} 
                style={styles.logoutCard}
              >
                <View style={styles.logoutHeader}>
                  <View style={styles.logoutIconContainer}>
                    <MaterialIcons name="exit-to-app" size={24} color="#ef4444" />
                  </View>
                  <ThemedText type="title" style={styles.logoutTitle}>Account Actions</ThemedText>
                </View>

                <Pressable style={styles.logoutButton} onPress={handleLogout}>
                  <MaterialIcons name="logout" size={20} color="#ef4444" />
                  <ThemedText style={styles.logoutButtonText}>Sign Out</ThemedText>
                  <MaterialIcons name="chevron-right" size={20} color="#ef4444" />
                </Pressable>
              </LinearGradient>
            </>
          ) : (
            <LinearGradient 
              colors={["#ffffff", "#f8fafc"]} 
              style={styles.notSignedInCard}
            >
              <View style={styles.notSignedInContent}>
                <MaterialIcons name="person-off" size={48} color="#94a3b8" />
                <ThemedText style={styles.notSignedInText}>Not signed in</ThemedText>
                <ThemedText style={styles.notSignedInSubtext}>Please sign in to access your settings</ThemedText>
              </View>
            </LinearGradient>
          )}
        </View>
      </ScrollView>
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
  profileCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarSection: {
    marginRight: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eaeaea',
  },
  avatarLetter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetterText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userField: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  fieldInfo: {
    marginLeft: 8,
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldValue: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '600',
    marginTop: 2,
  },
  navigationCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  navigationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  navigationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  navigationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  menuItems: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  menuItemDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16,
  },
  logoutCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  logoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoutIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoutTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '600',
    marginLeft: 8,
  },
  notSignedInCard: {
    borderRadius: 16,
    padding: 40,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  notSignedInContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  notSignedInText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 12,
  },
  notSignedInSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
});
