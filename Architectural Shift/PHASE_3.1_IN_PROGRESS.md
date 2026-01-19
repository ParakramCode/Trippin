# Phase 3.1: Fork-Only Active Journey (In Progress)

**Date:** 2026-01-18  
**Status:** 🚧 **IN PROGRESS** - Type narrowing started, compilation errors need resolution

## Objective

Make `activeJourney` strictly a `JourneyFork` at both type and runtime level, eliminating the possibility of templates becoming active.

---

## Changes Made So Far

### ✅ 1. Type System Updates

**Interface Updated:**
```typescript
// BEFORE (Phase 2)
activeJourney: Journey | null;
setActiveJourney: (journey: Journey) => void;

// AFTER (Phase 3.1)
activeJourney: JourneyFork | null;
setActiveJourney: (journey: JourneyFork) => void;
```

**Import Added:**
```typescript
import type { JourneyFork } from '../src/domain/journeyFork';
```

---

### ✅ 2. State Declaration Updated

**Before:**
```typescript
const [activeJourney, setActiveJourney] = useState<Journey | null>(() => {
  const savedId = localStorage.getItem('activeJourneyId');
  if (savedId) {
    const found = defaultJourneys.find(j => j.id === savedId);
    if (found) return found;  // ❌ Could be template!
  }
  return defaultJourneys[0];  // ❌ Definitely template!
});
```

**After:**
```typescript
const [activeJourney, setActiveJourney] = useState<JourneyFork | null>(() => {
  const savedId = localStorage.getItem('activeJourneyId');
  if (savedId) {
    const fork = plannerJourneys.find(j => j.id === savedId);
    if (fork && isJourneyFork(fork as any)) {
      return fork as JourneyFork;  // ✅ Only forks
    }
  }
  return null;  // ✅ Safe default
});
```

**Benefits:**
- No longer initializes from `defaultJourneys` (templates)
- Only loads from `plannerJourneys` (forks)
- Validates fork metadata before returning
- Defaults to `null` instead of first template

---

## Remaining Type Errors

### 1. ❌ MyTrips.tsx - setActiveJourney Calls

**Location:** Lines 76, 89, 117

**Error:**
```
Argument of type 'Journey' is not assignable to parameter of type 'JourneyFork'.
Property 'sourceJourneyId' is optional in type 'Journey' but required in type 'JourneyFork'.
```

**Issue:** Components calling `setActiveJourney(journey)` where `journey` is typed as `Journey`

**Solution:** These journeys are from `plannerJourneys`, so they're actually forks. Need to:
1. Type assert as `JourneyFork` (safe because plannerJourneys only contains forks)
2. OR change plannerJourneys type to `JourneyFork[]`
3. OR use `loadJourney(journey.id)` instead

---

### 2. ❌ HomeMap.tsx / JourneyMap.tsx - Author Property

**Locations:** 
- HomeMap.tsx: Lines 121, 123, 124
- JourneyMap.tsx: Line 386

**Error:**
```
Property 'author' does not exist on type 'JourneyFork'.
```

**Issue:** `currentJourney` is now type `Journey | JourneyFork` (union)
- `JourneySource` has `author` property
- `JourneyFork` does NOT have `author` property

**Solution:**
1. Check if journey is JourneySource before accessing author
2. OR add optional `author` to JourneyFork type (forks inherit from source)
3. OR use optional chaining: `currentJourney?.author?.` (only works if author is optional)

---

## Needed Updates

###1. Update setActiveJourneyWithValidation

**Current:** Still accepts `Journey` parameter

**Needed:**
```typescript
const setActiveJourneyWithValidation = useCallback((journey: JourneyFork) => {
  // Type is now enforced at compile time
  // Runtime guard for defense-in-depth
  
  if (!isJourneyFork(journey as any)) {
    // Development: Throw error
    if (process.env.NODE_ENV !== 'production') {
      throw new Error('Non-fork passed to setActiveJourney');
    }
    // Production: Log warning, don't crash
    console.error('Non-fork passed to setActiveJourney');
    return;
  }
  
  setActiveJourney(journey);
}, []);
```

---

### 2. Fix MyTrips.tsx Calls

**Option A: Type Assert (Safe)**
```typescript
// BEFORE
setActiveJourney(journey);

// AFTER
setActiveJourney(journey as JourneyFork);  // Safe: plannerJourneys only has forks
```

**Option B: Use loadJourney (Better)**
```typescript
// BEFORE
setActiveJourney(journey);

// AFTER
loadJourney(journey.id);  // Handles routing automatically
```

---

### 3. Fix Author Property Access

**Option A: Type Guard**
```typescript
// Check if it's a source before accessing author
if ('author' in currentJourney && currentJourney.author) {
  // Use author
}
```

