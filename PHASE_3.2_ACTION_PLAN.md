# Phase 3.2: Remove Manual Journey Flags (Action Plan)

**Status:** 🚧 **PLANNING** - Analysis complete, ready for execution

## Problem

`journeyMode` is derived from `isFollowing`, so we can't just delete `isFollowing` state. We need to:
1. Keep `isFollowing` as internal implementation detail
2. Remove it from public API
3. Provide semantic actions instead of manual flag setters

---

## Current State Analysis

### isFollowing Usage (30 occurrences)

**State Declaration:**
- `context/JourneyContext.tsx:772` - State declaration

**Public Interface:**
- `context/JourneyContext.tsx:200` - Interface export
- `context/JourneyContext.tsx:201` - setIsFollowing export
- `context/JourneyContext.tsx:1296` - Value export

**Derivation:**
- `context/JourneyContext.tsx:817` - Used in journeyMode derivation

**Component Imports:**
- `pages/MyTrips.tsx:27` - Imports setIsFollowing
- `pages/HomeMap.tsx:39` - Imports both
- `pages/Discover.tsx:12` - Imports setIsFollowing
- `components/JourneyMap.tsx:38-39` - Imports both
- `components/NavigationDrawer.tsx:33` - Imports setIsFollowing

**Component Usage:**
- 8 locations in JourneyMap.tsx (checks and sets)
- 4 locations in HomeMap.tsx
- 3 locations in MyTrips.tsx  
- 2 locations in Discover.tsx
- 2 locations in NavigationDrawer.tsx

---

## Refactor Strategy

### Phase 3.2a: Add Semantic Actions ✅ TODO

Add new action methods to replace `setIsFollowing`:

```typescript
// In JourneyContext
const startNavigation = useCallback(() => {
  setIsFollowing(true);
}, []);

const stopNavigation = useCallback(() => {
  setIsFollowing(false);
}, []);
```

**Export:**
```typescript
interface JourneyContextType {
  // Remove:
  // isFollowing: boolean;
  // setIsFollowing: (v: boolean) => void;
  
  // Add:
  startNavigation: () => void;
  stopNavigation: () => void;
}
```

---

### Phase 3.2b: Replace Direct Flag Checks ✅ TODO

**Pattern to Replace:**
```typescript
// BEFORE
if (isFollowing) { /* ... */ }

// AFTER
if (journeyMode === 'NAVIGATION') { /* ... */ }
```

**Locations:**
1. `HomeMap.tsx:96, 118, 158` - 3 conditional checks
2. `JourneyMap.tsx:152, 167, 241, 271, 371` - 5 conditional checks

---

### Phase 3.2c: Replace setIsFollowing Calls ✅ TODO

**Direct Calls:**
```typescript
// BEFORE
setIsFollowing(true);

// AFTER  
startNavigation();

// BEFORE
setIsFollowing(false);

// AFTER
stopNavigation();
```

**Toggle Calls:**
```typescript
// BEFORE
setIsFollowing(!isFollowing)

// AFTER
if (journeyMode === 'NAVIGATION') {
  stopNavigation();
} else {
  startNavigation();
}
```

**Locations:**
1. `MyTrips.tsx:81, 92` - 2 calls
2. `HomeMap.tsx:97` - 1 call
3. `Discover.tsx:18` - 1 call
4. `JourneyMap.tsx:346, 369` - 2 calls
5. `NavigationDrawer.tsx:100, 235` - 2 calls
6. `context/JourneyContext.tsx:1254` - 1 internal call (startJourney function)

---

### Phase 3.2d: Remove from Public API ✅ TODO

1. Remove from interface
2. Keep internal state (for journeyMode derivation)
3. Remove from value exports
4. Update documentation

---

### Phase 3.2e: Clean Up Imports ✅ TODO

Remove `isFollowing` and `setIsFollowing` from all component imports, add `journeyMode`, `startNavigation`, `stopNavigation` as needed.

---

## Alternative: Keep startJourney/Update Journey Status

**Better approach:** Don't add startNavigation/stopNavigation. Instead:

1. `startJourney(id)` already sets status='LIVE'
2. journeyMode derives NAVIGATION from status='LIVE'
3. Just need a way to stop navigation

**Options:**
- `stopJourney(id)` - sets status back to 'PLANNED'
- `pauseNavigation()` - temporary pause
- Remove concept of "following" - navigation is just status='LIVE'

---

## Recommended Approach

### Keep It Simple:

1. **Navigation = status='LIVE'**
   - `startJourney(id)` → sets status='LIVE'
   - `journeyMode` derives 'NAVIGATION' from status
   - Remove `isFollowing` from derivation
   
2. **Remove isFollowing entirely**
   - Delete state
   - Remove from interface
   - Replace all checks with `journeyMode === 'NAVIGATION'`
   - Replace setIsFollowing calls with status updates

3. **Map centering behavior**
   - User can toggle "follow mode" separately from navigation
   - Or just auto-center during navigation, manual pan disables

---

## Decision Needed

**Should we:**

A. Add `startNavigation` / `stopNavigation` actions?
B. Use existing `startJourney` / add `stopJourney`?
C. Remove `isFollowing` from journeyMode derivation entirely?

**Recommendation: Option B**
- Leverages existing `startJourney` function
- Status is already the source of truth
- journeyMode already checks status='LIVE'
- Just need to remove `isFollowing` check from journeyMode
- Add helper to stop navigation (set status='PLANNED')

---

## Implementation Plan (Recommended)

### Step 1: Update journeyMode Derivation
Remove `isFollowing` from priority checks:
```typescript
const journeyMode = useMemo(() => {
  if (inspectionJourney) return 'INSPECTION';
  if (!activeJourney) return null;
  if (activeJourney.isCompleted) return 'COMPLETED';
  if (activeJourney.status === 'LIVE') return 'NAVIGATION';
  // REMOVED: if (isFollowing) return 'NAVIGATION';
  return 'PLANNING';
}, [inspectionJourney, activeJourney]);
```

### Step 2: Add stopJourney Function
```typescript
const stopJourney = useCallback((journeyId: string) => {
  setPlannerJourneys(prev => prev.map(j =>
    j.id === journeyId ? { ...j, status: 'PLANNED' } : j
  ));
  if (activeJourney?.id === journeyId) {
    setActiveJourney({ ...activeJourney, status: 'PLANNED' });
  }
}, [setPlannerJourneys, activeJourney]);
```

### Step 3: Replace Component Usage
- `setIsFollowing(true)` → `startJourney(activeJourney.id)`
- `setIsFollowing(false)` → `stopJourney(activeJourney.id)`
- `isFollowing` → `journeyMode === 'NAVIGATION'`

### Step 4: Remove isFollowing
- Delete state declaration
- Remove from interface
- Remove from exports

---

## Files To Modify

1. `context/JourneyContext.tsx` - Remove isFollowing, add stopJourney
2. `pages/MyTrips.tsx` - Replace setIsFollowing calls
3. `pages/HomeMap.tsx` - Replace isFollowing checks and calls
4. `pages/Discover.tsx` - Replace setIsFollowing call
5. `components/JourneyMap.tsx` - Replace all isFollowing usage
6. `components/NavigationDrawer.tsx` - Replace setIsFollowing calls

---

## Risks

1. **Map following behavior** - Components use isFollowing for map centering
2. **Toggle behavior** - Some places toggle isFollowing
3. **No activeJourney** - Some calls don't have journey context

**Mitigation:**
- Add `recenterOnUser` prop or similar for map behavior
- Status toggling handles start/stop
- Calls without context need journey ID passed

---

**Next:** Execute recommended plan (Option B)
