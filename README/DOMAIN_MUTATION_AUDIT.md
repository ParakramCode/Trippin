# Domain Mutation Audit Report
**Date:** 2026-01-18  
**Objective:** Identify all unsafe mutations where discovered/default journeys can be modified

## Executive Summary

The current architecture allows **discovered journeys (JourneySource)** to be directly mutated through user interactions. This violates the domain model separation between:
- **JourneySource**: Immutable, author-owned journey templates
- **JourneyFork**: Mutable, user-owned journey copies

## Critical Issues Identified

### 1. ❌ CRITICAL: Active Journey Initialization
**File:** `context/JourneyContext.tsx` (Lines 263-272)
**Issue:** `activeJourney` is initialized with discovered journeys from `defaultJourneys`
**Risk:** HIGH - Allows direct mutation of discovered journey templates
**Impact:**
- Any user interaction (notes, visited status, reordering) mutates the template
- Pollutes discovered journeys for all users
- Loss of immutability guarantees

**Domain Model Fix:**
- `activeJourney` should ONLY accept `JourneyFork` instances
- Discovered journeys should be read-only for preview
- Users must explicitly fork before setting as activeJourney

---

### 2. ❌ CRITICAL: Journey Loading from Mixed Sources
**File:** `context/JourneyContext.tsx` (Lines 305-312)
**Issue:** `loadJourney()` merges `defaultJourneys` and `plannerJourneys`, sets discovered journeys as active
**Risk:** HIGH - Direct mutation pathway
**Impact:**
- Discovered journeys become mutable once loaded
- No enforcement of fork-before-edit policy
- State corruption across journey instances

**Domain Model Fix:**
- `loadJourney()` should ONLY load from `plannerJourneys` (JourneyFork instances)
- Discovered journeys should require forking first
- Separate `previewJourney()` for read-only discovery viewing

---

### 3. ❌ HIGH: Global Visited State Storage
**File:** `context/JourneyContext.tsx` (Line 317)
**Issue:** `visitedStopIds` is a global list, not per-journey
**Risk:** HIGH - Cross-journey state pollution
**Impact:**
- Visiting a stop in Journey A marks it visited in ALL journeys
- Stop IDs leak across discovered journeys and forks
- No journey-specific visit tracking

**Domain Model Fix:**
- Move `visited` state to `JourneyFork.stops[].visited` (UserStop property)
- Each fork maintains independent visit state
- Remove global `visitedStopIds` localStorage

---

### 4. ❌ HIGH: Global Stop Visit Tracking
**File:** `context/JourneyContext.tsx` (Lines 326-331)
**Issue:** `markStopAsVisited()` operates on global visited list
**Risk:** HIGH - Stop ID collision across journeys
**Impact:**
- If Stop ID "1" exists in multiple journeys, visiting it in one marks it in ALL
- Discovered journeys show incorrect visited state
- Fork state leaks back to source

**Domain Model Fix:**
- Modify `JourneyFork.stops[].visited` directly
- Accept `(journeyId, stopId)` parameters instead of just `stopId`
- Scope mutations to specific fork instances

---

### 5. ❌ HIGH: Global Visit Toggle
**File:** `context/JourneyContext.tsx` (Lines 333-341)
**Issue:** `toggleStopVisited()` operates on global list
**Risk:** HIGH - Same as `markStopAsVisited`
**Impact:** Same cross-journey pollution issue

**Domain Model Fix:** Same as #4

---

### 6. ⚠️ MEDIUM: Update Stop Note (Partial Safety)
**File:** `context/JourneyContext.tsx` (Lines 418-439)
**Issue:** Only updates `plannerJourneys` but syncs to `activeJourney` in memory
**Risk:** MEDIUM - Safe IF activeJourney is always a fork, unsafe if it's a discovered journey
**Impact:**
- Function correctly scopes to plannerJourneys
- BUT if `activeJourney` references a discovered journey, mutation occurs
- Depends on fixing issues #1 and #2

