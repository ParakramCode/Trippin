# Deprecation Summary - Mixed Responsibility Logic

**Date:** 2026-01-18  
**Status:** Marked with @deprecated, NOT removed yet

## Overview

All mixed-responsibility logic and unsafe mutations have been marked with `@deprecated` JSDoc comments. This serves as clear documentation for future migration steps.

## Deprecated Patterns

### 1. Mixed Discovery + Planner State

#### ❌ **`journeys` state** (JourneyContext.tsx)
```typescript
/** @deprecated Mixes discovered (JourneySource) and forked (JourneyFork) journeys. */
const [journeys, setJourneys] = useState<Journey[]>(defaultJourneys || []);
```
**Issue:** Combines immutable templates with user-owned forks  
**Migration:** Split into `journeySources` (read-only) + `plannerStore` (user forks)

---

#### ❌ **`defaultJourneys` export** (JourneyContext.tsx)
```typescript
/** @deprecated Should be migrated to use JourneySource[] type from domain models. */
export const defaultJourneys: Journey[] = [...]
```
**Issue:** Uses mixed `Journey` type instead of `JourneySource`  
**Migration:** Type as `JourneySource[]` and move to separate data file

---

#### ❌ **`loadJourney()` function** (JourneyContext.tsx)
```typescript
/** @deprecated Mixes discovery and planner sources. Replace with preview/fork flow. */
loadJourney: (journeyId: string) => void;
```
**Issue:** Merges `defaultJourneys` and `plannerJourneys`, allows discovered journeys to become active  
**Migration:** Replace with `previewJourney()` (read-only) + explicit fork flow

**Used in:**
- `pages/Discover.tsx` - ❌ Deprecated usage marked
- Direct navigation to discovered journeys

---

### 2. Unsafe Active Journey Management

#### ❌ **`activeJourney` state** (JourneyContext.tsx)
```typescript
/** @deprecated Can reference JourneySource (discovered), should only be JourneyFork. */
activeJourney: Journey | null;
```
**Issue:** Can be set to a discovered journey, enabling mutations  
**Migration:** Use `liveJourneyStore.getLiveJourney()` which returns `JourneyFork | null`

---

#### ❌ **`setActiveJourney()` function** (JourneyContext.tsx)
```typescript
/** @deprecated Allows setting discovered journeys as active. Use liveJourneyStore.setLive(). */
setActiveJourney: (journey: Journey) => void;
```
**Issue:** No type guard, accepts any Journey (including discovered)  
**Migration:** Use `liveJourneyStore.setLive(fork: JourneyFork)`

**Used in:**
- `pages/MyTrips.tsx` - ❌ Deprecated usage marked (lines 64, 77, 105)
- `pages/Discover.tsx` - ❌ Deprecated via `loadJourney()`
- `context/JourneyContext.tsx` - Multiple internal usages

---

### 3. Global Visited State Without Ownership

#### ❌ **`visitedStopIds` state** (JourneyContext.tsx)
```typescript
/** @deprecated Global visited state without journey ownership. Move to JourneyFork.stops[].visited */
const [visitedStopIds, setVisitedStopIds] = useLocalStorage<string[]>('trippin_visited_stops', []);
```
**Issue:** Global list causes cross-journey pollution  
**Migration:** Per-fork `stops[].visited` property (UserStop)

**Used in:**
- `components/NavigationDrawer.tsx` - ❌ Deprecated usage marked
- `components/JourneyMap.tsx` - ❌ Deprecated usage marked
- `pages/MyTrips.tsx` - ❌ Deprecated usage marked

---

#### ❌ **`markStopAsVisited()` function** (JourneyContext.tsx)
```typescript
/** @deprecated Global mutation without journey context. Should be per-fork. */
markStopAsVisited: (stopId: string) => void;
```
**Issue:** Marks stop globally across all journeys  
**Migration:** `updateForkStop(forkId, stopId, { visited: true })`

**Used in:**
- `components/JourneyMap.tsx` - Proximity detection auto-marking

---

#### ❌ **`toggleStopVisited()` function** (JourneyContext.tsx)
```typescript
/** @deprecated Global mutation without journey context. Should be per-fork. */
toggleStopVisited: (stopId: string) => void;
```
**Issue:** Toggles globally without journey context  
**Migration:** Update specific fork's stop state

**Used in:**
- `components/NavigationDrawer.tsx` - Manual toggle on click

---

### 4. Manual LIVE Status Management

