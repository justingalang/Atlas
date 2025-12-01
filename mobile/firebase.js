import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from './firebaseConfig';

const hasPlaceholderValues = Object.values(firebaseConfig).some(
  (value) => typeof value === 'string' && value.toLowerCase().includes('your-')
);

export const isFirebaseConfigured = !hasPlaceholderValues;

let app = null;

if (isFirebaseConfigured) {
  const existingApps = getApps();
  app = existingApps.length ? existingApps[0] : initializeApp(firebaseConfig);
} else {
  console.warn(
    'Firebase config still has placeholder values. Update mobile/firebaseConfig.js with your project keys.'
  );
}

export const firebaseApp = app;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
