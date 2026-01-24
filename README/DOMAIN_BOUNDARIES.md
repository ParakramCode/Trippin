# Domain Boundaries & Ownership Model

**Date:** 2026-01-18  
**Status:** ✅ **DOCUMENTED** - Domain model explicit and self-documenting

## Overview

This document defines the ownership boundaries, mutability rules, and responsibilities in the journey domain model.

---

## Domain Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     DOMAIN LAYER                            │
│                 (Pure TypeScript Types)                     │
│                                                             │
│  ┌────────────────┐              ┌────────────────┐       │
│  │ JourneySource  │──fork──────→ │  JourneyFork   │       │
│  │  (Template)    │              │  (User Copy)   │       │
│  │                │              │                │       │
│  │ • Immutable    │              │ • Mutable      │       │
│  │ • Author-owned │              │ • User-owned   │       │
│  │ • Read-only    │              │ • Personal     │       │
│  └────────────────┘              └────────────────┘       │
│         │                                │                 │
│         │ contains                       │ contains        │
│         ▼                                ▼                 │
│  ┌────────────────┐              ┌────────────────┐       │
│  │ StopTemplate   │              │   UserStop     │       │
│  │                │              │                │       │
│  │ • Immutable    │              │ • Mutable      │       │
│  │ • Author data  │              │ • + visited    │       │
│  └────────────────┘              │ • + note       │       │
│                                  └────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## Entity Ownership

### JourneySource (Template)

**Owner:** Content Author / Application  
**Stored:** In code (`defaultJourneys` array)  
**Lifetime:** Permanent (part of application)  
**Mutability:** Immutable (readonly)

**Responsibilities:**
- Define canonical journey structure
- Provide default stops and route
- Include author-curated moments
- Serve as template for forks

**What it CANNOT do:**
- ❌ Track user's visited state
- ❌ Store user's personal notes
- ❌ Change after deployment
- ❌ Be completed by user

**What it CAN do:**
- ✅ Be viewed in Discover tab
- ✅ Be previewed in inspection mode
- ✅ Be forked by users
- ✅ Serve multiple users

---

### JourneyFork (User Journey)

**Owner:** User  
**Stored:** In localStorage (`trippin_user_forks`)  
**Lifetime:** Until user deletes  
**Mutability:** Mutable

**Responsibilities:**
- Track user's progress (visited stops)
- Store user's personal notes
- Maintain independent state per fork
- Support journey lifecycle (PLANNED → LIVE → COMPLETED)

**What it CAN do:**
- ✅ Store visited state per stop
- ✅ Accept user notes
- ✅ Be reordered/edited
- ✅ Be marked as completed
- ✅ Exist multiple times from same source

**What it CANNOT do:**
- ❌ Modify the original JourneySource
- ❌ Affect other user's forks
- ❌ Be shared (future feature)

---

## Mutability Matrix

| Entity | Property | Mutable? | Who Can Change? | When? |
|--------|----------|----------|-----------------|-------|
| **JourneySource** | All properties | ❌ No | Application only | Build time |
| **StopTemplate** | All properties | ❌ No | Application only | Build time |
| **JourneyFork** | title, stops, status | ✅ Yes | User | When active |
| **UserStop** | visited, note | ✅ Yes | User | When active |

---

## Why Forks Exist

### Problem Without Forks

```typescript
// PROBLEM: Shared state
const journey = discoveredJourney;  // Reference to template
journey.stops[0].visited = true;    // ❌ MUTATES TEMPLATE!

// Now ALL users see this stop as visited
// Template corrupted forever
```

### Solution With Forks

```typescript
// SOLUTION: Copy-on-fork
const fork = forkJourney(discoveredJourney);  // Creates copy
fork.stops[0].visited = true;                  // ✅ Only affects THIS fork

// Template unchanged
// Other users unaffected
// Each fork has independent state
```

### Benefits of Forking

1. **Data Integrity**
   - Templates remain pristine
   - No cross-user pollution
   - Predictable state

2. **Multiple Completions**
   - Same route, multiple times
   - Each fork has independent progress
   - Summer trip vs Winter trip

3. **User Ownership**
   - User controls their copy
   - Personal notes stay personal
   - Delete without affecting others

4. **Future: Sharing**
   - User can share their fork
   - Recipients get a copy (new fork)
   - Original remains unchanged

---

## Ownership Boundaries

### What Application Owns

**JourneySource (Templates)**
```typescript
// Application provides these
export const defaultJourneys: JourneySource[] = [
  {
    id: 'himachal-1',
    title: 'Spiti Valley Circuit',
    stops: [/* StopTemplates */],
    // ... all readonly
  }
];
```

