# Atlas — Second Brain

> This file is the project's living memory. Read it before contributing code. Update it after every meaningful session.

---

## Current State

**Phase:** MVP feature-complete and running on physical device
**Status:** Full encounter logging + people management + profile editing flow working end-to-end against `pogi-atlas` Firestore. iOS dev client built via EAS Build, installed on Justin's iPhone. Daily dev loop is `npm run dev` (Metro) + open the Atlas dev client on phone.

### What exists today

| Component | Status | Location |
|-----------|--------|----------|
| Expo project (SDK 54 / RN 0.81 / TS) | Built and running on device | Repo root |
| Firebase Firestore (JS SDK) | Working, long-polling enabled for RN | `src/config/firebase.ts` |
| Firestore rules + indexes | Deployed to `pogi-atlas` | `firestore.rules`, `firestore.indexes.json` |
| Data models | Person + Encounter | `src/types/` |
| Navigation | Single-screen MainScreen with segmented pager + root stack for Profile/Edit/Form | `src/navigation/`, `src/screens/MainScreen.tsx` |
| Encounter form | Carousel of cards, prefill Where/When forward, prefill Person from profile FAB | `src/components/EncounterForm.tsx`, `src/screens/EncounterFormScreen.tsx` |
| Person autocomplete | TextInput + 🔍 modal picker (custom, library-free) | `src/components/PersonAutocomplete.tsx` |
| Profile screen | Stats, Facts/Encounters paged tabs, edit pencil, log-encounter FAB | `src/screens/PersonProfileScreen.tsx` |
| Edit Person screen | Full fields incl. birthday picker, Delete with cascade | `src/screens/EditPersonScreen.tsx` |
| Calendar view | Marked dates + day-specific encounter list | `src/components/CalendarView.tsx` |
| Tests | 18 passing, all pure utility | `__tests__/` |

### Project Structure

```
Atlas/
├── App.tsx                # Root: NavigationContainer
├── index.ts               # Expo entry
├── app.config.ts          # Expo config (scheme, plugins: datetimepicker, expo-font)
├── eas.json               # EAS Build profiles (env vars inline per profile)
├── package.json           # Expo 54 / RN 0.81 / firebase JS SDK / RNCalendars / Ionicons
├── tsconfig.json          # Strict, path aliases @/* → src/*
├── jest.config.js         # jest-expo preset
├── .env.local             # NOT committed — local Firebase config
├── .env.example           # Template
├── .firebaserc            # Default project = pogi-atlas
├── firebase.json          # Rules + indexes paths
├── firestore.rules        # Wide-open for single-user MVP
├── firestore.indexes.json # encounters: personId ASC + date DESC
├── GoogleService-Info.plist # iOS Firebase config (committed; public IDs only)
├── assets/                # icons + splash
├── src/
│   ├── components/        # CalendarView, EncounterForm, PersonAutocomplete, TimelinePane
│   ├── config/            # firebase.ts (initializeFirestore with experimentalForceLongPolling)
│   ├── navigation/        # RootNavigator, types (RootStackParamList)
│   ├── screens/           # MainScreen, PersonProfileScreen, EditPersonScreen, EncounterFormScreen, PeopleListScreen, PeopleScreen
│   ├── services/          # personService, encounterService (CRUD)
│   ├── types/             # Person, Encounter
│   └── utils/             # displayName, encounterContent, nameParser, normalizeName
├── __tests__/             # displayName, nameParser, normalizeName
└── archive/               # Previous implementation — reference only, never import
```

### Infrastructure

| Resource | Details |
|----------|---------|
| GitHub repo | `justingalang/Atlas` (origin, master) |
| Firebase project | `pogi-atlas` |
| Firestore | Native (default) database, rules deployed, composite index for encounters(personId, date desc) deployed |
| EAS project | `816d7e9d-121a-4a30-9d04-d00bf1157fcf` under `justingalang` |
| Apple bundle ID | `com.pogi.atlas` |
| iOS scheme | `atlas://` (for dev client) |
| Build path | EAS Build `development` profile (`eas build --profile development --platform ios`); local Xcode fallback |
| Dev workflow | `npm run dev` → Metro → open Atlas dev client on phone (same WiFi) |

---

## Decisions Made

### Stack
- **Firebase JS SDK over `@react-native-firebase/firestore`** — we initially planned native SDK for offline persistence but switched to JS SDK to mirror Chooz's working setup. Trade-off: no automatic offline cache, but RN long-polling (`experimentalForceLongPolling: true`) was required to avoid stalled reads.
- **Expo SDK 54 (not 55)** — pinned to match RN 0.81. SDK 55 wants RN 0.83 which we don't have.
- **Custom modal picker for Who autocomplete** — tried `react-native-autocomplete-dropdown` but it pulled in `react-native-svg` and the icons rendered as glyphs. Native iOS `Modal` + `FlatList` is more reliable.
- **Native `@react-native-community/datetimepicker` in a custom modal sheet** — inline `display="compact"` never re-measured when the date changed (always-stale whitespace). Wrapping in a tap-to-open modal with `display="spinner"` solved it.

