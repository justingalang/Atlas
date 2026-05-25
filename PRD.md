# Atlas — Product Requirements Document

## Overview

**Product Name:** Atlas
**Author:** J. Galang
**Date:** February 19, 2026
**Version:** 1.0 (MVP)

## Problem Statement

It's hard to keep track of the people you meet and the things you learn about them. Current workarounds (e.g., calendar events, memory) break down in two key ways:

1. **Difficult input** — too much friction to capture details quickly after an encounter
2. **Poor retrieval** — no easy way to recall what you know about someone when you need it

## Product Summary

Atlas is a personal, private CRM for everyday life. It helps you log encounters with people — across any context (work, social, random) — and builds rich, searchable profiles over time. It is phone-first, works offline, and syncs to the cloud.

## Target User

Single user (the author) — personal use across all social contexts.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native (iOS first) |
| Local persistence | Offline-capable (Firestore offline persistence or local-first DB like WatermelonDB syncing to Firestore) |
| Cloud backend | Firebase Firestore |
| Auth | Single-user, no authentication for MVP |

---

## Core Concepts

### Person

A person is someone you've encountered. A person has:

- **First name** (required)
- **Last name** (optional)
- **Memo** (optional — short label to help disambiguate, e.g., "Professor", "Blue eyes")
- **Where you first met** (derived from the first encounter's location)
- **Encounters** (a timeline of all logged interactions)

### Display Name Resolution

To handle duplicates, display names are resolved with the following cascade:

1. **First Last** — if unique
2. **First Last (memo)** — if duplicate first + last exists and memo is available
3. **First Last (original encounter location)** — if duplicate first + last exists and no memo
4. For first-name-only entries, the same cascade applies:
   - **First (memo)**
   - **First (original encounter location)**

### Encounter

An encounter is a single logged interaction with a person. It contains:

| Field | Details |
|---|---|
| **Who** | Person (search existing or create new) — first name required, last name optional |
| **When** | Date input, defaults to today. Time is not tracked. |
| **Where** | Location/context where the information was learned. For the first encounter with a person, this is also recorded as "where you first met." |
| **What** | Free-form text notes (facts, conversation topics, follow-ups, promises, etc.) |
| **Reminders** | *(Post-MVP)* Optional. Date-based or relative (e.g., "in 2 weeks"). Delivered as push notifications. |

### Aggregated Facts *(Post-MVP)*

Facts are auto-extracted from free-form encounter notes using an LLM. Categories include:

- Personal (hobbies, hometown, family)
- Professional (job, company, projects)
- Conversation topics
- Follow-ups / promises made

Users can manually correct or recategorize extracted facts.

---

## Information Architecture

### Tab Bar

| Tab | Description |
|---|---|
| **Home / Timeline** | Recent encounters, calendar view access |
| **People** | Alphabetical list of all people, searchable by name |
| **+ (Add Encounter)** | Opens the encounter input form, defaults to today |
| **Connections** | Surfaced relationships between people *(post-MVP)* |

### App Open Flow

1. **App launches** → Encounter form is immediately presented (defaults to today's date)
2. **Carousel input** → After adding one person's encounter, swipe right to add another in a carousel-style flow
3. **Dismiss form** → Lands on Home/Timeline view
4. **Re-open form** → Tap the **+** button in the tab bar at any time (defaults to today)

### Home / Timeline View

- Recent encounters (reverse chronological)
- **Calendar view** accessible from this screen — select a date to view encounters from that date or add a new encounter for that date

### People Tab

- **Default sort:** Alphabetical by first name
- **Alternate sort:** By most recent encounter date
- **Search bar** at top — search by name (primary recall method)
- Tapping a person opens their **profile**

### Person Profile

**Primary (visible immediately):**
- Name + display identifier
- Where you first met
- Timeline of encounters (summarized)

**Secondary (scrollable / expandable):**
- Full list of all encounters with complete notes
- Connections to other people *(post-MVP)*

### Encounter Input Form

- **Who:** Text input with autocomplete search against existing people. If no match, creates a new person entry.
- **When:** Date picker, defaults to today.
- **Where:** Text input for location/context.
- **What:** Multi-line free-form text input.
- **Reminders:** *(Post-MVP)* Optional. Date picker or relative time input ("in 2 weeks"). Supports multiple reminders per encounter.

---

## Search & Recall

| Method | Priority | Description |
|---|---|---|
| Search by name | **Primary** | Search bar on People tab, autocomplete on encounter input |
| Search by attribute | Secondary *(Post-MVP)* | "Who was into rock climbing?" — searches across aggregated facts |
| Browse by date | Secondary | Calendar view on Home/Timeline |
| Timeline scroll | Secondary | Reverse-chronological encounter feed on Home |

---

## AI Features *(Post-MVP)*

- **Fact extraction:** When an encounter is saved, an LLM processes the free-form notes and extracts structured facts (hobbies, job, family, etc.), which are added to the person's aggregated profile. User can correct.
- **Connection surfacing:** Identify shared attributes across people (e.g., "Sarah and Mike are both into rock climbing"). Displayed on person profiles and in a dedicated Connections tab.

---

## Sync Status Indicator *(Post-MVP)*

A small color indicator showing whether the current view's data has been persisted to Firestore:

| State | Color | Meaning |
|-------|-------|---------|
| Out of sync | Yellow | Local changes not yet written to Firestore |
| Synced | Green | Local data matches Firestore |
| Error | Red | Write to Firestore failed |

---

## Notifications *(Post-MVP)*

- **Push notifications** for user-created reminders tied to encounters
- **No unsolicited nudges** — the app does not proactively remind you to reach out to people
- Reminders support both absolute dates and relative scheduling

---

## Data & Privacy

- **Fully private** — single-user, no sharing features
- **Offline-capable** — works without network, syncs to Firestore when connected
- **No photos** for MVP — text only

---

## MVP Scope

### In Scope

- Encounter input form (with carousel for multiple entries)
- Person creation with deduplication/display name resolution
- Person profile with encounter timeline
- Home/Timeline view with calendar access
- People tab with alphabetical/date sort and name search
- Offline support with Firestore sync

### Out of Scope (Post-MVP)

- LLM-powered fact extraction and aggregated facts on profiles
- Push notification reminders tied to encounters
- API access for external AI agent consumption
- Attribute-based search (across aggregated facts)
- Sync status indicator (yellow/green/red Firestore sync state)
- Connections / Discovery tab (surfacing relationships between people)
- On-device AI processing
- Multi-user / sharing
- Photos / media attachments
- Android support
- Authentication / accounts

---

## Open Questions

1. What local-first persistence layer to use — Firestore's built-in offline cache vs. WatermelonDB or similar?
