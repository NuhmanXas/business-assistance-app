
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, signInWithEmail } from '../constants/firebase';

export default function LoginScreen() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const router = useRouter();

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (u) => {
			if (u) {
				// already signed in, send to app
				router.replace('/(tabs)/sales');
			}
		});
		return unsubscribe;
	}, [router]);

	const handleLogin = async () => {
		// Basic validation
		if (!email || !password) {
			setError('Please enter both email and password.');
			return;
		}

		setError('');
		try {
			await signInWithEmail(email.trim(), password);
			// successful login, navigate to sales tab
			router.replace('/(tabs)/sales');
		} catch (e: any) {
			// show error message from firebase or a generic message
			setError(e?.message || String(e) || 'Sign in failed');
		}
	};

	return (
		<View style={styles.container}>
			<LinearGradient
				colors={['#667eea', '#764ba2']}
				start={[0, 0]}
				end={[1, 0]}
				style={styles.headerWrap}
			>
				<View style={styles.headerContent}>
					<View style={styles.logoContainer}>
						<View style={styles.logoIcon}>
							<MaterialIcons name="business" size={40} color="#fff" />
						</View>
						<Text style={styles.title}>Business Assistant</Text>
						<Text style={styles.subtitle}>Welcome back! Sign in to continue</Text>
					</View>
				</View>
			</LinearGradient>

			<KeyboardAvoidingView
				style={styles.contentContainer}
				behavior={Platform.OS === 'ios' ? 'padding' : undefined}
			>
				<View style={styles.loginCard}>
					<View style={styles.cardHeader}>
						<View style={styles.cardHeaderIcon}>
							<MaterialIcons name="login" size={24} color="#667eea" />
						</View>
						<Text style={styles.cardTitle}>Sign In</Text>
					</View>

					<View style={styles.form}>
						<View style={styles.inputContainer}>
							<MaterialIcons name="email" size={20} color="#64748b" style={styles.inputIcon} />
							<TextInput
								style={styles.input}
								placeholder="Email address"
								placeholderTextColor="#94a3b8"
								keyboardType="email-address"
								autoCapitalize="none"
								value={email}
								onChangeText={setEmail}
							/>
						</View>

						<View style={styles.inputContainer}>
							<MaterialIcons name="lock" size={20} color="#64748b" style={styles.inputIcon} />
							<TextInput
								style={styles.input}
								placeholder="Password"
								placeholderTextColor="#94a3b8"
								secureTextEntry
								value={password}
								onChangeText={setPassword}
							/>
						</View>

						{error ? (
							<View style={styles.errorContainer}>
								<MaterialIcons name="error" size={16} color="#ef4444" />
								<Text style={styles.errorText}>{error}</Text>
							</View>
						) : null}

						<TouchableOpacity
							style={[
								styles.loginButton,
								Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
							]}
							onPress={handleLogin}
							activeOpacity={0.8}
						>
							<LinearGradient
								colors={['#667eea', '#764ba2']}
								start={[0, 0]}
								end={[1, 0]}
								style={styles.buttonGradient}
							>
								<MaterialIcons name="login" size={20} color="#fff" />
								<Text style={styles.buttonText}>Sign In</Text>
							</LinearGradient>
						</TouchableOpacity>

						{/* forgot-password UI removed */}
					</View>
				</View>

				<View style={styles.footer}>
					<View style={styles.footerCard}>
						<Text style={styles.footerText}>Developed By : XAS Technology</Text>
					</View>
				</View>
			</KeyboardAvoidingView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f8fafc',
	},
	headerWrap: {
		paddingTop: 60,
		paddingBottom: 40,
		paddingHorizontal: 20,
	},
	headerContent: {
		alignItems: 'center',
	},
	logoContainer: {
		alignItems: 'center',
	},
	logoIcon: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: 'rgba(255, 255, 255, 0.2)',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 20,
	},
	title: {
		fontSize: 32,
		fontWeight: 'bold',
		color: '#fff',
		marginBottom: 8,
		textAlign: 'center',
	},
	subtitle: {
		fontSize: 16,
		color: 'rgba(255, 255, 255, 0.85)',
		fontWeight: '500',
		textAlign: 'center',
	},
	contentContainer: {
		flex: 1,
		padding: 20,
		paddingTop: 10,
	},
	loginCard: {
		borderRadius: 16,
		padding: 24,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 3,
		backgroundColor: '#fff',
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 24,
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
		fontSize: 24,
		fontWeight: 'bold',
		color: '#1e293b',
	},
	form: {
		width: '100%',
	},
	inputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#e2e8f0',
		borderRadius: 12,
		paddingHorizontal: 16,
		marginBottom: 16,
		backgroundColor: '#f8fafc',
	},
	inputIcon: {
		marginRight: 12,
	},
	input: {
		flex: 1,
		height: 48,
		fontSize: 16,
		color: '#1e293b',
	},
	errorContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#fef2f2',
		borderColor: '#fecaca',
		borderWidth: 1,
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		marginBottom: 16,
	},
	errorText: {
		color: '#ef4444',
		fontSize: 14,
		fontWeight: '500',
		marginLeft: 8,
		flex: 1,
	},
	loginButton: {
		borderRadius: 12,
		marginBottom: 16,
		shadowColor: '#667eea',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 8,
		elevation: 3,
	},
	buttonGradient: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 16,
		paddingHorizontal: 24,
		borderRadius: 12,
	},
	buttonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: 'bold',
		marginLeft: 8,
	},
	forgotButton: {
		alignItems: 'center',
		paddingVertical: 8,
	},
	forgotText: {
		color: '#667eea',
		fontSize: 14,
		fontWeight: '500',
	},
	resetRow: {
		flexDirection: 'row',
		justifyContent: 'flex-start',
		alignItems: 'center',
		marginTop: 8,
	},
	resetButton: {
		paddingVertical: 10,
		paddingHorizontal: 14,
		borderRadius: 10,
		backgroundColor: '#eef2ff',
		marginRight: 8,
	},
	resetButtonText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1e293b',
	},
	footer: {
		marginTop: 20,
		alignItems: 'center',
	},
	footerCard: {
		backgroundColor: '#fff',
		borderRadius: 12,
		paddingHorizontal: 20,
		paddingVertical: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
		elevation: 2,
	},
	footerText: {
		color: '#64748b',
		fontSize: 14,
		textAlign: 'center',
	},
	signupText: {
		color: '#667eea',
		fontWeight: '600',
	},
});
