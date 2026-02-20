import {getApps, initializeApp} from 'firebase/app';
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth';
import {getFirestore} from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import firebaseConfig, {hasFirebaseConfig} from './firebaseConfig';

export const isFirebaseConfigured = hasFirebaseConfig;

let app = null;
let authInstance = null;
let dbInstance = null;

if (isFirebaseConfigured) {
  const existingApps = getApps();
  app = existingApps.length ? existingApps[0] : initializeApp(firebaseConfig);

  if (app) {
    dbInstance = getFirestore(app);
    try {
      authInstance = initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage),
      });
    } catch (error) {
      // initializeAuth will throw if Auth has already been initialized for this app.
      console.warn('Using existing Auth instance:', error?.message || error);
      authInstance = getAuth(app);
    }
  }
} else {
  console.warn(
    'Firebase config is missing. Set Firebase env vars in mobile/.env (see .env.example).'
  );
}

export const firebaseApp = app;
export const auth = authInstance;
export const db = dbInstance;
