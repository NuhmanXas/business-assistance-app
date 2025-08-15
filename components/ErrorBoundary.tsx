import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  children: React.ReactNode;
  fallbackMessage?: string;
};

type State = {
  hasError: boolean;
};

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: any) {
    // Log error for diagnostics. Keep the UI minimal and do not show raw error text to users.
    // In production replace with a call to your logging service (Sentry, etc.).
    // eslint-disable-next-line no-console
    console.error('Unhandled exception caught by ErrorBoundary:', error, info);
  }

  reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>{this.props.fallbackMessage ?? 'Something went wrong.'}</Text>
          <Text style={styles.sub}>We have logged the issue. You can try again.</Text>
          <Pressable onPress={this.reset} style={styles.button} accessibilityRole="button">
            <Text style={styles.buttonText}>Retry</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children as any;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '800', color: '#1e3a8a', marginBottom: 8 },
  sub: { color: '#6b7280', marginBottom: 16, textAlign: 'center' },
  button: { backgroundColor: '#1e3a8a', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '700' },
});