**Option B: Optional Author on JourneyFork**
```typescript
// In src/domain/journeyFork.ts
export interface JourneyFork {
  // ... existing properties
  author?: string;  // Inherited from source
  authorAvatar?: string;  // Inherited from source
}
```

**Option C: Use inspectionJourney for Author**
```typescript
// Since only templates have authors, check inspection mode
const author = inspectionJourney?.author || 'Unknown';
```

---

### 4. Update currentJourney Type

**Current:**
```typescript
const currentJourney = useMemo(
  () => inspectionJourney ?? activeJourney,
  [inspectionJourney, activeJourney]
);
// Type: Journey | JourneyFork | null
```

**This is correct** - currentJourney CAN be either:
- `Journey` (from inspectionJourney - template)
- `JourneyFork` (from activeJourney - fork)
- `null` (neither)

**Components must handle the union type:**
```typescript
// Check which type before using type-specific properties
if (isJourneyFork(currentJourney as any)) {
  // It's a fork
} else if (currentJourney) {
  // It's a template (has author property)
  const author = currentJourney.author;
}
```

---

## Migration Strategy

### Phase 3.1a: Core Type Changes ✅ DONE
- [x] Import JourneyFork type
- [x] Update interface types
- [x] Update state declaration
- [x] Fix initialization logic

### Phase 3.1b: Implementation Updates (TODO)
- [ ] Update setActiveJourneyWithValidation parameter type
- [ ] Add development throw, production log
- [ ] Remove Phase 2 soft validation

### Phase 3.1c: Component Fixes (TODO)
- [ ] Fix MyTrips.tsx setActive Journey calls (3 locations)
- [ ] Fix HomeMap.tsx author access (3 locations)
- [ ] Fix JourneyMap.tsx author access (1 location)

### Phase 3.1d: Testing & Validation (TODO)
- [ ] Verify app compiles with no errors
- [ ] Test template viewing (inspection mode)
- [ ] Test fork editing (active mode)
- [ ] Test fork creation and activation
- [ ] Verify no runtime errors

---

## Breaking Changes

### Type Level (Compile Time)

❌ **This code will NO LONGER compile:**
```typescript
const template: JourneySource = { /* ... */ };
setActiveJourney(template);  // ❌ Compile error!
```

✅ **Must use correct pattern:**
```typescript
// Option 1: Load it (routes to inspection)
loadJourney(template.id);

// Option 2: Fork it first
forkJourney(template);
const fork = plannerJourneys.find(j => j.sourceJourneyId === template.id);
setActiveJourney(fork);

// Option 3: Set as inspection
setInspectionJourney(template);
```

---

### Runtime Level (Development)

**Phase 2:** Logged warning, still allowed  
**Phase 3.1:** Throws error in development

```typescript
// Development mode
setActiveJourney(nonFork);  // 🔴 Throws Error

// Production mode
setActiveJourney(nonFork);  // ⚠️ Logs error, graceful degradation
```

---

## Benefits

### 1. **Type Safety**
```typescript
// TypeScript prevents this at compile time
const active: JourneyFork | null = activeJourney;
// active guaranteed to be fork or null, never template
```

### 2. **No Template Corruption**
```typescript
// Impossible to set template as active
const template = templateJourneys[0];
setActiveJourney(template);  // ❌ Won't compile
```

### 3. **Self-Documenting**
```typescript
// Type signature tells you exactly what's allowed
setActiveJourney: (journey: JourneyFork) => void
// "Only forks allowed" - no docs needed
```

### 4. **IDE Support**
- Auto-complete only shows JourneyFork properties
- Compiler catches type errors
- Refactoring is safer

---

## Next Steps

1. **Update setActiveJourneyWithValidation** to accept JourneyFork
2. **Fix MyTrips.tsx** - Change 3 setActiveJourney calls to use loadJourney or type assert
3. **Fix author property** - Add optional author to JourneyFork or use type guards
4. **Test thoroughly** - Ensure no runtime errors
5. **Document changes** - Update PHASE_3.1_TYPE_ENFORCEMENT.md with complete details

---

## Status

✅ **Completed:**
- Interface type narrowing
- State type narrowing
- Safe initialization (fork-only)

🚧 **In Progress:**
- Fixing compilation errors
- Updating implementation
- Component migrations

⏳ **Pending:**
- Full testing
- Documentation finalization

**Estimated completion:** Requires fixing 7 type errors across 3 files, plus updating validation logic.

---

## Rollback Plan

If type errors prove too complex to fix immediately:

1. Revert interface types to `Journey | null`
2. Keep improved initialization logic (fork-only)
3. Continue with Phase 2 soft validation
4. Plan more gradual migration:
   - Phase 3.1a: Update internals only
   - Phase 3.1b: Update components one by one
   - Phase 3.1c: Finally narrow types

**Current recommendation:** Continue with fixes - we're close to completion.
