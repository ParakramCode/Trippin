# Active Journey Ownership Rules

**Date:** 2026-01-18  
**Status:** ✅ **ENFORCED IN CODE** - Ownership guards active

## Overview

Ownership rules are now **enforced at runtime** to guarantee that only user-owned journey forks can be mutated, and only when they are the active journey.

---

## The Ownership Contract

### Core Guarantee

**Only the `activeJourney` can be mutated, and `activeJourney` must always be a `JourneyFork | null`.**

### Why This Matters

```typescript
// WITHOUT guards (dangerous):
updateStopNote('discovered-journey-1', 'stop-1', 'My note');
// ❌ Could mutate a template journey!

// WITH guards (safe):
updateStopNote('discovered-journey-1', 'stop-1', 'My note');
// ✅ Blocked: No activeJourney or ID mismatch
// Console: "[updateStopNote] No activeJourney. Mutation blocked..."
```

---

## Active vs. Inspection Mode

### Active Mode (Mutable)

```typescript
// User has opened a forked journey
activeJourney = {
  id: 'fork-123',
  sourceJourneyId: 'himachal-1',
  stops: [...],  // Can be mutated
  // ... JourneyFork properties
};

inspectionJourney = null;
```

**Allowed operations:**
- ✅ Toggle visited
- ✅ Mark visited  
- ✅ Add notes
- ✅ Reorder stops
- ✅ Complete journey

### Inspection Mode (Read-Only)

```typescript
// User is viewing a discovered journey
activeJourney = null;

inspectionJourney = {
  id: 'himachal-1',
  title: 'Spiti Valley Circuit',
  stops: [...],  // Read-only, cannot be mutated
  // ... JourneySource properties
};
```

**Allowed operations:**
- ❌ Toggle visited → BLOCKED
- ❌ Mark visited → BLOCKED
- ❌ Add notes → BLOCKED  
- ❌ Reorder stops → BLOCKED
- ❌ Complete journey → BLOCKED
- ✅ View journey → Allowed
- ✅ Fork journey → Creates new mutable copy

---

## Ownership Guards Explained

### Guard 1: Require Active Journey

```typescript
if (!activeJourney) {
  console.warn('[functionName] No activeJourney. Mutation blocked (likely inspection mode).');
  return;
}
```

**Purpose:**
- Prevents mutations when no journey is active
- Blocks mutations in inspection mode (viewing templates)
- Ensures user is working with their own fork

**When this triggers:**
- User viewing discovered journey (inspection mode)
- No journey loaded yet
- Journey was just closed

### Guard 2: Verify Journey ID Match

```typescript
if (activeJourney.id !== journeyId) {
  console.warn(`[functionName] journeyId mismatch. Active: ${activeJourney.id}, Requested: ${journeyId}. Mutation blocked.`);
  return;
}
```

**Purpose:**
- Prevents cross-journey mutations
- Ensures component is mutating the journey it thinks it's mutating
- Catches stale references or bugs

**When this triggers:**
- Component has stale journey ID
- User switched journeys rapidly
- Programming error (component confusion)

---

## Protected Mutation Functions

### 1. `toggleStopVisitedInJourney(journeyId, stopId)`

**Ownership Guards:**
```typescript
// Guard 1: activeJourney must exist
if (!activeJourney) return;

// Guard 2: journeyId must match activeJourney.id
if (activeJourney.id !== journeyId) return;
```

**Called by:**
- NavigationDrawer (manual toggle on click)

**Protection:**
- ✅ Prevents toggling in inspection mode
- ✅ Prevents toggling wrong journey
- ✅ Ensures only active fork is modified

---

### 2. `markStopVisitedInJourney(journeyId, stopId)`

**Ownership Guards:**
```typescript
// Guard 1: activeJourney must exist
if (!activeJourney) return;

// Guard 2: journeyId must match activeJourney.id
if (activeJourney.id !== journeyId) return;
```

**Called by:**
- JourneyMap (proximity-based auto-marking)

**Protection:**
- ✅ Prevents auto-marking in inspection mode
- ✅ Prevents marking discovered journeys
- ✅ Ensures proximity events only affect active fork

---

### 3. `updateStopNote(journeyId, stopId, note)`

**Ownership Guards:**
```typescript
// Guard 1: activeJourney must exist
if (!activeJourney) return;

// Guard 2: journeyId must match activeJourney.id
if (activeJourney.id !== journeyId) return;
```

