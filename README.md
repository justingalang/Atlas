# Atlas mobile starter

JavaScript-based iOS/Android app using Expo (React Native) with Firebase, managed by npm. The `/mobile` folder contains the app.

## Prerequisites
- Node.js 18+ and npm
- iOS: Xcode + Command Line Tools for simulator runs
- Phone testing: Expo Go from the App Store, and your phone and computer on the same network

## First run
```bash
cd mobile
npm install          # already done once, re-run after pulling updates
npm run start        # starts the Expo dev server
```
- Press `i` in the Expo CLI to open the iOS simulator, or use the QR code with Expo Go on your phone.
- For a direct simulator launch: `npm run ios`

## Firebase setup
1) In the Firebase console, create a project and add a Web app to get config values.
2) Copy `mobile/firebaseConfig.example.js` to `mobile/firebaseConfig.js` and replace every placeholder with your project keys.
3) From the Firebase console, create a Firestore database (in test mode is fine for local dev).
4) Back in the app, tap **Send test ping to Firestore**. A document will be written to the `pings` collection when configuration is correct.

> Tip: Keep real keys out of git by storing them in env-specific config files that stay local.

## Viewing on your phone (Expo Go)
1) Install **Expo Go** from the iOS App Store.
2) Run `npm run start` inside `mobile`.
3) In the terminal, press `s` to switch to tunnel mode if your network blocks LAN discovery, or stay on LAN if both devices are on the same network.
4) Scan the QR code with the iOS Camera app (or paste the URL into Expo Go).
5) The app will reload automatically when you edit files.

## Cloud Function: Secret Manager sample
- Location: `functions/getSecret/index.js`
- Callable function that loads `GOOGLE_API_KEY` from Firebase Secret Manager, requires auth, and returns a masked value (do not forward raw secrets to clients).

Setup:
```bash
cd functions
npm install
firebase functions:secrets:set GOOGLE_API_KEY
firebase deploy --only functions:getSecret
```

Client call (Expo app), after Firebase app init:
```js
import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseApp } from './firebase';

const functions = getFunctions(firebaseApp);
const getSecret = httpsCallable(functions, 'getSecret');
const result = await getSecret();
console.log(result.data);
```

Note: The provided client sample in `mobile/services/secretService.js` uses anonymous auth to call the function, so enable Anonymous provider in Firebase Authentication for local testing.
