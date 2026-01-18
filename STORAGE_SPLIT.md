# Storage Split Migration Guide

**Date:** 2026-01-18  
**Status:** ✅ **COMPLETE** - Storage separation implemented

## Overview

Formalized the separation between **template journeys** (read-only discovery) and **user journeys** (mutable forks/plans) with distinct localStorage keys to prevent accidental data merging.

---

## The Problem: Mixed Storage

### Before
```typescript
// MIXED STORAGE (❌ Templates and forks in same array)
const [journeys, setJourneys] = useState<Journey[]>(defaultJourneys);
const [plannerJourneys] = useLocalStorage('trippin_planner_journeys', []);

// Issues:
// 1. journeys mixes templates (static) with user data (dynamic)
// 2. Templates could be mutated accidentally
// 3. No clear distinction between source and fork
// 4. Same localStorage key could cause data conflicts
```

### Problems
1. **Type confusion** - Array contains both JourneySource and JourneyFork
2. **Mutation risk** - Templates could be modified in memory
3. **Data integrity** - localStorage key mixing concerns
4. **Unclear ownership** - Which journeys are templates? Which are user-owned?

---

## The Solution: Storage Split

### After
```typescript
// SPLIT STORAGE (✅ Clear separation)

// Read-only templates (never persisted, always from code)
const templateJourneys = useMemo(() => defaultJourneys || [], []);

// User forks (persisted with NEW localStorage key)
const [plannerJourneys] = useLocalStorage(
  'trippin_user_forks',  // ✅ New key
  []
);
```

### Benefits
1. **✅ Type clarity** - templateJourneys = JourneySource, plannerJourneys = JourneyFork
2. **✅ Immutability** - Templates cannot be mutated (useMemo, no setter)
3. **✅ Data isolation** - Different localStorage keys prevent mixing
4. **✅ Clear ownership** - Templates = code-owned, Forks = user-owned

---

## Implementation Changes

### 1. New Template Store

**File:** `context/JourneyContext.tsx`

```typescript
// Template journeys: Read-only, immutable journey sources for discovery
const templateJourneys = useMemo(() => defaultJourneys || [], []);
```

**Characteristics:**
- ✅ No setter (immutable)
- ✅ Always derived from `defaultJourneys`
- ✅ Never persisted (code-defined)
- ✅ Represents JourneySource domain type

### 2. Updated User Store

**File:** `context/JourneyContext.tsx`

```typescript
// User journeys: Mutable forks stored with NEW localStorage key
const [plannerJourneys, setPlannerJourneys] = useLocalStorage<Journey[]>(
  'trippin_user_forks',  // 🔑 Changed from 'trippin_planner_journeys'
  []
);
```

**Why new key:**
- ✅ Prevents mixing with old data structure
- ✅ Clean slate for proper fork metadata
- ✅ Avoids migration complexity
- ✅ Clear semantic distinction

### 3. Backward Compatibility

**File:** `context/JourneyContext.tsx`

```typescript
// Legacy: For backward compatibility, keep journeys referencing templates
/** @deprecated Use templateJourneys instead */
const journeys = templateJourneys;
```

**Purpose:**
- Existing components using `journeys` still work
- Gradual migration possible
- No breaking changes

---

## localStorage Keys

### Old Structure (Deprecated)
```javascript
// Implicit templates (in code, not stored)
defaultJourneys = [...]

// User journeys (mixed with old structure)
localStorage: {
  'trippin_planner_journeys': [...]
}
```

### New Structure (Current)
```javascript
// Explicit templates (in code, never stored)
templateJourneys = defaultJourneys

// User forks (new key, clean structure)
localStorage: {
  'trippin_user_forks': [...]  // ✅ New key
}
```

### Migration Strategy

**User data handling:**
- Old `trippin_planner_journeys` data is NOT automatically migrated
- Users start fresh with `trippin_user_forks`
- This is intentional to avoid corrupted mixed data
- Old data remains in localStorage but is unused

**If manual migration needed:**
```typescript
// One-time migration (if needed)
const oldData = localStorage.getItem('trippin_planner_journeys');
if (oldData && !localStorage.getItem('trippin_user_forks')) {
  // Validate and clean old data
  const parsed = JSON.parse(oldData);
  const validForks = parsed.filter(j => j.sourceJourneyId && j.clonedAt);
  localStorage.setItem('trippin_user_forks', JSON.stringify(validForks));
}
```

---

## Component Migration

### Discover.tsx

#### Before
```typescript
const { journeys, loadJourney } = useJourneys();

const filteredJourneys = useMemo(() => {
  return journeys.filter(journey => {
    // Filter logic
  });
}, [journeys]);
```

#### After ✅
```typescript
const { templateJourneys, loadJourney } = useJourneys();

const filteredJourneys = useMemo(() => {
  return templateJourneys.filter(journey => {
    // Same filter logic
  });
}, [templateJourneys]);
```

### HomeMap.tsx

**No changes needed** - Uses `inspectionJourney` which already handles routing

### MyTrips.tsx