**Domain Model Fix:**
- Ensure `activeJourney` can NEVER be a JourneySource
- Add runtime validation/type guards
- Already operates on correct domain model (JourneyFork.stops / UserStop)

---

### 7. ❌ HIGH: Navigation Drawer Visit Toggle
**File:** `components/NavigationDrawer.tsx` (Lines 43-62)
**Issue:** `toggleStopVisited(stop.id)` uses global visit tracking
**Risk:** HIGH - UI-level mutation of global state
**Impact:**
- Manual visit toggling affects all journeys
- Same cross-journey pollution as #4 and #5

**Domain Model Fix:**
- Call journey-scoped visit toggle: `toggleStopVisited(activeJourney.id, stop.id)`
- Update to mutate `activeJourney.stops[].visited`

---

### 8. ❌ HIGH: Map Proximity Auto-Marking
**File:** `components/JourneyMap.tsx` (Lines 140-180)
**Issue:** `markStopAsVisited(stop.id)` triggered on proximity
**Risk:** HIGH - Automatic global mutation
**Impact:**
- Arrival detection marks stops globally
- Proximity-based marking affects all journeys with same stop ID
- No journey isolation

**Domain Model Fix:**
- Use journey-scoped marking: `markStopAsVisited(activeJourney.id, stop.id)`
- Mutate `activeJourney.stops[].visited` directly

---

### 9. ❌ CRITICAL: Discover Page Journey Loading
**File:** `pages/Discover.tsx` (Lines 18-21)
**Issue:** Clicking discovered journey loads it as `activeJourney` via `loadJourney()`
**Risk:** CRITICAL - Primary entry point for unsafe mutations
**Impact:**
- User clicks discovered journey → becomes activeJourney → becomes mutable
- No fork enforcement
- Direct path to template corruption

**Domain Model Fix:**
- Replace `loadJourney()` with `previewJourney()` (read-only modal)
- Add "Fork to My Trips" button in preview
- Only navigate to map AFTER forking

---

## Mutation Flow Diagram

```
User clicks discovered journey (Discover.tsx)
    ↓
loadJourney(journeyId) - loads from defaultJourneys (JourneySource)
    ↓
setActiveJourney(discoveredJourney) - discovered journey becomes mutable
    ↓
User adds note → updateStopNote() → MUTATES discovered journey template
User visits stop → markStopAsVisited() → Global state pollution
User toggles visited → toggleStopVisited() → Cross-journey leakage
```

## Recommended Refactoring Strategy

### Phase 1: Prevent Active Journey Mutation
1. Add type guard: `activeJourney` must be `JourneyFork | null`
2. Block `loadJourney()` from loading discovered journeys
3. Implement `previewJourney()` for read-only discovery viewing

### Phase 2: Migrate Visited State
1. Add `visited: boolean` to `UserStop` interface
2. Update `JourneyFork.stops` to use `UserStop[]`
3. Migrate `visitedStopIds` to per-fork stop state
4. Update all mutation functions to accept `(journeyId, stopId)`

### Phase 3: Enforce Fork-First Policy
1. Discover page: Preview only, no direct loading
2. Add "Fork to My Trips" flow
3. Only allow navigation to map with forked journeys
4. Remove direct `setActiveJourney()` calls with discovered journeys

## Affected Components Summary

| Component | Issue | Risk Level |
|-----------|-------|------------|
| JourneyContext.tsx | Active journey init, global visited state | CRITICAL |
| Discover.tsx | Loads discovered journeys as active | CRITICAL |
| NavigationDrawer.tsx | Global visit toggle | HIGH |
| JourneyMap.tsx | Proximity-based global marking | HIGH |

## Next Steps

1. ✅ **Audit Complete** - All mutation points documented
2. ⏳ **Awaiting approval** to proceed with refactoring
3. 🔄 **One concern per step** - Will fix issues incrementally
4. 📝 **Small commits** - Each fix will be isolated and tested

---

**Note:** No behavior has been changed yet. All modifications are TODO comments for tracking purposes.
