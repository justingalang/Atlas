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
