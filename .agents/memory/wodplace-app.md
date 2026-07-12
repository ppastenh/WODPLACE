---
name: WODPLACE app conventions
description: Decisions behind the WODPLACE Expo app's mock auth and deterministic class-schedule seeding, for consistency in later work on this artifact.
---

## Mock authentication
Google/Apple sign-in and email/password auth are simulated locally (no real OAuth, no Clerk/backend) and persisted via AsyncStorage. This was a deliberate first-build choice to avoid extra secrets/integration setup for a UI draft.

**Why:** the user's initial spec only needed a clickable draft of the flows, not production auth.

**How to apply:** if the user later asks for real Google/Apple login, that requires wiring an actual OAuth/Clerk integration — flag it as new scope rather than assuming the existing mock already does this.

## Deterministic class/attendee data
There is no backend for WODPLACE. Class schedule per day is a fixed daily template; attendee counts and names are derived from a deterministic hash of a session id (date + time), not real randomness or a database. Bookings the user makes are the only real state, stored in AsyncStorage.

**Why:** keeps capacities/attendee lists stable across re-renders and days without needing a database for a draft app.

**How to apply:** if the user asks for a real backend/multi-user booking system later, this seeding approach should be replaced with actual persisted data — don't extend the hash-based approach further once real backend work starts.
