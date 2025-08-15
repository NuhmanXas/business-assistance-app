import { onAuthStateChanged } from 'firebase/auth';
import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { auth, signInWithEmail, signOutUser, signUpWithEmail } from '../constants/firebase';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<any>(null);

  // Subscribe to auth state
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return unsubscribe;
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithEmail(email.trim(), password);
      Alert.alert('Signed in');
    } catch (e: any) {
      Alert.alert('Sign in error', e.message || String(e));
    }
  };

  const handleSignUp = async () => {
    try {
      await signUpWithEmail(email.trim(), password);
      Alert.alert('Account created');
    } catch (e: any) {
      Alert.alert('Sign up error', e.message || String(e));
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      Alert.alert('Signed out');
    } catch (e: any) {
      Alert.alert('Sign out error', e.message || String(e));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Email / Password Authentication</Text>

      {user ? (
        <View style={styles.row}>
          <Text style={styles.info}>Signed in as: {user.email}</Text>
          <Button title="Sign Out" onPress={handleSignOut} />
        </View>
      ) : (
        <>
          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />

          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
          />

          <View style={styles.buttons}>
            <Button title="Sign In" onPress={handleSignIn} />
            <View style={{ width: 12 }} />
            <Button title="Sign Up" onPress={handleSignUp} />
          </View>
          {/* forgot-password UI removed */}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 12,
    borderRadius: 6,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  row: {
    alignItems: 'center',
  },
  info: {
    marginBottom: 12,
  },
});