**Responsibilities:**
- ✅ Define journey templates
- ✅ Curate quality content
- ✅ Update templates in releases
- ❌ Cannot track user state
- ❌ Cannot store personal data

---

### What User Owns

**JourneyFork (User Journeys)**
```typescript
// User creates these by forking
const myFork: JourneyFork = {
  id: 'fork-123',
  sourceJourneyId: 'himachal-1',
  title: 'My Himachal Trip',
  stops: [/* UserStops with visited, notes */],
  status: 'PLANNED',
  // ... user can modify
};
```

**Responsibilities:**
- ✅ Track personal progress
- ✅ Add personal notes
- ✅ Customize journey
- ✅ Manage lifecycle
- ❌ Cannot modify source template
- ❌ Cannot affect other forks

---

## Storage Boundaries

### Application Storage (Code)

```typescript
// src/context/JourneyContext.tsx
export const defaultJourneys: JourneySource[] = [/* ... */];
```

**Characteristics:**
- Stored in: JavaScript/TypeScript code
- Lifetime: Application lifetime
- Mutability: Immutable at runtime
- Access: All users (read-only)

---

### User Storage (localStorage)

```typescript
// localStorage key: 'trippin_user_forks'
{
  "fork-1": { /* JourneyFork */ },
  "fork-2": { /* JourneyFork */ },
  // ...
}
```

**Characteristics:**
- Stored in: Browser localStorage
- Lifetime: Until user clears data
- Mutability: Mutable
- Access: Single user per browser

---

### DEPRECATED: Global Storage

```typescript
// DEPRECATED localStorage key: 'trippin_visited_stops'
['stop-1', 'stop-2',  ...global array affecting all journeys]
```

**Status:** Being phased out  
**Replacement:** Per-fork `stop.visited` property  
**Issue:** Global state causes cross-journey pollution

---

## Data Flow: Discovery → Fork → Active

### Step 1: Discovery

```typescript
// User browses Discover tab
// Displays: templateJourneys (JourneySource[])
// User sees: Spiti Valley Circuit

// User clicks journey
loadJourney('himachal-1');
// Sets: inspectionJourney = JourneySource
// Mode: Read-only inspection
```

**Ownership:** Application  
**User can:** View only  
**User cannot:** Modify, add notes

---

### Step 2: Forking

```typescript
// User clicks "Add to My Journeys"
forkJourney(inspectionJourney);

// Creates:
const newFork: JourneyFork = {
  id: 'fork-' + Date.now(),
  sourceJourneyId: 'himachal-1',
  stops: inspectionJourney.stops.map(s => ({
    ...s,
    visited: false,  // Fresh state
    note: undefined  // No notes yet
  })),
  status: 'PLANNED'
};

// Saves to: plannerJourneys (localStorage: trippin_user_forks)
```

**Ownership:** Transfers to User  
**User can:** Modify, customize  
**User cannot:** Affect original template

---

### Step 3: Active Journey

```typescript
// User opens fork from My Trips
loadJourney('fork-123');

// Sets: activeJourney = JourneyFork
// Mode: Mutable, user-owned

// User can now:
toggleStopVisitedInJourney(fork.id, 'stop-1');  // Mark visited
updateStopNote(fork.id, 'stop-1', 'Amazing!');  // Add note
```

**Ownership:** User (actively editing)  
**User can:** Make changes  
**User cannot:** Edit other forks, modify template

---

## Immutability Enforcement

### TypeScript readonly Modifiers

```typescript
// JourneySource uses readonly
export interface JourneySource {
  readonly id: string;
  readonly title: string;
  readonly stops: readonly StopTemplate[];
  // ... all readonly
}

// StopTemplate uses readonly
export interface StopTemplate {
  readonly id: string;
  readonly name: string;
  readonly coordinates: readonly [number, number];
  // ... all readonly
}
```

**What this provides:**
- ✅ Compile-time checks
- ✅ IDE warnings on mutation attempts
- ✅ Self-documenting immutability
- ⚠️ NOT runtime enforcement (TypeScript is erased)

---

### Runtime Ownership Guards

```typescript
// Functions enforce activeJourney ownership
const updateStopNote = (journeyId, stopId, note) => {
  // Guard 1: Must have activeJourney
  if (!activeJourney) {
    console.warn('No activeJourney. Mutation blocked.');
    return;
  }
  
  // Guard 2: Must match activeJourney.id
  if (activeJourney.id !== journeyId) {
    console.warn('Journey ID mismatch. Mutation blocked.');
    return;
  }
  
  // Guards passed - perform mutation
  // ...
};
```

