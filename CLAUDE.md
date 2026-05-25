# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Before contributing code, read `brain.md`** — it contains current project state, decisions made, gotchas, and a session log. Update it after every meaningful session.

## Project Overview

Atlas is a personal, phone-first CRM for everyday life. It logs encounters with people and builds searchable profiles over time. See `PRD.md` for full product requirements.

**Target platform:** iOS (React Native via Expo, development builds — not Expo Go)
**Backend:** Firebase Firestore via the **Firebase JS SDK** (`firebase` npm package)
**Auth:** None for MVP (single user)

## Repository State

Active Expo project scaffolded at root. The `archive/` folder contains a previous implementation for reference.

## Tech Stack

- Expo SDK 54 / React Native 0.81 / TypeScript (strict, path aliases `@/*` → `src/*`)
- `firebase` (JS SDK) for Firestore. Config via `EXPO_PUBLIC_FIREBASE_*` env vars in `.env.local` (which is gitignored). The `.env.local.example` style entries live in `eas.json` under each build profile's `env` block.
- `expo-dev-client` development builds via EAS Build (`eas.json`)
- Native deps: `@react-native-community/datetimepicker`, `@expo/vector-icons`, `expo-font`
- Firestore JS SDK on RN requires `experimentalForceLongPolling: true` (see `src/config/firebase.ts`)
- Jest for testing

## Key Domain Concepts

- **Person**: someone you've encountered. Fields: first name (required), last name, nickname, first met location, birthday.
- **Encounter**: a logged interaction. Fields: person ref, date, location, array of `facts` (short strings).
- **Display name**: `First Last (Nickname)` when nickname is set, otherwise just `First Last`. Nickname doubles as the "is this a different person with the same name?" disambiguator (see encounter form save logic in `src/components/EncounterForm.tsx`).
- The app opens directly to the encounter input form, not a home screen.

## Archived Code Reference

Previous implementation lives in `archive/`. Notable patterns:
- `archive/mobile/` — Expo app with Firebase integration
- `archive/functions/` — old Cloud Functions
- Reference only — do not import from here.