**Called by:**
- Planner (user adding/editing notes)

**Protection:**
- ✅ Prevents adding notes to templates
- ✅ Prevents notes in inspection mode
- ✅ Ensures notes only on owned forks

---

## Why Silent Failures?

### Design Principle: Fail Gracefully

```typescript
// ✅ GOOD: Silent failure with warning
if (!activeJourney) {
  console.warn('Mutation blocked');
  return;  // Early return, no error thrown
}

// ❌ BAD: Throwing errors
if (!activeJourney) {
  throw new Error('No active journey!');  // Crashes UI
}
```

**Rationale:**
1. **UX preservation** - App continues working, no crashes
2. **Developer feedback** - Console warns about issues
3. **Graceful degradation** - Invalid operations silently ignored
4. **Production safety** - Edge cases don't break user experience

---

## Mutation Contract

### What Mutations Guarantee

When a mutation function is called:

1. **It WILL NOT mutate** if `activeJourney` is `null`
2. **It WILL NOT mutate** if `journeyId` doesn't match `activeJourney.id`
3. **It WILL mutate** only the `activeJourney` (which is in `plannerJourneys`)
4. **It WILL log warnings** if guards block the operation

### What Callers Must Provide

```typescript
// Component calling mutation
const { activeJourney, toggleStopVisitedInJourney } = useJourneys();

// CORRECT: Pass activeJourney.id
if (activeJourney) {
  toggleStopVisitedInJourney(activeJourney.id, stop.id);
}

// INCORRECT: Pass arbitrary ID
toggleStopVisitedInJourney('some-random-id', stop.id);
// ❌ Blocked by Guard 2
```

---

## Data Corruption Prevention

### Scenario 1: Mutating Template in Inspection Mode

**Without guards:**
```typescript
// User viewing discovered journey
inspectionJourney = templateJourney;
activeJourney = null;

// Component tries to add note
updateStopNote(inspectionJourney.id, 'stop-1', 'My note');
// ❌ CORRUPTS THE TEMPLATE!
```

**With guards:**
```typescript
// Same scenario
updateStopNote(inspectionJourney.id, 'stop-1', 'My note');
// ✅ BLOCKED by Guard 1 (no activeJourney)
// Console: "[updateStopNote] No activeJourney. Mutation blocked..."
// Template remains pristine
```

---

### Scenario 2: Cross-Journey Mutation

**Without guards:**
```typescript
// User has Fork A active
activeJourney = forkA;

// Component has stale reference to Fork B
const staleJourneyId = forkB.id;

// Component tries to mutate Fork B
toggleStopVisitedInJourney(staleJourneyId, 'stop-1');
// ❌ MUTATES WRONG JOURNEY!
```

**With guards:**
```typescript
// Same scenario
toggleStopVisitedInJourney(staleJourneyId, 'stop-1');
// ✅ BLOCKED by Guard 2 (ID mismatch)
// Console: "[toggleStopVisitedInJourney] journeyId mismatch. Active: fork-a, Requested: fork-b"
// Only activeJourney can be mutated
```

---

### Scenario 3: Rapid Journey Switching

**Without guards:**
```typescript
// User clicks Fork A
activeJourney = forkA;

// Component starts async operation
setTimeout(() => {
  // User already switched to Fork B
  activeJourney = forkB;
  
  // Async operation completes, tries to mutate Fork A
  updateStopNote(forkA.id, 'stop-1', 'Delayed note');
  // ❌ MUTATES WRONG JOURNEY (not currently active)
}, 1000);
```

**With guards:**
```typescript
// Same scenario
updateStopNote(forkA.id, 'stop-1', 'Delayed note');
// ✅ BLOCKED by Guard 2 (forkA.id !== activeJourney.id)
// Only the current active journey can be mutated
```

---

## Developer Guidelines

### Always Check activeJourney

**GOOD:**
```typescript
const { activeJourney, toggleStopVisitedInJourney } = useJourneys();

const handleToggle = (stop: Stop) => {
  if (activeJourney) {  // ✅ Component-level check
    toggleStopVisitedInJourney(activeJourney.id, stop.id);
  }
};
```

**ALSO GOOD (guards handle it):**
```typescript
const { activeJourney, toggleStopVisitedInJourney } = useJourneys();

const handleToggle = (stop: Stop) => {
  // No component check needed - guards will handle it
  if (activeJourney) {  // Optional but explicit
    toggleStopVisitedInJourney(activeJourney.id, stop.id);
  }
};
```

