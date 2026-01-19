# Phase 3.2: Remove Manual Journey Flags (Progress Report)

**Status:** 🚧 **IN PROGRESS** - Core changes done, component migration pending

---

## ✅ Completed

### 1. Updated journeyMode Derivation
**Removed isFollowing dependency:**
```typescript
// OLD (Phase 2.2)
const journeyMode = useMemo(() => {
  if (inspectionJourney) return 'INSPECTION';
  if (activeJourney?.isCompleted) return 'COMPLETED';
  if (activeJourney?.status === 'LIVE') return 'NAVIGATION';
  if (isFollowing) return 'NAVIGATION';  // ❌ Manual flag
  return 'PLANNING';
}, [inspectionJourney, activeJourney, isFollowing]);

// NEW (Phase 3.2)
const journeyMode = useMemo(() => {
  if (inspectionJourney) return 'INSPECTION';
  if (activeJourney?.isCompleted) return 'COMPLETED';
  if (activeJourney?.status === 'LIVE') return 'NAVIGATION';  // ✅ Status only
  return 'PLANNING';
}, [inspectionJourney, activeJourney]);  // ✅ No isFollowing
```

**Benefit:** journeyMode now derives purely from journey state, no manual flags.

---

### 2. Updated startJourney
**Removed setIsFollowing call:**
```typescript
// OLD
const startJourney = useCallback((journeyId) => {
  setPlannerJourneys(/* set status='LIVE' */);
  setIsFollowing(true);  // ❌ Manual flag sync
}, [/* ... */]);

// NEW
const startJourney = useCallback((journeyId) => {
  setPlannerJourneys(/* set status='LIVE' */);
  // ✅ No manual flag - journeyMode derives from status
}, [/* ... */]);
```

---

### 3. Added stopJourney Function
```typescript
const stopJourney = useCallback((journeyId: string) => {
  setPlannerJourneys(prev => prev.map(j =>
    j.id === journeyId ? { ...j, status: "PLANNED" } : j
  ));
  
  if (activeJourney?.id === journeyId) {
    setActiveJourney({ ...activeJourney, status: "PLANNED" });
  }
}, [setPlannerJourneys, activeJourney]);
```

**Purpose:** Provides semantic action to stop navigation (sets status='PLANNED').

---

## ⏳ Remaining Tasks

### Task 1: Update Interface
**Remove from JourneyContextType:**
- ❌ `isFollowing: boolean`
- ❌ `setIsFollowing: (v: boolean) => void`

**Add to JourneyContextType:**
- ✅ `stopJourney: (journeyId: string) => void`

---

### Task 2: Update Exports
**Remove from value:**
```typescript
const value = {
  // Remove:
  // isFollowing,
  // setIsFollowing,
  
  // Add:
  stopJourney,
};
```

---

### Task 3: Remove isFollowing State
```typescript
// DELETE this line:
const [isFollowing, setIsFollowing] = useState(false);
```

**Note:** Can only do this AFTER all components are migrated.

---

### Task 4: Component Migrations

#### MyTrips.tsx (3 locations)
**Line 27:** Remove from imports
```typescript
// Remove: setIsFollowing
const { /*...*/ } = useJourneys();
```

**Line 81:** Replace setIsFollowing(false)
```typescript
// OLD
setIsFollowing(false);

// NEW - Actually not needed! loadJourney handles routing.
// Can just remove this call.
```

**Line 92:** Replace setIsFollowing(true)
```typescript
// OLD
setIsFollowing(true);

// NEW
// Already calls startJourney below, which sets status='LIVE'
// Can remove this line
```

---

#### HomeMap.tsx (4 locations)
**Line 39:** Replace imports
```typescript
// OLD
const { isFollowing, setIsFollowing, /* ... */ } = useJourneys();

// NEW
const { journeyMode, /* ... */ } = useJourneys();
```

**Line 96:** Replace isFollowing check
```typescript
// OLD
if (!isFollowing) {
  setIsFollowing(true);
}

// NEW
if (journeyMode !== 'NAVIGATION' && activeJourney) {
  startJourney(activeJourney.id);
}
```

**Line 118:** Replace isFollowing check
```typescript
// OLD
{!isFollowing && currentJourney && (/* ... */)}

// NEW
{journeyMode !== 'NAVIGATION' && currentJourney && (/* ... */)}
```

**Line 158:** Replace isFollowing check
```typescript
// OLD
{isFollowing ? (/* ... */) : (/* ... */)}

// NEW
{journeyMode === 'NAVIGATION' ? (/* ... */) : (/* ... */)}
```

---

#### Discover.tsx (2 locations)
**Line 12:** Remove imports
```typescript
// OLD
const { setIsFollowing, /* ... */ } = useJourneys();

// NEW
const { /* ... */ } = useJourneys();
```

**Line 18:** Remove setIsFollowing call
```typescript
// OLD
useEffect(() => {
  setIsFollowing(false);
}, [setIsFollowing]);

// NEW - Remove entire useEffect OR:
useEffect(() => {
  // If activeJourney is navigating, stop it
  if (activeJourney && journeyMode === 'NAVIGATION') {
    stopJourney(activeJourney.id);
  }
}, [activeJourney, journeyMode, stopJourney]);
```