**What this provides:**
- ✅ Runtime enforcement
- ✅ Prevents template mutation
- ✅ Prevents cross-fork mutation
- ✅ Developer warnings in console

---

## Type Hierarchy

```
AnyJourney
├── JourneySource (readonly)
│   └── contains: StopTemplate[] (readonly)
│       └── properties: readonly coordinates, readonly name, etc.
│
└── JourneyFork (mutable)
    └── contains: UserStop[] (mutable)
        ├── extends: StopTemplate (readonly properties)
        └── adds: visited (mutable), note (mutable)
```

---

## Naming Conventions

### Current Naming (Explicit)

| Concept | Variable Name | Type | Storage |
|---------|--------------|------|---------|
| Template journeys | `templateJourneys` | `JourneySource&#91;]` | Code |
| User forks | `plannerJourneys` | `JourneyFork[]` | localStorage |
| View-only | `inspectionJourney` | `JourneySource \| JourneyFork` | Temporary |
| Editable | `activeJourney` | `JourneyFork \| null` | Temporary |

### Deprecated Naming (Backward Compatibility)

| Old Name | New Name | Status |
|----------|----------|--------|
| `journeys` | `templateJourneys` | Deprecated alias |
| `visitedStopIds` | `journey.stops[].visited` | Migrating |
| `clonedFrom` | `sourceJourneyId` | Updated |

---

## Domain Invariants

### Invariant 1: Templates Never Mutate

```typescript
// MUST BE TRUE at all times:
templateJourneys.forEach(template => {
  // template is never modified after creation
  // template.stops are never mutated
  // template is never assigned user state
});
```

**Enforcement:**
- TypeScript `readonly` modifiers
- No setter for `templateJourneys`
- Stored as `useMemo()` (immutable reference)

---

### Invariant 2: Only Active Journey Mutates

```typescript
// MUST BE TRUE at all times:
// If mutation occurs, it MUST be on activeJourney
if (mutationHappens) {
  assert(activeJourney !== null);
  assert(journeyId === activeJourney.id);
}
```

**Enforcement:**
- Ownership guards in mutation functions
- Runtime checks before mutations
- Console warnings on violations

---

### Invariant 3: Forks Are Independent

```typescript
// MUST BE TRUE at all times:
const fork1 = plannerJourneys[0];
const fork2 = plannerJourneys[1];

// Mutating fork1 never affects fork2
fork1.stops[0].visited = true;
assert(fork2.stops[0].visited !== fork1.stops[0].visited);
```

**Enforcement:**
- Deep clone on fork creation
- Per-fork state storage
- No shared references

---

## Future-Proofing

### Prepared For: Social Features

```typescript
// Domain supports future sharing
interface JourneyFork {
  // Existing
  sourceJourneyId: string;
  
  // Future additions (commented, ready to uncomment):
  // ownerId?: string;           // User who owns this fork
  // sharedWith?: string[];      // Users with read access
  // isPublic?: boolean;         // Public share link
  // collaborators?: string[];   // Users with write access
}
```

---

### Prepared For: Versioning

```typescript
// Domain supports template updates
interface JourneyFork {
  // Existing
  sourceJourneyId: string;
  clonedAt: number;
  
  // Future additions:
  // sourceVersion?: number;     // Version of source when forked
  // canUpdate?: boolean;        // Can merge source updates
  // lastSyncedAt?: number;      // Last template sync
}
```

---

## Summary

### What Owns What

| Owner | Owns | Example |
|-------|------|---------|
| **Application** | JourneySource, StopTemplate | Spiti Valley template |
| **User** | JourneyFork, UserStop | My Spiti trip (fork) |
| **Runtime** | activeJourney reference | Currently editing fork |

### What Is Mutable

| Entity | Mutability | Who Can Mutate? |
|--------|------------|-----------------|
| **JourneySource** | ❌ Immutable | Nobody (readonly) |
| **StopTemplate** | ❌ Immutable | Nobody (readonly) |
| **JourneyFork** | ✅ Mutable | User (when active) |
| **UserStop** | ✅ Mutable | User (when active) |

### Why Forks Exist

1. **Protect templates** - Immutable reference data
2. **Enable personalization** - User-owned copies
3. **Support multiple completions** - Same route, many times
4. **Prepare for social** - Sharing, collaboration
5. **Data integrity** - Clear ownership boundaries

**Status:** Domain model is now explicit, self-documenting, and ready for collaborative features.