**OK (guards will block):**
```typescript
const { activeJourney, toggleStopVisitedInJourney } = useJourneys();

const handleToggle = (stop: Stop) => {
  toggleStopVisitedInJourney(activeJourney?.id || '', stop.id);
  // ⚠️ Will be blocked if activeJourney is null
  // Console warning will appear
};
```

### Use Journey ID from activeJourney

**CORRECT:**
```typescript
// Always use activeJourney.id for mutations
const journeyId = activeJourney.id;
updateStopNote(journeyId, stopId, note);
```

**INCORRECT:**
```typescript
// Don't use journey ID from props or state
const journeyId = journey.id;  // Might be stale
updateStopNote(journeyId, stopId, note);
```

---

## Console Warnings

### Normal Operation (No Warnings)

```typescript
// User has active fork
activeJourney = fork;

// Mutation proceeds
toggleStopVisitedInJourney(fork.id, 'stop-1');
// Console: (no output - success)
```

### Guard 1 Triggered (No Active Journey)

```typescript
// User in inspection mode
activeJourney = null;

// Mutation blocked
toggleStopVisitedInJourney('some-id', 'stop-1');
// Console: "[toggleStopVisitedInJourney] No activeJourney. Mutation blocked (likely inspection mode)."
```

### Guard 2 Triggered (ID Mismatch)

```typescript
// User has Fork A active
activeJourney = { id: 'fork-a', ... };

// Component tries to mutate Fork B
toggleStopVisitedInJourney('fork-b', 'stop-1');
// Console: "[toggleStopVisitedInJourney] journeyId mismatch. Active: fork-a, Requested: fork-b. Mutation blocked."
```

---

## Testing Scenarios

### Test 1: Inspection Mode Protection ✅

```typescript
// Setup: Load discovered journey
loadJourney('template-1');
// activeJourney = null, inspectionJourney = template

// Attempt mutation
toggleStopVisitedInJourney('template-1', 'stop-1');

// Expected:
// - Guard 1 blocks mutation
// - Console warning appears
// - Template unchanged
```

### Test 2: Active Fork Mutation ✅

```typescript
// Setup: Load user fork
loadJourney('fork-1');
// activeJourney = fork, inspectionJourney = null

// Attempt mutation
toggleStopVisitedInJourney('fork-1', 'stop-1');

// Expected:
// - Guards pass
// - Stop toggled successfully
// - No console warnings
```

### Test 3: Cross-Fork Protection ✅

```typescript
// Setup: Fork A active
activeJourney = forkA;

// Attempt mutation on Fork B
toggleStopVisitedInJourney(forkB.id, 'stop-1');

// Expected:
// - Guard 2 blocks mutation
// - Console warning (ID mismatch)
// - Fork B unchanged
// - Fork A unchanged
```

---

## Migration Impact

### Before Guards

```typescript
// ANY journey could be mutated
updateStopNote('any-journey-id', 'stop-1', 'note');
// ❌ Could corrupt templates
// ❌ Could mutate wrong journey
// ❌ No protection
```

### After Guards

```typescript
// ONLY activeJourney can be mutated
updateStopNote('any-journey-id', 'stop-1', 'note');
// ✅ Blocked if not activeJourney
// ✅ Warnings in console
// ✅ Templates protected
// ✅ Cross-journey mutations prevented
```

---

## Summary

### Guarantees Enforced

1. **✅ Only activeJourney can be mutated**
   - Templates safe from mutation
   - Inspection mode is truly read-only

2. **✅ Only the journey being viewed can be mutated**
   - No cross-journey mutations
   - Stale references blocked

3. **✅ Silent failures with developer feedback**
   - App doesn't crash
   - Console warnings for debugging
   - Graceful degradation

4. **✅ Clear ownership model**
   - Active = mutable
   - Inspection = read-only
   - Explicit contract

### Protected Functions

- `toggleStopVisitedInJourney()` ✅
- `markStopVisitedInJourney()` ✅
- `updateStopNote()` ✅

### Protection Layers

1. **Component checks** (optional, good practice)
2. **Function guards** (mandatory, enforced)
3. **Console warnings** (developer feedback)

**Status:** Ownership rules are now **code-enforced**, not just convention. Data corruption through mutation is prevented at runtime.