#### ❌ **`isFollowing` state** (JourneyContext.tsx)
```typescript
/** @deprecated Should be derived from liveJourneyStore state, not separate flag */
isFollowing: boolean;
```
**Issue:** Separate flag instead of deriving from LIVE journey  
**Migration:** `const isFollowing = liveJourneyStore.getLiveJourney() !== null`

---

#### ❌ **`startJourney()` function** (JourneyContext.tsx)
```typescript
/** @deprecated Manual status management. Use liveJourneyStore.setLive() instead. */
startJourney: (journeyId: string) => void;
```
**Issue:** Manually sets status to "LIVE" without type guards  
**Migration:** Use `liveJourneyStore.setLive(fork)` with automatic validation

**Used in:**
- `pages/MyTrips.tsx` - ❌ Deprecated usage marked (line 108)

---

### 5. Unsafe Journey Creation

#### ❌ **`addJourney()` function** (JourneyContext.tsx)
```typescript
/** @deprecated Creates mixed journey type without proper fork metadata. */
addJourney: () => void;
```
**Issue:** Creates journey without proper `JourneyFork` metadata  
**Migration:** Use `createJourneyFork()` from domain utilities

---

## Component-Level Deprecations

### NavigationDrawer.tsx
```typescript
// @deprecated Using global visitedStopIds and toggleStopVisited without journey ownership
// MIGRATE TO: Use liveJourneyStore.getLiveJourney() and mutate fork.stops[].visited
const { visitedStopIds, toggleStopVisited, activeJourney } = useJourneys();
```

### JourneyMap.tsx
```typescript
// @deprecated Using global visitedStopIds and markStopAsVisited without journey ownership
// MIGRATE TO: Use liveJourneyStore.getLiveJourney() and mutate fork.stops[].visited
const { visitedStopIds, markStopAsVisited, activeJourney } = useJourneys();
```

### Discover.tsx
```typescript
// @deprecated Using loadJourney which mixes discovered and forked journeys
// MIGRATE TO: Preview-only flow, then fork, then navigate to forked journey
const { journeys, loadJourney } = useJourneys();
```

### MyTrips.tsx
```typescript
// @deprecated Using activeJourney (mixed type), global visitedStopIds, and setActiveJourney
// MIGRATE TO: liveJourneyStore.getLiveJourney() and per-fork visited state
const { activeJourney, setActiveJourney, visitedStopIds, startJourney } = useJourneys();
```

---

## Migration Priority

### High Priority (Critical Safety Issues)
1. ✅ `loadJourney()` - Allows discovered journeys to be mutated
2. ✅ `setActiveJourney()` - No type guards
3. ✅ `visitedStopIds` - Cross-journey pollution

### Medium Priority (Mixed Responsibilities)
4. ✅ `journeys` state - Mixed types
5. ✅ `startJourney()` - Manual status management
6. ✅ `isFollowing` - Separate flag

### Low Priority (Convenience Functions)
7. ✅ `addJourney()` - Legacy creation
8. ✅ `defaultJourneys` - Type migration

---

## What's NOT Deprecated

### Safe Functions (Keep)
- ✅ `forkJourney()` - Creates proper forks (can be improved but safe)
- ✅ `removeFromPlanner()` - Operates only on plannerJourneys
- ✅ `completeJourney()` - Only updates planner journeys
- ✅ `isJourneyEditable()` - Safe check
- ✅ `renameJourney()` - Only updates planner journeys
- ✅ `moveStop()` - Only updates planner journeys
- ✅ `removeStop()` - Only updates planner journeys
- ✅ `updateStopNote()` - Only updates planner journeys (but needs activeJourney fix)

### New Infrastructure (Use Instead)
- ✅ `plannerStore` - Pure fork management
- ✅ `liveJourneyStore` - Type-safe LIVE journey
- ✅ `createJourneyFork()` - Domain utility
- ✅ `canBeLive()` - Validation helper
- ✅ `isJourneyFork()` - Type guard

---

## Next Steps

1. **Phase 1:** Replace `activeJourney` with `liveJourneyStore`
2. **Phase 2:** Migrate `visitedStopIds` to per-fork state
3. **Phase 3:** Implement preview-fork flow in Discover
4. **Phase 4:** Remove deprecated code after migration complete

---

## Benefits of Deprecation Marking

1. **Clear Intent** - Developers know what to avoid
2. **IDE Warnings** - TypeScript shows strikethrough on deprecated usage
3. **Migration Guide** - Comments explain what to use instead
4. **Safe Refactoring** - Nothing broken, just marked
5. **Documentation** - Living documentation of technical debt

**Status:** All unsafe and mixed-responsibility logic is now clearly marked. No functionality changed.