---

#### JourneyMap.tsx (8 locations)
**Lines 38-39:** Replace imports
```typescript
// OLD
const { isFollowing, setIsFollowing, /* ... */ } = useJourneys();

// NEW
const { journeyMode, stopJourney, /* ... */ } = useJourneys();
```

**Line 152:** Replace isFollowing check
```typescript
// OLD
if (!isFollowing && ref && 'current' in ref && ref.current) {

// NEW
if (journeyMode !== 'NAVIGATION' && ref && 'current' in ref && ref.current) {
```

**Line 167:** Replace isFollowing check
```typescript
// OLD
if (isFollowing) {

// NEW
if (journeyMode === 'NAVIGATION') {
```

**Line 241:** Replace isFollowing check
```typescript
// OLD
if (!isFollowing) {

// NEW
if (journeyMode !== 'NAVIGATION') {
```

**Line 271:** Replace isFollowing in padding
```typescript
// OLD
padding={isFollowing ? {/*...*/} : {/*...*/}}

// NEW
padding={journeyMode === 'NAVIGATION' ? {/*...*/} : {/*...*/}}
```

**Line 346:** Replace setIsFollowing call
```typescript
// OLD
setIsFollowing(false);

// NEW
if (activeJourney) {
  stopJourney(activeJourney.id);
}
```

**Line 369:** Replace toggle
```typescript
// OLD
onClick={() => setIsFollowing(!isFollowing)}

// NEW
onClick={() => {
  if (activeJourney) {
    if (journeyMode === 'NAVIGATION') {
      stopJourney(activeJourney.id);
    } else {
      startJourney(activeJourney.id);
    }
  }
}}
```

**Line 371:** Replace isFollowing in className
```typescript
// OLD
className={`w-6 h-6 ${isFollowing ? 'rotate-0' : '-rotate-45'}`}

// NEW
className={`w-6 h-6 ${journeyMode === 'NAVIGATION' ? 'rotate-0' : '-rotate-45'}`}
```

---

#### NavigationDrawer.tsx (3 locations)
**Line 33:** Remove import
```typescript
// Remove: setIsFollowing
```

**Line 100:** Replace setIsFollowing call
```typescript
// OLD
setIsFollowing(false);

// NEW
if (activeJourney) {
  stopJourney(activeJourney.id);
}
```

**Line 235:** Replace setIsFollowing call
```typescript
// OLD
onClick={() => setIsFollowing(false)}

// NEW
onClick={() => activeJourney && stopJourney(activeJourney.id)}
```

---

## Summary of Changes Needed

| File | isFollowing Checks | setIsFollowing Calls | Total Changes |
|------|-------------------|---------------------|---------------|
| MyTrips.tsx | 0 | 2 | 2 |
| HomeMap.tsx | 3 | 1 | 4 |
| Discover.tsx | 0 | 1 | 1 |
| JourneyMap.tsx | 5 | 2 | 7 |
| NavigationDrawer.tsx | 0 | 2 | 2 |
| **Total** | **8** | **8** | **16** |

---

## Migration Pattern

### Pattern 1: Replace Boolean Check
```typescript
// BEFORE
if (isFollowing) {

// AFTER
if (journeyMode === 'NAVIGATION') {
```

### Pattern 2: Replace Negated Check
```typescript
// BEFORE
if (!isFollowing) {

// AFTER
if (journeyMode !== 'NAVIGATION') {
```

### Pattern 3: Replace setIsFollowing(true)
```typescript
// BEFORE
setIsFollowing(true);

// AFTER
if (activeJourney) {
  startJourney(activeJourney.id);
}
```

### Pattern 4: Replace setIsFollowing(false)
```typescript
// BEFORE
setIsFollowing(false);

// AFTER
if (activeJourney) {
  stopJourney(activeJourney.id);
}
```

### Pattern 5: Replace Toggle
```typescript
// BEFORE
setIsFollowing(!isFollowing)

// AFTER
if (activeJourney) {
  if (journeyMode === 'NAVIGATION') {
    stopJourney(activeJourney.id);
  } else {
    startJourney(activeJourney.id);
  }
}
```

---

## Rollback Plan

If issues arise during migration:

1. **Revert journeyMode derivation** - Add isFollowing back to useMemo deps
2. **Revert startJourney** - Add setIsFollowing(true) back
3. **Remove stopJourney** - Not exported yet, safe to remove
4. **Keep component changes** - journeyMode checks still work with isFollowing

---

## Next Steps

1. ✅ Update JourneyContextType interface
2. ✅ Export stopJourney in value
3. ✅ Migrate all 5 component files
4. ✅ Remove isFollowing state declaration
5. ✅ Test thoroughly
6. ✅ Document completion in PHASE_3.2_COMPLETE.md

---

**Status:** Core refactoring complete. Ready for component migration (16 changes across 5 files).
