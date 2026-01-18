# Per-Journey Visited State Migration Guide

**Date:** 2026-01-18  
**Status:** ✅ Infrastructure complete, ready for component migration

## Overview

Moved visited state from a **global array** to **per-journey properties**, allowing users to complete the same route multiple times with independent progress tracking for each fork.

## The Problem: Global Visited State

### Before
```typescript
// GLOBAL STATE (❌ Cross-journey pollution)
visitedStopIds: ['stop-1', 'stop-2', 'stop-3']

// Issue: If Stop ID "stop-1" exists in multiple journeys:
// Journey A (Himachal Route #1)
// Journey B (Himachal Route #2 - fork of same template)
// Journey C (Unrelated journey)

// Visiting "stop-1" in Journey A marks it visited in ALL journeys!
```

### Problems
1. **Cross-journey pollution** - Visiting a stop in one journey marks it in all journeys with that stop ID
2. **No independent progress** - Can't fork same route multiple times with separate progress
3. **Data ownership unclear** - Visited state not tied to specific journey
4. **Template corruption risk** - Global state could leak to discovered journeys

---

## The Solution: Per-Journey Visited State

### After
```typescript
// PER-JOURNEY STATE (✅ Independent progress)
Journey A: {
  id: 'fork-1',
  stops: [
    { id: 'stop-1', visited: true },   // Visited in THIS fork
    { id: 'stop-2', visited: false }
  ]
}

Journey B: {
  id: 'fork-2', 
  stops: [
    { id: 'stop-1', visited: false },  // NOT visited in this fork
    { id: 'stop-2', visited: true }
  ]
}
```

### Benefits
1. **✅ Independent progress** - Each fork tracks its own visited state
2. **✅ Multiple completions** - Complete same Himachal route multiple times
3. **✅ Clear ownership** - Visited state lives in journey object
4. **✅ Type-safe** - Aligns with UserStop domain model

---

## Implementation Changes

### 1. Updated Type Definition

**File:** `types.ts`

```typescript
export interface Stop {
  id: string;
  name: string;
  coordinates: [number, number];
  imageUrl: string;
  // ... other properties
  
  // NEW: Per-journey visited state
  visited?: boolean;  // ✅ Added
}
```

### 2. New Helper Functions

**File:** `context/JourneyContext.tsx`

#### `toggleStopVisitedInJourney(journeyId, stopId)`
Toggles visited state for a specific stop within a specific journey.

```typescript
const { toggleStopVisitedInJourney } = useJourneys();

// Toggle stop in specific journey
toggleStopVisitedInJourney('journey-123', 'stop-456');
```

#### `markStopVisitedInJourney(journeyId, stopId)`
Marks a stop as visited within a specific journey.

```typescript
const { markStopVisitedInJourney } = useJourneys();

// Mark stop visited in specific journey
markStopVisitedInJourney('journey-123', 'stop-456');
```

#### `getVisitedStopsForJourney(journeyId)`
Gets array of visited stop IDs for a specific journey.

```typescript
const { getVisitedStopsForJourney } = useJourneys();

// Get visited stops for journey
const visitedIds = getVisitedStopsForJourney('journey-123');
// Returns: ['stop-1', 'stop-3', 'stop-5']
```

### 3. Fork Initialization

**File:** `context/JourneyContext.tsx`

```typescript
const forkJourney = useCallback((journey: Journey) => {
  const clone = JSON.parse(JSON.stringify(journey));
  clone.id = `journey-${Date.now()}`;
  clone.sourceJourneyId = journey.id;
  clone.clonedAt = Date.now();
  
  // ✅ Initialize visited: false for all stops
  if (clone.stops) {
    clone.stops = clone.stops.map((stop: Stop) => ({
      ...stop,
      visited: false  // Fresh start for each fork
    }));
  }
  
  setPlannerJourneys(prev => [...prev, clone]);
}, [setPlannerJourneys]);
```

---

## Migration Path for Components

### NavigationDrawer.tsx

#### Before (Deprecated)
```typescript
const { visitedStopIds, toggleStopVisited } = useJourneys();

// Check if visited globally
const isVisited = visitedStopIds.includes(stop.id);

// Toggle globally
toggleStopVisited(stop.id);
```

#### After (New)
```typescript
const { activeJourney, toggleStopVisitedInJourney, getVisitedStopsForJourney } = useJourneys();

if (!activeJourney) return;

// Get visited stops for THIS journey
const visitedIds = getVisitedStopsForJourney(activeJourney.id);
const isVisited = visitedIds.includes(stop.id);

// OR check stop.visited directly
const isVisited = stop.visited === true;

// Toggle in THIS journey only
toggleStopVisitedInJourney(activeJourney.id, stop.id);
```

### JourneyMap.tsx

#### Before  (Deprecated)
```typescript
const { visitedStopIds, markStopAsVisited } = useJourneys();

// Auto-mark on proximity
if (!visitedStopIds.includes(stop.id)) {
  markStopAsVisited(stop.id);  // ❌ Global mutation
}
```

#### After (New)
```typescript
const { activeJourney, markStopVisitedInJourney } = useJourneys();

if (!activeJourney) return;

// Auto-mark on proximity IN THIS JOURNEY
const isVisited = stop.visited === true;
if (!isVisited) {
  markStopVisitedInJourney(activeJourney.id, stop.id);  // ✅ Per-journey
}
```

