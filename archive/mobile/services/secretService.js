import { getFunctions, httpsCallable } from 'firebase/functions';
import { signInAnonymously } from 'firebase/auth';
import { auth, firebaseApp, isFirebaseConfigured } from '../firebase';

const getFunctionsClient = () => {
  if (!firebaseApp || !isFirebaseConfigured) {
    throw new Error('Firebase is not configured.');
  }
  return getFunctions(firebaseApp);
};

const ensureSignedIn = async () => {
  if (!auth) {
    throw new Error('Auth is not available. Check Firebase config.');
  }
  if (auth.currentUser) {
    return auth.currentUser;
  }
  const credential = await signInAnonymously(auth);
  return credential.user;
};

export const fetchMaskedSecret = async () => {
  const functions = getFunctionsClient();
  await ensureSignedIn();
  const callable = httpsCallable(functions, 'getSecret');
  const { data } = await callable();
  return data;
};
