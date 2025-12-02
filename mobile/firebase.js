import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig, { hasFirebaseConfig } from './firebaseConfig';

export const isFirebaseConfigured = hasFirebaseConfig;

let app = null;

if (isFirebaseConfigured) {
  const existingApps = getApps();
  app = existingApps.length ? existingApps[0] : initializeApp(firebaseConfig);
} else {
  console.warn(
    'Firebase config is missing. Set Firebase env vars in mobile/.env (see .env.example).'
  );
}

export const firebaseApp = app;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