### MyTrips.tsx

#### Before (Deprecated)
```typescript
const { visitedStopIds } = useJourneys();

// Calculate progress using global state
const visitedCount = journey.stops?.filter(s => 
  visitedStopIds.includes(s.id)  // ❌ Could include visits from other journeys
).length || 0;
```

#### After (New)
```typescript
const { getVisitedStopsForJourney } = useJourneys();

// Calculate progress for THIS journey
const visitedCount = journey.stops?.filter(s => 
  s.visited === true  // ✅ Only visits in this journey
).length || 0;

// OR use helper
const visitedIds = getVisitedStopsForJourney(journey.id);
const visitedCount = visitedIds.length;
```

---

## Backward Compatibility

### Deprecated (Still Works, But Don't Use)
```typescript
interface JourneyContextType {
  /** @deprecated Global visited state without journey ownership */
  visitedStopIds: string[];
  
  /** @deprecated Global mutation without journey context */
  markStopAsVisited: (stopId: string) => void;
  
  /** @deprecated Global mutation without journey context */
  toggleStopVisited: (stopId: string) => void;
}
```

### New (Use These Instead)
```typescript
interface JourneyContextType {
  // NEW: Per-journey visited state management
  toggleStopVisitedInJourney: (journeyId: string, stopId: string) => void;
  markStopVisitedInJourney: (journeyId: string, stopId: string) => void;
  getVisitedStopsForJourney: (journeyId: string) => string[];
}
```

---

## Use Case: Multiple Himachal Trips

### Scenario
User loves the "Spiti Valley Circuit" and wants to do it multiple times:

1. **First time (Summer 2024):**
   - Forks journey → `fork-summer-2024`
   - Visits Kaza ✅
   - Visits Key Monastery ✅
   - Skips Chandratal Lake ❌

2. **Second time (Winter 2025):**
   - Forks same template → `fork-winter-2025`
   - Fresh visited state (all unchecked)
   - Different progress, independent tracking

### Before (Global State) ❌
```typescript
// Both forks share same visited state!
// Can't track them separately
visitedStopIds: ['kaza', 'key-monastery']
```

### After (Per-Journey State) ✅
```typescript
// Fork 1 (Summer 2024)
{
  id: 'fork-summer-2024',
  stops: [
    { id: 'kaza', visited: true },
    { id: 'key-monastery', visited: true },
    { id: 'chandratal', visited: false }
  ]
}

// Fork 2 (Winter 2025)
{
  id: 'fork-winter-2025',
  stops: [
    { id: 'kaza', visited: false },
    { id: 'key-monastery', visited: false },
    { id: 'chandratal', visited: false }
  ]
}
```

---

## Migration Checklist

### ✅ Complete
- [x] Add `visited?: boolean` to Stop type
- [x] Create `toggleStopVisitedInJourney()` function
- [x] Create `markStopVisitedInJourney()` function
- [x] Create `getVisitedStopsForJourney()` function
- [x] Update `forkJourney()` to initialize `visited: false`
- [x] Add functions to context provider value
- [x] Mark old functions as @deprecated
- [x] Document migration path

### ⏳ TODO (Next Step)
- [ ] Update NavigationDrawer.tsx to use per-journey state
- [ ] Update JourneyMap.tsx to use per-journey state  
- [ ] Update MyTrips.tsx to use per-journey state
- [ ] Update Planner.tsx to use per-journey state
- [ ] Remove global `visitedStopIds` usage
- [ ] Test multiple forks with independent progress
- [ ] Remove deprecated functions after migration

---

## Testing Scenarios

### Test 1: Fork Same Journey Twice
1. Fork "Spiti Valley Circuit" → Fork A
2. Mark Kaza as visited in Fork A
3. Fork "Spiti Valley Circuit" again → Fork B
4. **Expected:** Kaza is NOT visited in Fork B ✅

### Test 2: Independent Progress
1. Create Fork A, visit stops 1-3
2. Create Fork B (same template)
3. Visit only stop 5 in Fork B
4. **Expected:** 
   - Fork A shows stops 1-3 visited
   - Fork B shows only stop 5 visited
   - No cross-contamination ✅

### Test 3: Progress Calculation
1. Fork journey with 10 stops
2. Mark 5 stops as visited
3. Check progress bar
4. **Expected:** Shows 50% progress for THIS fork only ✅

---

## Summary

### What Changed
- ✅ Added `visited` property to Stop type
- ✅ Created per-journey visited state helpers
- ✅ Updated `forkJourney()` to initialize visited state
- ✅ Deprecated global visited state functions

### What Stayed Same  
- ✅ Old functions still work (backward compatible)
- ✅ No UI changes yet
- ✅ No breaking changes
- ✅ Components can migrate incrementally

### Benefits Achieved
- ✅ Independent progress tracking per fork
- ✅ Same route can be completed multiple times
- ✅ No cross-journey pollution
- ✅ Aligns with domain model (UserStop.visited)

**Status:** Infrastructure complete. Components can now migrate to per-journey visited state at their own pace.