### UX
- **App opens to encounter form** — modal auto-presented on launch.
- **Main screen = single page, two segments (Calendar | Timeline) with swipe pager.** People list lives behind a bottom-left FAB; the `+` FAB on bottom-right launches the encounter form. Pill-style segmented control (Option C from the tab-options doc).
- **Save Encounter ≠ Done** — carousel pattern: each save flips to a green ✓ card and appends a new blank card with Where/When prefilled from the saved one. User dismisses modal manually.
- **Nickname is identity, not disambiguation.** Typing a name auto-populates nickname from a canonical match; if user changes nickname → new person, otherwise → existing person. Display always shows `First Last (Nickname)` in lists; profile shows nickname as a 18pt subtitle under the name.
- **Facts ≠ free-form notes.** Each fact is a single-line input; Return creates a new auto-focused row. Saved as `encounter.facts: string[]`. Profile has Facts / Encounters tabs (swipeable pager).

### Profile
- **Edit Person** is a modal screen pushed from a pencil headerRight. Fields: first/last/nickname/first met/birthday. Delete button at bottom cascades to all encounters.
- **`firstMetLocation` is set on person creation only.** Known limitation — if you log someone you've known for years, the first-logged location is wrong. User-correctable via Edit Person.

### Persistence
- Firestore JS SDK + `experimentalForceLongPolling: true` (required on RN — without it, `getDoc`/`getDocs` calls hang)
- Firestore rules: `allow read, write: if true` on `people` and `encounters` collections (acceptable for single-user MVP, tighten when auth lands)
- All Firestore `undefined` values are coerced to `null` in service-layer writes — JS SDK rejects raw `undefined`.

---

## Gotchas & Watch-Outs

- **`.env.local` is required** — `EXPO_PUBLIC_FIREBASE_*` vars. Copy from `eas.json` `development` profile if missing.
- **Firestore JS SDK + RN = long-polling required.** If you ever swap `initializeFirestore` back to `getFirestore`, reads will silently hang on device.
- **Firebase CLI active project** — `firebase use pogi-atlas` before any deploy. CLI's user-level active project silently overrides `.firebaserc default` (we accidentally deployed Atlas rules to `pogi-bracket` once).
- **Date strings as YYYY-MM-DD must be parsed in local time.** Don't use `new Date("2026-05-22")` — parses as UTC midnight, drops a day in PST. Use the `parseLocalDate` helper.
- **iOS 26 "Liquid Glass" bubble around nav header buttons is system-applied** — we accepted this as a system default rather than rewriting headers. See user feedback memory.
- **Dev client must be rebuilt for any new native module** (datetimepicker, expo-font, etc.). EAS Build burns from the free tier; local Xcode build is the fallback.

---

## Session Log

### 2026-05-25 — Pre-commit cleanup + first big commit

Project is feature-complete in its current shape. Did final pass: deleted dead `sample.test.ts`, deleted `docs/` design HTML files, refreshed `brain.md` + `CLAUDE.md` + `PRD.md` to match reality, typed `useNavigation` in `CalendarView`. Splitting the 50-file initial-real-commit into infra commit + app commit for cleaner history.

### 2026-05-27 — Reminders UI (notifications deferred)

Built the Reminders tab as a 4th tab on the profile (Core | Facts | Encounters | Reminders) plus an EditReminder modal screen. New `reminders` Firestore collection + composite index on (personId, date) deployed to `pogi-atlas`. Reminders cascade-delete when a person is deleted.

**Crucially: no OS notifications wired up yet.** Reminders are just dated Firestore records right now — the phone won't fire anything. To turn them into real alerts, see "Deferred: notifications" below.

### Deferred: notifications

When ready, wire `expo-notifications` into the existing reminder data model:
- Install `expo-notifications` (native module → requires dev client rebuild via EAS Build)
- Add to `app.config.ts` plugins array
- Create `src/services/notificationService.ts` with `requestPermission`, `scheduleNotification`, `cancelNotification`
- In `EditReminderScreen.handleSave`: after `createReminder`/`updateReminder`, call `scheduleNotification` with the reminder's date + message. Persist the returned OS notification ID on the Reminder doc (add `notificationId?: string` field to `Reminder` type and service)
- In `EditReminderScreen.handleDelete` and `EditPersonScreen.handleDelete` cascade: call `cancelNotification(notificationId)` before/after Firestore deletes
- Birthday reminders (separate from user reminders): on person create/update, if `birthday` is set, schedule a recurring annual notification 3 days before. Store the notification ID on the person doc OR re-schedule from scratch each load.
- First-launch permission flow: on app start, check status; if `undetermined`, prompt before the user tries to use reminders
- Test on physical device — simulator notification support is partial

**Next likely directions:**
- Tighten Firestore rules once auth lands
- Notifications (see above)
- Post-MVP: AI fact extraction, connections, multi-fact search