#### Already Correct
```typescript
// MyTrips only uses plannerJourneys (user forks)
const { plannerJourneys } = useJourneys();

// This is correct - only shows user-owned journeys
```

---

## Updated loadJourney Logic

### Before
```typescript
const loadJourney = (journeyId) => {
  const discoveredJourney = journeys.find(j => j.id === journeyId);
  if (discoveredJourney) {
    // ...
  }
};
```

### After
```typescript
const loadJourney = (journeyId) => {
  // STORAGE SPLIT: Check template vs user forks
  
  const templateJourney = templateJourneys.find(j => j.id === journeyId);
  if (templateJourney) {
    // Template: Read-only inspection mode
    setInspectionJourney(templateJourney);
    setActiveJourney(null);
    return;
  }
  
  const userFork = plannerJourneys.find(j => j.id === journeyId);
  if (userFork) {
    // User fork: Mutable active mode
    setInspectionJourney(null);
    setActiveJourney(userFork);
    return;
  }
};
```

---

## JourneyContextType Interface

### Updated Interface
```typescript
interface JourneyContextType {
  // STORAGE SPLIT: Separated template (read-only) from user (mutable)
  
  /** @deprecated Use templateJourneys instead */
  journeys: Journey[];
  
  /** NEW: Read-only template journeys for discovery (JourneySource) */
  templateJourneys: Journey[];
  
  /** User-owned forked/planned journeys (JourneyFork) - stored separately */
  plannerJourneys: Journey[];
  
  // ... rest of interface
}
```

---

## Data Flow Diagrams

### Template Journey Flow
```
User opens Discover page
    ↓
Displays templateJourneys (from defaultJourneys in code)
    ↓
User clicks journey
    ↓
loadJourney(templateId)
    ↓
Sets inspectionJourney (read-only)
    ↓
Map displays template (no mutations allowed)
    ↓
User clicks "Add to My Journeys"
    ↓
forkJourney() creates copy
    ↓
Saved to plannerJourneys (localStorage: trippin_user_forks)
```

### User Fork Flow
```
User opens My Trips page
    ↓
Displays plannerJourneys (from localStorage: trippin_user_forks)
    ↓
User clicks journey
    ↓
loadJourney(forkId)
    ↓
Sets activeJourney (mutable)
    ↓
Map displays fork (mutations allowed)
    ↓
User adds notes, marks visited
    ↓
Saved to plannerJourneys (localStorage: trippin_user_forks)
```

---

## Testing Scenarios

### Test 1: Template Immutability
1. Navigate to Discover
2. Click on a template journey
3. Try to add a note (via console or future UI)
4. **Expected:** Operation fails or has no effect ✅
5. **Verify:** Template unchanged in code

### Test 2: Fork Independence
1. Fork "Himachal Route"
2. Modify the fork (add notes, mark visited)
3. Re-fork "Himachal Route"
4. **Expected:** New fork has clean state ✅
5. **Verify:** Original template unchanged

### Test 3: localStorage Isolation
1. Create multiple forks
2. Check `localStorage.getItem('trippin_user_forks')`
3. Check `localStorage.getItem('trippin_planner_journeys')`
4. **Expected:** 
   - `trippin_user_forks` has new forks ✅
   - `trippin_planner_journeys` is empty or has old data (unused)

### Test 4: Backward Compatibility
1. Component using old `journeys` property
2. Should still receive template journeys
3. **Expected:** No errors, same data ✅
4. **Verify:** `journeys === templateJourneys`

---

## Migration Checklist

### ✅ Complete
- [x] Create `templateJourneys` from `defaultJourneys`
- [x] Change `plannerJourneys` localStorage key to `trippin_user_forks`
- [x] Maintain `journeys` as alias for backward compatibility
- [x] Update `loadJourney()` to use `templateJourneys`
- [x] Update Discover.tsx to use `templateJourneys`
- [x] Make `addJourney()` a no-op (templates immutable)
- [x] Update context provider value
- [x] Add comprehensive comments
- [x] Document migration path

### ⏳ Optional Future Tasks
- [ ] Migrate any remaining `journeys` references to `templateJourneys`
- [ ] Remove `journeys` alias after full migration
- [ ] Add one-time migration script for old user data (if needed)
- [ ] Update TypeScript types to enforce JourneySource vs JourneyFork

---

## Summary

### What Changed
- ✅ Introduced `templateJourneys` (read-only, code-defined)
- ✅ Changed user journeys localStorage key to `trippin_user_forks`
- ✅ Made templates immutable (useMemo, no setter)
- ✅ Clear separation of template vs user data

### What Stayed Same
- ✅ `journeys` still available (backward compatible)
- ✅ `plannerJourneys` API unchanged (just new storage key)
- ✅ Component behavior unchanged
- ✅ No breaking changes

### Benefits Achieved
- ✅ **Type clarity** - Templates are JourneySource
- ✅ **Data integrity** - Separate storage prevents mixing
- ✅ **Immutability** - Templates cannot be mutated
- ✅ **Clear ownership** - Code owns templates, user owns forks

**Status:** Storage split complete. Template journeys are now properly isolated from user-owned forks with distinct storage keys.
