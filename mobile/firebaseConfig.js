import Constants from 'expo-constants';

const firebaseConfig =
  Constants.expoConfig?.extra?.firebase ||
  Constants.manifest?.extra?.firebase ||
  {};

export const hasFirebaseConfig =
  firebaseConfig &&
  Object.values(firebaseConfig).every(
    (value) => typeof value === 'string' && value.trim().length > 0
  );

export default firebaseConfig;
