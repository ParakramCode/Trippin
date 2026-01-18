# LIVE Journey Concept

## Overview

The LIVE journey represents the **single active journey** that a user is currently executing in real-time with navigation.

## Core Rules

### 1. Single LIVE Journey
- ✅ **Only ONE journey can be LIVE at a time**
- When a journey becomes LIVE, all other journeys revert to PLANNED status
- Managed by `liveJourneyStore` singleton

### 2. Type Safety: Only JourneyFork Can Be LIVE
- ✅ **JourneySource can NEVER be LIVE**
- ✅ **Only JourneyFork instances can be LIVE**
- LIVE journeys MUST be user-owned

### 3. Status Lifecycle

```
DISCOVERED (JourneySource - read-only)
    ↓
  [Fork]
    ↓
PLANNED (JourneyFork - editable)
    ↓
  [Start]
    ↓
LIVE (JourneyFork - active navigation)
    ↓
  [Complete]
    ↓
COMPLETED (JourneyFork - archived)
```

### 4. State Transitions

| From | To | Allowed? | Notes |
|------|-----|----------|-------|
| DISCOVERED → LIVE | ❌ NO | Must fork first |
| PLANNED → LIVE | ✅ YES | Start navigation |
| LIVE → PLANNED | ✅ YES | Stop navigation |
| LIVE → COMPLETED | ✅ YES | Finish journey |
| COMPLETED → LIVE | ❌ NO | Cannot restart completed journeys |

## Architecture

### Store: `liveJourneyStore.ts`

**Responsibilities:**
- Maintains reference to the single LIVE journey ID
- Enforces LIVE status rules via type guards
- Coordinates with `plannerStore` for status updates
- Persists LIVE journey ID to localStorage

**Key Methods:**
```typescript
// Get current live journey (type-safe, returns JourneyFork | null)
getLiveJourney(): JourneyFork | null

// Set a journey as LIVE (type guard enforced)
setLive(journey: JourneyFork): void  // Only accepts JourneyFork

// Clear LIVE status
clearLive(): void

// Check if a journey is live
isLive(journeyId: string): boolean

// Type guard helper
canBeLive(journey: JourneySource | JourneyFork): journey is JourneyFork
```

## Type Guards Enforced

### 1. Compile-Time (TypeScript)
```typescript
// Parameter type prevents JourneySource
setLive(journey: JourneyFork): void  
// ❌ Cannot pass JourneySource - type error
```

### 2. Runtime Checks
```typescript
// Guard 1: Type check
if (!isJourneyFork(journey)) {
  throw new Error('Only JourneyFork can be LIVE');
}

// Guard 2: Ownership check
if (!plannerStore.getForkById(journey.id)) {
  throw new Error('Only user-owned forks can be LIVE');
}

// Guard 3: Completion check
if (journey.isCompleted) {
  throw new Error('Completed journeys cannot be LIVE');
}
```

### 3. Domain Validation
```typescript
// From journeyFork.ts
export function canBeLive(fork: JourneyFork): boolean {
  if (fork.isCompleted) return false;
  if (!fork.sourceJourneyId || !fork.clonedAt) return false;
  if (fork.status !== 'PLANNED' && fork.status !== 'LIVE') return false;
  return true;
}
```

## Integration Points

### Current (Legacy - To Be Migrated)
- `JourneyContext.tsx` - `startJourney()` function (TODO: migrate)
- `activeJourney` state (TODO: replace with liveJourneyStore)
- `isFollowing` flag (TODO: derive from LIVE status)

### Future (New Architecture)
- Navigation components subscribe to `liveJourneyStore`
- Map components only render when `liveJourney !== null`
- "Start Navigation" button calls `liveJourneyStore.setLive(fork)`
- "End Navigation" button calls `liveJourneyStore.clearLive()`

## Safety Guarantees

### What CAN become LIVE:
✅ User-forked journey (exists in plannerStore)  
✅ Status = PLANNED  
✅ Not completed  
✅ Valid JourneyFork with sourceJourneyId  

### What CANNOT become LIVE:
❌ Discovered journey (JourneySource)  
❌ Completed journey  
❌ Journey not in plannerStore  
❌ Custom journey without proper fork metadata  

## Migration Path

### Phase 1: ✅ COMPLETE
- Created `liveJourneyStore` with type guards
- Added `canBeLive()` validation to domain
- Documented JourneySource cannot be LIVE
- Added TODO comments to existing code

### Phase 2: TODO
- Replace `activeJourney` with `liveJourneyStore.getLiveJourney()`
- Update `startJourney()` to use `liveJourneyStore.setLive()`
- Wire navigation components to LIVE store
- Remove `isFollowing` flag (derive from LIVE status)

### Phase 3: TODO
- Add UI indicators for LIVE status
- Prevent discovering journeys from being set as active
- Enforce fork-first policy in Discover page
- Add "Start Navigation" flow from My Trips

## Example Usage (Future)

```typescript
import { liveJourneyStore } from './state/liveJourneyStore';
import { plannerStore } from './state/plannerStore';

// User clicks "Start Navigation" on a forked journey
const fork = plannerStore.getForkById(forkId);
if (fork && liveJourneyStore.canBeLive(fork)) {
  liveJourneyStore.setLive(fork);  // ✅ Type-safe
  // Navigation UI appears automatically via subscription
}

// User clicks "End Navigation"
liveJourneyStore.clearLive();
// Navigation UI disappears, journey returns to PLANNED

// In a component
liveJourneyStore.subscribe((liveJourney) => {
  if (liveJourney) {
    // Show navigation UI with liveJourney.stops
  } else {
    // Hide navigation UI
  }
});
```

## Benefits

1. **Type Safety** - Impossible to set JourneySource as LIVE
2. **Single Source of Truth** - One store manages LIVE state
3. **Automatic Coordination** - Status updates propagate to plannerStore
4. **Clear Lifecycle** - Explicit state transitions
5. **Validation** - Runtime checks prevent invalid states
6. **Persistence** - LIVE journey survives page refresh

---

**Status:** Architecture complete, migration pending. JourneyContext remains unchanged.
