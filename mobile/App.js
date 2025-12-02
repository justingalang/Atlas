import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { fetchMaskedSecret } from './services/secretService';

export default function App() {
  const [status, setStatus] = useState(
    isFirebaseConfigured
      ? 'Ready to talk to Firebase.'
      : 'Add your Firebase keys in mobile/firebaseConfig.js.'
  );
  const [lastPingId, setLastPingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [secretInfo, setSecretInfo] = useState(null);
  const [isFetchingSecret, setIsFetchingSecret] = useState(false);

  const firebaseStatusColor = useMemo(
    () => (isFirebaseConfigured ? '#0c8a4c' : '#c22f2f'),
    []
  );

  const sendTestPing = useCallback(async () => {
    if (!isFirebaseConfigured || !db) {
      setStatus('Firebase is not configured yet.');
      return;
    }

    setIsSaving(true);
    try {
      const docRef = await addDoc(collection(db, 'pings'), {
        createdAt: serverTimestamp(),
        platform: 'mobile',
      });
      setLastPingId(docRef.id);
      setStatus('Saved a test ping in Firestore.');
    } catch (error) {
      setStatus(`Unable to write to Firestore: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const handleFetchSecret = useCallback(async () => {
    if (!isFirebaseConfigured) {
      setStatus('Firebase is not configured yet.');
      return;
    }
    setIsFetchingSecret(true);
    try {
      const data = await fetchMaskedSecret();
      setSecretInfo(data.googleApiKeyMasked || data.message || 'Secret fetched.');
      setStatus('Fetched masked secret via Cloud Function.');
    } catch (error) {
      setSecretInfo(null);
      setStatus(`Unable to fetch secret: ${error.message}`);
    } finally {
      setIsFetchingSecret(false);
    }
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Text style={styles.title}>Atlas mobile starter</Text>
          <Text style={styles.subtitle}>Expo • React Native • Firebase</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Firebase status</Text>
            <View style={[styles.statusDot, { backgroundColor: firebaseStatusColor }]} />
          </View>
          <Text style={styles.cardBody}>{status}</Text>
        {lastPingId ? (
          <Text style={styles.cardFootnote}>Last ping document id: {lastPingId}</Text>
        ) : null}
        <Pressable
          style={({ pressed }) => [
              styles.button,
              (!isFirebaseConfigured || isSaving) && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
            onPress={sendTestPing}
            disabled={!isFirebaseConfigured || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#f6f7fb" />
            ) : (
              <Text style={styles.buttonLabel}>Send test ping to Firestore</Text>
            )}
          </Pressable>
          <Text style={styles.helperText}>
            The ping writes to a `pings` collection. Configure your Firebase keys, then tap the
            button and look for the new document in the Firebase console.
          </Text>
          <View style={styles.divider} />
          <Pressable
            style={({ pressed }) => [
              styles.buttonSecondary,
              (!isFirebaseConfigured || isFetchingSecret) && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleFetchSecret}
            disabled={!isFirebaseConfigured || isFetchingSecret}
          >
            {isFetchingSecret ? (
              <ActivityIndicator color="#0f7ae5" />
            ) : (
              <Text style={styles.buttonSecondaryLabel}>Fetch masked secret</Text>
            )}
          </Pressable>
          {secretInfo ? <Text style={styles.cardFootnote}>{secretInfo}</Text> : null}
          <Text style={styles.helperText}>
            This calls the callable function `getSecret`, which reads the Google API key from
            Firebase Secret Manager and returns a masked value. Anonymous auth must be enabled for
            this sample.
          </Text>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7fb',
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
  },
  subtitle: {
    fontSize: 16,
    color: '#3a3b3f',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#1d1d1d',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  cardBody: {
    fontSize: 16,
    color: '#222',
    marginBottom: 8,
    lineHeight: 22,
  },
  cardFootnote: {
    fontSize: 12,
    color: '#4f5664',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#0f7ae5',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    backgroundColor: '#93b8ed',
  },
  buttonLabel: {
    color: '#f6f7fb',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondary: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0f7ae5',
    backgroundColor: '#fff',
  },
  buttonSecondaryLabel: {
    color: '#0f7ae5',
    fontSize: 16,
    fontWeight: '600',
  },
  helperText: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    color: '#4f5664',
    textAlign: 'center',
  },
  divider: {
    marginVertical: 14,
    height: 1,
    backgroundColor: '#e4e7ed',
  },
  footer: {
    alignItems: 'center',
  },
});
